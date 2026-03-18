import { router } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  RefreshControl
} from "react-native";

import { useEffect, useState } from "react";
import { Alert } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Dimensions } from "react-native";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebase";

import DashboardCard from "@/components/DashboardCard";
import QuickAction from "@/components/ui/QuickAction";
import { colors } from "@/constants/colors";

import {
  initHealth,
  requestHealthPermissions,
  checkHealthPermissions,
  getHistoricalData,
  getRecentExerciseSessions,
  getTodayDistance,
  getLatestHeartRate,
  insertMockData
} from "@/services/health";

export default function Dashboard() {

  // Historical Arrays
  const [stepsHistory, setStepsHistory] = useState<{ date: string; value: number }[]>([]);
  const [caloriesHistory, setCaloriesHistory] = useState<{ date: string; value: number }[]>([]);

  // Unified activities feed
  const [unifiedActivities, setUnifiedActivities] = useState<any[]>([]);

  // Single metrics
  const [distance, setDistance] = useState(0);
  const [heartRate, setHeartRate] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [caloriesEaten, setCaloriesEaten] = useState(0);
  const [userName, setUserName] = useState("");

  const [healthAvailable, setHealthAvailable] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Get today's calories burned from the last item in the 7-day array
  const todayCaloriesBurned = caloriesHistory.length > 0 ? caloriesHistory[caloriesHistory.length - 1].value : 0;
  const deficit = Math.round(todayCaloriesBurned - caloriesEaten);

  const loadHealthData = async () => {

    try {

      const [stepsArr, calArr, dist, hr, activities] = await Promise.all([
        getHistoricalData("Steps", 7),
        getHistoricalData("TotalCaloriesBurned", 7),
        getTodayDistance(),
        getLatestHeartRate(),
        getRecentExerciseSessions(7)
      ]);

      // 2. Fetch Calories Eaten Today (Firebase)
      const user = auth.currentUser;
      if (user) {
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
      }

      // 3. Fetch User Profile
      if (user) {
        const uSnap = await getDoc(doc(db, "users", user.uid));
        if (uSnap.exists()) {
          setUserName(uSnap.data().name || "");
        }
      }

      // 4. Fetch Food Logs (Firebase)
      let meals: any[] = [];
      if (user) {
        const fQuery = query(collection(db, "food_logs"), where("userId", "==", user.uid));
        const fSnap = await getDocs(fQuery);
        fSnap.forEach(doc => {
          const d = doc.data();
          meals.push({
            id: doc.id,
            type: 'food',
            title: d.foodName || 'Meal',
            subtitle: d.mealType || 'Nutrition',
            value: `${d.calories} kcal`,
            timestamp: d.date?.toDate ? d.date.toDate().getTime() : 0,
            icon: 'fast-food'
          });
        });
      }

      // 5. Fetch Weight Logs (Firebase)
      let weightLogs: any[] = [];
      if (user) {
        const wQuery = query(collection(db, "weight_logs"), where("userId", "==", user.uid));
        const wSnap = await getDocs(wQuery);
        wSnap.forEach(doc => {
          const d = doc.data();
          weightLogs.push({
            id: doc.id,
            type: 'weight',
            title: 'Weight Logged',
            subtitle: 'Body Weight',
            value: `${d.weight} kg`,
            timestamp: d.date?.toDate ? d.date.toDate().getTime() : 0,
            icon: 'scale'
          });
        });
      }

      // Normalize Exercise Sessions
      const normalizedExercises = activities.map((act: any) => ({
        id: act.id,
        type: 'exercise',
        title: act.title,
        subtitle: 'Exercise',
        value: `${act.durationMinutes} min`,
        timestamp: new Date(act.startTime).getTime(),
        icon: act.title === "Running" ? "walk" : (act.title === "Walking" ? "walk-outline" : "barbell")
      }));

      // Merge and Sort
      const combined = [...normalizedExercises, ...meals, ...weightLogs]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10); // Show top 10 recent items

      setUnifiedActivities(combined);

      console.log(`[HealthData] Fetched 7-day data. Steps Array Length: ${stepsArr.length}, Combined Activities: ${combined.length}`);

      setStepsHistory(stepsArr);
      setCaloriesHistory(calArr);
      setDistance(parseFloat(dist.toFixed(2)));
      setHeartRate(hr);

    } catch (err) {

      console.warn("Health load error:", err);

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  };

  useEffect(() => {
    const setup = async () => {
      try {
        const initialized = await initHealth();
        setHealthAvailable(initialized);

        if (!initialized) {
          setLoading(false);
          Alert.alert("Health Connect Not Available", "Initialization failed.");
          return;
        }

        const hasPermissions = await checkHealthPermissions();
        setPermissionsGranted(hasPermissions);

        if (hasPermissions) {
          await loadHealthData();
        } else {
          setLoading(false);
        }
      } catch (err: any) {
        setLoading(false);
        Alert.alert("Error", err.message || "An error occurred during setup.");
      }
    };

    setup();
  }, []);

  const handleConnectHealth = async () => {

    try {
      await requestHealthPermissions();

      const hasPermissions = await checkHealthPermissions();
      console.log('hasPermissions', hasPermissions);
      setPermissionsGranted(hasPermissions);

      if (hasPermissions) {
        await loadHealthData();
      }
    } catch (err: any) {
      Alert.alert("Permission Error", err.message || "Unknown error occurred.");
    }

  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHealthData();
  };

  const getHeaderConfig = () => {
    const hour = new Date().getHours();

    let config: {
      greeting: string;
      icon: string;
      iconColor: string;
      colors: [string, string];
      subtitleColor: string;
    };

    if (hour >= 5 && hour < 12) {
      config = {
        greeting: "Good Morning",
        icon: "sunny",
        iconColor: "#FFD700", // Gold/Yellow Sun
        colors: ["#FF914D", "#FFBC11"], // Sunrise Orange/Yellow
        subtitleColor: "rgba(255,255,255,0.8)"
      };
    } else if (hour >= 12 && hour < 17) {
      config = {
        greeting: "Good Afternoon",
        icon: "sunny",
        iconColor: "#FFD700", // Gold/Yellow Sun
        colors: ["#4FACFE", "#00F2FE"], // Vibrant Sky Blue
        subtitleColor: "rgba(255,255,255,0.9)"
      };
    } else if (hour >= 17 && hour < 21) {
      config = {
        greeting: "Good Evening",
        icon: "cloudy-night",
        iconColor: "#E0E0E0", // Silver/Light Grey
        colors: ["#667EEA", "#764BA2"], // Sunset Purple/Indigo
        subtitleColor: "rgba(255,255,255,0.8)"
      };
    } else {
      config = {
        greeting: "Good Night",
        icon: "moon",
        iconColor: "#FFFFFF", // White Moon
        colors: ["#243B55", "#141E30"], // Midnight Deep Blue
        subtitleColor: "rgba(255,255,255,0.7)"
      };
    }
    return config;
  };

  const headerConfig = getHeaderConfig();

  return (

    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header with Dynamic Gradient */}
      <LinearGradient
        colors={headerConfig.colors}
        style={{
          paddingTop: 60,
          paddingBottom: 30,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          marginBottom: 20,
          overflow: 'hidden',
          position: 'relative'
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative elements */}
        <View style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' }} />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 16, color: headerConfig.subtitleColor, fontWeight: '500' }}>
                {headerConfig.greeting},
              </Text>
            </View>
            <Text style={{ fontSize: 32, fontWeight: "800", color: "#FFF", letterSpacing: 0.5 }}>
              {userName || "Ready to train?"}
            </Text>
          </View>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
            <Ionicons name={headerConfig.icon as any} size={28} color={headerConfig.iconColor} />
          </View>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 20 }}>
        {/* Health Connect Section */}

        {!healthAvailable && (

          <View style={{
            backgroundColor: colors.card,
            padding: 20,
            borderRadius: 16,
            marginBottom: 20
          }}>
            <Text style={{ color: colors.textSecondary }}>
              Health Connect not available on this device
            </Text>
          </View>

        )}

        {healthAvailable && !permissionsGranted && (
          <LinearGradient
            colors={['#1E88E5', '#1565C0']}
            style={{
              padding: 24,
              borderRadius: 20,
              marginBottom: 24,
              alignItems: "center",
              shadowColor: colors.secondary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="fitness" size={40} color="white" style={{ marginBottom: 12 }} />
            <Text style={{
              color: "rgba(255,255,255,0.9)",
              marginBottom: 16,
              textAlign: "center",
              fontSize: 15,
              lineHeight: 22
            }}>
              Connect Health data to track your activity. Tap below to securely authorize permissions.
            </Text>

            <TouchableOpacity
              onPress={handleConnectHealth}
              style={{
                backgroundColor: "white",
                paddingHorizontal: 24,
                paddingVertical: 14,
                borderRadius: 30,
                width: '100%',
                alignItems: 'center'
              }}
            >
              <Text style={{ color: colors.secondary, fontWeight: "bold", fontSize: 16 }}>
                Authorize Connection
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* {permissionsGranted && (
        <LinearGradient
          colors={['#8E2DE2', '#4A00E0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            padding: 20,
            borderRadius: 20,
            marginBottom: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#4A00E0',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
              Developer Tools
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
              Inject mock data into Health Connect to preview the UI.
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={async () => {
              const ok = await insertMockData();
              if (ok) {
                Alert.alert("Success", "Injected 5000 steps and 300 calories. Pull down to refresh!");
              } else {
                Alert.alert("Error", "Failed to inject data");
              }
            }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 30,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.4)'
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>Inject Data</Text>
          </TouchableOpacity>
        </LinearGradient>
      )} */}

        {/* Health Stats */}

        {permissionsGranted && (

          <View style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            marginTop: 8
          }}>

            <DashboardCard
              title="Today's Steps"
              value={loading ? "..." : (stepsHistory.length > 0 ? stepsHistory[stepsHistory.length - 1].value : 0)}
              icon="footsteps"
              color={colors.steps}
              onPress={() => router.push("/metric/steps")}
            />

            <DashboardCard
              title="Today's Calories"
              value={loading ? "..." : `${todayCaloriesBurned} kcal`}
              icon="flame"
              color={colors.calories}
              onPress={() => router.push("/metric/calories")}
            />

            <DashboardCard
              title="Distance"
              value={loading ? "..." : `${distance} km`}
              icon="map"
              color={colors.distance}
              onPress={() => router.push("/metric/distance")}
            />

            <DashboardCard
              title="Heart Rate"
              value={loading ? "..." : heartRate ? `${heartRate} bpm` : "--"}
              icon="heart"
              color={colors.heartRate}
              onPress={() => router.push("/metric/heartRate")}
            />

          </View>

        )}

        {/* Nutrition */}

        <Text style={{
          fontSize: 18,
          fontWeight: "bold",
          marginTop: 25,
          marginBottom: 10
        }}>
          Nutrition
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>

          <DashboardCard
            title="Calories Eaten"
            value={`${caloriesEaten} kcal`}
            icon="pizza"
            color={colors.warning}
            onPress={() => router.push("/food")}
          />

          <DashboardCard
            title="Daily Deficit"
            value={`${deficit} kcal`}
            icon="trending-down"
            color={colors.success}
            onPress={() => router.push("/food")}
          />

        </View>

        {/* Quick Actions */}

        <Text style={{
          fontSize: 18,
          fontWeight: "bold",
          marginTop: 25,
          marginBottom: 10
        }}>
          Quick Actions
        </Text>

        <View style={{ flexDirection: "row" }}>

          <QuickAction
            icon="fast-food-outline"
            label="Food"
            onPress={() => router.push("/food")}
          />

          <QuickAction
            icon="barbell-outline"
            label="Activity"
            onPress={() => router.push("/activity")}
          />

          <QuickAction
            icon="scale-outline"
            label="Weight"
            onPress={() => router.push("/weight")}
          />

        </View>

        {/* Activity Preview */}

        <Text style={{
          fontSize: 18,
          fontWeight: "bold",
          marginTop: 25,
          marginBottom: 10
        }}>
          Recent Activities
        </Text>

        <View style={{ marginBottom: 30 }}>
          {unifiedActivities.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 10 }}>No recent records found.</Text>
          ) : (
            unifiedActivities.map((act) => (
              <TouchableOpacity
                key={act.id + act.type}
                onPress={() => {
                  if (act.type === 'exercise') router.push(`/activity/${act.id}`);
                  else if (act.type === 'food') router.push("/food");
                  else if (act.type === 'weight') router.push("/weight");
                }}
                style={{
                  backgroundColor: colors.card,
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 2
                }}
              >
                <View style={{
                  backgroundColor: (act.type === 'food' ? colors.warning : act.type === 'weight' ? colors.secondary : colors.primary) + '20',
                  padding: 10,
                  borderRadius: 12,
                  marginRight: 12
                }}>
                  <Ionicons name={act.icon} size={24} color={act.type === 'food' ? colors.warning : act.type === 'weight' ? colors.secondary : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>{act.title}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    {new Date(act.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} • {act.subtitle}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: act.type === 'food' ? colors.warning : act.type === 'weight' ? colors.secondary : colors.primary }}>
                  {act.value}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

    </ScrollView>

  );

}