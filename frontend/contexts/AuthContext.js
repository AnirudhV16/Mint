// frontend/contexts/AuthContext.js - WITH PROFILE PHOTO SUPPORT
import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { Platform } from 'react-native';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    console.log('🔐 Setting up auth listener...');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔔 Auth state changed!');
      if (firebaseUser) {
        console.log('✅ User logged in:', firebaseUser.email);
        
        // Load user profile from Firestore
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data();
            console.log('📄 User profile loaded');
            setUserProfile(profileData);
          }
        } catch (error) {
          console.error('❌ Error loading profile:', error);
        }
      } else {
        console.log('❌ No user logged in');
        setUserProfile(null);
      }
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const signup = async (email, password, profileImage = null) => {
    try {
      console.log('📝 Creating account for:', email);
      
      // Create user account
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      console.log('✅ Account created:', user.email);

      // Convert profile image to base64 if provided
      let profileImageData = null;
      if (profileImage && profileImage.uri) {
        try {
          if (Platform.OS === 'web') {
            const response = await fetch(profileImage.uri);
            const blob = await response.blob();
            const reader = new FileReader();
            profileImageData = await new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          } else {
            // For mobile, we'll store the URI directly (in production, upload to Firebase Storage)
            profileImageData = profileImage.uri;
          }
          console.log('✅ Profile image processed');
        } catch (imgError) {
          console.error('⚠️ Failed to process profile image:', imgError);
        }
      }

      // Create user profile in Firestore
      const userProfileData = {
        email: email,
        createdAt: new Date().toISOString(),
        profileImage: profileImageData,
        displayName: email.split('@')[0], // Use email username as display name
      };

      await setDoc(doc(db, 'users', user.uid), userProfileData);
      console.log('✅ User profile created in Firestore');

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: email.split('@')[0]
      });

      setUserProfile(userProfileData);

      return { success: true, user: user };
    } catch (error) {
      console.error('❌ Signup error:', error.code, error.message);
      return { success: false, error: error };
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔑 Attempting login for:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Load user profile
      const profileDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (profileDoc.exists()) {
        setUserProfile(profileDoc.data());
      }
      
      console.log('✅ Login successful:', result.user.email);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('❌ Login error:', error.code, error.message);
      return { success: false, error: error };
    }
  };

  const logout = async () => {
    console.log('=== LOGOUT FUNCTION CALLED ===');
    console.log('Current user before logout:', user?.email);
    
    try {
      console.log('Calling Firebase signOut...');
      await signOut(auth);
      
      console.log('✅ Firebase signOut completed');
      
      // Clear local state
      setUser(null);
      setUserProfile(null);
      console.log('✅ Local user state cleared');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUserProfile = async (updates) => {
    if (!user) return { success: false, error: 'No user logged in' };

    try {
      console.log('📝 Updating user profile...');
      
      await setDoc(doc(db, 'users', user.uid), {
        ...userProfile,
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setUserProfile({ ...userProfile, ...updates });
      console.log('✅ Profile updated');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Profile update error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signup,
    login,
    logout,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};