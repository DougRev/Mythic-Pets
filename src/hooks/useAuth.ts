'use client';

import { useContext } from 'react';
import { FirebaseContext, FirebaseContextState } from '@/firebase/provider';
import {
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  updateProfile,
  User,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

async function createUserProfile(firestore: any, user: User, isNewUser: boolean) {
    if (!isNewUser) return; // Only create profile for new users

    const userProfileRef = doc(firestore, "users", user.uid);
    const profileData = {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        creationDate: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        planType: 'free',
        generationCredits: 5,
    };
    // Use setDoc with merge:true to avoid overwriting existing data if somehow called twice
    await setDoc(userProfileRef, profileData, { merge: true });
}

export const useAuth = (): FirebaseContextState & {
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signInWithApple: () => Promise<any>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
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
    // It's a new user, so pass true
    await createUserProfile(firestore, userCredential.user, true);
    return userCredential;
  };

  const signInWithEmail = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const handleSocialSignIn = async (provider: GoogleAuthProvider | OAuthProvider) => {
    const userCredential = await signInWithPopup(auth, provider);
    const additionalInfo = getAdditionalUserInfo(userCredential);
    // Use the isNewUser flag from additionalInfo to decide whether to create a profile
    await createUserProfile(firestore, userCredential.user, !!additionalInfo?.isNewUser);
    return userCredential;
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return handleSocialSignIn(provider);
  };

  const signInWithApple = async () => {
    const provider = new OAuthProvider('apple.com');
    return handleSocialSignIn(provider);
  };

  const sendPasswordResetEmail = (email: string) => {
    return firebaseSendPasswordResetEmail(auth, email);
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
    sendPasswordResetEmail,
    signOut,
  };
};
