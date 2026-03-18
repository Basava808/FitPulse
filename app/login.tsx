import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform, Dimensions } from "react-native";
import { router } from "expo-router";
import InputField from "../components/ui/InputField";
import PrimaryButton from "../components/ui/PrimaryButton";
import { colors } from "../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp, withSpring, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { width, height } = Dimensions.get('window');

  const buttonScale = useSharedValue(1);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Validation", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // successful login -> replace stack with tabs
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      const message =
        err?.code === "auth/user-not-found"
          ? "User not found. Please sign up."
          : err?.code === "auth/wrong-password"
          ? "Incorrect password."
          : "Login failed. Please try again.";
      Alert.alert("Login Error", message);
    } finally {
      setLoading(false);
    }
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[colors.primaryDark, colors.primary, colors.background]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Decorative Background Elements */}
      <View style={styles.blurCircle1} />
      <View style={styles.blurCircle2} />

      <View style={styles.innerContainer}>
        <Animated.View entering={FadeInDown.delay(200).duration(800).springify()} style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="fitness" size={48} color="#FFF" />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to continue your fitness journey</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(800).springify()} style={styles.card}>
          <InputField 
            placeholder="Email Address" 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            placeholder="Password"
            secure
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.buttonContainer}>
            <Pressable 
              onPressIn={() => buttonScale.value = withSpring(0.95)}
              onPressOut={() => buttonScale.value = withSpring(1)}
              onPress={handleLogin} 
              disabled={loading}
            >
              <Animated.View style={[styles.loginButton, animatedButtonStyle]}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </Animated.View>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push("/signup")}>
              <Text style={styles.signupText}>Sign Up</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  innerContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    zIndex: 10,
  },
  blurCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(30, 136, 229, 0.4)',
    transform: [{ scale: 1.5 }],
  },
  blurCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    transform: [{ scale: 1.5 }],
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
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
    fontSize: 36,
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
  buttonContainer: {
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: '#64748B',
    fontSize: 15,
  },
  signupText: {
    color: colors.secondary,
    fontSize: 15,
    fontWeight: '700',
  }
});