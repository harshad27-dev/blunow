import admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

let firebaseReady = false;

if (!admin.apps.length && projectId && privateKey && clientEmail) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });
    firebaseReady = true;
  } catch (error) {
    console.warn(
      '[Firebase] Push notifications disabled. Invalid Firebase credentials:',
      error,
    );
  }
} else {
  console.warn('[Firebase] Push notifications disabled. Missing Firebase credentials.');
}

export const firebaseAdmin = admin;
export const fcm = firebaseReady ? admin.messaging() : null;
