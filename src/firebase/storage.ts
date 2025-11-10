'use client';

import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  FirebaseStorage,
} from 'firebase/storage';
import { useFirebaseApp } from '@/firebase/provider';

/**
 * Custom hook to get an initialized Firebase Storage instance.
 * @returns {FirebaseStorage} The Firebase Storage instance.
 */
export function useStorage(): FirebaseStorage {
  const app = useFirebaseApp();
  return getStorage(app);
}

/**
 * Uploads a file to Firebase Storage.
 *
 * @param {FirebaseStorage} storage - The Firebase Storage instance.
 * @param {string} path - The path where the file will be stored in the bucket.
 * @param {string} dataUrl - The Base64-encoded data URL of the file to upload.
 * @returns {Promise<string>} A promise that resolves with the public download URL of the uploaded file.
 * @throws {Error} Throws an error if the upload fails.
 */
export async function uploadFile(
  storage: FirebaseStorage,
  path: string,
  dataUrl: string
): Promise<string> {
  const storageRef = ref(storage, path);

  try {
    // 'data_url' indicates the string is a data URL.
    const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Upload failed:', error);
    // Re-throw the error to be handled by the caller.
    throw new Error('Failed to upload file.');
  }
}
