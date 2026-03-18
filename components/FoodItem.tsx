import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Text, View } from "react-native";
import { colors } from "../constants/colors";

export default function FoodItem({ food, calories, mealType, date, onDelete }: any) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        padding: 18,
        borderRadius: 20,
        marginBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <View
        style={{
          backgroundColor: "#C2185B" + "15", // Pinkish accent to match the food header gradient
          padding: 14,
          borderRadius: 16,
          marginRight: 16,
        }}
      >
        <Ionicons name="fast-food" size={26} color="#C2185B" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginBottom: 4 }}>
          {food}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "500" }}>
          {mealType} • {date ? date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "Today"}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end", marginRight: 14 }}>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#C2185B", letterSpacing: 0.5 }}>
          {calories}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "600" }}>
          kcal
        </Text>
      </View>

      <TouchableOpacity onPress={onDelete} style={{ padding: 6 }}>
        <Ionicons name="trash-outline" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}