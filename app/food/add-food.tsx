import { router } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { useState } from "react";
import { Pressable, Text, TextInput, View, ScrollView, StyleSheet } from "react-native";
import { colors } from "../../constants/colors";
import { auth, db } from "../../services/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function AddFood() {
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [mealType, setMealType] = useState("");

  const saveFood = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Basic validation to prevent completely empty submissions
    if(!foodName.trim() && !calories.trim()) return;

    await addDoc(collection(db, "food_logs"), {
      userId: user.uid,
      foodName,
      calories: Number(calories) || 0,
      mealType: mealType || "Snack",
      date: new Date()
    });

    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      
      {/* Premium Gradient Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={["#E91E63", "#C2185B"]} // Pinkish/Red gradient for food
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTopRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </Pressable>
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Log a Meal</Text>
            <Text style={styles.headerSubtitle}>Keep track of your nutrition</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentContainer}>
        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Meal Details</Text>

          {/* Food Name Input */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldLabelRow}>
               <Ionicons name="fast-food-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
               <Text style={styles.fieldLabel}>Food Name</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="e.g. Avocado Toast"
                value={foodName}
                onChangeText={setFoodName}
                style={styles.textInput}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Calories Input */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldLabelRow}>
               <Ionicons name="flame-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
               <Text style={styles.fieldLabel}>Calories</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="e.g. 350"
                keyboardType="numeric"
                value={calories}
                onChangeText={setCalories}
                style={styles.textInput}
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.inputAppend}>kcal</Text>
            </View>
          </View>

          {/* Meal Type Input */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldLabelRow}>
               <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
               <Text style={styles.fieldLabel}>Meal Type</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="e.g. Breakfast, Lunch, Dinner"
                value={mealType}
                onChangeText={setMealType}
                style={styles.textInput}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {/* Save/Action Button */}
        <Pressable onPress={saveFood} style={styles.saveButton}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]} // Green for save
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="checkmark-done-circle-outline" size={24} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Save Food Logger</Text>
          </LinearGradient>
        </Pressable>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    marginBottom: 25,
  },
  headerGradient: {
    paddingTop: 50, // Slightly less padding to account for safe area/back button
    paddingBottom: 35,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    alignItems: "flex-start",
    paddingHorizontal: 5,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 22,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    color: colors.text,
    paddingVertical: 16,
  },
  inputAppend: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "600",
    marginLeft: 8,
  },
  saveButton: {
    borderRadius: 18,
    overflow: "hidden",
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});