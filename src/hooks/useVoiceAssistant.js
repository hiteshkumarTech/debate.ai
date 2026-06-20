import { useState, useRef, useCallback, useEffect } from 'react';

const SpeechRecognitionImpl =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const speechSynthesisImpl = typeof window !== 'undefined' ? window.speechSynthesis : null;

// Best-effort gender heuristics by voice name (the Web Speech API doesn't
// expose gender). Voices vary by OS/browser, so we match common names and
// fall back gracefully.
const FEMALE_HINT = /female|samantha|victoria|karen|moira|tessa|fiona|zira|susan|allison|ava|serena|aria|jenny|sonia|libby|michelle|catherine|hazel|linda|heera|kalpana|swara|salli|joanna|kimberly|amy|emma|google us english/i;
const MALE_HINT = /\bmale\b|daniel|alex|fred|thomas|oliver|david|mark|george|rishi|guy|davis|tony|ryan|matthew|brian|arthur|hemant|google uk english male/i;

function pickVoice(voices, lang, gender) {
  if (!voices || voices.length === 0) return null;
  const base = (lang || 'en').split('-')[0].toLowerCase();
  const langVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(base));
  const pool = langVoices.length ? langVoices : voices;
  const wanted = gender === 'male' ? MALE_HINT : FEMALE_HINT;
  const avoid = gender === 'male' ? FEMALE_HINT : MALE_HINT;
  return (
    pool.find((v) => wanted.test(v.name)) ||
    pool.find((v) => !avoid.test(v.name)) ||
    pool[0] ||
    null
  );
}

export function useVoiceAssistant({ language = 'en-US' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [recognitionError, setRecognitionError] = useState(null);
  const [voices, setVoices] = useState([]);
  const [voiceGender, setVoiceGender] = useState('female');

  const recognitionRef = useRef(null);
  const onResultCallbackRef = useRef(null);

  const isRecognitionSupported = Boolean(SpeechRecognitionImpl);
  const isSynthesisSupported = Boolean(speechSynthesisImpl);

  // Synthesis voices populate asynchronously in most browsers.
  useEffect(() => {
    if (!isSynthesisSupported) return;
    const load = () => setVoices(speechSynthesisImpl.getVoices() || []);
    load();
    speechSynthesisImpl.addEventListener?.('voiceschanged', load);
    return () => speechSynthesisImpl.removeEventListener?.('voiceschanged', load);
  }, [isSynthesisSupported]);

  useEffect(() => {
    if (!isRecognitionSupported) return;

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const result = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setTranscript(result);
      if (event.results[event.results.length - 1].isFinal && onResultCallbackRef.current) {
        onResultCallbackRef.current(result);
      }
    };

    recognition.onerror = (event) => {
      setRecognitionError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // abort() throws if recognition never started - safe to ignore.
      }
    };
  }, [language, isRecognitionSupported]);

  const startListening = useCallback((onFinalResult) => {
    if (!recognitionRef.current) return;
    setRecognitionError(null);
    setTranscript('');
    onResultCallbackRef.current = onFinalResult || null;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // start() throws if recognition is already running - ignore.
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback(
    (text) => {
      if (!isSynthesisSupported || !speakerOn || !text) return;
      speechSynthesisImpl.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 1;
      const chosen = pickVoice(voices, language, voiceGender);
      if (chosen) utterance.voice = chosen;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechSynthesisImpl.speak(utterance);
    },
    [language, speakerOn, isSynthesisSupported, voices, voiceGender]
  );

  const stopSpeaking = useCallback(() => {
    if (!isSynthesisSupported) return;
    speechSynthesisImpl.cancel();
    setIsSpeaking(false);
  }, [isSynthesisSupported]);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((prev) => {
      if (prev) stopSpeaking();
      return !prev;
    });
  }, [stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    speakerOn,
    transcript,
    recognitionError,
    isRecognitionSupported,
    isSynthesisSupported,
    voiceGender,
    setVoiceGender,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleSpeaker,
  };
}