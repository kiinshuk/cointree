import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyB0N8GF9NEokfQSKOsyWgSTP4_swi2j78k",
  authDomain: "contri-app-8441b.firebaseapp.com",
  projectId: "contri-app-8441b",
  storageBucket: "contri-app-8441b.firebasestorage.app",
  messagingSenderId: "749839095472",
  appId: "1:749839095472:web:6621274a456fad36cc0d75"
};

const app = initializeApp(firebaseConfig);
export { app };

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);