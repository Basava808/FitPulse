import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform, Dimensions } from "react-native";
import { router } from "expo-router";
import InputField from "../components/ui/InputField";
import PrimaryButton from "../components/ui/PrimaryButton";
import { colors } from "../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp, withSpring, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { width, height } = Dimensions.get('window');

  const buttonScale = useSharedValue(1);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert("Validation", "Please fill all fields.");
      return;
    }

    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      // Save basic profile to Firestore
      await setDoc(doc(db, "users", uid), {
        name: name.trim(),
        email: email.trim(),
        weight: null,
        height: null,
        age: null,
        goal: null,
        createdAt: new Date()
      });

      // Navigate to profile setup so user can complete metrics
      router.replace("/profile-setup");
    } catch (err: any) {
      console.error("Signup error:", err);
      const message =
        err?.code === "auth/email-already-in-use"
          ? "Email already in use. Try logging in."
          : err?.code === "auth/weak-password"
          ? "Password is too weak (min 6 characters)."
          : "Signup failed. Please try again.";
      Alert.alert("Signup Error", message);
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
            <Ionicons name="person-add" size={40} color="#FFF" />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Let's get you set up</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(800).springify()} style={styles.card}>
          <InputField 
            placeholder="Full Name" 
            value={name} 
            onChangeText={setName} 
            autoCapitalize="words"
          />
          <InputField 
            placeholder="Email Address" 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            placeholder="Password (min 6 chars)"
            secure
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.buttonContainer}>
            <Pressable 
              onPressIn={() => buttonScale.value = withSpring(0.95)}
              onPressOut={() => buttonScale.value = withSpring(1)}
              onPress={handleSignup} 
              disabled={loading}
            >
              <Animated.View style={[styles.signupButton, animatedButtonStyle]}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.signupButtonText}>Sign Up</Text>
                )}
              </Animated.View>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.push("/login")}>
              <Text style={styles.loginText}>Login</Text>
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
  signupButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  signupButtonText: {
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
  loginText: {
    color: colors.secondary,
    fontSize: 15,
    fontWeight: '700',
  }
});