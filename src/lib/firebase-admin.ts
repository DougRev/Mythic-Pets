import admin from 'firebase-admin';

let firebaseAdminInstance: admin.app.App | null = null;

export function getFirebaseAdmin() {
    if (firebaseAdminInstance) {
        return firebaseAdminInstance;
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    if (admin.apps.length > 0) {
        firebaseAdminInstance = admin.app();
    } else {
        firebaseAdminInstance = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    return firebaseAdminInstance;
}
