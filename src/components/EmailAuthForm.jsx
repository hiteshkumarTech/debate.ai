import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './EmailAuthForm.css';

const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account already exists with that email. Try signing in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'That email address doesn\u2019t look right.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
};

function readableError(code) {
  return ERROR_MESSAGES[code] || 'Something went wrong. Please try again.';
}

export default function EmailAuthForm() {
  const { signUpWithEmail, signInWithEmail, resetPassword } = useAuth();

  const [mode, setMode] = useState('sign-in'); // 'sign-in' | 'sign-up'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setResetSent(false);

    if (!email.trim() || !password) {
      setErrorMsg('Enter both an email and a password.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'sign-up') {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      // On success, the AuthContext's onAuthStateChanged listener picks
      // up the new user automatically — nothing else to do here.
    } catch (err) {
      setErrorMsg(readableError(err.code));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg('');
    if (!email.trim()) {
      setErrorMsg('Enter your email above first, then click "Forgot password".');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err) {
      setErrorMsg(readableError(err.code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="email-auth-form" onSubmit={handleSubmit}>
      <div className="email-auth-tabs">
        <button
          type="button"
          className={`email-auth-tab ${mode === 'sign-in' ? 'is-active' : ''}`}
          onClick={() => { setMode('sign-in'); setErrorMsg(''); setResetSent(false); }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`email-auth-tab ${mode === 'sign-up' ? 'is-active' : ''}`}
          onClick={() => { setMode('sign-up'); setErrorMsg(''); setResetSent(false); }}
        >
          Create account
        </button>
      </div>

      <label className="email-auth-label" htmlFor="email-auth-email">Email</label>
      <input
        id="email-auth-email"
        type="email"
        className="email-auth-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
      />

      <label className="email-auth-label" htmlFor="email-auth-password">Password</label>
      <input
        id="email-auth-password"
        type="password"
        className="email-auth-input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === 'sign-up' ? 'At least 6 characters' : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
        autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
      />

      {mode === 'sign-in' && (
        <button
          type="button"
          className="email-auth-forgot"
          onClick={handleForgotPassword}
          disabled={busy}
        >
          Forgot password?
        </button>
      )}

      {errorMsg && <p className="email-auth-error">{errorMsg}</p>}
      {resetSent && <p className="email-auth-success">Password reset email sent — check your inbox.</p>}

      <button type="submit" className="email-auth-submit" disabled={busy}>
        {busy ? 'Please wait\u2026' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}
