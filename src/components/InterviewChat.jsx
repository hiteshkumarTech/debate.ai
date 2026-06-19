import { useState, useRef, useEffect } from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { LANGUAGES } from '../data/personalities';
import { INTERVIEW_QUESTIONS } from '../data/interviewQuestions';
import { api } from '../services/api';
import { startSession, persistTurns } from '../services/sessionService';
import './DebateChat.css';

// Finds the full question object (with tips/focus) from its text, so the
// interviewer's follow-ups can reference what a strong answer needs.
function findQuestion(categoryId, questionText) {
  const list = INTERVIEW_QUESTIONS[categoryId] || [];
  return list.find((q) => q.text === questionText) || null;
}

// Placeholder interviewer follow-ups. Swap for a real backend call to
// POST /api/interview/message once it exists — same string-return contract
// as the debate mock, so this component won't need to change.
function generateInterviewerReply(userMessage, { questionMeta, turnCount }) {
  const probes = [
    'Can you be more specific about your individual contribution there?',
    'What was the measurable outcome? Put a number on it if you can.',
    'Walk me through your reasoning — why that approach over the alternatives?',
    'What would you do differently if you faced this again?',
    'Interesting. Now what was the hardest trade-off you had to make?',
  ];
  const probe = probes[Math.min(turnCount, probes.length - 1)];
  const hint = questionMeta?.focus ? ` I'm listening for how you handle ${questionMeta.focus.toLowerCase()}.` : '';
  const tooShort = userMessage.trim().length < 40
    ? ' Try to give me a fuller answer — a single sentence is not enough to evaluate.'
    : '';
  return `${probe}${hint}${tooShort}`;
}

export default function InterviewChat({ config, onEndInterview, initialSession = null }) {
  const { question, category, categoryId, company, role, aiModel } = config;
  const questionMeta = findQuestion(categoryId, question);

  const [language, setLanguage] = useState('en-US');
  const [messages, setMessages] = useState(() => {
    if (initialSession?.messages?.length) return initialSession.messages;
    return [
      {
        id: 'opening',
        sender: 'ai',
        text: `Welcome — I'll be your ${company} interviewer for a ${category} question. Here it is: "${question}" Take your time and walk me through your answer.`,
      },
    ];
  });
  const [draft, setDraft] = useState('');
  const [turnCount, setTurnCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Backend session id for persisting turns / enabling resume.
  const sessionIdRef = useRef(initialSession?.id || null);

  const voice = useVoiceAssistant({ language });

  // Create an active backend session on mount for a new interview (no-op
  // when resuming or when there's no backend).
  useEffect(() => {
    if (initialSession?.id) return;
    let cancelled = false;
    (async () => {
      const id = await startSession({
        kind: 'interview',
        topic: question,
        aiModel,
        category,
        company,
      });
      if (!cancelled && id) sessionIdRef.current = id;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg = { id: `u-${Date.now()}`, sender: 'user', text: trimmed };
    const historyForApi = [...messages, userMsg].map((m) => ({
      sender: m.sender,
      content: m.text,
    }));
    setMessages((prev) => [...prev, userMsg]);
    setDraft('');

    const currentTurn = turnCount;
    setTurnCount((t) => t + 1);

    let reply;
    if (api.isConfigured()) {
      try {
        const res = await api.aiReply({
          kind: 'interview',
          topic: question,
          history: historyForApi,
          ai_model: aiModel,
          category,
          company,
        });
        reply = res.reply;
      } catch {
        reply = generateInterviewerReply(trimmed, { questionMeta, turnCount: currentTurn });
      }
    } else {
      await new Promise((r) => setTimeout(r, 500));
      reply = generateInterviewerReply(trimmed, { questionMeta, turnCount: currentTurn });
    }

    setMessages((prev) => {
      const updated = [...prev, { id: `a-${Date.now()}`, sender: 'ai', text: reply }];
      persistTurns(sessionIdRef.current, updated);
      return updated;
    });
    voice.speak(reply);
  };

  const handleMicToggle = () => {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    voice.startListening((finalText) => sendMessage(finalText));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(draft);
  };

  return (
    <div className="dchat">
      <div className="dchat-topbar">
        <div className="dchat-topic">
          <span className="dchat-topic-label">{category} interview</span>
          <span className="dchat-topic-text">{question}</span>
        </div>
        <div className="dchat-meta">
          <span className="dchat-meta-chip">{company}</span>
          <span className="dchat-meta-chip">{role}</span>
          <span className="dchat-meta-chip">{aiModel}</span>
        </div>
        <button type="button" className="dchat-end-btn" onClick={() => onEndInterview(messages, sessionIdRef.current)}>
          End interview
        </button>
      </div>

      <div className="dchat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`dchat-row ${m.sender === 'user' ? 'is-user' : ''}`}>
            <div className="dchat-avatar">{m.sender === 'user' ? 'You' : 'Int'}</div>
            <div className="dchat-bubble">
              {m.sender === 'ai' && voice.isSpeaking && m.id === messages[messages.length - 1].id && (
                <span className="dchat-speaking-tag">
                  <SpeakerWaveIcon /> Speaking…
                </span>
              )}
              {m.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="dchat-input-area">
        <div className="dchat-lang-bar">
          <label htmlFor="ichat-lang" className="dchat-lang-label">
            <GlobeIcon /> Language
          </label>
          <select
            id="ichat-lang"
            className="dchat-lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          {!voice.isRecognitionSupported && (
            <span className="dchat-unsupported-note">Voice input isn't supported in this browser — typing still works.</span>
          )}
        </div>

        <form className="dchat-input-row" onSubmit={handleSubmit}>
          <button
            type="button"
            className={`dchat-mic-btn ${voice.isListening ? 'is-listening' : ''}`}
            onClick={handleMicToggle}
            disabled={!voice.isRecognitionSupported}
            aria-label={voice.isListening ? 'Stop listening' : 'Start voice input'}
            title={voice.isRecognitionSupported ? 'Speak your answer' : 'Voice input not supported in this browser'}
          >
            <MicIcon />
          </button>

          <input
            type="text"
            className="dchat-text-input"
            placeholder={voice.isListening ? 'Listening… speak now' : 'Type your answer, or press the mic to speak'}
            value={voice.isListening ? voice.transcript : draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={voice.isListening}
          />

          <button
            type="button"
            className={`dchat-speaker-btn ${voice.speakerOn ? 'is-on' : ''}`}
            onClick={voice.toggleSpeaker}
            disabled={!voice.isSynthesisSupported}
            aria-label={voice.speakerOn ? 'Turn off interviewer voice' : 'Turn on interviewer voice'}
            title={voice.isSynthesisSupported ? 'Toggle interviewer voice' : 'Voice output not supported in this browser'}
          >
            {voice.speakerOn ? <SpeakerWaveIcon /> : <SpeakerMuteIcon />}
          </button>

          <button type="submit" className="dchat-send-btn">Send</button>
        </form>

        {voice.recognitionError && (
          <p className="dchat-error-note">
            {voice.recognitionError === 'not-allowed'
              ? 'Microphone access was blocked. Allow it in your browser settings to use voice input.'
              : 'Voice input had a problem — try again or type your answer.'}
          </p>
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
