import { useState, useRef, useCallback, useEffect } from 'react';

// Web Speech API is prefixed in some browsers and entirely absent in others
// (notably Firefox has no SpeechRecognition support as of this writing).
// Every consumer of this hook must check `isRecognitionSupported` /
// `isSynthesisSupported` before relying on mic or speaker behavior.
const SpeechRecognitionImpl =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const speechSynthesisImpl = typeof window !== 'undefined' ? window.speechSynthesis : null;

export function useVoiceAssistant({ language = 'en-US' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [recognitionError, setRecognitionError] = useState(null);

  const recognitionRef = useRef(null);
  const onResultCallbackRef = useRef(null);

  const isRecognitionSupported = Boolean(SpeechRecognitionImpl);
  const isSynthesisSupported = Boolean(speechSynthesisImpl);

  // Recreate the recognizer whenever language changes — SpeechRecognition
  // instances don't support changing `.lang` mid-session reliably.
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
      // Common codes: 'no-speech', 'audio-capture', 'not-allowed', 'network'
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
        // abort() throws if recognition never started — safe to ignore.
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
      // start() throws if recognition is already running — ignore, state
      // will self-correct via onend.
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
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechSynthesisImpl.speak(utterance);
    },
    [language, speakerOn, isSynthesisSupported]
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
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleSpeaker,
  };
}
