import { useState, useRef, useEffect } from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { LANGUAGES, PERSONALITIES } from '../data/personalities';
import { api, ApiError } from '../services/api';
import { startSession, persistTurns } from '../services/sessionService';
import './DebateChat.css';

// LOCAL-DEV ONLY placeholder. Used *only* when no backend is configured at
// all (VITE_API_URL unset) so the UI is still demoable offline. In
// production the real backend is always called, and on failure we now
// surface the actual error instead of faking a reply.
function generateMockReply(userMessage, { side, personality }) {
  const opposite = side === 'for' ? 'against' : 'for';
  const intensity = {
    'friendly-teacher': 'That\'s a reasonable start. Can you back it up with a specific example?',
    'strict-professor': 'Weak premise. Where is your evidence for that claim?',
    'aggressive-opponent': 'That argument falls apart the moment anyone asks for a source.',
    'job-interviewer': 'Interesting point Ã¢â‚¬â€ walk me through how you\'d defend that under pressure.',
  };
  const fallback = intensity[personality] || intensity['strict-professor'];
  return `[local placeholder Ã¢â‚¬â€ no backend configured] ${fallback} I'm arguing ${opposite} this topic, and "${userMessage.slice(0, 60)}${userMessage.length > 60 ? 'Ã¢â‚¬Â¦' : ''}" doesn't address the core counter-evidence yet.`;
}

// Turn a backend/network failure into a clear, human message shown in the
// chat Ã¢â‚¬â€ never a fake AI reply. This fixes the bug where a 401 (not signed
// in) was silently swallowed and replaced with a canned line.
function describeApiError(err) {
  const status = err instanceof ApiError ? err.status : undefined;
  if (status === 401 || status === 403) {
    return 'You need to be signed in to debate with the AI. Please log in, then send your message again.';
  }
  if (status === 0) {
    return "Couldn't reach the server Ã¢â‚¬â€ it may be waking up (the free backend sleeps after a few minutes idle). Wait ~30 seconds and send your message again.";
  }
  if (status === 429) {
    return 'The AI is being rate-limited right now. Wait a few seconds, then try again.';
  }
  if (status === 502 || status === 503) {
    return `The AI provider had a problem: ${err.message}. Please try again in a moment.`;
  }
  return `Couldn't get a reply: ${err?.message || 'unknown error'}. Please try again.`;
}

export default function DebateChat({ config, onEndDebate, initialSession = null, onLiveUpdate }) {
  const { topic, side, personality, aiModel, customPersonaInstruction } = config;
  const personaInfo = PERSONALITIES.find((p) => p.id === personality);

  const [language, setLanguage] = useState('en-US');
  const [messages, setMessages] = useState(() => {
    if (initialSession?.messages?.length) return initialSession.messages;
    return [
      {
        id: 'opening',
        sender: 'ai',
        text: `I'll be arguing ${side === 'for' ? 'against' : 'for'} "${topic}". Make your opening case.`,
      },
    ];
  });
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [apiError, setApiError] = useState(null);
  const messagesEndRef = useRef(null);

  const sessionIdRef = useRef(initialSession?.id || null);
  const [activeSessionId, setActiveSessionId] = useState(initialSession?.id || null);

  const voice = useVoiceAssistant({ language });

  useEffect(() => {
    if (initialSession?.id) return;
    let cancelled = false;
    (async () => {
      const id = await startSession({
        kind: 'debate',
        topic,
        aiModel,
        side,
        personality,
      });
      if (!cancelled && id) { sessionIdRef.current = id; setActiveSessionId(id); }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Report live transcript + session id up so the page can persist an
  // in-progress debate (survives tab switches; cleared when the tab closes).
  useEffect(() => {
    onLiveUpdate?.({ sessionId: activeSessionId, messages });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, activeSessionId]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    const userMsg = { id: `u-${Date.now()}`, sender: 'user', text: trimmed };
    const historyForApi = [...messages, userMsg].map((m) => ({
      sender: m.sender,
      content: m.text,
    }));
    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    setApiError(null);

    const appendReply = (reply) => {
      const aiMsg = { id: `a-${Date.now()}`, sender: 'ai', text: reply };
      setMessages((prev) => {
        const updated = [...prev, aiMsg];
        persistTurns(sessionIdRef.current, updated);
        return updated;
      });
      voice.speak(reply);
    };

    if (!api.isConfigured()) {
      await new Promise((r) => setTimeout(r, 400));
      appendReply(generateMockReply(trimmed, { side, personality }));
      return;
    }

    setIsThinking(true);
    try {
      const res = await api.aiReply({
        kind: 'debate',
        topic,
        history: historyForApi,
        ai_model: aiModel,
        side,
        personality,
        custom_persona_instruction: customPersonaInstruction || null,
      });
      appendReply(res.reply);
    } catch (err) {
      setApiError(describeApiError(err));
    } finally {
      setIsThinking(false);
    }
  };

  const handleMicToggle = () => {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    voice.startListening((finalText) => {
      sendMessage(finalText);
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendMessage(draft);
  };

  return (
    <div className="dchat">
      <div className="dchat-topbar">
        <div className="dchat-topic">
          <span className="dchat-topic-label">Topic</span>
          <span className="dchat-topic-text">{topic}</span>
        </div>
        <div className="dchat-meta">
          <span className="dchat-meta-chip">You: {side === 'for' ? 'For' : 'Against'}</span>
          <span className="dchat-meta-chip">{personaInfo?.icon} {personaInfo?.name}</span>
          <span className="dchat-meta-chip">{aiModel}</span>
        </div>
        <button type="button" className="dchat-end-btn" onClick={() => onEndDebate(messages, sessionIdRef.current)}>
          End debate
        </button>
      </div>

      <div className="dchat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`dchat-row ${m.sender === 'user' ? 'is-user' : ''}`}>
            <div className="dchat-avatar">{m.sender === 'user' ? 'You' : 'AI'}</div>
            <div className="dchat-bubble">
              {m.sender === 'ai' && voice.isSpeaking && m.id === messages[messages.length - 1].id && (
                <span className="dchat-speaking-tag">
                  <SpeakerWaveIcon /> SpeakingÃ¢â‚¬Â¦
                </span>
              )}
              {m.text}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="dchat-row">
            <div className="dchat-avatar">AI</div>
            <div className="dchat-bubble dchat-thinking">ThinkingÃ¢â‚¬Â¦</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="dchat-input-area">
        <div className="dchat-lang-bar">
          <label htmlFor="dchat-lang" className="dchat-lang-label">
            <GlobeIcon /> Language
          </label>
          <select
            id="dchat-lang"
            className="dchat-lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>

          <label className="dchat-lang-label" htmlFor="dchat-voice">Voice</label>
          <select
            id="dchat-voice"
            className="dchat-lang-select"
            value={voice.voiceGender}
            onChange={(e) => voice.setVoiceGender(e.target.value)}
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>

          {!voice.isRecognitionSupported && (
            <span className="dchat-unsupported-note">Voice input isn't supported in this browser Ã¢â‚¬â€ typing still works.</span>
          )}
        </div>

        <form className="dchat-input-row" onSubmit={handleFormSubmit}>
          <button
            type="button"
            className={`dchat-mic-btn ${voice.isListening ? 'is-listening' : ''}`}
            onClick={handleMicToggle}
            disabled={!voice.isRecognitionSupported || isThinking}
            aria-label={voice.isListening ? 'Stop listening' : 'Start voice input'}
            title={voice.isRecognitionSupported ? 'Speak your argument' : 'Voice input not supported in this browser'}
          >
            <MicIcon />
          </button>

          <input
            type="text"
            className="dchat-text-input"
            placeholder={voice.isListening ? 'ListeningÃ¢â‚¬Â¦ speak now' : 'Type your argument, or press the mic to speak'}
            value={voice.isListening ? voice.transcript : draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={voice.isListening || isThinking}
          />

          <button
            type="button"
            className={`dchat-speaker-btn ${voice.speakerOn ? 'is-on' : ''}`}
            onClick={voice.toggleSpeaker}
            disabled={!voice.isSynthesisSupported}
            aria-label={voice.speakerOn ? 'Turn off AI voice' : 'Turn on AI voice'}
            title={voice.isSynthesisSupported ? 'Toggle AI voice output' : 'Voice output not supported in this browser'}
          >
            {voice.speakerOn ? <SpeakerWaveIcon /> : <SpeakerMuteIcon />}
          </button>

          <button type="submit" className="dchat-send-btn" disabled={isThinking}>
            {isThinking ? 'ThinkingÃ¢â‚¬Â¦' : 'Send'}
          </button>
        </form>

        {voice.recognitionError && (
          <p className="dchat-error-note">
            {voice.recognitionError === 'not-allowed'
              ? 'Microphone access was blocked. Allow it in your browser settings to use voice input.'
              : 'Voice input had a problem Ã¢â‚¬â€ try again or type your argument.'}
          </p>
        )}

        {apiError && (
          <p className="dchat-error-note">{apiError}</p>
        )}
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function SpeakerWaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SpeakerMuteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
    </svg>
  );
}