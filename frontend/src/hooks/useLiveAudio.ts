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
  const isBackendDoneRef = useRef<boolean>(true); // Track if backend finished sending chunks
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const AUTO_SUBMIT_DELAY = 2500; // ms of silence before auto-submit

  // Deepgram Refs
  const deepgramFailedRef = useRef<boolean>(false);
  const deepgramWsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const greetingRequestedRef = useRef<boolean>(false);

  useEffect(() => {
    isListeningRef.current = (status === 'listening');
  }, [status]);

  // ─── STT Control ─────────────────────────────
  const pauseRecognition = useCallback(() => {
    recognitionActiveRef.current = false;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (e) { /* ignore - may not be started */ }

    // Pause Deepgram MediaRecorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.pause(); } catch (e) { }
    }
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

    // Resume Deepgram MediaRecorder if paused
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try { mediaRecorderRef.current.resume(); } catch (e) { }
      console.log("[Audio] Deepgram media recorder resumed");
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
    // Only transition if the queue is empty AND backend confirmed it's done
    if (audioQueueRef.current.length > 0 || !isBackendDoneRef.current) {
      console.log("[Audio] Waiting for more chunks or backend done signal...");
      return;
    }

    console.log("[Audio] All audio finished and backend done, transitioning to listening");
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


    // Explicitly define proper mime type for MP3 files to prevent NotSupportedError
    const blob = new Blob([byteArray], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);

    // Initialize Web Audio API if needed (for volume boost)
    if (!audioCtxRef.current) {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const newCtx = new AudioCtx();
        const newGain = newCtx.createGain();
        newGain.connect(newCtx.destination);

        audioCtxRef.current = newCtx;
        gainNodeRef.current = newGain;
      }
    }

    const ctx = audioCtxRef.current;
    const gainNode = gainNodeRef.current;
    if (ctx && gainNode && audioElementRef.current) {
      // Boost volume for Sarvam (Hindi) which is notoriously low
      // Normal ElevenLabs is fine at 1.0, Sarvam usually needs 2.5x to match perceived loudness
      gainNode.gain.value = language === 'hi' ? 2.5 : 1.0;

      // Connect element to gain node if not already connected
      if (!(audioElementRef.current as any)._connected) {
        const source = ctx.createMediaElementSource(audioElementRef.current);
        source.connect(gainNode);
        (audioElementRef.current as any)._connected = true;
      }
    }

    // Reset audio element before loading new source
    audioElementRef.current.pause();
    audioElementRef.current.src = url;

    // Increase pace as requested (1.15x feels snappy but legible)
    audioElementRef.current.playbackRate = 1.3;

    audioElementRef.current.load(); // Force load the new blob

    audioElementRef.current.play().catch(e => {
      console.error("[Audio] Play error:", e);
      isPlayingRef.current = false;
      setTimeout(() => playNextAudioChunk(), 100);
    });
  }, [pauseRecognition, language]);

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
  const startNativeRecognition = async () => {
    try {
      console.log("[STT] Starting Native SpeechRecognition...");
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
        if (display.trim() && recognitionActiveRef.current && !isPlayingRef.current) {
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

      if (!greetingRequestedRef.current) {
        greetingRequestedRef.current = true;
        requestGreeting();
      }
    } catch (err) {
      console.error("[STT] Failed to start native STT:", err);
      setStatus('error');
      setTranscript('Microphone access denied or STT not available.');
    }
  };

  const startDeepgramRecognition = async () => {
    console.log("[Deepgram] Starting Deepgram streaming...");
    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.warn("[Deepgram] No API key found in .env, falling back directly to native...");
      deepgramFailedRef.current = true;
      startNativeRecognition();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const langCode = language === 'hi' ? 'hi' : 'en';
      
      let wsUrl: string;
      if (language === 'hi') {
        // Fallback or use standard Nova-2 for Hindi as Flux is English-only
        wsUrl = `wss://api.deepgram.com/v1/listen?language=hi&interim_results=true&smart_format=true`;
      } else {
        // Migration to Deepgram Flux (v2) with optimization for "Dhoury"
        // Added multiple keyword variations and preserved smart_format
        wsUrl = `wss://api.deepgram.com/v2/listen?model=flux-general-en&interim_results=true&smart_format=true&eot_threshold=0.7&eot_timeout_ms=5000&keywords=Dhoury:2.0&keywords=dhoury:2.0&keywords=Dhourie:1.5`;
      }

      const socket = new WebSocket(wsUrl, ["token", apiKey]);
      deepgramWsRef.current = socket;

      // Deepgram requires a KeepAlive to stay open during AI playing
      let keepAliveInterval: any;

      socket.onopen = () => {
        console.log("[Deepgram] WebSocket connected!");
        recognitionActiveRef.current = true;
        finalTranscriptRef.current = '';

        setStatus('listening');
        setTranscript(language === 'hi' ? 'सुन रहा हूँ... अब बोलिए।' : 'Listening... Speak now.');

        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && socket.readyState === 1 && recognitionActiveRef.current) {
            socket.send(event.data);
          }
        });
        // 80ms audio chunks strongly recommended for Flux
        mediaRecorder.start(80);

        keepAliveInterval = setInterval(() => {
          if (socket.readyState === 1) {
            socket.send(JSON.stringify({ type: "KeepAlive" }));
          }
        }, 10000);

        if (!greetingRequestedRef.current) {
          greetingRequestedRef.current = true;
          requestGreeting();
        }
      };

      socket.onmessage = (message) => {
        const received = JSON.parse(message.data);

        // Handle Flux Turn Detection Events
        if (received.type === "EndOfTurn") {
          console.log("[Deepgram] EndOfTurn detected");
          const text = finalTranscriptRef.current.trim();
          if (text && recognitionActiveRef.current && !isPlayingRef.current) {
            console.log("[Flux] Auto-sending on EndOfTurn:", text);
            sendCurrentTranscriptAuto();
          }
          return;
        }

        if (!received.channel?.alternatives?.[0]) return;

        const transcript = received.channel.alternatives[0].transcript;

        if (transcript || received.is_final) {
          if (received.is_final && transcript) {
            finalTranscriptRef.current += transcript + " ";
            console.log("[Deepgram] Final:", transcript);

            // With Flux EndOfTurn, we might not need the long silence timer, 
            // but keeping it as a fallback with a shorter duration might be safer.
            if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
            onAutoSubmitStart?.(AUTO_SUBMIT_DELAY / 1000);
            autoSubmitTimerRef.current = setTimeout(() => {
              const text = finalTranscriptRef.current.trim();
              if (text && recognitionActiveRef.current && !isPlayingRef.current) {
                console.log("[Auto-Submit] Deepgram auto-sending (timer):", text);
                sendCurrentTranscriptAuto();
              }
              onAutoSubmitCancel?.();
            }, AUTO_SUBMIT_DELAY);

          } else if (transcript) {
            // Reset timer on any new speech
            if (autoSubmitTimerRef.current) {
              clearTimeout(autoSubmitTimerRef.current);
              onAutoSubmitCancel?.();
              autoSubmitTimerRef.current = setTimeout(() => {
                const text = finalTranscriptRef.current.trim();
                if (text && recognitionActiveRef.current && !isPlayingRef.current) {
                  sendCurrentTranscriptAuto();
                }
                onAutoSubmitCancel?.();
              }, AUTO_SUBMIT_DELAY);
            }
          }

          const display = finalTranscriptRef.current + (!received.is_final ? transcript : "");
          if (display.trim() && recognitionActiveRef.current && !isPlayingRef.current) {
            setTranscript(`You: "${display.trim()}"`);
          }
        }
      };

      socket.onclose = () => {
        console.log("[Deepgram] WebSocket closed.");
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        try { mediaRecorder.stop(); } catch (e) { }

        if (!deepgramFailedRef.current && recognitionActiveRef.current) {
          console.log("[Deepgram] Connection closed prematurely, failing over to native...");
          deepgramFailedRef.current = true;
          startNativeRecognition();
        }
      };

      socket.onerror = (error) => {
        console.error("[Deepgram] WebSocket error:", error);
        deepgramFailedRef.current = true;
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        try { mediaRecorder.stop(); } catch (e) { }
        try { socket.close(); } catch (e) { }
        console.log("[STT] Falling back to native recognition...");
        startNativeRecognition();
      };

    } catch (err) {
      console.error("[Deepgram] Media/setup failed:", err);
      deepgramFailedRef.current = true;
      startNativeRecognition();
    }
  };

  const startRecording = async () => {
    greetingRequestedRef.current = false; // Reset on initial start
    if (!deepgramFailedRef.current && process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY) {
      startDeepgramRecognition();
    } else {
      startNativeRecognition();
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

    // Deepgram cleanup
    if (deepgramWsRef.current) {
      try { deepgramWsRef.current.close(); } catch (e) { }
      deepgramWsRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); } catch (e) { }
      mediaRecorderRef.current = null;
    }
  };

  /**
   * Strips common noise tokens from the end/start of text.
   */
  const stripNoiseTokens = (text: string) => {
    // Noise tokens: toh, to, huh, umm, hmm, ah, oh, तो, जी, भाई, यार
    const noiseRegex = /\b(toh|to|huh|umm|hmm|ah|oh|तो|तो तो|जी|जी जी|भाई|यार)\b/gi;
    return text.replace(noiseRegex, '').replace(/\s+/g, ' ').trim();
  };

  /**
   * Internal auto-submit — same as sendCurrentTranscript but doesn't need user tap.
   */
  const sendCurrentTranscriptAuto = () => {
    const rawText = finalTranscriptRef.current.trim();
    if (!rawText) return;

    const cleanedText = stripNoiseTokens(rawText);
    
    // Junk Filter: Ignore if cleaned text is too short or pure noise
    const isJunk = cleanedText.length < 2 || /^[^a-z0-9\u0900-\u097F]+$/i.test(cleanedText);

    if (cleanedText && !isJunk) {
      console.log("[Live] Auto-sending cleaned text:", cleanedText);
      sendUserText(cleanedText);
      finalTranscriptRef.current = '';
      setStatus('processing');
      setTranscript(`You: "${cleanedText}"`);
      pauseRecognition();
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = null;
      }
        finalTranscriptRef.current = '';
        // Don't change status, just clear and keep listening
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

    const rawText = finalTranscriptRef.current.trim();
    if (!rawText) return;

    const cleanedText = stripNoiseTokens(rawText);
    const isJunk = cleanedText.length < 2 && !/^[\u0900-\u097F]+$/.test(cleanedText);

    if (cleanedText && !isJunk) {
      console.log("[Live] Sending cleaned text to backend:", cleanedText);
      sendUserText(cleanedText);
      finalTranscriptRef.current = '';
      setStatus('processing');
      setTranscript(`You: "${cleanedText}"`);
      // Pause recognition while we wait for AI response
      pauseRecognition();
    } else {
      // No transcript accumulated, just resume listening
      setTranscript(language === 'hi' ? 'कोई आवाज़ नहीं सुनी। फिर से बोलिए।' : 'No speech detected. Try again.');
      finalTranscriptRef.current = '';
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

  const setBackendDone = useCallback((done: boolean) => {
    isBackendDoneRef.current = done;
    if (done && !isPlayingRef.current && status === 'speaking') {
      onAudioFinished();
    }
  }, [status, onAudioFinished]);

  return { audioQueueRef, playNextAudioChunk, startRecording, stopRecording, interruptAudio, sendCurrentTranscript, resumeRecognition, cancelAutoSubmit, setBackendDone };
}
