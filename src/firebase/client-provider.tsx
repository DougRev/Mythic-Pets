'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';
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
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const firebaseServices = useMemo(() => {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    
    return {
      app,
      auth: getAuth(app),
      firestore: getFirestore(app),
      storage: getStorage(app),
    };
  }, []);

  useEffect(() => {
    // Initialize Analytics only on the client side where `window` is available
    isSupported().then(supported => {
        if (supported && firebaseConfig.measurementId) {
            setAnalytics(getAnalytics(firebaseServices.app));
        }
    });
  }, [firebaseServices.app]);


  return (
    <FirebaseProvider
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
      app={firebaseServices.app}
    >
      {analytics && <FirebaseAnalytics analytics={analytics} />}
      {children}
    </FirebaseProvider>
  );
}
