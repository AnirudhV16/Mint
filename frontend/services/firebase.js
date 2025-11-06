import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// SAFE TO EXPOSE - These are PUBLIC identifiers, not secret keys
// Security is handled by Firestore Security Rules, not by hiding these values
const firebaseConfig = {
  apiKey: "AIzaSyA3U5vokoQJak0NAzhlREMwmWfAomVi-2E",
  authDomain: "ai-food-tracker-c2599.firebaseapp.com",
  projectId: "ai-food-tracker-c2599",
  storageBucket: "ai-food-tracker-c2599.firebasestorage.app",
  messagingSenderId: "752249028435",
  appId: "1:752249028435:web:f8b5c0cb95f65b2bc02ba6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with persistence
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

// Initialize Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
export default app;