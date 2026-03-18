import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { colors } from "../constants/colors";

export default function ActivityItem({ activity, duration, calories, onDelete }: any) {

  return (

    <View
      style={{
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3
      }}
    >

      <View>

        <Text style={{ fontSize: 16, fontWeight: "600" }}>
          {activity}
        </Text>

        <Text style={{ color: colors.textSecondary }}>
          {duration} min • {calories} kcal
        </Text>

      </View>

      <Pressable onPress={onDelete}>
        <Ionicons name="trash-outline" size={22} color="red" />
      </Pressable>

    </View>

  );

}