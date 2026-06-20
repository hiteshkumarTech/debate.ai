import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDebateHistory } from '../hooks/useDebateHistory';
import { loadSessionDetail } from '../services/sessionService';
import { PERSONALITIES } from '../data/personalities';
import EmailAuthForm from '../components/EmailAuthForm';
import './History.css';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.5C29.6 35.5 26.9 36.4 24 36.4c-5.2 0-9.6-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.1 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.5 5.5C41.4 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}

function formatRelativeDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function scoreTone(score) {
  if (score >= 75) return 'good';
  if (score >= 50) return 'mid';
  return 'low';
}

function LockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function LockedView() {
  const { signInWithGoogle } = useAuth();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const handleGoogleClick = async () => {
    setGoogleError('');
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setGoogleError('Google sign-in failed. Try again or use email below.');
      }
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="history-locked">
      <div className="history-locked-icon" aria-hidden="true">
        <LockIcon />
      </div>
      <h1 className="history-locked-title">Your debate history is private</h1>
      <p className="history-locked-sub">
        Sign in to see your past debates, scores, and progress over time. Your data is only visible to you.
      </p>

      <button type="button" className="history-google-btn" onClick={handleGoogleClick} disabled={googleBusy}>
        <GoogleIcon />
        {googleBusy ? 'Signing in…' : 'Continue with Google'}
      </button>
      {googleError && <p className="history-google-error">{googleError}</p>}

      <div className="history-divider"><span>or</span></div>

      <EmailAuthForm />
    </div>
  );
}

const hdOverlay = { position: 'fixed', inset: 0, background: 'rgba(26,26,46,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 200 };
const hdPanel = { background: '#FFFFFF', borderRadius: 14, maxWidth: 640, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '30px 24px 24px', position: 'relative', boxShadow: '0 8px 24px rgba(26,26,46,0.14)' };
const hdClose = { position: 'absolute', top: 8, right: 14, border: 'none', background: 'transparent', fontSize: 28, lineHeight: 1, color: '#8A8A98', cursor: 'pointer' };

function HistoryDetailModal({ detail, loading, onClose }) {
  const persona = detail ? PERSONALITIES.find((p) => p.id === detail.personality) : null;
  return (
    <div style={hdOverlay} onClick={onClose}>
      <div style={hdPanel} onClick={(e) => e.stopPropagation()}>
        <button type="button" style={hdClose} onClick={onClose} aria-label="Close">×</button>

        {loading && <p style={{ color: '#8A8A98', margin: 0 }}>Loading transcript…</p>}

        {!loading && !detail && (
          <p style={{ color: '#8A8A98', margin: 0 }}>Couldn't load this one — it may have been removed.</p>
        )}

        {!loading && detail && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8A8A98' }}>
              {detail.kind === 'interview' ? 'Interview' : 'Debate'}
            </div>
            <h3 style={{ margin: '4px 0 8px', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 21 }}>{detail.topic}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12.5, color: '#4A4A5C', marginBottom: 16 }}>
              {detail.side && <span>You: {detail.side === 'for' ? 'For' : 'Against'}</span>}
              {persona && <span>{persona.icon} {persona.name}</span>}
              {detail.aiModel && <span>{detail.aiModel}</span>}
              {typeof detail.score?.overall === 'number' && <span>Score: {detail.score.overall}%</span>}
            </div>

            {detail.feedback?.summary && (
              <div style={{ background: '#EEF0FF', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#3F36C9', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI feedback</div>
                <p style={{ margin: 0, fontSize: 13.5, color: '#4A4A5C', lineHeight: 1.5 }}>{detail.feedback.summary}</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {detail.messages.length === 0 ? (
                <p style={{ color: '#8A8A98', fontSize: 13 }}>No transcript was saved for this session.</p>
              ) : (
                detail.messages.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '85%', padding: '10px 13px', borderRadius: 10, fontSize: 14, lineHeight: 1.5, background: m.sender === 'user' ? '#E9F7F3' : '#EEF0FF', color: m.sender === 'user' ? '#0D3D38' : '#221E5C' }}>
                      {m.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UnlockedView() {
  const { user, signOutUser } = useAuth();
  const { history, totalDebates, loading } = useDebateHistory();
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetail(null);
    const d = await loadSessionDetail(id);
    setDetail(d);
    setDetailLoading(false);
  };
  const closeDetail = () => {
    setDetail(null);
    setDetailLoading(false);
  };

  const filtered =
    filter === 'all'
      ? history
      : history.filter((h) => (h.kind || 'debate') === filter);

  const hasInterviews = history.some((h) => h.kind === 'interview');

  return (
    <div className="history-unlocked">
      {(detail || detailLoading) && (
        <HistoryDetailModal detail={detail} loading={detailLoading} onClose={closeDetail} />
      )}

      <div className="history-header">
        <div className="history-user">
          <div className="history-avatar">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            ) : (
              (user.displayName || user.email || '?')[0].toUpperCase()
            )}
          </div>
          <div>
            <div className="history-username">{user.displayName || 'Welcome back'}</div>
            <div className="history-useremail">{user.email}</div>
          </div>
        </div>
        <button type="button" className="history-signout-btn" onClick={signOutUser}>Sign out</button>
      </div>

      {loading ? (
        <div className="history-empty">
          <p className="history-empty-text">Loading your history…</p>
        </div>
      ) : totalDebates === 0 ? (
        <div className="history-empty">
          <p className="history-empty-text">Nothing saved yet. Finish a debate or an interview and it'll show up here.</p>
          <a href="/debate" className="history-empty-cta">Start a debate</a>
        </div>
      ) : (
        <>
          <div className="history-filter-tabs">
            <button type="button" className={`history-filter-tab ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button type="button" className={`history-filter-tab ${filter === 'debate' ? 'is-active' : ''}`} onClick={() => setFilter('debate')}>Debates</button>
            {hasInterviews && (
              <button type="button" className={`history-filter-tab ${filter === 'interview' ? 'is-active' : ''}`} onClick={() => setFilter('interview')}>Interviews</button>
            )}
          </div>

          <div className="history-list">
            {filtered.map((entry) => {
              const isInterview = entry.kind === 'interview';
              const persona = PERSONALITIES.find((p) => p.id === entry.personality);
              const tone = scoreTone(entry.score?.overall || 0);
              const metaParts = isInterview
                ? [formatRelativeDate(entry.completedAt), entry.category, entry.company]
                : [formatRelativeDate(entry.completedAt), persona ? `${persona.icon} ${persona.name}` : null, entry.aiModel];
              return (
                <div
                  className="history-row"
                  key={entry.id}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openDetail(entry.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') openDetail(entry.id); }}
                >
                  <div className="history-row-icon" aria-hidden="true">
                    {isInterview ? <BriefcaseIcon /> : <ChatIcon />}
                  </div>
                  <div className="history-row-main">
                    <span className="history-row-topic">{entry.topic}</span>
                    <span className="history-row-meta">{metaParts.filter(Boolean).join(' · ')}</span>
                  </div>
                  <span className={`history-row-score tone-${tone}`}>{entry.score?.overall || 0}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function History() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="history-page">
        <div className="container history-loading">Checking your session…</div>
      </main>
    );
  }

  return (
    <main className="history-page">
      <div className="container">
        {user ? <UnlockedView /> : <LockedView />}
      </div>
    </main>
  );
}