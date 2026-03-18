import { useState, useCallback } from "react";
import { ScrollView, Text, View, Dimensions, ActivityIndicator, TouchableOpacity } from "react-native";
import { useFocusEffect } from "expo-router";
import { collection, query, where, getDocs, orderBy, limit, deleteDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, PieChart, BarChart } from "react-native-chart-kit";

import { auth, db } from "../../services/firebase";
import { getHistoricalData, getRecentExerciseSessions, getHistoricalWeight } from "../../services/health";
import { colors } from "@/constants/colors";

const screenWidth = Dimensions.get("window").width;

export default function ProgressTab() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"Week" | "Month" | "All data">("Week");

  // Weight State
  const [weights, setWeights] = useState<number[]>([]);
  const [weightLabels, setWeightLabels] = useState<string[]>([]);

  // Calorie State
  const [caloriesEaten, setCaloriesEaten] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);

  // Activity State
  const [activityData, setActivityData] = useState<number[]>([]);
  const [activityLabels, setActivityLabels] = useState<string[]>([]);

  // Health Stats (Steps / Distance)
  const [stepsData, setStepsData] = useState<number[]>([]);
  const [stepsLabels, setStepsLabels] = useState<string[]>([]);
  
  const [distanceData, setDistanceData] = useState<number[]>([]);
  const [distanceLabels, setDistanceLabels] = useState<string[]>([]);

  const loadProgressData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const daysToFetch = timeRange === "Week" ? 7 : timeRange === "Month" ? 30 : 90;

      // ==========================================
      // 1. Fetch Weight Logs (Firebase & HC)
      // ==========================================
      const wQuery = query(collection(db, "weight_logs"), where("userId", "==", user.uid), orderBy("date", "desc"), limit(daysToFetch));
      const wSnap = await getDocs(wQuery);

      // New Unified Weight Merging logic
      const hcWeight = await getHistoricalWeight(daysToFetch);
      
      // Combine Firebase and HC data
      const mergedMap = new Map<string, number>();
      
      // 1. Fill with HC data (already daily bucketed)
      hcWeight.forEach(item => {
        if (item.value > 0) mergedMap.set(item.date, item.value);
      });
      
      // 2. Overlay Firebase data (might be more recent or specialized)
      wSnap.docs.forEach(doc => {
        const data = doc.data();
        const date = data.date?.toDate ? data.date.toDate() : new Date();
        const rawWeight = Number(data.weight);
        if (!isNaN(rawWeight) && rawWeight < 400 && rawWeight >= 20) {
          const dStr = date.toISOString().split('T')[0];
          mergedMap.set(dStr, rawWeight);
        }
      });

      // 3. Re-map into original chart arrays for the X-day window
      const finalVals: number[] = [];
      const finalLabs: string[] = [];
      
      let lastKnownWeight = 0;
      // First, find the first non-zero weight to start the trend
      for (let i = daysToFetch - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const val = mergedMap.get(dStr);
        if (val && val > 0) {
          lastKnownWeight = val;
          break;
        }
      }

      for (let i = daysToFetch - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        let val = mergedMap.get(dStr) || 0;
        
        if (val === 0 && lastKnownWeight > 0) {
          val = lastKnownWeight; // Forward fill
        } else if (val > 0) {
          lastKnownWeight = val; // Update last known
        }

        finalVals.push(val);
        finalLabs.push(`${d.getDate()}/${d.getMonth() + 1}`);
      }

      setWeights(finalVals);
      setWeightLabels(finalLabs);

      // ==========================================
      // 2. Fetch Calories Eaten Today (Firebase)
      // ==========================================
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const fQuery = query(collection(db, "food_logs"), where("userId", "==", user.uid));
      const fSnap = await getDocs(fQuery);

      let eatenToday = 0;
      fSnap.forEach(doc => {
        const data = doc.data();
        const dDate = data.date?.toDate ? data.date.toDate() : new Date(0);
        if (dDate >= todayStart) {
          eatenToday += Number(data.calories || 0);
        }
      });
      setCaloriesEaten(eatenToday);

      // ==========================================
      // 3. Fetch Calories Burned Today (Health Connect)
      // ==========================================
      const calHistory = await getHistoricalData("TotalCaloriesBurned", 1);
      const burnedToday = calHistory.length > 0 ? calHistory[calHistory.length - 1].value : 0;
      setCaloriesBurned(burnedToday);

      // ==========================================
      // 4. Fetch Dynamic Activity Sessions (Health Connect)
      // ==========================================
      const sessions = await getRecentExerciseSessions(daysToFetch);

      const actDurs = new Array(daysToFetch).fill(0);
      const actLabs = new Array(daysToFetch).fill("");

      // Build skeleton labels
      for (let i = daysToFetch - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        // Only show the label if it's the 1st of the month, or every ~7th day for cleaner sparse arrays
        const isSparse = daysToFetch > 7 && (i % Math.ceil(daysToFetch / 6) !== 0);
        actLabs[(daysToFetch - 1) - i] = isSparse ? "" : d.toLocaleDateString(undefined, { weekday: daysToFetch === 7 ? 'short' : undefined, day: 'numeric', month: daysToFetch > 7 ? 'short' : undefined });
      }

      // Populate array by matching session date back into our window
      sessions.forEach(sess => {
        const sDate = new Date(sess.startTime);
        sDate.setHours(0, 0, 0, 0);

        const current = new Date();
        current.setHours(0, 0, 0, 0);

        const diffTime = current.getTime() - sDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= daysToFetch && diffDays >= 0) {
          const arrayIndex = (daysToFetch - 1) - diffDays;
          if (arrayIndex >= 0 && arrayIndex < daysToFetch) {
            actDurs[arrayIndex] += sess.durationMinutes;
          }
        }
      });

      setActivityData(actDurs);
      setActivityLabels(actLabs);

      // ==========================================
      // 5. Fetch Steps & Distance (Health Connect)
      // ==========================================
      const stepsHistory = await getHistoricalData("Steps", daysToFetch);
      const distHistory = await getHistoricalData("Distance", daysToFetch);

      const mapSparseLabels = (historyArray: { date: string, value: number }[]) => {
        return historyArray.map((d, i) => {
          const parts = d.date.split("-");
          return `${parts[1]}/${parts[2]}`; // MM/DD
        });
      };

      setStepsData(stepsHistory.map(d => d.value));
      setStepsLabels(mapSparseLabels(stepsHistory));
      
      setDistanceData(distHistory.map(d => d.value));
      setDistanceLabels(mapSparseLabels(distHistory));

    } catch (err) {
      console.warn("Failed to load progress data", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProgressData();
    }, [timeRange])
  );

  // Calculate Weight Deltas
  const currentWeight = weights.length ? weights[weights.length - 1] : null;
  const previousWeight = weights.length > 1 ? weights[weights.length - 2] : null;
  const diff = previousWeight !== null && currentWeight !== null ? (currentWeight - previousWeight).toFixed(1) : null;
  const diffNumber = diff ? Number(diff) : 0;

  // Pie Chart Config
  const pieData = [
    {
      name: "Eaten",
      population: caloriesEaten,
      color: colors.warning,
      legendFontColor: "#7F7F7F",
      legendFontSize: 13
    },
    {
      name: "Burned",
      population: caloriesBurned,
      color: colors.primary,
      legendFontColor: "#7F7F7F",
      legendFontSize: 13
    }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.text }}>Progress</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Segmented Control Filter */}
        <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: "#F9FAFB", borderRadius: 30, flexDirection: "row", padding: 4 }}>
          {["Week", "Month", "All data"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setTimeRange(tab as any)}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                borderRadius: 26,
                backgroundColor: timeRange === tab ? "#E0E7FF" : "transparent"
              }}
            >
              <Text style={{
                color: timeRange === tab ? "#4338CA" : "#6B7280",
                fontWeight: timeRange === tab ? "500" : "400",
                fontSize: 15
              }}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 10, color: colors.textSecondary }}>Crunching your numbers...</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {/* ========================================== */}
            {/* 1. CALORIE PIE CHART BLOCK                 */}
            {/* ========================================== */}
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12, marginTop: 10 }}>Today's Energy</Text>

            <View style={{ backgroundColor: colors.card, borderRadius: 16, paddingVertical: 16, marginBottom: 24, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 }}>

              {caloriesEaten === 0 && caloriesBurned === 0 ? (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <Ionicons name="pie-chart-outline" size={48} color={colors.textSecondary + '40'} />
                  <Text style={{ marginTop: 12, color: colors.textSecondary }}>No energy data logged today.</Text>
                </View>
              ) : (
                <>
                  <PieChart
                    data={pieData}
                    width={screenWidth - 40}
                    height={160}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    center={[10, 0]}
                    absolute
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderColor: '#F3F4F6', paddingTop: 16, marginTop: 10, marginHorizontal: 16 }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>Total Consumed</Text>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.warning }}>{caloriesEaten} <Text style={{ fontSize: 12 }}>kcal</Text></Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: '#F3F4F6' }} />
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>Active Burn</Text>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{caloriesBurned} <Text style={{ fontSize: 12 }}>kcal</Text></Text>
                    </View>
                  </View>
                </>
              )}
            </View>


            {/* ========================================== */}
            {/* 2. WEIGHT TREND LINE CHART BLOCK           */}
            {/* ========================================== */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>Weight Trend</Text>

              {diff && (
                <View style={{ backgroundColor: diffNumber < 0 ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: diffNumber < 0 ? "#16A34A" : "#EF4444", fontWeight: 'bold', fontSize: 12 }}>
                    {diffNumber < 0 ? "↓" : "↑"} {Math.abs(diffNumber)} kg
                  </Text>
                </View>
              )}
            </View>

            <View style={{ backgroundColor: colors.card, borderRadius: 16, paddingTop: 20, paddingBottom: 10, paddingRight: 20, marginBottom: 24, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 }}>
              {weights.length < 2 ? (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <Ionicons name="scale-outline" size={48} color={colors.textSecondary + '40'} />
                  <Text style={{ marginTop: 12, color: colors.textSecondary, textAlign: 'center' }}>We need at least 2 weight logs to plot a trend graph.</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={{
                      labels: weightLabels,
                      datasets: [{ data: weights }]
                    }}
                    width={Math.max(screenWidth - 40, weightLabels.length * 60)}
                    height={200}
                  withDots={true}
                  withInnerLines={false}
                  withOuterLines={false}
                  yAxisSuffix=" kg"
                  chartConfig={{
                    backgroundColor: colors.card,
                    backgroundGradientFrom: colors.card,
                    backgroundGradientTo: colors.card,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    propsForDots: {
                      r: "5",
                      strokeWidth: "2",
                      stroke: "#ffffff"
                    }
                  }}
                  bezier
                />
                </ScrollView>
              )}
            </View>

            {/* ========================================== */}
            {/* 3. WEEKLY ACTIVITY BAR CHART BLOCK         */}
            {/* ========================================== */}
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>Activity Intensity</Text>

            <View style={{ backgroundColor: colors.card, borderRadius: 16, paddingTop: 20, paddingBottom: 10, paddingRight: 20, marginBottom: 24, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={{
                    labels: activityLabels,
                    datasets: [{ data: activityData }]
                  }}
                  width={Math.max(screenWidth - 40, activityLabels.length * 60)}
                height={220}
                yAxisLabel=""
                yAxisSuffix="m"
                withInnerLines={false}
                showBarTops={false}
                showValuesOnTopOfBars={true}
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`, // Light blue active color
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  barPercentage: 0.6,
                  fillShadowGradient: "#0EA5E9",
                  fillShadowGradientOpacity: 0.8,
                }}
              />
              </ScrollView>
              <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 13, marginTop: 10, marginBottom: 5 }}>
                Active duration over the last {timeRange === "Week" ? "7" : timeRange === "Month" ? "30" : "90"} days
              </Text>
            </View>

            {/* ========================================== */}
            {/* 4. TOTAL STEPS BAR CHART BLOCK             */}
            {/* ========================================== */}
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>Step Count</Text>

            <View style={{ backgroundColor: colors.card, borderRadius: 16, paddingTop: 20, paddingBottom: 10, paddingRight: 20, marginBottom: 24, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={{
                    labels: stepsLabels,
                    datasets: [{ data: stepsData.length ? stepsData : [0] }]
                  }}
                  width={Math.max(screenWidth - 40, stepsLabels.length * 60)}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                withInnerLines={false}
                showBarTops={false}
                showValuesOnTopOfBars={false} // values too big to fit on top
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Emerald Green
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  barPercentage: 0.6,
                  fillShadowGradient: "#10B981",
                  fillShadowGradientOpacity: 0.8,
                }}
              />
              </ScrollView>
            </View>

            {/* ========================================== */}
            {/* 5. DISTANCE LINE CHART BLOCK               */}
            {/* ========================================== */}
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>Distance Covered</Text>

            <View style={{ backgroundColor: colors.card, borderRadius: 16, paddingTop: 20, paddingBottom: 10, paddingRight: 20, marginBottom: 24, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={{
                    labels: distanceLabels,
                    datasets: [{ data: distanceData.length ? distanceData : [0] }]
                  }}
                  width={Math.max(screenWidth - 40, distanceLabels.length * 60)}
                height={200}
                withDots={true}
                withInnerLines={false}
                withOuterLines={false}
                yAxisSuffix=" km"
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`, // Amber Orange
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: "#ffffff"
                  }
                }}
                bezier
              />
            </ScrollView>
          </View>

          </View>
        )}

      </ScrollView>
    </View>
  );
}