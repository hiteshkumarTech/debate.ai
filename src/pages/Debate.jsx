import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DebateSetup from '../components/DebateSetup';
import DebateChat from '../components/DebateChat';
import DebateReport from '../components/DebateReport';
import { loadSessionForResume } from '../services/sessionService';
import './Debate.css';

export default function Debate() {
  // 'setup' | 'chat' | 'report'
  const [stage, setStage] = useState('setup');
  const [debateConfig, setDebateConfig] = useState(null);
  const [finishedMessages, setFinishedMessages] = useState([]);
  // The backend session id for the current debate (for completing the right
  // session and avoiding duplicates).
  const [sessionId, setSessionId] = useState(null);
  // When resuming, the loaded session (id + transcript) passed to DebateChat.
  const [resumeSession, setResumeSession] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // If the URL has ?resume=<id>, load that unfinished session and jump
  // straight into the chat with its transcript rehydrated.
  useEffect(() => {
    const resumeId = searchParams.get('resume');
    if (!resumeId) return;
    let cancelled = false;
    (async () => {
      const loaded = await loadSessionForResume(resumeId);
      if (cancelled) return;
      if (loaded) {
        setDebateConfig(loaded.config);
        setResumeSession(loaded);
        setSessionId(loaded.id);
        setStage('chat');
      }
      // Clear the param either way so a refresh doesn't re-trigger a load
      // (and a stale/invalid id just falls back to the setup screen).
      setSearchParams({}, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = (config) => {
    setDebateConfig(config);
    setResumeSession(null);
    setSessionId(null);
    setStage('chat');
  };

  const handleEndDebate = (messages, id) => {
    setFinishedMessages(messages);
    if (id) setSessionId(id);
    setStage('report');
  };

  const handleRetrySameTopic = () => {
    setFinishedMessages([]);
    setResumeSession(null);
    setSessionId(null); // a retry is a fresh session
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
        {stage === 'setup' && <DebateSetup onStart={handleStart} />}

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
