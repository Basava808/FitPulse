import { useRef, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AIMessageBubble from "../../components/AIMessageBubble";
import AIPromptChip from "../../components/AIPromptChip";
import { colors } from "../../constants/colors";

const suggestions = [
  "How many calories should I eat today?",
  "Suggest a 400 calorie dinner",
  "How long to reach 75kg?",
  "Best workout for fat loss",
  "Did I burn enough calories today?"
];

export default function AICoach() {

  const [messages, setMessages] = useState<any[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi 👋 I’m your AI fitness coach. Ask me anything about diet, workouts, or weight loss."
    }
  ]);

  const [input, setInput] = useState("");

  const listRef = useRef<FlatList>(null);

  const sendMessage = async (text?: string) => {

    const messageText = text || input;

    if (!messageText) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText
    };

    setMessages(prev => [...prev, userMessage]);

    setInput("");

    try {

      // Smooth scroll to bottom when user sends
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

      const res = await fetch("http://192.168.1.29:3000/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: messageText })
      });

      const data = await res.json();

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply
      };

      setMessages(prev => [...prev, aiMessage]);

      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 200);

    } catch (err) {

      const errorMsg = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "⚠️ Unable to reach AI server"
      };

      setMessages(prev => [...prev, errorMsg]);

    }

  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "Hi 👋 Chat cleared! How else can I help you today?"
      }
    ]);
  };

  return (

    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={{
          paddingTop: 60,
          paddingBottom: 20,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 5,
          zIndex: 10
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "white" }}>AI Coach</Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: '500' }}>Your personalized fitness expert</Text>
        </View>
        <TouchableOpacity
          onPress={clearChat}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AIMessageBubble
              message={item.content}
              role={item.role}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 100
          }}
          ListHeaderComponent={
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textSecondary, marginBottom: 12 }}>
                Suggested Questions
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {suggestions.map((q, index) => (
                  <AIPromptChip
                    key={index}
                    label={q}
                    onPress={() => sendMessage(q)}
                  />
                ))}
              </ScrollView>
            </View>
          }
        />

        {/* Floating Input Area */}
        <View
          style={{
            position: 'absolute',
            bottom: 20,
            left: 16,
            right: 16,
            backgroundColor: 'white',
            borderRadius: 30,
            paddingHorizontal: 6,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.05)'
          }}
        >
          <TextInput
            placeholder="Ask your coach..."
            value={input}
            onChangeText={setInput}
            multiline
            style={{
              flex: 1,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              maxHeight: 100,
              color: colors.text
            }}
          />
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={!input.trim()}
            style={{
              backgroundColor: input.trim() ? colors.primary : colors.textSecondary + '40',
              width: 44,
              height: 44,
              borderRadius: 22,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6
            }}
          >
            <Ionicons name="send" size={20} color="white" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>

  );

}