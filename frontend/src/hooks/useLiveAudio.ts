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
  onAutoSubmitStart?: (seconds: number) => void;
  onAutoSubmitCancel?: () => void;
}

export function useLiveAudio({
  wsReadyState, sendUserText, requestGreeting, status, setStatus, setTranscript, language, audioQueueRef,
  onAutoSubmitStart, onAutoSubmitCancel
}: UseLiveAudioParams) {
  const isPlayingRef = useRef<boolean>(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const finalTranscriptRef = useRef<string>('');
  const recognitionActiveRef = useRef<boolean>(false);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const AUTO_SUBMIT_DELAY = 2500; // ms of silence before auto-submit

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

  // ─── Trigger Sound (chime when mic resumes) ────────────
  const playTriggerSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) { /* ignore — AudioContext may not be available */ }
  }, []);

  // ─── Audio Playback ────────────────────────────────────
  const onAudioFinished = useCallback(() => {
    console.log("[Audio] All audio finished playing, transitioning to listening");
    isPlayingRef.current = false;
    setStatus('listening');
    setTranscript(language === 'hi' ? 'सुन रहा हूँ... अब बोलिए।' : 'Listening... Speak now.');
    finalTranscriptRef.current = '';
    // Play a short chime so the user knows it's their turn
    playTriggerSound();
    // Directly resume recognition
    resumeRecognition();
  }, [setStatus, setTranscript, language, resumeRecognition, playTriggerSound]);

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

          // ─── Auto-submit: start/reset the silence timer ───
          if (autoSubmitTimerRef.current) {
            clearTimeout(autoSubmitTimerRef.current);
          }
          onAutoSubmitStart?.(AUTO_SUBMIT_DELAY / 1000);
          autoSubmitTimerRef.current = setTimeout(() => {
            const text = finalTranscriptRef.current.trim();
            if (text && recognitionActiveRef.current && !isPlayingRef.current) {
              console.log("[Auto-Submit] Silence detected, auto-sending:", text);
              sendCurrentTranscriptAuto();
            }
            onAutoSubmitCancel?.();
          }, AUTO_SUBMIT_DELAY);
        }

        // Any new speech (even interim) resets the timer
        if (interimTranscript && autoSubmitTimerRef.current) {
          clearTimeout(autoSubmitTimerRef.current);
          onAutoSubmitCancel?.();
          // Restart timer from now
          autoSubmitTimerRef.current = setTimeout(() => {
            const text = finalTranscriptRef.current.trim();
            if (text && recognitionActiveRef.current && !isPlayingRef.current) {
              console.log("[Auto-Submit] Silence after interim, auto-sending:", text);
              sendCurrentTranscriptAuto();
            }
            onAutoSubmitCancel?.();
          }, AUTO_SUBMIT_DELAY);
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

      // Always request greeting — startRecording is called from ws.onopen so WS is guaranteed open
      requestGreeting();
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
   * Internal auto-submit — same as sendCurrentTranscript but doesn't need user tap.
   */
  const sendCurrentTranscriptAuto = () => {
    const text = finalTranscriptRef.current.trim();
    if (text) {
      console.log("[Live] Auto-sending user text to backend:", text);
      sendUserText(text);
      finalTranscriptRef.current = '';
      setStatus('processing');
      setTranscript(`You: "${text}"`);
      pauseRecognition();
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = null;
      }
    }
  };

  /**
   * Called when user taps the "send" button. Collects accumulated final transcript,
   * sends it as user_text to the backend, and resets the buffer.
   */
  const sendCurrentTranscript = () => {
    // Clear any auto-submit timer since user is manually sending
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
      onAutoSubmitCancel?.();
    }

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

  /**
   * Cancel a pending auto-submit (called from UI cancel button).
   */
  const cancelAutoSubmit = () => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
      onAutoSubmitCancel?.();
      console.log("[Auto-Submit] Cancelled by user");
    }
  };

  const interruptAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    // Also cancel any pending auto-submit
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
      onAutoSubmitCancel?.();
    }
  };

  return { audioQueueRef, playNextAudioChunk, startRecording, stopRecording, interruptAudio, sendCurrentTranscript, resumeRecognition, cancelAutoSubmit };
}
