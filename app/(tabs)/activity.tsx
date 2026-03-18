import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { colors } from "@/constants/colors";
import { getRecentExerciseSessions } from "@/services/health";
import { auth, db } from "@/services/firebase";

export default function ActivityTab() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"Week" | "Month" | "All data">("Month");

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true);
        try {
          const user = auth.currentUser;
          const unifiedList: any[] = [];
          
          const daysToFetch = timeRange === "Week" ? 7 : timeRange === "Month" ? 30 : 90;

          // 1. Fetch from Health Connect
          const healthData = await getRecentExerciseSessions(daysToFetch);
          healthData.forEach(act => {
             unifiedList.push({
               id: act.id,
               title: act.title,
               startTime: act.startTime,
               durationMinutes: act.durationMinutes,
               source: 'health_connect',
               // Activity details page currently only supports Health Connect 
               // (because it relies on getRecentExerciseSessions internally to find the session)
               canViewDetails: true 
             });
          });

          // 2. Fetch Manual Logs from Firebase
          if (user) {
            const q = query(collection(db, "activity_logs"), where("userId", "==", user.uid));
            const snap = await getDocs(q);
            snap.forEach(d => {
              const data = d.data();
              // Firebase timestamps are usually stored as Objects or Strings depending on how it was saved.
              // In `add-activity.tsx` we saved new Date() directly which becomes a Timestamp in Firestore.
              const startDate = data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString();
              unifiedList.push({
                id: d.id,
                title: data.activity || "Manual Workout",
                startTime: startDate,
                durationMinutes: data.duration || 0,
                calories: data.calories,
                source: 'firebase',
                canViewDetails: false // Firebase manual logs don't have deeper HC metadata
              });
            });
          }

          // 3. Sort chronologically descending
          unifiedList.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
          
          setActivities(unifiedList);
        } catch (err) {
          console.warn("Failed to load unified activities", err);
        } finally {
          setLoading(false);
        }
      }
      
      load();
    }, [timeRange])
  );

  const handleDeleteFirebaseActivity = (id: string) => {
      Alert.alert(
        "Delete Activity",
        "Are you sure you want to remove this logged activity?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive",
            onPress: async () => {
              try {
                await deleteDoc(doc(db, "activity_logs", id));
                setActivities(prev => prev.filter(a => a.id !== id));
              } catch(e) {
                console.warn("Delete failed", e);
              }
            }
          }
        ]
      );
  };

  const formatDateRange = () => {
     if (activities.length === 0) return "No workouts";
     const start = new Date(activities[activities.length - 1].startTime);
     const end = new Date(activities[0].startTime);
     const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
     return `${start.toLocaleDateString('en-GB', opts)} - ${end.toLocaleDateString('en-GB', opts)}`;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.text }}>Activity</Text>
        
        <TouchableOpacity 
           onPress={() => router.push("/activity/add-activity")}
           style={{ backgroundColor: colors.primary + '15', padding: 10, borderRadius: 14 }}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          
        {/* Segmented Control */}
        <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: "#F9FAFB", borderRadius: 30, flexDirection: "row", padding: 4 }}>
          {["Week", "Month", "All data"].map((tab) => (
             <TouchableOpacity 
               key={tab} 
               onPress={() => setTimeRange(tab as any)}
               style={{ 
                 flex: 1, 
                 paddingVertical: 10, 
                 alignItems: "center", 
                 borderRadius: 26,
                 backgroundColor: timeRange === tab ? "#E0E7FF" : "transparent"
               }}
             >
               <Text style={{ 
                 color: timeRange === tab ? "#4338CA" : "#6B7280", 
                 fontWeight: timeRange === tab ? "500" : "400",
                 fontSize: 15
               }}>{tab}</Text>
             </TouchableOpacity>
          ))}
        </View>

        {/* Date Range Selector Text */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 }}>
           <TouchableOpacity>
             <Ionicons name="chevron-back" size={24} color="#374151" />
           </TouchableOpacity>
           <Text style={{ fontSize: 16, color: "#111827", fontWeight: "400" }}>
             {loading ? "..." : formatDateRange()}
           </Text>
           <TouchableOpacity>
             <Ionicons name="scan-outline" size={24} color="#374151" />
           </TouchableOpacity>
        </View>

        {loading ? (
             <View style={{ marginTop: 40 }}>
                 <ActivityIndicator size="large" color={colors.primary} />
             </View>
        ) : activities.length === 0 ? (
             <View style={{ marginTop: 40, alignItems: 'center' }}>
                 <Ionicons name="barbell-outline" size={64} color={colors.textSecondary + '40'} />
                 <Text style={{ marginTop: 16, fontSize: 16, color: colors.textSecondary }}>No workouts found for this period.</Text>
                 <TouchableOpacity 
                    onPress={() => router.push("/activity/add-activity")}
                    style={{ marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
                 >
                     <Text style={{ color: 'white', fontWeight: 'bold' }}>Log Workout</Text>
                 </TouchableOpacity>
             </View>
        ) : (
             <View style={{ paddingHorizontal: 20 }}>
               {activities.map((act) => {
                   
                 const isFirebase = act.source === 'firebase';
                 const iconName = act.title === "Running" ? "walk" : (act.title === "Walking" ? "walk-outline" : "barbell");
                 
                 const CardWrapper = act.canViewDetails ? TouchableOpacity : View;

                 return (
                   <CardWrapper 
                      key={act.id} 
                      onPress={() => act.canViewDetails ? router.push(`/activity/${act.id}`) : null}
                      style={{ 
                          backgroundColor: colors.card, 
                          padding: 16, 
                          borderRadius: 16, 
                          marginBottom: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          shadowColor: colors.shadow,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.05,
                          shadowRadius: 8,
                          elevation: 1 
                      }}>
                        <View style={{ backgroundColor: isFirebase ? colors.warning + '20' : colors.primary + '15', padding: 12, borderRadius: 14, marginRight: 16 }}>
                           <Ionicons name={iconName} size={28} color={isFirebase ? colors.warning : colors.primary} />
                        </View>
                        
                        <View style={{ flex: 1 }}>
                           <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{act.title}</Text>
                           <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                             {new Date(act.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} • {act.durationMinutes} min
                           </Text>
                        </View>
                        
                        {isFirebase ? (
                            <TouchableOpacity onPress={() => handleDeleteFirebaseActivity(act.id)} style={{ padding: 8 }}>
                                <Ionicons name="trash-outline" size={22} color={colors.danger || "red"} />
                            </TouchableOpacity>
                        ) : (
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary + '80'} />
                        )}
                        
                   </CardWrapper>
                 )
               })}
             </View>
        )}

      </ScrollView>
    </View>
  );
}