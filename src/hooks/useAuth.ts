
'use client';

import {
  useUser as useFirebaseUser,
  useAuth as useFirebaseAuth,
  useFirestore,
} from '@/firebase';
import {
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  AppleAuthProvider,
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
    // Non-blocking write
    setDoc(userProfileRef, profileData, { merge: true });
}

export const useAuth = () => {
  const { user, isUserLoading, userError } = useFirebaseUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    if (!auth || !firestore) throw new Error("Firebase not initialized");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    await createUserProfile(firestore, userCredential.user);
    return userCredential;
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    if (!auth || !firestore) throw new Error("Firebase not initialized");
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    // Create profile only if it's a new user (or just merge on every login)
    await createUserProfile(firestore, userCredential.user);
    return userCredential;
  };

  const signInWithApple = async () => {
    if (!auth || !firestore) throw new Error("Firebase not initialized");
    const provider = new AppleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    await createUserProfile(firestore, userCredential.user);
    return userCredential;
  };

  const signOut = async () => {
    if (!auth) throw new Error("Firebase not initialized");
    await firebaseSignOut(auth);
  };

  return {
    user,
    isUserLoading,
    userError,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
  };
};
