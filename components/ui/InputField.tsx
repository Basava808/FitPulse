import { TextInput } from "react-native";
import { colors } from "../../constants/colors";

export default function InputField({ value, onChangeText, placeholder, secure, ...props }: any) {

  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secure}
      {...props}
      style={{
        backgroundColor: colors.card,
        padding: 14,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text
      }}
    />
  );

}