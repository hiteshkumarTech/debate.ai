import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase';

const AuthContext = createContext(null);

// Maps Firebase's machine-readable error codes to copy a non-technical
// person can act on. Anything not in this map falls back to a generic
// message rather than leaking a raw Firebase code into the UI.
const FRIENDLY_AUTH_ERRORS = {
  'auth/email-already-in-use': 'An account with that email already exists. Try signing in instead.',
  'auth/invalid-email': "That doesn't look like a valid email address.",
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/wrong-password': 'Incorrect password. Try again or use a different sign-in method.',
  'auth/user-not-found': 'No account found with that email. Try signing up instead.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/popup-closed-by-user': null, // not a real error — user just changed their mind
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

function friendlyAuthError(code) {
  if (code in FRIENDLY_AUTH_ERRORS) return FRIENDLY_AUTH_ERRORS[code];
  return 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Without a configured Firebase project there's no auth to subscribe to —
    // run as a logged-out app (Phase 1) instead of crashing.
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Guard used by every sign-in path so a click gives a clear message rather
  // than an exception when login isn't set up yet.
  const requireAuth = () => {
    if (!isFirebaseConfigured || !auth) {
      const msg = 'Login isn’t set up yet. Add your Firebase keys to enable accounts (see SETUP_GUIDE.md Phase 3).';
      setError(msg);
      throw new Error(msg);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    requireAuth();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = friendlyAuthError(err.code);
      if (message) setError(message);
      throw err;
    }
  };

  const signUpWithEmail = async (email, password) => {
    setError(null);
    requireAuth();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(friendlyAuthError(err.code));
      throw err;
    }
  };

  const signInWithEmail = async (email, password) => {
    setError(null);
    requireAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(friendlyAuthError(err.code));
      throw err;
    }
  };

  const resetPassword = async (email) => {
    setError(null);
    requireAuth();
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(friendlyAuthError(err.code));
      throw err;
    }
  };

  const signOutUser = () => (auth ? signOut(auth) : Promise.resolve());

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        resetPassword,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
