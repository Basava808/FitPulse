import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {

  const insets = useSafeAreaInsets();

  return (

    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["bottom"]}
    >

      <Tabs
        screenOptions={{
          headerShown: false,

          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: "#9CA3AF",

          tabBarStyle: {
            height:  insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
            backgroundColor: colors.card,
            borderTopWidth: 0,
            elevation: 10
          }
        }}
      >

        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            )
          }}
        />

        <Tabs.Screen
          name="activity"
          options={{
            title: "Activity",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="barbell-outline" size={size} color={color} />
            )
          }}
        />

        <Tabs.Screen
          name="food"
          options={{
            title: "Food",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="fast-food-outline" size={size} color={color} />
            )
          }}
        />

        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="analytics-outline" size={size} color={color} />
            )
          }}
        />

        <Tabs.Screen
          name="ai-coach"
          options={{
            title: "Coach",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
            )
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            )
          }}
        />

      </Tabs>

    </SafeAreaView>

  );
}