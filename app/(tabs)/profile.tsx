import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { auth, db } from "../../services/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { colors } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getHistoricalWeight, insertWeight } from "../../services/health";
import ChartCard from "../../components/ChartCard";
import Animated, { FadeInDown, FadeInUp, withSpring, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [goal, setGoal] = useState("");
  const [targetWeight, setTargetWeight] = useState("");

  // Prediction State
  const [predictionData, setPredictionData] = useState<number[]>([]);
  const [predictionLabels, setPredictionLabels] = useState<string[]>([]);
  const [daysToTarget, setDaysToTarget] = useState<number | null>(null);

  // BMI Calculation
  const w = Number(weight);
  const h = Number(height) / 100; // cm to meters
  const bmi = (w > 0 && h > 0) ? (w / (h * h)).toFixed(1) : null;

  let bmiCategory = "";
  let bmiColor = colors.textSecondary;
  if (bmi) {
    const b = Number(bmi);
    if (b < 18.5) { bmiCategory = "Underweight"; bmiColor = "#3B82F6"; }
    else if (b < 25) { bmiCategory = "Healthy"; bmiColor = "#22C55E"; }
    else if (b < 30) { bmiCategory = "Overweight"; bmiColor = "#F59E0B"; }
    else { bmiCategory = "Obese"; bmiColor = "#EF4444"; }
  }

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        const user = auth.currentUser;
        if (!user) return;
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data: any = snap.data();
          setProfile(data);
          setName(data.name || "");
          setWeight(String(data.weight || ""));
          setHeight(String(data.height || ""));
          setAge(String(data.age || ""));
          setTargetWeight(String(data.targetWeight || ""));
          setGoal(data.goal || "");
        }
      };
      loadProfile();
    }, [])
  );

  // Prediction Logic
  useEffect(() => {
    const loadPrediction = async () => {
      const user = auth.currentUser;
      if (!user || !targetWeight || isNaN(Number(targetWeight))) {
        setPredictionData([]);
        setDaysToTarget(null);
        return;
      }
      const tWeight = Number(targetWeight);

      // 1. Fetch from Health Connect
      const hcData = await getHistoricalWeight(14);

      // 2. Fetch from Firebase
      const wQuery = query(collection(db, "weight_logs"), where("userId", "==", user.uid), orderBy("date", "desc"), limit(14));
      const wSnap = await getDocs(wQuery);

      // 3. Merge
      const mergedMap = new Map<string, number>();
      hcData.forEach(d => { if (d.value > 0) mergedMap.set(d.date, d.value); });

      wSnap.docs.forEach(doc => {
        const data = doc.data();
        const date = data.date?.toDate ? data.date.toDate() : new Date();
        const rawWeight = Number(data.weight);
        if (!isNaN(rawWeight) && rawWeight < 400 && rawWeight >= 20) {
          const dStr = date.toISOString().split('T')[0];
          mergedMap.set(dStr, rawWeight);
        }
      });

      // Convert back to sorted array (newest first)
      const combined = Array.from(mergedMap.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const validHistory = combined.slice(0, 10);

      if (validHistory.length >= 2 && tWeight > 0) {
        const oldest = validHistory[validHistory.length - 1];
        const newest = validHistory[0];

        const dtOld = new Date(oldest.date).getTime();
        const dtNew = new Date(newest.date).getTime();
        const daysDiff = Math.max(1, (dtNew - dtOld) / (1000 * 60 * 60 * 24));

        const dailyDelta = (newest.value - oldest.value) / daysDiff;
        const needsToLose = tWeight < newest.value;
        const makingProgress = needsToLose ? dailyDelta < 0 : dailyDelta > 0;

        if (makingProgress || dailyDelta === 0) {
          const safeDelta = dailyDelta === 0 ? (needsToLose ? -0.01 : 0.01) : dailyDelta;
          const weightDiff = tWeight - newest.value;
          const daysReq = Math.ceil(weightDiff / safeDelta);

          if (daysReq > 0 && daysReq < 365 * 3) {
            const targetDate = new Date(dtNew + daysReq * 24 * 60 * 60 * 1000);

            // Reverse history to show chronological order (oldest to newest)
            const chronologicalHistory = [...validHistory].reverse();

            const pLabels = chronologicalHistory.map(h => {
              const d = new Date(h.date);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            });
            pLabels.push(`Target\n${targetDate.getMonth() + 1}/${targetDate.getDate()}`);

            const pData = chronologicalHistory.map(h => h.value);
            pData.push(tWeight);

            setPredictionData(pData);
            setPredictionLabels(pLabels);
            setDaysToTarget(daysReq);
          } else {
            setPredictionData([]); setDaysToTarget(null);
          }
        } else { setPredictionData([]); setDaysToTarget(null); }
      } else { setPredictionData([]); setDaysToTarget(null); }
    };
    loadPrediction();
  }, [targetWeight, weight]);

  const saveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const w = Number(weight);

    await updateDoc(doc(db, "users", user.uid), {
      name,
      weight: w,
      height: Number(height),
      age: Number(age),
      targetWeight: Number(targetWeight),
      goal
    });

    // Also sync the explicitly typed weight into Health Connect
    if (w > 0) {
      await insertWeight(w);
      // Also log to weight_logs collection for history
      await addDoc(collection(db, "weight_logs"), {
        userId: user.uid,
        weight: w,
        date: serverTimestamp()
      });
    }

    setEditMode(false);
  };

  const logout = async () => {
    await signOut(auth);
    router.replace("../login");
  };

  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <Text style={{ fontSize: 16, color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Header section with gradient */}
      <Animated.View entering={FadeInDown.delay(100).duration(600).springify()} style={styles.headerContainer}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative Blur Circles */}
          <View style={styles.blurCircle1} />
          <View style={styles.blurCircle2} />

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{name?.charAt(0)?.toUpperCase() || "U"}</Text>
            </View>
            <Text style={styles.userName}>{name || "User"}</Text>
            <Text style={styles.userEmail}>{auth.currentUser?.email}</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.contentContainer}>

        {/* Health Overview Card */}
        <Animated.View entering={FadeInUp.delay(300).duration(600).springify()} style={styles.card}>
          <Text style={styles.cardTitle}>Health Overview</Text>

          <View style={styles.bmiContainer}>
            <View style={styles.bmiStats}>
              <Text style={styles.bmiLabel}>Body Mass Index (BMI)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.bmiValue}>{bmi || "--"}</Text>
                {bmi && <Text style={[styles.bmiCategory, { color: bmiColor }]}>{bmiCategory}</Text>}
              </View>
            </View>

            {bmi && (
              <View style={[styles.bmiBadge, { backgroundColor: bmiColor + "15" }]}>
                <Ionicons
                  name={bmiCategory === "Healthy" ? "checkmark-circle" : "warning"}
                  size={24}
                  color={bmiColor}
                />
              </View>
            )}
          </View>
          {(!height || !weight) && (
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8, fontStyle: 'italic' }}>
              Add your height and weight to calculate your BMI.
            </Text>
          )}
        </Animated.View>

        {/* Prediction Chart */}
        {predictionData.length > 0 && daysToTarget !== null && (
          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={{ marginBottom: 20 }}>
            <ChartCard
              title="Target Completion Forecast"
              labels={predictionLabels}
              data={predictionData}
            >
              <Text style={{ textAlign: 'center', color: '#64748B', fontSize: 13, marginTop: 10, paddingHorizontal: 10 }}>
                Based on your recent progress, it will take about <Text style={{ fontWeight: "bold", color: colors.primary }}>{daysToTarget} days</Text> to reach your target of {targetWeight}kg!
              </Text>
            </ChartCard>
          </Animated.View>
        )}

        {/* Profile Details Card */}
        <Animated.View entering={FadeInUp.delay(400).duration(600).springify()} style={styles.card}>
          <Text style={styles.cardTitle}>Personal Details</Text>
          <ProfileField
            icon="person-outline"
            label="Name"
            value={name}
            setValue={setName}
            editable={editMode}
          />
          <ProfileField
            icon="barbell-outline"
            label="Weight (kg)"
            value={weight}
            setValue={setWeight}
            editable={editMode}
            keyboardType="numeric"
          />
          <ProfileField
            icon="body-outline"
            label="Height (cm)"
            value={height}
            setValue={setHeight}
            editable={editMode}
            keyboardType="numeric"
          />
          <ProfileField
            icon="flag-outline"
            label="Target Weight (kg)"
            value={targetWeight}
            setValue={setTargetWeight}
            editable={editMode}
            keyboardType="numeric"
          />
          <ProfileField
            icon="calendar-outline"
            label="Age"
            value={age}
            setValue={setAge}
            editable={editMode}
            keyboardType="numeric"
          />
          <ProfileField
            icon="flag-outline"
            label="Goal"
            value={goal}
            setValue={setGoal}
            editable={editMode}
          />
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {!editMode ? (
            <AnimatedButton
              onPress={() => setEditMode(true)}
              colors={[colors.secondary, "#1976D2"]}
              icon="pencil"
              label="Edit Profile"
              containerStyle={styles.editButton}
            />
          ) : (
            <AnimatedButton
              onPress={saveProfile}
              colors={["#22C55E", "#16A34A"]}
              icon="checkmark-circle"
              label="Save Changes"
              containerStyle={styles.saveButton}
            />
          )}

          <AnimatedButton
            onPress={logout}
            colors={["transparent", "transparent"]}
            icon="log-out-outline"
            label="Log Out"
            containerStyle={styles.logoutButton}
            iconColor={colors.danger}
            labelColor={colors.danger}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function ProfileField({ icon, label, value, setValue, editable, keyboardType = "default" }: any) {
  return (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldLabelRow}>
        <Ionicons name={icon} size={18} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <TextInput
        value={value}
        editable={editable}
        onChangeText={setValue}
        keyboardType={keyboardType}
        style={[
          styles.fieldInput,
          editable ? styles.fieldInputEditable : styles.fieldInputReadOnly
        ]}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

function AnimatedButton({ onPress, colors: bgColors, icon, label, containerStyle, iconColor = "#FFF", labelColor = "#FFF" }: any) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Pressable
      onPressIn={() => scale.value = withSpring(0.95)}
      onPressOut={() => scale.value = withSpring(1)}
      onPress={onPress}
      style={containerStyle}
    >
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={bgColors}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name={icon} size={20} color={iconColor} style={styles.btnIcon} />
          <Text style={[styles.buttonText, { color: labelColor }]}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    marginBottom: 25,
  },
  headerGradient: {
    paddingTop: 70,
    paddingBottom: 45,
    paddingHorizontal: 25,
    position: 'relative',
  },
  blurCircle1: {
    position: 'absolute',
    top: -50,
    right: -20,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  blurCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -40,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerContent: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 25,
    alignSelf: "flex-start",
  },
  avatarContainer: {
    width: 105,
    height: 105,
    borderRadius: 52.5,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarText: {
    color: "#FFF",
    fontSize: 42,
    fontWeight: "bold",
  },
  userName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 22,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  fieldInput: {
    fontSize: 16,
    color: colors.text,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  fieldInputReadOnly: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "transparent",
  },
  fieldInputEditable: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionsContainer: {
    gap: 16,
  },
  editButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  btnIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  logoutText: {
    color: colors.danger,
    fontSize: 17,
    fontWeight: "bold",
  },
  bmiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  bmiStats: {
    flex: 1,
  },
  bmiLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: "500",
  },
  bmiValue: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    marginRight: 12,
  },
  bmiCategory: {
    fontSize: 15,
    fontWeight: "700",
  },
  bmiBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  }
});