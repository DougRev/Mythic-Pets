'use client';

import { useContext } from 'react';
import { FirebaseContext, FirebaseContextState } from '@/firebase/provider';
import {
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

async function createUserProfile(firestore: any, user: User) {
    const userProfileRef = doc(firestore, "users", user.uid);
    const profileData = {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        creationDate: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        planType: 'free',
    };
    await setDoc(userProfileRef, profileData, { merge: true });
}

export const useAuth = (): FirebaseContextState & {
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signInWithApple: () => Promise<any>;
  signOut: () => Promise<void>;
} => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider.');
  }
  const { auth, firestore } = context;

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    await createUserProfile(firestore, userCredential.user);
    return userCredential;
  };

  const signInWithEmail = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    await createUserProfile(firestore, userCredential.user);
    return userCredential;
  };

  const signInWithApple = async () => {
    const provider = new OAuthProvider('apple.com');
    const userCredential = await signInWithPopup(auth, provider);
    await createUserProfile(firestore, userCredential.user);
    return userCredential;
  };

  const signOut = () => {
    return firebaseSignOut(auth);
  };

  return {
    ...context,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
  };
};
