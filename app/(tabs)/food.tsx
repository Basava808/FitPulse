import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TouchableOpacity, View } from "react-native";
import FoodItem from "../../components/FoodItem";
import { colors } from "../../constants/colors";
import { auth, db } from "../../services/firebase";

export default function FoodTab() {
  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadFoods = async () => {
        setLoading(true);
        try {
          const user = auth.currentUser;
          if (!user) return;

          const q = query(
            collection(db, "food_logs"),
            where("userId", "==", user.uid)
          );

          const snap = await getDocs(q);
          const list: any[] = [];

          snap.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
          });
          
          // Sort descending if date exists
          list.sort((a, b) => {
            const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
            const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
            return dateB - dateA;
          });

          setFoods(list);
        } catch (err) {
            console.warn("Failed to load foods", err);
        } finally {
            setLoading(false);
        }
      };

      loadFoods();
    }, [])
  );

  const deleteFood = async (id: string) => {
    try {
      await deleteDoc(doc(db, "food_logs", id));
      setFoods(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      console.warn("Failed to delete", e);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.text }}>Nutrition</Text>
        
        <TouchableOpacity 
           onPress={() => router.push("/food/add-food")}
           style={{ backgroundColor: colors.warning + '15', padding: 10, borderRadius: 14 }}
        >
          <Ionicons name="add" size={24} color={colors.warning} />
        </TouchableOpacity>
      </View>

      {/* Food List */}
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
          {loading ? (
             <View style={{ marginTop: 40 }}>
                 <ActivityIndicator size="large" color={colors.warning} />
             </View>
          ) : foods.length === 0 ? (
             <View style={{ marginTop: 40, alignItems: 'center' }}>
                 <Ionicons name="pizza-outline" size={64} color={colors.textSecondary + '40'} />
                 <Text style={{ marginTop: 16, fontSize: 16, color: colors.textSecondary }}>No meals logged yet.</Text>
                 <TouchableOpacity 
                    onPress={() => router.push("/food/add-food")}
                    style={{ marginTop: 24, backgroundColor: colors.warning, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
                 >
                     <Text style={{ color: 'white', fontWeight: 'bold' }}>Log Meal</Text>
                 </TouchableOpacity>
             </View>
          ) : (
            <FlatList
              data={foods}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => (
                <FoodItem
                  food={item.foodName}
                  calories={item.calories}
                  mealType={item.mealType}
                  date={item.date?.toDate ? item.date.toDate() : new Date()}
                  onDelete={() => deleteFood(item.id)}
                />
              )}
            />
          )}
      </View>
    </View>
  );
}