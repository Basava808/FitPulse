import { View } from "react-native";
import { colors } from "../constants/colors";

export default function Card({children}:any){

  return(

    <View
      style={{
        backgroundColor:colors.card,
        borderRadius:16,
        padding:16,
        marginBottom:12,
        shadowColor:"#000",
        shadowOpacity:0.08,
        shadowRadius:8,
        elevation:3
      }}
    >
      {children}
    </View>

  );

}