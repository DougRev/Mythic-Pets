'use server';
/**
 * @fileOverview A flow for recursively deleting a Firestore document and its subcollections.
 *
 * - deleteDocumentAndSubcollections - A function that handles the recursive deletion process.
 * - DeleteCollectionInput - The input type for the deleteDocumentAndSubcollections function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getFirestore} from 'firebase-admin/firestore';
import {initializeApp, getApps, cert} from 'firebase-admin/app';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

const DeleteCollectionInputSchema = z.object({
  docPath: z.string().describe('The path to the document to be deleted.'),
});
export type DeleteCollectionInput = z.infer<
  typeof DeleteCollectionInputSchema
>;

export async function deleteDocumentAndSubcollections(
  input: DeleteCollectionInput
): Promise<void> {
  return deleteDocumentAndSubcollectionsFlow(input);
}

async function deleteCollection(collectionPath: string, batchSize: number) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(query: FirebaseFirestore.Query, resolve: (value: unknown) => void) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve(true);
        return;
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        // For each document, recursively delete its subcollections
        const subcollections = doc.ref.listCollections();
        subcollections.then(collections => {
            collections.forEach(collection => {
                deleteCollection(collection.path, 100);
            });
        });
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid hitting stack limits
    process.nextTick(() => {
        deleteQueryBatch(query, resolve);
    });
}


const deleteDocumentAndSubcollectionsFlow = ai.defineFlow(
  {
    name: 'deleteDocumentAndSubcollectionsFlow',
    inputSchema: DeleteCollectionInputSchema,
    outputSchema: z.void(),
  },
  async ({docPath}) => {
    const docRef = db.doc(docPath);
    
    // First, delete all subcollections
    const collections = await docRef.listCollections();
    for (const collection of collections) {
      await deleteCollection(collection.path, 100);
    }

    // After all subcollections are deleted, delete the main document
    await docRef.delete();
  }
);
