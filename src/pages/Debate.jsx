import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DebateSetup from '../components/DebateSetup';
import DebateChat from '../components/DebateChat';
import DebateReport from '../components/DebateReport';
import { loadSessionForResume, loadLatestActiveSession, discardSession } from '../services/sessionService';
import './Debate.css';

const resumeBannerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 16, flexWrap: 'wrap', padding: '12px 16px', marginBottom: 20,
  borderRadius: 10, border: '1.5px solid rgba(79,70,229,0.35)', background: '#EEF0FF',
};
const resumeBtnStyle = {
  padding: '8px 16px', borderRadius: 999, border: 'none',
  background: '#1A1A2E', color: '#FAF9F6', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const discardBtnStyle = {
  padding: '8px 16px', borderRadius: 999, border: '1.5px solid rgba(26,26,46,0.18)',
  background: 'transparent', color: '#1A1A2E', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

export default function Debate() {
  const [stage, setStage] = useState('setup');
  const [debateConfig, setDebateConfig] = useState(null);
  const [finishedMessages, setFinishedMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [resumeSession, setResumeSession] = useState(null);
  // A still-active debate found on mount, offered via the resume banner.
  const [resumable, setResumable] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // On mount: resume a specific session from ?resume=<id>, OR detect the
  // user's latest unfinished debate and offer to resume it -- so navigating
  // away from an in-progress debate and back doesn't lose it.
  useEffect(() => {
    let cancelled = false;
    const resumeId = searchParams.get('resume');

    (async () => {
      if (resumeId) {
        const loaded = await loadSessionForResume(resumeId);
        if (cancelled) return;
        if (loaded) {
          setDebateConfig(loaded.config);
          setResumeSession(loaded);
          setSessionId(loaded.id);
          setStage('chat');
        }
        setSearchParams({}, { replace: true });
        return;
      }
      const latest = await loadLatestActiveSession('debate');
      if (!cancelled && latest && (latest.messages?.length || 0) > 1) {
        setResumable(latest);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = (config) => {
    // Starting a brand-new debate: drop any unfinished one we were offering.
    if (resumable) {
      discardSession(resumable.id);
      setResumable(null);
    }
    setDebateConfig(config);
    setResumeSession(null);
    setSessionId(null);
    setStage('chat');
  };

  const handleResumeActive = () => {
    if (!resumable) return;
    setDebateConfig(resumable.config);
    setResumeSession(resumable);
    setSessionId(resumable.id);
    setResumable(null);
    setStage('chat');
  };

  const handleDiscardActive = () => {
    if (resumable) discardSession(resumable.id);
    setResumable(null);
  };

  const handleEndDebate = (messages, id) => {
    setFinishedMessages(messages);
    if (id) setSessionId(id);
    setStage('report');
  };

  const handleRetrySameTopic = () => {
    setFinishedMessages([]);
    setResumeSession(null);
    setSessionId(null);
    setStage('chat');
  };

  const handleNewDebate = () => {
    setDebateConfig(null);
    setFinishedMessages([]);
    setResumeSession(null);
    setSessionId(null);
    setStage('setup');
  };

  return (
    <main className="debate-page">
      <div className="container">
        {stage === 'setup' && (
          <>
            {resumable && (
              <div style={resumeBannerStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <strong style={{ fontSize: 14 }}>You have an unfinished debate</strong>
                  <span style={{ fontSize: 13, color: '#4A4A5C' }}>
                    “{resumable.config.topic}” — pick up where you left off?
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button type="button" style={resumeBtnStyle} onClick={handleResumeActive}>Resume</button>
                  <button type="button" style={discardBtnStyle} onClick={handleDiscardActive}>Start fresh</button>
                </div>
              </div>
            )}
            <DebateSetup onStart={handleStart} />
          </>
        )}

        {stage === 'chat' && (
          <DebateChat
            config={debateConfig}
            onEndDebate={handleEndDebate}
            initialSession={resumeSession}
          />
        )}

        {stage === 'report' && (
          <DebateReport
            config={debateConfig}
            messages={finishedMessages}
            sessionId={sessionId}
            onRetry={handleRetrySameTopic}
            onNewDebate={handleNewDebate}
          />
        )}
      </div>
    </main>
  );
}