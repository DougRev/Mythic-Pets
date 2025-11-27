'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { firebaseConfig } from './config';
import { FirebaseAnalytics } from './analytics';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
  analytics: Analytics | null;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    
    let analytics: Analytics | null = null;
    if (firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    }
    
    return {
      app,
      auth: getAuth(app),
      firestore: getFirestore(app),
      storage: getStorage(app),
      analytics,
    };
  }, []);

  return (
    <FirebaseProvider
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      {firebaseServices.analytics && <FirebaseAnalytics analytics={firebaseServices.analytics} />}
      {children}
    </FirebaseProvider>
  );
}
