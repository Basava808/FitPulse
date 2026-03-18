import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { LineChart } from "react-native-chart-kit";
import Animated, { FadeIn } from "react-native-reanimated";

interface ChartCardProps {
  title: string;
  labels: string[];
  data: number[];
  color?: string;
  prefix?: string;
  suffix?: string;
  children?: React.ReactNode;
}

const { width } = Dimensions.get("window");

export default function ChartCard({
  title,
  labels,
  data,
  color = "#8B5CF6", // Default to the violet premium color
  prefix = "",
  suffix = "",
  children
}: ChartCardProps) {
  
  // If we don't have enough data, don't crash
  if (!data || data.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.chartContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={{
              labels: labels.length > 0 
                ? labels 
                : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
              datasets: [
                {
                  data: data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0],
                },
              ],
            }}
            width={Math.max(width - 80, labels.length * 60)} // Dynamic width based on labels
            height={200}
            yAxisLabel={prefix}
            yAxisSuffix={suffix}
            yAxisInterval={1}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            bezier
            fromZero={false}
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 1,
              color: (opacity = 1) => color,
              labelColor: (opacity = 1) => "#94A3B8",
              strokeWidth: 3,
              propsForDots: {
                r: "5",
                strokeWidth: "3",
                stroke: "#FFFFFF",
                fill: color,
              },
              propsForBackgroundLines: {
                strokeWidth: 1,
                stroke: "#F1F5F9",
                strokeDasharray: "0",
              },
              propsForLabels: {
                fontSize: 11,
                fontWeight: "600",
              }
            }}
            style={{
              marginVertical: 8,
              borderRadius: 16,
              marginLeft: -15,
            }}
          />
        </ScrollView>
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A", // slate-900
    letterSpacing: 0.2,
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden", // Prevents the chart from spilling over borders
  },
});