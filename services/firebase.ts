import { getApp, getApps, initializeApp } from "firebase/app";
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAAYxS3s-sbBDWXqLJdAKl-lZqAezSYc-A",
  authDomain: "fitpulse-80d83.firebaseapp.com",
  projectId: "fitpulse-80d83",
  storageBucket: "fitpulse-80d83.firebasestorage.app",
  messagingSenderId: "790916793013",
  appId: "1:790916793013:web:211b170b8ff06aa07134fc",
  measurementId: "G-WQ577LX1FE"
};

const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (err) {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);