import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Dimensions } from "react-native";
import { router } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import InputField from "../components/ui/InputField";
import PrimaryButton from "../components/ui/PrimaryButton";
import { colors } from "../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp, withSpring, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileSetup() {
  const [name,setName] = useState("");
  const [age,setAge] = useState("");
  const [height,setHeight] = useState("");
  const [weight,setWeight] = useState("");
  const [goal,setGoal] = useState("lose");
  
  const buttonScale = useSharedValue(1);

  const saveProfile = async () => {

    const user = auth.currentUser;

    if(!user) return;

    await setDoc(doc(db,"users",user.uid),{
      name,
      age:Number(age),
      height:Number(height),
      weight:Number(weight),
      goal,
      createdAt:new Date()
    });

    router.replace("/(tabs)/dashboard");

  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

  const goals = [
    { id: "lose", label: "Lose Weight", icon: "trending-down" as "trending-down" },
    { id: "maintain", label: "Maintain", icon: "remove" as "remove" },
    { id: "gain", label: "Gain Muscle", icon: "trending-up" as "trending-up" }
  ];

  return(
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primaryDark, colors.primary, colors.background]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Decorative Background Elements */}
      <View style={styles.blurCircle1} />
      <View style={styles.blurCircle2} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeInDown.delay(200).duration(800).springify()} style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={40} color="#FFF" />
          </View>
          <Text style={styles.title}>Complete Profile</Text>
          <Text style={styles.subtitle}>Personalize your fitness plan</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(800).springify()} style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          <InputField
            placeholder="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <InputField
            placeholder="Age"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <InputField
                placeholder="Height (cm)"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <InputField
                placeholder="Weight (kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.goalTitle}>Primary Goal</Text>
          <View style={styles.goalContainer}>
            {goals.map((g) => {
              const isActive = goal === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setGoal(g.id)}
                  style={[
                    styles.goalOption,
                    isActive && styles.goalOptionActive
                  ]}
                >
                  <Ionicons 
                    name={g.icon} 
                    size={24} 
                    color={isActive ? "#FFFFFF" : colors.textSecondary} 
                    style={{ marginBottom: 4 }}
                  />
                  <Text style={[styles.goalOptionText, isActive && styles.goalOptionTextActive]}>
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.buttonContainer}>
            <Pressable 
              onPressIn={() => buttonScale.value = withSpring(0.95)}
              onPressOut={() => buttonScale.value = withSpring(1)}
              onPress={saveProfile} 
            >
              <Animated.View style={[styles.saveButton, animatedButtonStyle]}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={styles.saveButtonText}>Save Details</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
              </Animated.View>
            </Pressable>
          </View>
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  blurCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(76, 175, 80, 0.4)',
    transform: [{ scale: 1.5 }],
  },
  blurCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(30, 136, 229, 0.2)',
    transform: [{ scale: 1.5 }],
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalTitle: {
    marginTop: 20,
    marginBottom: 16,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  goalContainer: {
    flexDirection: "row",
    gap: 12,
  },
  goalOption: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  goalOptionActive: {
    backgroundColor: colors.primary,
    borderColor: `${colors.primaryDark}80`,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  goalOptionText: {
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  goalOptionTextActive: {
    color: "#FFFFFF",
  },
  buttonContainer: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButton: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  }
});