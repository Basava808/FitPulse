import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { colors } from "../../constants/colors";

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

export default function QuickAction({ icon, label, onPress }: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed
      ]}
    >
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    flex: 1,
    marginHorizontal: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  containerPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  iconWrapper: {
    backgroundColor: colors.primary + "15",
    padding: 14,
    borderRadius: 50,
    marginBottom: 10,
  },
  label: {
    fontWeight: "600",
    color: colors.text,
    fontSize: 14,
  },
});