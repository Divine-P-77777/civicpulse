import { useRef, useEffect, useCallback } from 'react';

interface UseLiveAudioParams {
  wsReadyState: number | undefined;
  sendUserText: (text: string) => void;
  requestGreeting: () => void;
  status: string;
  setStatus: (s: any) => void;
  setTranscript: (t: string) => void;
  language: 'en' | 'hi';
  audioQueueRef: React.MutableRefObject<string[]>;
}

export function useLiveAudio({
  wsReadyState, sendUserText, requestGreeting, status, setStatus, setTranscript, language, audioQueueRef
}: UseLiveAudioParams) {
  const isPlayingRef = useRef<boolean>(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const finalTranscriptRef = useRef<string>('');

  useEffect(() => {
    isListeningRef.current = (status === 'listening');
  }, [status]);

  // ─── Audio Playback ────────────────────────────────────
  const playNextAudioChunk = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioElementRef.current) {
      if (audioQueueRef.current.length === 0 && isPlayingRef.current) {
        isPlayingRef.current = false;
        setStatus('listening');
        // Resume recognition after AI finishes speaking
        resumeRecognition();
      }
      return;
    }
    isPlayingRef.current = true;

    // Pause recognition while playing to avoid echo
    pauseRecognition();

    const base64Audio = audioQueueRef.current.shift();
    if (!base64Audio) return;

    const byteCharacters = atob(base64Audio);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    audioElementRef.current.src = url;
    audioElementRef.current.play().catch(e => {
      console.error("Audio play error", e);
      setTimeout(() => { isPlayingRef.current = false; playNextAudioChunk(); }, 100);
    });
  }, []);

  useEffect(() => {
    audioElementRef.current = new Audio();
    audioElementRef.current.onended = () => {
      isPlayingRef.current = false;
      playNextAudioChunk();
    };
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);

  // ─── Web Speech API (STT) ─────────────────────────────
  const pauseRecognition = () => {
    try {
      if (recognitionRef.current) recognitionRef.current.stop();
    } catch (e) { /* ignore */ }
  };

  const resumeRecognition = () => {
    try {
      if (recognitionRef.current && isListeningRef.current) {
        recognitionRef.current.start();
      }
    } catch (e) { /* may already be running */ }
  };

  const startRecording = async () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error("Web Speech API not supported");
        setStatus('error');
        setTranscript('Speech recognition not supported in this browser. Please use Chrome.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

      finalTranscriptRef.current = '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          console.log("Final STT transcript:", finalTranscriptRef.current);
        }

        // Show live transcript to user
        const display = finalTranscriptRef.current + interimTranscript;
        if (display.trim()) {
          setTranscript(`You: "${display.trim()}"`);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'no-speech') {
          // No speech detected, restart recognition
          try { recognition.start(); } catch (e) { /* ignore */ }
          return;
        }
        if (event.error === 'aborted') return; // Normal stop
      };

      recognition.onend = () => {
        // Auto-restart if we're still in listening mode
        if (isListeningRef.current && !isPlayingRef.current) {
          try { recognition.start(); } catch (e) { /* ignore */ }
        }
      };

      recognition.start();
      setStatus('listening');
      setTranscript('Listening... Speak now.');

      // Request greeting from WebSocket
      if (wsReadyState === WebSocket.OPEN) {
        requestGreeting();
      }
    } catch (err) {
      console.error("Speech recognition failed to start", err);
      setStatus('error');
      setTranscript('Microphone access denied or STT not available.');
    }
  };

  const stopRecording = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch (e) { /* ignore */ }
  };

  /**
   * Called when user taps the "send" button. Collects accumulated final transcript,
   * sends it as user_text to the backend, and resets the buffer.
   */
  const sendCurrentTranscript = () => {
    const text = finalTranscriptRef.current.trim();
    if (text) {
      console.log("Sending user text to backend:", text);
      sendUserText(text);
      finalTranscriptRef.current = '';
      setStatus('processing');
      setTranscript(`You: "${text}"`);
      // Pause recognition while we wait for AI response
      pauseRecognition();
    } else {
      // No transcript accumulated, just resume listening
      setTranscript('No speech detected. Try again.');
      setTimeout(() => {
        setStatus('listening');
        setTranscript('Listening... Speak now.');
      }, 1500);
    }
  };

  const interruptAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  return { audioQueueRef, playNextAudioChunk, startRecording, stopRecording, interruptAudio, sendCurrentTranscript };
}
