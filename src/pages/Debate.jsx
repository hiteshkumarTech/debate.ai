import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DebateSetup from '../components/DebateSetup';
import DebateChat from '../components/DebateChat';
import DebateReport from '../components/DebateReport';
import { loadSessionForResume } from '../services/sessionService';
import './Debate.css';

// In-progress debate lives in sessionStorage: it survives switching tabs and
// in-session refreshes, and is cleared when the tab/window closes (or when
// the debate ends).
const DRAFT_KEY = 'debateai_inprogress_v1';

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveDraft(draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable - non-fatal */
  }
}
function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* non-fatal */
  }
}

export default function Debate() {
  const [stage, setStage] = useState('setup');
  const [debateConfig, setDebateConfig] = useState(null);
  const [finishedMessages, setFinishedMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [resumeSession, setResumeSession] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // On mount: ?resume=<id> wins; otherwise restore an in-progress debate from
  // this browser session so leaving the tab and coming back drops you right
  // back into the conversation, no prompt.
  useEffect(() => {
    let cancelled = false;
    const resumeId = searchParams.get('resume');

    if (resumeId) {
      (async () => {
        const loaded = await loadSessionForResume(resumeId);
        if (cancelled) return;
        if (loaded) {
          setDebateConfig(loaded.config);
          setResumeSession(loaded);
          setSessionId(loaded.id);
          setStage('chat');
        }
        setSearchParams({}, { replace: true });
      })();
      return () => { cancelled = true; };
    }

    const draft = loadDraft();
    if (draft && draft.stage === 'chat' && draft.config && (draft.messages?.length || 0) > 0) {
      setDebateConfig(draft.config);
      setResumeSession({ id: draft.sessionId || null, config: draft.config, messages: draft.messages });
      setSessionId(draft.sessionId || null);
      setStage('chat');
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = (config) => {
    clearDraft();
    setDebateConfig(config);
    setResumeSession(null);
    setSessionId(null);
    setStage('chat');
  };

  // Called by DebateChat on every transcript change, so an in-progress debate
  // is always recoverable after a tab switch.
  const handleLiveUpdate = ({ sessionId: liveId, messages }) => {
    if (liveId) setSessionId(liveId);
    saveDraft({ stage: 'chat', config: debateConfig, sessionId: liveId, messages });
  };

  const handleEndDebate = (messages, id) => {
    clearDraft();
    setFinishedMessages(messages);
    if (id) setSessionId(id);
    setStage('report');
  };

  const handleRetrySameTopic = () => {
    clearDraft();
    setFinishedMessages([]);
    setResumeSession(null);
    setSessionId(null);
    setStage('chat');
  };

  const handleNewDebate = () => {
    clearDraft();
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
            onLiveUpdate={handleLiveUpdate}
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