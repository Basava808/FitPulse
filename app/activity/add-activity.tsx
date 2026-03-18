import { router } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { activities } from "../../constants/activities";
import { colors } from "../../constants/colors";
import { auth, db } from "../../services/firebase";
import { calculateCalories } from "../../utils/calorieCalculator";

export default function AddActivity(){

  const [selectedActivity,setSelectedActivity] = useState(activities[0]);
  const [duration,setDuration] = useState("");
  const [weight,setWeight] = useState(79);
  const [calories,setCalories] = useState(0);

  const handleCalculate = () => {

    const mins = Number(duration);

    const cal = calculateCalories(
      selectedActivity.met,
      weight,
      mins
    );

    setCalories(cal);

  };

  const saveActivity = async () => {

    const user = auth.currentUser;

    if(!user) return;

    await addDoc(collection(db,"activity_logs"),{

      userId:user.uid,
      activity:selectedActivity.name,
      duration:Number(duration),
      calories,
      date:new Date()

    });

    router.back();

  };

  return(

    <View style={{flex:1,padding:20,backgroundColor:colors.background}}>

      <Text style={{fontSize:22,fontWeight:"bold",marginBottom:20}}>
        Add Activity
      </Text>

      {/* Activity Picker */}

      {activities.map((a)=>(
        <Pressable
          key={a.name}
          onPress={()=>setSelectedActivity(a)}
          style={{
            padding:14,
            backgroundColor:
              selectedActivity.name===a.name
                ? colors.primary
                : colors.card,
            borderRadius:10,
            marginBottom:10
          }}
        >

          <Text
            style={{
              color:selectedActivity.name===a.name
                ? "white"
                : "black"
            }}
          >
            {a.name}
          </Text>

        </Pressable>
      ))}

      {/* Duration */}

      <Text style={{marginTop:20}}>Duration (minutes)</Text>

      <TextInput
        value={duration}
        onChangeText={setDuration}
        keyboardType="numeric"
        style={{
          backgroundColor:colors.card,
          padding:12,
          borderRadius:10,
          marginTop:10
        }}
      />

      {/* Calculate */}

      <Pressable
        onPress={handleCalculate}
        style={{
          backgroundColor:colors.primary,
          padding:14,
          borderRadius:12,
          marginTop:20,
          alignItems:"center"
        }}
      >

        <Text style={{color:"white",fontWeight:"600"}}>
          Calculate Calories
        </Text>

      </Pressable>

      {/* Calories */}

      {calories>0 && (
        <Text style={{marginTop:20,fontSize:18}}>
          Estimated Calories: {calories} kcal
        </Text>
      )}

      {/* Save */}

      <Pressable
        onPress={saveActivity}
        style={{
          backgroundColor:"black",
          padding:14,
          borderRadius:12,
          marginTop:20,
          alignItems:"center"
        }}
      >

        <Text style={{color:"white"}}>
          Save Activity
        </Text>

      </Pressable>

    </View>

  );

}