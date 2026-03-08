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
  const recognitionActiveRef = useRef<boolean>(false);

  useEffect(() => {
    isListeningRef.current = (status === 'listening');
  }, [status]);

  // ─── Web Speech API (STT) ─────────────────────────────
  const pauseRecognition = useCallback(() => {
    recognitionActiveRef.current = false;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (e) { /* ignore - may not be started */ }
  }, []);

  const resumeRecognition = useCallback(() => {
    console.log("[Audio] Attempting to resume recognition...");
    recognitionActiveRef.current = true;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        console.log("[Audio] Recognition restarted successfully");
      } else {
        console.warn("[Audio] No recognition instance to resume");
      }
    } catch (e) {
      console.warn("[Audio] Resume failed (may already be running):", e);
    }
  }, []);

  // ─── Audio Playback ────────────────────────────────────
  const onAudioFinished = useCallback(() => {
    console.log("[Audio] All audio finished playing, transitioning to listening");
    isPlayingRef.current = false;
    setStatus('listening');
    setTranscript(language === 'hi' ? 'सुन रहा हूँ... अब बोलिए।' : 'Listening... Speak now.');
    finalTranscriptRef.current = '';
    // Directly resume recognition — don't rely on isListeningRef since
    // setStatus is async and the ref won't be updated yet
    resumeRecognition();
  }, [setStatus, setTranscript, language, resumeRecognition]);

  const playNextAudioChunk = useCallback(() => {
    // If already playing, do nothing (onended will call us again)
    if (isPlayingRef.current) return;

    // No more chunks in queue → we're done
    if (audioQueueRef.current.length === 0) {
      return;
    }

    // We have chunks to play
    isPlayingRef.current = true;

    // Pause recognition while playing to avoid echo
    pauseRecognition();

    const base64Audio = audioQueueRef.current.shift();
    if (!base64Audio || !audioElementRef.current) {
      isPlayingRef.current = false;
      return;
    }

    const byteCharacters = atob(base64Audio);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    audioElementRef.current.src = url;
    audioElementRef.current.play().catch(e => {
      console.error("[Audio] Play error:", e);
      isPlayingRef.current = false;
      // Try next chunk after a small delay
      setTimeout(() => playNextAudioChunk(), 100);
    });
  }, [pauseRecognition]);

  // Setup audio element with onended handler
  useEffect(() => {
    const audio = new Audio();
    audioElementRef.current = audio;

    audio.onended = () => {
      console.log("[Audio] Chunk finished playing, queue length:", audioQueueRef.current.length);
      isPlayingRef.current = false;
      
      if (audioQueueRef.current.length > 0) {
        // More chunks to play
        playNextAudioChunk();
      } else {
        // All done — transition back to listening
        onAudioFinished();
      }
    };

    return () => {
      audio.pause();
      audio.onended = null;
      audioElementRef.current = null;
    };
  }, [playNextAudioChunk, onAudioFinished]);

  // ─── Speech Recognition Setup ────────────────────────
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
      recognitionActiveRef.current = true;

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
          console.log("[STT] Final transcript:", finalTranscriptRef.current);
        }

        // Show live transcript to user
        const display = finalTranscriptRef.current + interimTranscript;
        if (display.trim()) {
          setTranscript(`You: "${display.trim()}"`);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[STT] Error:", event.error);
        if (event.error === 'no-speech') {
          // No speech detected — auto-restart if still active
          if (recognitionActiveRef.current) {
            try { recognition.start(); } catch (e) { /* ignore */ }
          }
          return;
        }
        if (event.error === 'aborted') return; // Normal stop
        if (event.error === 'network') {
          // Network error — try restart after delay
          if (recognitionActiveRef.current) {
            setTimeout(() => {
              try { recognition.start(); } catch (e) { /* ignore */ }
            }, 1000);
          }
        }
      };

      recognition.onend = () => {
        console.log("[STT] onend fired, activeRef:", recognitionActiveRef.current, "playingRef:", isPlayingRef.current);
        // Auto-restart only if we should be listening
        if (recognitionActiveRef.current && !isPlayingRef.current) {
          console.log("[STT] Auto-restarting recognition...");
          setTimeout(() => {
            try { recognition.start(); } catch (e) { /* ignore */ }
          }, 100);
        }
      };

      recognition.start();
      setStatus('listening');
      setTranscript(language === 'hi' ? 'सुन रहा हूँ... अब बोलिए।' : 'Listening... Speak now.');

      // Request greeting from WebSocket
      if (wsReadyState === WebSocket.OPEN) {
        requestGreeting();
      }
    } catch (err) {
      console.error("[STT] Failed to start:", err);
      setStatus('error');
      setTranscript('Microphone access denied or STT not available.');
    }
  };

  const stopRecording = () => {
    recognitionActiveRef.current = false;
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
      console.log("[Live] Sending user text to backend:", text);
      sendUserText(text);
      finalTranscriptRef.current = '';
      setStatus('processing');
      setTranscript(`You: "${text}"`);
      // Pause recognition while we wait for AI response
      pauseRecognition();
    } else {
      // No transcript accumulated, just resume listening
      setTranscript(language === 'hi' ? 'कोई आवाज़ नहीं सुनी। फिर से बोलिए।' : 'No speech detected. Try again.');
      setTimeout(() => {
        setStatus('listening');
        setTranscript(language === 'hi' ? 'सुन रहा हूँ... अब बोलिए।' : 'Listening... Speak now.');
        resumeRecognition();
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

  return { audioQueueRef, playNextAudioChunk, startRecording, stopRecording, interruptAudio, sendCurrentTranscript, resumeRecognition };
}
