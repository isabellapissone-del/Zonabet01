import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the specific database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connection test helper
async function testConnection() {
  try {
    // Read publicly accessible global settings document
    await getDocFromServer(doc(db, 'settings', 'global'));
    console.log('[Firebase] Connection verified.');
  } catch (error: any) {
    if (error.message && error.message.includes('the client is offline')) {
      console.warn("[Firebase] Client is offline or working locally.");
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}
