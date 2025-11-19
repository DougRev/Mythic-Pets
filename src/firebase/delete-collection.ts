'use client';

import {
  Firestore,
  DocumentReference,
  collection,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';

/**
 * Deletes a document and all of its subcollections recursively.
 *
 * @param {Firestore} db - The Firestore instance.
 * @param {DocumentReference} docRef - The reference to the document to delete.
 */
export async function deleteDocumentAndSubcollections(
  db: Firestore,
  docRef: DocumentReference
) {
  // Get all subcollections
  const subcollections = await getDocs(collection(docRef, '.'));
  
  const batch = writeBatch(db);

  // Recursively delete subcollections
  for (const subcollection of subcollections.docs) {
    const subcollectionRef = collection(docRef, subcollection.id);
    const subcollectionDocs = await getDocs(subcollectionRef);
    subcollectionDocs.forEach(doc => {
        // This is a shallow delete, we need to recurse for sub-sub-collections
        deleteDocumentAndSubcollections(db, doc.ref);
    });
  }

  // Get all documents in the current collection to delete
  const docs = await getDocs(collection(docRef.parent, docRef.id));
   docs.forEach(docPayload => {
    batch.delete(docPayload.ref);
  });
  
  // Delete the main document itself
  batch.delete(docRef);

  await batch.commit();
}
