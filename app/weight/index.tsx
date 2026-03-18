import { useState, useCallback, useEffect } from "react";
import { View, Text, FlatList, Pressable, TextInput, ScrollView, StyleSheet, Dimensions, Platform } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { auth, db } from "../../services/firebase";
import { doc, updateDoc, collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { getHistoricalWeight, insertWeight } from "../../services/health";
import ChartCard from "../../components/ChartCard";
import { colors } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp, Layout, useAnimatedStyle, withSpring, useSharedValue } from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function WeightScreen() {
  const router = useRouter();
  const [weights, setWeights] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [loading, setLoading] = useState(true);

  // Animation values for the save button
  const buttonScale = useSharedValue(1);

  const loadWeights = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) return;

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

    // Convert back to sorted array
    const combined = Array.from(mergedMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const validHistory = combined.slice(0, 10);
    const chronData = [...combined].reverse();
    
    setWeights(chronData.map(d => d.value));
    setLabels(chronData.map(d => {
      const parts = d.date.split("-");
      return `${parts[1]}/${parts[2]}`; // MM/DD
    }));
    
    setHistory(validHistory.map((d, index) => ({
      id: d.date + "_" + d.value + "_" + index, // unique ID guarantees flatlist re-render
      weight: d.value.toFixed(1),
      date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    })));
    
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadWeights();
    }, [])
  );

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

  const saveWeight = async () => {
    const w = Number(weightInput);
    if (!weightInput || isNaN(w) || w <= 0) return;

    const success = await insertWeight(w);
    if (success) {
      setWeightInput("");
      
      // Delay fetching by ~800ms to allow Health Connect to index the new write
      setTimeout(() => {
        loadWeights();
      }, 800);
      
      // Keep Firebase user profile in sync
      const user = auth.currentUser;
      if (user) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            weight: w
          });
          // Also log to weight_logs collection for history
          await addDoc(collection(db, "weight_logs"), {
            userId: user.uid,
            weight: w,
            date: serverTimestamp()
          });
        } catch(e) { console.log("Failed to sync weight to Firebase"); }
      }
    }
  };

  const currentWeight = history.length ? history[0].weight : "--";
  const previousWeight = history.length > 1 ? history[1].weight : null;

  const weightChange = previousWeight !== null ? (Number(currentWeight) - Number(previousWeight)).toFixed(1) : null;
  const isGain = Number(weightChange) > 0;
  const isLoss = Number(weightChange) < 0;
  const trendColor = isGain ? "#EF4444" : isLoss ? colors.primary : colors.secondary; 
  const trendIcon = isGain ? "trending-up" : isLoss ? "trending-down" : "remove";

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Dynamic Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Soft decorative circles */}
            <View style={styles.headerCircle1} />
            <View style={styles.headerCircle2} />

            <View style={styles.headerTop}>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </Pressable>
              <View style={styles.headerIconWrapper}>
                <Ionicons name="barbell" size={20} color={colors.primaryDark} />
              </View>
            </View>

            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Body Weight</Text>
              <Text style={styles.headerSubtitle}>Synced with Health Connect</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.contentContainer}>
          
          {/* Current Weight Highlights */}
          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={styles.heroCard}>
            <Text style={styles.heroCardLabel}>LATEST RECORDING</Text>
            <View style={styles.mainWeightRow}>
              <Text style={styles.mainWeightValue}>{currentWeight}</Text>
              <Text style={styles.mainWeightUnit}>kg</Text>
            </View>

            {weightChange && (
              <View style={[styles.trendPill, { backgroundColor: trendColor + "15" }]}>
                <Ionicons name={trendIcon} size={18} color={trendColor} style={{ marginRight: 6 }} />
                <Text style={[styles.trendText, { color: trendColor }]}>
                  {Math.abs(Number(weightChange))} kg {isGain ? "gain" : isLoss ? "loss" : "change"} since last entry
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Quick Input Card */}
          <Animated.View entering={FadeInDown.delay(300).duration(600).springify()} style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Ionicons name="add-circle" size={22} color={colors.primary} />
              <Text style={styles.inputCardTitle}>Log New Weight</Text>
            </View>
            
            <View style={styles.inputRow}>
              <View style={styles.minimalInputWrapper}>
                <TextInput
                  placeholder="0.0"
                  value={weightInput}
                  onChangeText={setWeightInput}
                  keyboardType="decimal-pad"
                  style={styles.minimalInput}
                  placeholderTextColor="#CBD5E1"
                  maxLength={5}
                />
                <Text style={styles.minimalInputUnit}>kg</Text>
              </View>

              <Pressable 
                onPress={saveWeight} 
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <Animated.View style={[styles.saveActionBox, animatedButtonStyle]}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                    style={styles.saveActionGradient}
                  >
                    <Ionicons name="checkmark" size={28} color="#FFF" />
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            </View>
          </Animated.View>

          {/* Chart Section */}
          {weights.filter(w => w > 0).length > 0 && (
            <Animated.View entering={FadeInDown.delay(400).duration(600).springify()} style={{ marginBottom: 24 }}>
               <ChartCard
                title="14-Day Trajectory"
                labels={labels}
                data={weights}
              />
            </Animated.View>
          )}

          {/* History List */}
          <Animated.View entering={FadeInUp.delay(500).duration(600).springify()}>
            <View style={styles.historyHeaderRow}>
              <Text style={styles.sectionHeader}>History</Text>
              <Text style={styles.sectionSubHeader}>Last 10 entries</Text>
            </View>
            
            {history.length === 0 && !loading && (
              <View style={styles.emptyStateBox}>
                <Ionicons name="folder-open-outline" size={48} color="#E2E8F0" />
                <Text style={styles.emptyStateText}>No recent records found in Health.</Text>
              </View>
            )}

            <Animated.FlatList
              data={history}
              scrollEnabled={false}
              keyExtractor={(item: any) => String(item.id)}
              itemLayoutAnimation={Layout.springify()}
              renderItem={({ item, index }: any) => (
                <Animated.View entering={FadeInUp.delay(600 + (index * 50)).springify()} style={styles.historyListItem}>
                  <View style={styles.historyListLeft}>
                    <View style={styles.historyDateBadge}>
                      <Text style={styles.historyDateMonth}>{item.date.split(" ")[1]}</Text>
                      <Text style={styles.historyDateDay}>{item.date.split(" ")[2]}</Text>
                    </View>
                    <Text style={styles.historyDateFull}>{item.date.split(" ")[0]}</Text>
                  </View>
                  <View style={styles.historyListRight}>
                    <Text style={styles.historyListWeight}>{item.weight}</Text>
                    <Text style={styles.historyListUnit}>kg</Text>
                  </View>
                </Animated.View>
              )}
            />
          </Animated.View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 24,
  },
  headerCircle1: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerCircle2: {
    position: 'absolute',
    bottom: -60,
    left: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: {
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  heroCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
    marginBottom: 24,
  },
  heroCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  mainWeightRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: 16,
  },
  mainWeightValue: {
    fontSize: 64,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -1,
  },
  mainWeightUnit: {
    fontSize: 24,
    fontWeight: "700",
    color: "#64748B",
    marginLeft: 8,
  },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  trendText: {
    fontWeight: "700",
    fontSize: 15,
  },
  inputCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 3,
    marginBottom: 28,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  inputCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  minimalInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 70,
  },
  minimalInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
    height: '100%',
  },
  minimalInputUnit: {
    fontSize: 20,
    fontWeight: "600",
    color: "#94A3B8",
    marginLeft: 8,
  },
  saveActionBox: {
    width: 70,
    height: 70,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveActionGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  historyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 16,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  emptyStateBox: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F1F5F9",
    borderStyle: "dashed",
    marginTop: 10,
  },
  emptyStateText: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 12,
  },
  historyListItem: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#F8FAFC",
  },
  historyListLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyDateBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    marginRight: 16,
    width: 54,
  },
  historyDateMonth: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  historyDateDay: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  historyDateFull: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },
  historyListRight: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  historyListWeight: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  historyListUnit: {
    fontSize: 15,
    fontWeight: "600",
    color: "#94A3B8",
    marginLeft: 4,
  },
});