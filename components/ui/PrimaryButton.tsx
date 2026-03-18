import { Pressable, Text } from "react-native";
import { colors } from "../../constants/colors";

export default function PrimaryButton({ title, onPress }: any) {

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: "center"
      }}
    >
      <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>
        {title}
      </Text>
    </Pressable>
  );

}