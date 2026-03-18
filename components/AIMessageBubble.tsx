import { Text, View } from "react-native";
import { colors } from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";

export default function AIMessageBubble({ message, role }: any){

  const isUser = role === "user";

  return(

    <View
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        backgroundColor: isUser ? colors.primary : colors.card,
        padding: 12,
        borderRadius: 16,
        borderBottomLeftRadius: isUser ? 16 : 4,
        borderBottomRightRadius: isUser ? 4 : 16,
        marginBottom: 12,
        maxWidth: "85%",
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1
      }}
    >
      {!isUser && (
        <View style={{ 
          width: 28, 
          height: 28, 
          borderRadius: 14, 
          backgroundColor: colors.primary + '20', 
          justifyContent: 'center', 
          alignItems: 'center',
          marginRight: 8
        }}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
        </View>
      )}

      <Text style={{ 
        color: isUser ? "white" : colors.text,
        fontSize: 15,
        lineHeight: 20,
        flexShrink: 1
      }}>
        {message}
      </Text>

    </View>

  );

}