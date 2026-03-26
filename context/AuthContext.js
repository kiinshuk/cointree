import React, { createContext, useContext, useState, useEffect } from 'react';

let auth, db;

try {
  const firebaseModule = require('../firebase/config');
  auth = firebaseModule.auth;
  db = firebaseModule.db;
} catch (e) {
  console.log('Firebase config error:', e);
}

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!auth) return;
    
    checkAutoLogin();
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchUserProfile(firebaseUser.uid);
        await AsyncStorage.setItem('userUid', firebaseUser.uid);
      } else {
        setUser(null);
        setUserProfile(null);
        await AsyncStorage.removeItem('userUid');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const checkAutoLogin = async () => {
    try {
      const savedUid = await AsyncStorage.getItem('userUid');
      if (savedUid && db) {
        const userDoc = await getDoc(doc(db, 'users', savedUid));
        if (userDoc.exists()) {
          setUser({ uid: savedUid });
          setUserProfile(userDoc.data());
        }
      }
    } catch (error) {
      console.log('Auto login check failed:', error);
    }
  };

  const fetchUserProfile = async (uid) => {
    if (!db) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      console.log('Error fetching user profile:', error);
    }
  };

  const signup = async (name, email, password) => {
    if (!auth || !db) return { success: false, error: 'Firebase not initialized' };
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email,
        name: name,
        createdAt: new Date().toISOString()
      });

      setUserProfile({
        uid: user.uid,
        email: email,
        name: name,
        createdAt: new Date().toISOString()
      });

      setIsLoading(false);
      return { success: true };
    } catch (error) {
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    if (!auth) return { success: false, error: 'Firebase not initialized' };
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setIsLoading(false);
      return { success: true };
    } catch (error) {
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    if (!auth) return { success: false, error: 'Firebase not initialized' };
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      await AsyncStorage.removeItem('userUid');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    isLoading,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};