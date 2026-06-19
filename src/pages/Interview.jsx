import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import InterviewSetup from '../components/InterviewSetup';
import InterviewChat from '../components/InterviewChat';
import InterviewReport from '../components/InterviewReport';
import { loadSessionForResume } from '../services/sessionService';
import './Interview.css';

export default function Interview() {
  const [stage, setStage] = useState('setup'); // 'setup' | 'chat' | 'report'
  const [config, setConfig] = useState(null);
  const [finishedMessages, setFinishedMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [resumeSession, setResumeSession] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // ?resume=<id> -> load that unfinished interview and jump into the chat
  // with its transcript rehydrated.
  useEffect(() => {
    const resumeId = searchParams.get('resume');
    if (!resumeId) return;
    let cancelled = false;
    (async () => {
      const loaded = await loadSessionForResume(resumeId);
      if (cancelled) return;
      if (loaded) {
        // The interview chat expects `question` (not `topic`) plus
        // categoryId; map the loaded session's fields onto its config shape.
        setConfig({
          question: loaded.config.topic,
          category: loaded.config.category,
          categoryId: null, // not stored; questionMeta lookup just returns null
          company: loaded.config.company,
          role: loaded.config.role,
          aiModel: loaded.config.aiModel,
        });
        setResumeSession(loaded);
        setSessionId(loaded.id);
        setStage('chat');
      }
      setSearchParams({}, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = (cfg) => {
    setConfig(cfg);
    setResumeSession(null);
    setSessionId(null);
    setStage('chat');
  };

  const handleEnd = (messages, id) => {
    setFinishedMessages(messages);
    if (id) setSessionId(id);
    setStage('report');
  };

  const handleRetry = () => {
    setFinishedMessages([]);
    setResumeSession(null);
    setSessionId(null);
    setStage('chat');
  };

  const handleNew = () => {
    setConfig(null);
    setFinishedMessages([]);
    setResumeSession(null);
    setSessionId(null);
    setStage('setup');
  };

  return (
    <main className="interview-page">
      <div className="container">
        {stage === 'setup' && <InterviewSetup onStart={handleStart} />}
        {stage === 'chat' && (
          <InterviewChat
            config={config}
            onEndInterview={handleEnd}
            initialSession={resumeSession}
          />
        )}
        {stage === 'report' && (
          <InterviewReport
            config={config}
            messages={finishedMessages}
            sessionId={sessionId}
            onRetry={handleRetry}
            onNewInterview={handleNew}
          />
        )}
      </div>
    </main>
  );
}
