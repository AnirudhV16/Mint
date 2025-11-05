// frontend/contexts/AuthContext.js - FIXED IMAGE UPLOAD
import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../services/firebase';
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

  /**
   * Upload profile image to Firebase Storage
   */
  const uploadProfileImage = async (imageUri, userId) => {
    try {
      console.log('📤 Uploading profile image...');
      
      let blob;
      
      if (Platform.OS === 'web') {
        // Web: Convert data URL to blob
        const response = await fetch(imageUri);
        blob = await response.blob();
      } else {
        // Mobile: Fetch the image and convert to blob
        const response = await fetch(imageUri);
        blob = await response.blob();
      }

      // Create reference to storage location
      const storageRef = ref(storage, `profile_images/${userId}_${Date.now()}.jpg`);
      
      // Upload the blob
      console.log('⬆️ Uploading to Firebase Storage...');
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('✅ Upload complete. URL:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw error;
    }
  };

  const signup = async (email, password, profileImage = null) => {
    try {
      console.log('📝 Creating account for:', email);
      
      // Create user account
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      console.log('✅ Account created:', user.email);

      // Upload profile image if provided
      let profileImageURL = null;
      if (profileImage && profileImage.uri) {
        try {
          profileImageURL = await uploadProfileImage(profileImage.uri, user.uid);
        } catch (imgError) {
          console.error('⚠️ Failed to upload profile image:', imgError);
          // Continue without image - don't fail signup
        }
      }

      // Create user profile in Firestore
      const userProfileData = {
        email: email,
        createdAt: new Date().toISOString(),
        profileImage: profileImageURL, // Store Firebase Storage URL
        displayName: email.split('@')[0],
      };

      await setDoc(doc(db, 'users', user.uid), userProfileData);
      console.log('✅ User profile created in Firestore');

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: email.split('@')[0],
        photoURL: profileImageURL // Also store in Auth
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

  const updateUserProfile = async (updates, newProfileImage = null) => {
    if (!user) return { success: false, error: 'No user logged in' };

    try {
      console.log('📝 Updating user profile...');
      
      let profileImageURL = userProfile?.profileImage;
      
      // Upload new profile image if provided
      if (newProfileImage && newProfileImage.uri) {
        try {
          profileImageURL = await uploadProfileImage(newProfileImage.uri, user.uid);
          updates.profileImage = profileImageURL;
        } catch (imgError) {
          console.error('⚠️ Failed to upload new profile image:', imgError);
        }
      }

      await setDoc(doc(db, 'users', user.uid), {
        ...userProfile,
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update Auth profile if display name changed
      if (updates.displayName) {
        await updateProfile(user, {
          displayName: updates.displayName,
          photoURL: profileImageURL
        });
      }

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