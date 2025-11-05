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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('User logged in:', firebaseUser.email);
        
        // Load user profile from Firestore
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data();
            console.log('User profile loaded');
            setUserProfile(profileData);
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      } else {
        console.log('No user logged in');
        setUserProfile(null);
      }
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signup = async (email, password) => {
    try {
      console.log('Creating account for:', email);
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      console.log(' Account created:', user.email);

      // Create user profile in Firestore
      const userProfileData = {
        email: email,
        createdAt: new Date().toISOString(),
        displayName: email.split('@')[0],
      };

      await setDoc(doc(db, 'users', user.uid), userProfileData);
      console.log(' User profile created in Firestore');


      await updateProfile(user, {
        displayName: email.split('@')[0]
      });

      setUserProfile(userProfileData);

      return { success: true, user: user };
    } catch (error) {
      console.error(' Signup error:', error.code, error.message);
      return { success: false, error: error };
    }
  };

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Load user profile
      const profileDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (profileDoc.exists()) {
        setUserProfile(profileDoc.data());
      }
      
      console.log(' Login successful:', result.user.email);
      return { success: true, user: result.user };
    } catch (error) {
      console.error(' Login error:', error.code, error.message);
      return { success: false, error: error };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      
      console.log(' Firebase signOut completed');
      
      setUser(null);
      setUserProfile(null);
      
      return { success: true };
    } catch (error) {
      console.error(' Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUserProfile = async (updates) => {
    if (!user) return { success: false, error: 'No user logged in' };

    try {
      
      await setDoc(doc(db, 'users', user.uid), {
        ...userProfile,
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update Auth profile if display name changed
      if (updates.displayName) {
        await updateProfile(user, {
          displayName: updates.displayName
        });
      }

      setUserProfile({ ...userProfile, ...updates });
      console.log(' Profile updated');
      
      return { success: true };
    } catch (error) {
      console.error(' Profile update error:', error);
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