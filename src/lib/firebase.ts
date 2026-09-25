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
    // Try to get a non-existent doc just to verify path and credentials
    await getDocFromServer(doc(db, 'system_health', 'connection-test'));
    console.log('[Firebase] Connection verified.');
  } catch (error: any) {
    if (error.message && error.message.includes('the client is offline')) {
      console.error("[Firebase] Client is offline. Please check your configuration.");
    } else {
      console.warn("[Firebase] Initial connection check:", error.message);
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}
