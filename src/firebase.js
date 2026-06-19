import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase config pulled from env (Firebase Console > Project Settings >
// General > Your apps). See SETUP_GUIDE.md Phase 3.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Whether a real Firebase config is present. Without this guard, getAuth()
// throws `auth/invalid-api-key` on an empty key and crashes the whole app —
// so when Firebase isn't configured (e.g. Phase 1 local run), we simply skip
// initialization and the app runs without login. Auth features light up
// automatically once the VITE_FIREBASE_* vars are set.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} else if (import.meta.env.DEV) {
  // Helpful one-time note in dev so it's obvious why login is unavailable.
  console.info(
    '[DebateAI] Firebase not configured — running without login. ' +
      'Add VITE_FIREBASE_* to .env.local to enable accounts (see SETUP_GUIDE.md Phase 3).',
  );
}

export { auth, googleProvider };
