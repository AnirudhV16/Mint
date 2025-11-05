// frontend/services/firebase.js - WITH STORAGE
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Add Storage

// Export the app instance if needed
export default app;