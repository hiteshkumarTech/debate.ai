import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './FloatingSignIn.css';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.5C29.6 35.5 26.9 36.4 24 36.4c-5.2 0-9.6-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.1 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.5 5.5C41.4 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}

export default function FloatingSignIn() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (loading) return null;

  const handleClick = async () => {
    if (user) {
      await signOutUser();
      return;
    }
    setBusy(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User changed their mind — no need to show an error.
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('Your browser blocked the sign-in popup. Allow popups and try again.');
      } else {
        setErrorMsg('Sign-in failed. Check your connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="floating-signin-wrap">
      {errorMsg && <div className="floating-signin-error">{errorMsg}</div>}
      <button
        className={`floating-signin-btn ${user ? 'is-signed-in' : ''}`}
        onClick={handleClick}
        disabled={busy}
        aria-label={user ? `Signed in as ${user.displayName || user.email}. Click to sign out.` : 'Sign in with Google'}
      >
        {user ? (
          <img
            src={user.photoURL || undefined}
            alt=""
            className="floating-signin-avatar"
            referrerPolicy="no-referrer"
          />
        ) : (
          <GoogleIcon />
        )}
        <span className="floating-signin-label">
          {busy ? 'Signing in…' : user ? (user.displayName?.split(' ')[0] || 'Signed in') : 'Sign In With Google'}
        </span>
      </button>
    </div>
  );
}
