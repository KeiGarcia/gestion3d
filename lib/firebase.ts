import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app

/*
 * Reglas de seguridad sugeridas para Firestore (firestore.rules):
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     function isAuthenticated() {
 *       return request.auth != null;
 *     }
 *     function isOwner(userId) {
 *       return request.auth.uid == userId;
 *     }
 *
 *     match /materiales/{docId} {
 *       allow read, write: if isAuthenticated() && isOwner(resource.data.userId);
 *       allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
 *     }
 *
 *     match /pedidos/{docId} {
 *       allow read, write: if isAuthenticated() && isOwner(resource.data.userId);
 *       allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
 *     }
 *
 *     match /configuraciones/{docId} {
 *       allow read, write: if isAuthenticated() && isOwner(resource.data.userId);
 *       allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
 *     }
 *   }
 * }
 */
