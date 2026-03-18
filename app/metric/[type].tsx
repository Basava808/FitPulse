import { useEffect, useState } from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
import { colors } from "@/constants/colors";
import { getHistoricalData, getLatestHeartRate } from "@/services/health";

export default function MetricDetail() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const [data, setData] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controls
  const [timeRange, setTimeRange] = useState<"Week" | "Month" | "All data">("Week");

  const config = {
    steps: { recordType: "Steps", title: "Steps", unit: "steps", color: "#2563EB" },
    calories: { recordType: "TotalCaloriesBurned", title: "Calories burnt", unit: "kcal", color: "#2563EB" },
    distance: { recordType: "Distance", title: "Distance", unit: "km", color: "#2563EB" },
    heartRate: { recordType: "HeartRate", title: "Heart Rate", unit: "bpm", color: "#2563EB" },
  }[type || "steps"] || { recordType: "Steps", title: "Metric", unit: "", color: "#2563EB" };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const daysToFetch = timeRange === "Month" ? 30 : timeRange === "All data" ? 90 : 7;
        
        if (type === "heartRate") {
          const hr = await getLatestHeartRate();
          const mock = Array.from({length: daysToFetch}).map((_, i) => {
             const d = new Date();
             d.setDate(d.getDate() - ((daysToFetch - 1) - i));
             return { date: d.toISOString().split('T')[0], value: hr ? Math.round(hr + (Math.random()*10 - 5)) : 72 }
          });
          setData(mock);
        } else {
          const recordType = config.recordType as "Steps" | "TotalCaloriesBurned" | "Distance";
          const hist = await getHistoricalData(recordType, daysToFetch);
          setData(hist);
        }
      } catch (err) {
        console.warn("Detail fetch error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type, timeRange]);

  const screenWidth = Dimensions.get("window").width;
  
  const totalThisWeek = data.reduce((sum, d) => sum + d.value, 0);

  const formatDateRange = () => {
     if (data.length === 0) return "";
     const start = new Date(data[0].date);
     const end = new Date(data[data.length - 1].date);
     const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
     return `${start.toLocaleDateString('en-GB', opts)} - ${end.toLocaleDateString('en-GB', opts)}`;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 20 }}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={{ fontSize: 24, color: "#000", fontWeight: "400" }}>{config.title}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Segmented Control */}
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

        {/* Date Range Selector */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 }}>
           <TouchableOpacity>
             <Ionicons name="chevron-back" size={24} color="#374151" />
           </TouchableOpacity>
           <Text style={{ fontSize: 16, color: "#111827", fontWeight: "400" }}>
             {loading ? "..." : formatDateRange()}
           </Text>
           <TouchableOpacity>
             <Ionicons name="scan-outline" size={24} color="#374151" />
           </TouchableOpacity>
        </View>

        {/* Chart */}
        {loading ? (
           <View style={{ height: 260, justifyContent: 'center' }}>
               <ActivityIndicator size="large" color={config.color} />
           </View>
        ) : (
           <View style={{ marginBottom: 20, marginLeft: -10 }}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false}>
               <BarChart
                 data={{
                   labels: data.map((h, i) => {
                     const d = new Date(h.date);
                     if (timeRange === "Week") {
                       return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
                     } else if (timeRange === "Month") {
                       return i % 5 === 0 ? d.getDate().toString() : "";
                     } else {
                       return i % 15 === 0 ? d.toLocaleDateString('en-US', { month: 'short' }) : "";
                     }
                   }),
                   datasets: [{ data: data.map(h => h.value) }]
                 }}
                 width={Math.max(screenWidth + 10, data.length * 50)}
                 height={260}
                 yAxisLabel=""
                 yAxisSuffix=""
                 fromZero={true}
                 chartConfig={{
                   backgroundColor: "#FFFFFF",
                   backgroundGradientFrom: "#FFFFFF",
                   backgroundGradientTo: "#FFFFFF",
                   decimalPlaces: config.unit === 'km' ? 1 : 0,
                   color: (opacity = 1) => config.color,
                   labelColor: (opacity = 1) => "#9CA3AF",
                   style: { borderRadius: 0 },
                   barPercentage: 0.25, // Slim bars like mockup
                   propsForBackgroundLines: {
                     strokeDasharray: "", 
                     strokeWidth: 1,
                     stroke: "#F3F4F6"
                   },
                   formatYLabel: (yVal) => {
                       // Try to format large numbers with commas if needed
                       const num = parseInt(yVal);
                       return !isNaN(num) ? num.toLocaleString() : yVal;
                   }
                 }}
                 style={{ paddingRight: 0 }}
                 showValuesOnTopOfBars={false}
                 withInnerLines={true}
                 segments={4}
               />
             </ScrollView>
           </View>
        )}

        {/* Summary Header */}
        <View style={{ backgroundColor: "#F9FAFB", paddingVertical: 18, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#F3F4F6", marginBottom: 24 }}>
            <Text style={{ fontSize: 18, color: "#111827", fontWeight: "400" }}>
               {timeRange === "Week" ? "This week" : timeRange === "Month" ? "This month" : "All data"}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "500", color: "#111827" }}>
               {loading ? "..." : totalThisWeek.toFixed(config.unit === 'km' ? 2 : 0)} 
               <Text style={{ fontSize: 15, fontWeight: "400", color: "#4B5563" }}> {config.unit}</Text>
            </Text>
        </View>

        {/* Daily Data Cards */}
        <View style={{ paddingHorizontal: 20 }}>
           {data.slice().reverse().map((d, i) => {
              const dateObj = new Date(d.date);
              const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dateObj.getDay()];
              const displayVal = d.value.toFixed(config.unit === 'km' ? 2 : 0);

              // Don't render empty cards to keep it clean (or render if 0 is important to track)
              // We'll render all to match the 7-day flow.
              return (
                <View key={i} style={{ 
                    borderWidth: 1, 
                    borderColor: "#E5E7EB", 
                    borderRadius: 12, 
                    padding: 18, 
                    marginBottom: 16,
                    backgroundColor: "white",
                    // Subtle shadow to give it that lifted card feel without being heavy
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1
                }}>
                    <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 10, fontWeight: "400" }}>
                       {dayName}, 09:10 am · Google Fit
                    </Text>
                    <Text style={{ color: "#111827", fontSize: 22, fontWeight: "500" }}>
                       {displayVal} <Text style={{ fontSize: 15, color: "#6B7280", fontWeight: "400" }}>{config.unit}</Text>
                    </Text>
                </View>
              )
           })}
        </View>

      </ScrollView>
    </View>
  );
}
