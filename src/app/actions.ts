'use server';

import { firestore } from '@/firebase/firebase-admin';
import { headers } from 'next/headers';
import { auth } from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

async function getAuthenticatedUser() {
  const authorization = headers().get('Authorization');
  if (authorization?.startsWith('Bearer ')) {
    const idToken = authorization.split('Bearer ')[1];
    try {
      const decodedToken = await auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }
  return null;
}

export async function publishPersona(petId: string, personaId: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error('User must be authenticated to publish a persona.');
  }

  const userRef = firestore.collection('users').doc(user.uid);
  const petRef = userRef.collection('petProfiles').doc(petId);
  const personaRef = petRef.collection('aiPersonas').doc(personaId);

  const publicPersonaRef = firestore.collection('publishedPersonas').doc(personaId);

  return firestore.runTransaction(async (transaction) => {
    const [personaDoc, petDoc, userDoc] = await transaction.getAll(personaRef, petRef, userRef);

    if (!personaDoc.exists) {
      throw new Error('This persona does not exist.');
    }
    if (!petDoc.exists) {
        throw new Error('Could not find the associated pet.');
    }
     if (!userDoc.exists) {
        throw new Error('Could not find the user.');
    }

    const personaData = personaDoc.data()!;
    const petData = petDoc.data()!;
    const userData = userDoc.data()!;

    // Check if it's already published
    const publicPersonaDoc = await transaction.get(publicPersonaRef);
    if (publicPersonaDoc.exists) {
       throw new Error('This persona has already been published.');
    }

    const publicData = {
      authorUid: user.uid,
      authorName: userData.displayName || 'Anonymous',
      authorAvatarUrl: userData.photoURL || null,
      petName: petData.name,
      petBreed: petData.breed,
      personaId: personaDoc.id,
      personaTheme: personaData.theme,
      personaLore: personaData.loreText,
      personaImageUrl: personaData.imageUrl,
      publishedDate: FieldValue.serverTimestamp(),
      likes: 0,
      likedBy: [],
    };

    transaction.set(publicPersonaRef, publicData);
    transaction.update(personaRef, { isPublished: true });

    return { id: publicPersonaRef.id, ...publicData };
  });
}

export async function revalidatePWA() {
  // This is a dummy function that will be implemented later.
  // It is used to revalidate the PWA cache.
  return { revalidated: true, now: Date.now() };
}
