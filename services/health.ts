import {
  initialize,
  requestPermission,
  readRecords,
  insertRecords,
  getGrantedPermissions,
  getSdkStatus,
  SdkAvailabilityStatus,
  openHealthConnectSettings,
  aggregateRecord
} from "react-native-health-connect";

import { Platform } from "react-native";

const PERMISSIONS: any[] = [
  { accessType: "read", recordType: "Steps" },
  { accessType: "write", recordType: "Steps" },
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "TotalCaloriesBurned" },
  { accessType: "write", recordType: "TotalCaloriesBurned" },
  { accessType: "read", recordType: "Distance" },
  { accessType: "read", recordType: "ExerciseSession" },
  { accessType: "read", recordType: "Weight" },
  { accessType: "write", recordType: "Weight" },
];

const PROVIDER_PACKAGE = "com.google.android.healthconnect.controller";

let initialized = false;

async function ensureInitialized(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  try {
    const status = await getSdkStatus(PROVIDER_PACKAGE);
    console.log("Health Connect SDK Status:", status);

    if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      console.warn("Health Connect is not available. Status:", status);
      return false;
    }

    if (!initialized) {
      await initialize(PROVIDER_PACKAGE);
      initialized = true;
    }
    return true;
  } catch (e) {
    console.warn("Health Connect initialization failed:", e);
    return false;
  }
}

export async function initHealth(): Promise<boolean> {
  return ensureInitialized();
}

export async function requestHealthPermissions(): Promise<void> {
  const ok = await ensureInitialized();
  if (!ok) throw new Error("Health Connect initialization failed.");

  try {
    console.log("Requesting permissions:", PERMISSIONS);
    const result = await requestPermission(PERMISSIONS, PROVIDER_PACKAGE);
    console.log("Permission request result:", result);
    
    // If Android silently denies the request (returns an empty array),
    // redirect the user to the manual settings panel.
    if (result.length === 0) {
      console.log("Permissions silently denied by Android. Redirecting to settings...");
      openHealthConnectSettings();
    }
    
  } catch (error: any) {
    console.warn("Error during requestPermission:", error);
    throw new Error(`Failed to request permissions: ${error.message || String(error)}`);
  }
}

export async function checkHealthPermissions(): Promise<boolean> {
  try {
    const granted = await getGrantedPermissions();

    return PERMISSIONS.every(p =>
      granted.some(
        g => (g.recordType === p.recordType || (p.recordType === 'ExerciseSession' && (g.recordType as string) === 'Exercise')) 
             && g.accessType === p.accessType
      )
    );
  } catch {
    return false;
  }
}

export function openHealthSettings(): void {
  openHealthConnectSettings();
}

function getTodayRange() {
  const start = new Date();
  // Look back 7 days to capture recent test entries
  start.setDate(start.getDate());
  start.setHours(0, 0, 0, 0);

  return {
    operator: "between" as const,
    startTime: start.toISOString(),
    endTime: new Date().toISOString(),
  };
}

export async function getTodaySteps(): Promise<number> {
  try {
    const ok = await ensureInitialized();
    if (!ok) return 0;

    const result = await aggregateRecord({
      recordType: "Steps",
      timeRangeFilter: getTodayRange(),
    });

    console.log("Aggregated steps returned:", JSON.stringify(result, null, 2));

    return result.COUNT_TOTAL ?? 0;
  } catch (err) {
    console.error("Error reading Steps:", err);
    return 0;
  }
}

export async function getTodayCalories(): Promise<number> {
  try {
    const ok = await ensureInitialized();
    if (!ok) return 0;

    const result = await aggregateRecord({
      recordType: "TotalCaloriesBurned",
      timeRangeFilter: getTodayRange(),
    });

    console.log("Aggregated calories returned:", JSON.stringify(result, null, 2));

    return Math.round(result.ENERGY_TOTAL?.inKilocalories ?? 0);
  } catch (err) {
    console.error("Error reading Calories:", err);
    return 0;
  }
}

export async function getTodayDistance(): Promise<number> {
  try {
    const ok = await ensureInitialized();
    if (!ok) return 0;

    const result = await aggregateRecord({
      recordType: "Distance",
      timeRangeFilter: getTodayRange(),
    });

    return (result.DISTANCE?.inMeters ?? 0) / 1000; // convert meters → km
  } catch (err) {
    console.error("Error reading Distance:", err);
    return 0;
  }
}

export async function getLatestHeartRate(): Promise<number | null> {
  try {
    const ok = await ensureInitialized();
    if (!ok) return null;

    const result = await readRecords("HeartRate", {
      timeRangeFilter: getTodayRange(),
    });

    if (!result.length) return null;

    const latest = result[result.length - 1];

    return latest.samples?.[0]?.beatsPerMinute ?? null;
  } catch (err) {
    console.error("Error reading HeartRate:", err);
    return null;
  }
}

/**
 * Generalized Historical Data Fetcher
 * Returns an array of daily aggregated buckets (e.g. 7 days of Steps)
 */
export async function getHistoricalData(
  recordType: "Steps" | "TotalCaloriesBurned" | "Distance",
  days: number = 7
): Promise<{ date: string; value: number }[]> {
  try {
    const ok = await ensureInitialized();
    if (!ok) return [];

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - (days - 1)); // Include today
    start.setHours(0, 0, 0, 0);

    const buckets: { date: string; value: number }[] = [];

    // Pre-fill the last N days
    for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);

        const dateStr = d.toISOString().split("T")[0];
        
        try {
            const result = await aggregateRecord({
                recordType,
                timeRangeFilter: {
                    operator: "between",
                    startTime: dayStart.toISOString(),
                    endTime: dayEnd.toISOString()
                }
            });
            
            let val = 0;
            if (recordType === "Steps") val = (result as any).COUNT_TOTAL ?? 0;
            else if (recordType === "TotalCaloriesBurned") val = Math.round((result as any).ENERGY_TOTAL?.inKilocalories ?? 0);
            else if (recordType === "Distance") val = ((result as any).DISTANCE?.inMeters ?? 0) / 1000;

            buckets.push({ date: dateStr, value: val });
        } catch (e) {
            buckets.push({ date: dateStr, value: 0 });
        }
    }

    return buckets;

  } catch (err) {
    console.error(`Error reading historical ${recordType}:`, err);
    return [];
  }
}

export async function getHistoricalWeight(days: number = 7): Promise<{ date: string; value: number }[]> {
  try {
    const ok = await ensureInitialized();
    if (!ok) return [];

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    // Expand the fetch window by an extra day to catch UTC-shifted records
    // Since we dedup by biological day later, this is completely safe.
    start.setDate(start.getDate() - (days)); 
    
    // Also push the end time into tomorrow to catch late-night UTC shifts
    const searchEnd = new Date(end);
    searchEnd.setDate(searchEnd.getDate() + 1);

    const result = await readRecords("Weight", {
      timeRangeFilter: {
        operator: "between",
        startTime: start.toISOString(),
        endTime: searchEnd.toISOString()
      }
    });

    // Safely parse Health Connect timestamps which can occasionally be anomalous
    const records = result.map((r: any) => {
      let t = new Date(); // guarantee fallback
      
      try {
        if (r.startTime) t = new Date(r.startTime);
        else if (r.time) t = new Date(r.time);
      } catch (e) {
        // ignore and use fallback
      }

      if (isNaN(t.getTime())) t = new Date(); // total safety check

      return {
        date: t.toISOString().split("T")[0],
        value: r.weight?.inKilograms || 0,
        timestamp: t.getTime()
      };
    }).sort((a,b) => b.timestamp - a.timestamp); // newest first
    
    // De-duplicate by day (taking latest entry of each day)
    const uniqueDays = new Map<string, number>();
    records.forEach(r => {
      // Since records is sorted newest first, the FIRST time we see a date, 
      // it is biologically the most recent log for that day. 
      if (!uniqueDays.has(r.date)) {
        uniqueDays.set(r.date, r.value);
      }
    });

    // Fill buckets for the chart
    const buckets: { date: string; value: number }[] = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        buckets.push({ date: dateStr, value: uniqueDays.get(dateStr) || 0 });
    }

    return buckets;
  } catch (err) {
    console.error("Error reading historical weight:", err);
    return [];
  }
}

export async function insertWeight(weightInKg: number): Promise<boolean> {
  try {
    const ok = await ensureInitialized();
    if (!ok) return false;

    // Use current time for the new weight record
    const date = new Date();

    await insertRecords([
      {
        recordType: "Weight",
        weight: { value: weightInKg, unit: "kilograms" },
        time: date.toISOString()
      }
    ]);

    console.log(`Successfully inserted weight: ${weightInKg}kg`);
    return true;
  } catch (error) {
    console.error("Error inserting weight data:", error);
    return false;
  }
}

export async function insertMockData(): Promise<boolean> {
  try {
    const ok = await ensureInitialized();
    if (!ok) return false;

    // Use current time for the mock records
    const end = new Date();
    const start = new Date();
    start.setHours(start.getHours() - 1); // 1 hour ago

    await insertRecords([
      {
        recordType: "Steps",
        count: 5000,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      }
    ]);

    await insertRecords([
      {
        recordType: "TotalCaloriesBurned",
        energy: { value: 300, unit: "kilocalories" },
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      }
    ]);

    console.log("Successfully inserted mock data!");
    return true;
  } catch (error) {
    console.error("Error inserting mock data:", error);
    return false;
  }
}

/**
 * Fetches specific workout sessions (e.g. Running, Biking) from the last N days
 */
export async function getRecentExerciseSessions(days: number = 7) {
  try {
    const ok = await ensureInitialized();
    if (!ok) return [];

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const result = await readRecords("ExerciseSession", {
      timeRangeFilter: {
        operator: "between",
        startTime: start.toISOString(),
        endTime: end.toISOString()
      }
    });

    // Map and sort backwards (newest first)
    return result.map((r: any) => {
      const startT = new Date(r.startTime).getTime();
      const endT = new Date(r.endTime).getTime();
      const durationMin = Math.round((endT - startT) / 60000);

      // Extract a readable title based on the exercise type integer 
      // (The API uses numeric constants, here we just return the generic 'Exercise' if unknown,
      // or map some common ones based on Android specs)
      let title = "Exercise";
      if (r.exerciseType === 56) title = "Running";
      else if (r.exerciseType === 79) title = "Walking";
      else if (r.exerciseType === 8) title = "Biking";
      else if (r.exerciseType === 2) title = "Badminton";
      else if (r.exerciseType === 82) title = "Workout";

      return {
        id: r.metadata?.id || Math.random().toString(),
        title,
        type: r.exerciseType,
        startTime: r.startTime,
        durationMinutes: durationMin,
      };
    }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
  } catch (err) {
    console.error("Error fetching exercise sessions:", err);
    return [];
  }
}