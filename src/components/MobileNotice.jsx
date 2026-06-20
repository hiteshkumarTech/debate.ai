import { useState, useEffect } from 'react';

// Small dismissible banner shown on narrow screens, nudging users toward
// desktop mode + signing up. Dismissal lasts for the browser session.
const DISMISS_KEY = 'debateai_mobile_notice_dismissed';

export default function MobileNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      dismissed = false;
    }
    setShow(isMobile && !dismissed);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div style={noticeWrap} role="note">
      <span style={{ flex: 1 }}>
        For the best experience, switch to <strong>Desktop mode</strong> in your browser and{' '}
        <strong>sign up</strong> — voice, scoring, and history all work better on a larger screen.
      </span>
      <button type="button" onClick={dismiss} style={noticeBtn} aria-label="Dismiss">
        Got it
      </button>
    </div>
  );
}

const noticeWrap = {
  position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 300,
  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
  borderRadius: 12, background: '#1A1A2E', color: '#FAF9F6', fontSize: 13,
  lineHeight: 1.4, boxShadow: '0 8px 24px rgba(26,26,46,0.24)',
};
const noticeBtn = {
  flexShrink: 0, border: '1px solid rgba(250,249,246,0.4)', background: 'transparent',
  color: '#FAF9F6', borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
};