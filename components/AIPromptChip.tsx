import { Pressable, Text } from "react-native";
import { colors } from "../constants/colors";

export default function AIPromptChip({ label, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.card,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        marginRight: 10,
        borderWidth: 1,
        borderColor: colors.border,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
      }}
    >
      <Text style={{ color: colors.text, fontWeight: '500', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}