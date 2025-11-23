'use client';

import {
  ref,
  uploadString,
  getDownloadURL,
  deleteObject,
  FirebaseStorage,
} from 'firebase/storage';

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


/**
 * Deletes a file from Firebase Storage using its download URL.
 *
 * @param {FirebaseStorage} storage - The Firebase Storage instance.
 * @param {string | null | undefined} fileUrl - The public download URL of the file to delete.
 * @returns {Promise<void>} A promise that resolves when the file is deleted.
 */
export async function deleteFileByUrl(storage: FirebaseStorage, fileUrl: string | null | undefined): Promise<void> {
  if (!fileUrl) {
    // If the URL is null or undefined, there's nothing to delete.
    return Promise.resolve();
  }

  try {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch (error: any) {
    // It's common to encounter 'storage/object-not-found' errors if the file
    // has already been deleted or never existed. We can safely ignore these.
    if (error.code === 'storage/object-not-found') {
      console.warn(`File not found, could not delete: ${fileUrl}`);
    } else {
      console.error(`Error deleting file: ${fileUrl}`, error);
      // We don't re-throw here to allow the rest of the deletion process to continue.
      // A failed image deletion shouldn't block the deletion of the database records.
    }
  }
}
