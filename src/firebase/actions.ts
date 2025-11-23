'use client';

import { 
    collection, 
    doc, 
    getDocs,
    getDoc,
    writeBatch, 
    Firestore 
} from "firebase/firestore";
import { FirebaseStorage } from "firebase/storage";
import { deleteFileByUrl } from "./storage";

/**
 * Performs a cascading delete of a pet and all its associated data in Firestore and Firebase Storage.
 * 
 * @param firestore The Firestore instance.
 * @param storage The Firebase Storage instance.
 * @param userId The ID of the user who owns the pet.
 * @param petId The ID of the pet to delete.
 */
export async function deletePet(
    firestore: Firestore, 
    storage: FirebaseStorage, 
    userId: string, 
    petId: string
) {
    const batch = writeBatch(firestore);
    const petRef = doc(firestore, 'users', userId, 'petProfiles', petId);

    // Get the pet document to access its photoURL before deleting it
    const petDoc = await getDoc(petRef);
    if (petDoc.exists()) {
        const petData = petDoc.data();
        // Delete the main pet profile image from Storage, if it exists
        if (petData.photoURL) {
            await deleteFileByUrl(storage, petData.photoURL);
        }
    }

    // 1. Delete Personas, Stories, Chapters, and their associated images
    const personasCollection = collection(petRef, 'aiPersonas');
    const personasSnapshot = await getDocs(personasCollection);

    for (const personaDoc of personasSnapshot.docs) {
        const personaRef = personaDoc.ref;
        const personaData = personaDoc.data();

        // 2. Handle stories and chapters for each persona
        const storiesCollection = collection(personaRef, 'aiStories');
        const storiesSnapshot = await getDocs(storiesCollection);

        for (const storyDoc of storiesSnapshot.docs) {
            const storyRef = storyDoc.ref;
            
            // 3. Handle chapters and their images for each story
            const chaptersCollection = collection(storyRef, 'chapters');
            const chaptersSnapshot = await getDocs(chaptersCollection);
            
            for (const chapterDoc of chaptersSnapshot.docs) {
                const chapterData = chapterDoc.data();
                // Delete chapter image from Storage
                if (chapterData.imageUrl) {
                    await deleteFileByUrl(storage, chapterData.imageUrl);
                }
                // Queue chapter document for deletion
                batch.delete(chapterDoc.ref);
            }
            // Queue story document for deletion
            batch.delete(storyRef);
        }
        
        // Delete persona image from Storage
        if (personaData.imageUrl) {
            await deleteFileByUrl(storage, personaData.imageUrl);
        }
        // Queue persona document for deletion
        batch.delete(personaRef);
    }
    
    // Finally, queue the main pet profile document for deletion
    batch.delete(petRef);

    // Commit all batched deletions at once
    await batch.commit();
}
