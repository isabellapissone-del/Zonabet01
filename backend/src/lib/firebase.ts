import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Must specify databaseId (firebaseConfig.firestoreDatabaseId) for getFirestore
export const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export async function validateFirestoreConnection() {
  try {
    const testDocRef = doc(firestore, 'settings', '_health');
    await getDocFromServer(testDocRef);
    console.log('[Firestore] Conexão estabelecida com sucesso ao banco:', firebaseConfig.firestoreDatabaseId);
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('[Firestore] Cliente offline. Verifique a configuração do Firebase.');
    } else {
      console.log('[Firestore] Teste de conexão finalizado (o documento de teste pode não existir ainda):', error.message || error);
    }
  }
}
