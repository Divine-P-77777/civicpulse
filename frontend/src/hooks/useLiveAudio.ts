import { useRef, useEffect, useCallback } from 'react';

/** A single audio chunk from the backend with its encoding format. */
type AudioChunk = { data: string; format: 'wav' | 'mp3' };

interface UseLiveAudioParams {
  wsReadyState: number | undefined;
  sendUserText: (text: string) => void;
  requestGreeting: () => void;
  status: string;
  setStatus: (s: any) => void;
  setTranscript: (t: string) => void;
  setUserTranscript: (t: string) => void;
  setAiTranscript: (t: string) => void;
  language: 'en' | 'hi';
  audioQueueRef: React.MutableRefObject<AudioChunk[]>;
  onAutoSubmitStart?: (seconds: number) => void;
  onAutoSubmitCancel?: () => void;
}

export function useLiveAudio({
  wsReadyState, sendUserText, requestGreeting, status, setStatus, setTranscript, setUserTranscript, setAiTranscript, language, audioQueueRef,
  onAutoSubmitStart, onAutoSubmitCancel
}: UseLiveAudioParams) {
  const isPlayingRef = useRef<boolean>(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null); // Track blob URLs for revocation to avoid memory leaks
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const finalTranscriptRef = useRef<string>('');
  const recognitionActiveRef = useRef<boolean>(false);
  const isBackendDoneRef = useRef<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const AUTO_SUBMIT_DELAY = 2500;

  // Deepgram Refs
  const deepgramFailedRef = useRef<boolean>(false);
  const deepgramWsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const greetingRequestedRef = useRef<boolean>(false);

  // Language hot-swap tracking
  const lastLanguageRef = useRef<'en' | 'hi'>(language);
  const pendingLanguageRestartRef = useRef<boolean>(false);

  // Keep a stable ref to language so callbacks don't go stale
  const languageRef = useRef<'en' | 'hi'>(language);
  useEffect(() => { languageRef.current = language; }, [language]);

  useEffect(() => {
    isListeningRef.current = (status === 'listening');
  }, [status]);

  // ─── STT Control ─────────────────────────────
  const pauseRecognition = useCallback(() => {
    recognitionActiveRef.current = false;
    try {
      if (recognitionRef.current) recognitionRef.current.stop();
    } catch (e) { /* ignore */ }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.pause(); } catch (e) { }
    }
  }, []);

  const resumeRecognition = useCallback(() => {
    console.log('[Audio] Attempting to resume recognition...');
    recognitionActiveRef.current = true;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        console.log('[Audio] Recognition restarted successfully');
      } else {
        console.warn('[Audio] No recognition instance to resume');
      }
    } catch (e) {
      console.warn('[Audio] Resume failed (may already be running):', e);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try { mediaRecorderRef.current.resume(); } catch (e) { }
      console.log('[Audio] Deepgram media recorder resumed');
    }
  }, []);

  // ─── Trigger Sound ────────────
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
    } catch (e) { /* ignore */ }
  }, []);

  // ─── Audio Finished ────────────────────────────────────
  const onAudioFinished = useCallback(() => {
    if (audioQueueRef.current.length > 0 || !isBackendDoneRef.current) {
      return;
    }
    console.log('[Audio] All audio finished, transitioning to listening');
    isPlayingRef.current = false;
    setStatus('listening');
    setTranscript(languageRef.current === 'hi' ? 'सुन रहा हूँ... अब बोलिए।' : 'Listening... Speak now.');
    finalTranscriptRef.current = '';
    playTriggerSound();
    resumeRecognition();
  }, [setStatus, setTranscript, resumeRecognition, playTriggerSound]);

  // ─── Audio Playback ────────────────────────────────────
  const playNextAudioChunk = useCallback(() => {
    if (isPlayingRef.current) return;

    if (audioQueueRef.current.length === 0) {
      if (isBackendDoneRef.current) onAudioFinished();
      return;
    }

    isPlayingRef.current = true;
    pauseRecognition();

    const chunk = audioQueueRef.current.shift();
    if (!chunk || !audioElementRef.current) {
      isPlayingRef.current = false;
      if (isBackendDoneRef.current) onAudioFinished();
      return;
    }

    const { data: base64Audio, format } = chunk;

    let byteArray: Uint8Array;
    try {
      const byteCharacters = atob(base64Audio);
      byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
    } catch (e) {
      console.warn('[Audio] Failed to decode base64 chunk, skipping:', e);
      isPlayingRef.current = false;
      setTimeout(() => playNextAudioChunk(), 50);
      return;
    }

    // Skip tiny/empty chunks that crash mobile browsers
    if (byteArray.length < 100) {
      console.warn('[Audio] Skipping tiny chunk, length:', byteArray.length);
      isPlayingRef.current = false;
      setTimeout(() => playNextAudioChunk(), 50);
      return;
    }

    const audioMimeType = format === 'wav' ? 'audio/wav' : 'audio/mpeg';
    const blob = new Blob([byteArray.buffer as ArrayBuffer], { type: audioMimeType });

    // Revoke previous blob URL to prevent memory leak
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
    }
    const url = URL.createObjectURL(blob);
    currentBlobUrlRef.current = url;

    // Initialize Web Audio API for volume boost
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
      // Sarvam (Hindi) audio is notoriously quiet, boost it
      gainNode.gain.value = languageRef.current === 'hi' ? 2.5 : 1.0;
      if (!(audioElementRef.current as any)._connected) {
        const source = ctx.createMediaElementSource(audioElementRef.current);
        source.connect(gainNode);
        (audioElementRef.current as any)._connected = true;
      }
    }

    audioElementRef.current.pause();
    audioElementRef.current.src = url;
    audioElementRef.current.playbackRate = 1.3;
    audioElementRef.current.load();
    audioElementRef.current.play().catch(e => {
      console.error('[Audio] Play error:', e);
      isPlayingRef.current = false;
      setTimeout(() => playNextAudioChunk(), 100);
    });
  }, [pauseRecognition, onAudioFinished]);

  // Setup audio element once — stable ref, no infinite loop
  useEffect(() => {
    const audio = new Audio();
    audioElementRef.current = audio;

    audio.onended = () => {
      console.log('[Audio] Chunk finished, queue length:', audioQueueRef.current.length);
      isPlayingRef.current = false;
      if (audioQueueRef.current.length > 0) {
        playNextAudioChunk();
      } else {
        onAudioFinished();
      }
    };

    return () => {
      audio.pause();
      audio.onended = null;
      audioElementRef.current = null;
      // Clean up any dangling blob URL
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Timer helpers (shared between Native & Deepgram) ────────────────────
  const clearSubmitTimer = useCallback(() => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
      onAutoSubmitCancel?.();
    }
  }, [onAutoSubmitCancel]);

  const scheduleSubmitTimer = useCallback((fromInterim = false) => {
    clearSubmitTimer();
    onAutoSubmitStart?.(AUTO_SUBMIT_DELAY / 1000);
    autoSubmitTimerRef.current = setTimeout(() => {
      const text = finalTranscriptRef.current.trim();
      if (text && recognitionActiveRef.current && !isPlayingRef.current) {
        console.log(`[Watchdog] Timeout exceeded${fromInterim ? ' (after interim)' : ''}. Forcing buffer submit:`, text);
        sendCurrentTranscriptAuto();
      }
      onAutoSubmitCancel?.();
    }, AUTO_SUBMIT_DELAY);
  }, [clearSubmitTimer, onAutoSubmitStart, onAutoSubmitCancel]);

  // ─── Native STT ───────────────────────────────────────────────────────────
  const startNativeRecognition = async () => {
    try {
      console.log('[STT] Starting Native SpeechRecognition...');
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setStatus('error');
        setTranscript('Speech recognition not supported. Please use Chrome.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognitionActiveRef.current = true;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = languageRef.current === 'hi' ? 'hi-IN' : 'en-US';
      finalTranscriptRef.current = '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let newFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) newFinal += result[0].transcript;
          else interimTranscript += result[0].transcript;
        }

        if (newFinal) {
          finalTranscriptRef.current += newFinal;
          console.log('[STT] Final:', finalTranscriptRef.current);
          scheduleSubmitTimer();
        } else if (interimTranscript && finalTranscriptRef.current) {
          // Only reset timer if we have accumulated final text already — prevents premature submit on first word
          scheduleSubmitTimer(true);
        }

        const display = finalTranscriptRef.current + interimTranscript;
        if (display.trim() && recognitionActiveRef.current && !isPlayingRef.current) {
          setUserTranscript(display.trim());
          setAiTranscript('');
          setTranscript(`You: "${display.trim()}"`);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[STT] Error:', event.error);
        if (event.error === 'no-speech') {
          if (recognitionActiveRef.current) try { recognition.start(); } catch (e) { }
          return;
        }
        if (event.error === 'aborted') return;
        if (event.error === 'network' && recognitionActiveRef.current) {
          setTimeout(() => { try { recognition.start(); } catch (e) { } }, 1000);
        }
      };

      recognition.onend = () => {
        console.log('[STT] onend — active:', recognitionActiveRef.current, 'playing:', isPlayingRef.current);
        if (recognitionActiveRef.current && !isPlayingRef.current) {
          setTimeout(() => { try { recognition.start(); } catch (e) { } }, 100);
        }
      };

      recognition.start();
      setStatus('listening');
      setTranscript(languageRef.current === 'hi' ? 'सुन रहा हूँ... अब बोलिए।' : 'Listening... Speak now.');

      if (!greetingRequestedRef.current) {
        greetingRequestedRef.current = true;
        requestGreeting();
      }
    } catch (err) {
      console.error('[STT] Failed to start:', err);
      setStatus('error');
      setTranscript('Microphone access denied or STT not available.');
    }
  };

  // ─── Deepgram STT ─────────────────────────────────────────────────────────
  const startDeepgramRecognition = async () => {
    console.log('[Deepgram] Starting Deepgram streaming...');
    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.warn('[Deepgram] No API key — falling back to native STT.');
      deepgramFailedRef.current = true;
      startNativeRecognition();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const wsUrl = languageRef.current === 'hi'
        ? `wss://api.deepgram.com/v1/listen?language=hi&interim_results=true&smart_format=true`
        : `wss://api.deepgram.com/v2/listen?model=flux-general-en&eot_threshold=0.4&eot_timeout_ms=3000`;

      console.log('[Deepgram] Connecting:', wsUrl.split('?')[0]);
      const socket = new WebSocket(wsUrl, ['token', apiKey]);
      deepgramWsRef.current = socket;
      let keepAliveInterval: any;

      socket.onopen = () => {
        console.log('[Deepgram] Connected!');
        recognitionActiveRef.current = true;
        finalTranscriptRef.current = '';
        setStatus('listening');
        setTranscript(languageRef.current === 'hi' ? 'सुन रहा हूँ... अब बोलिए।' : 'Listening... Speak now.');

        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && socket.readyState === 1 && recognitionActiveRef.current) {
            socket.send(event.data);
          }
        });
        mediaRecorder.start(80);

        keepAliveInterval = setInterval(() => {
          if (socket.readyState === 1) socket.send(JSON.stringify({ type: 'KeepAlive' }));
        }, 10000);

        if (!greetingRequestedRef.current) {
          greetingRequestedRef.current = true;
          requestGreeting();
        }
      };

      socket.onmessage = (message) => {
        const received = JSON.parse(message.data);

        // Flux model emits EndOfTurn — highest-confidence submit signal
        if (received.type === 'EndOfTurn') {
          console.log('[Deepgram] EndOfTurn detected');
          const text = finalTranscriptRef.current.trim();
          if (text && recognitionActiveRef.current && !isPlayingRef.current) {
            clearSubmitTimer();
            console.log('[Flux] Submitting on EndOfTurn:', text);
            sendCurrentTranscriptAuto();
          }
          return;
        }

        if (!received.channel?.alternatives?.[0]) return;
        const transcript = received.channel.alternatives[0].transcript;

        if (received.is_final && transcript) {
          finalTranscriptRef.current += transcript + ' ';
          console.log('[Deepgram] Final:', transcript);
          // Watchdog: submit if EndOfTurn never fires
          scheduleSubmitTimer();
        } else if (transcript && finalTranscriptRef.current) {
          // Reset watchdog on any interim speech that follows confirmed final text
          scheduleSubmitTimer(true);
        }

        const display = finalTranscriptRef.current + (!received.is_final ? transcript : '');
        if (display.trim() && recognitionActiveRef.current && !isPlayingRef.current) {
          setTranscript(`You: "${display.trim()}"`);
        }
      };

      socket.onclose = () => {
        console.log('[Deepgram] WebSocket closed.');
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        try { mediaRecorder.stop(); } catch (e) { }
        // Stop media tracks to release the microphone
        stream.getTracks().forEach(t => t.stop());

        if (!deepgramFailedRef.current && recognitionActiveRef.current) {
          console.log('[Deepgram] Closed prematurely, falling back to native...');
          deepgramFailedRef.current = true;
          startNativeRecognition();
        }
      };

      socket.onerror = () => {
        console.warn('[Deepgram] WebSocket error. Falling back to native STT.');
        deepgramFailedRef.current = true;
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        try { mediaRecorder.stop(); } catch (e) { }
        try { socket.close(); } catch (e) { }
        stream.getTracks().forEach(t => t.stop());
        startNativeRecognition();
      };

    } catch (err) {
      console.error('[Deepgram] Media/setup failed:', err);
      deepgramFailedRef.current = true;
      startNativeRecognition();
    }
  };

  // ─── Recording Lifecycle ──────────────────────────────────────────────────
  const startRecording = async (options?: { preserveGreeting?: boolean }) => {
    if (options?.preserveGreeting) {
      // Language hot-swap: clear historic failure so Deepgram is re-attempted fresh
      deepgramFailedRef.current = false;
    } else {
      greetingRequestedRef.current = false;
    }

    if (!deepgramFailedRef.current && process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY) {
      startDeepgramRecognition();
    } else {
      startNativeRecognition();
    }
  };

  const stopRecording = () => {
    recognitionActiveRef.current = false;
    clearSubmitTimer();

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch (e) { /* ignore */ }

    if (deepgramWsRef.current) {
      try { deepgramWsRef.current.close(); } catch (e) { }
      deepgramWsRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); } catch (e) { }
      mediaRecorderRef.current = null;
    }
  };

  // ─── Text Filtering ───────────────────────────────────────────────────────
  const stripNoiseTokens = (text: string) => {
    const noiseRegex = /\b(toh|to|huh|umm|hmm|ah|oh|तो|तो तो|जी|जी जी|भाई|यार)\b/gi;
    return text.replace(noiseRegex, '').replace(/\s+/g, ' ').trim();
  };

  // ─── Send Helpers ─────────────────────────────────────────────────────────
  /**
   * Internal: send accumulated transcript to backend (auto-submit / watchdog path).
   */
  const sendCurrentTranscriptAuto = () => {
    const rawText = finalTranscriptRef.current.trim();
    if (!rawText) return;

    const cleanedText = stripNoiseTokens(rawText);
    const isJunk = cleanedText.length < 2 || /^[^a-z0-9\u0900-\u097F]+$/i.test(cleanedText);

    if (cleanedText && !isJunk) {
      console.log('[Live Debug] Auto-sending cleaned text:', cleanedText);
      sendUserText(cleanedText);
      finalTranscriptRef.current = '';
      setStatus('processing');
      setUserTranscript(cleanedText);
      setAiTranscript('');
      setTranscript(`You: "${cleanedText}"`);
      pauseRecognition();
      clearSubmitTimer();
    } else {
      console.log('[Live Debug] Dropped turn (noise/junk):', { rawText, cleanedText });
      finalTranscriptRef.current = '';
    }
  };

  /**
   * Manual send: called when user taps the send button.
   */
  const sendCurrentTranscript = () => {
    clearSubmitTimer();

    const rawText = finalTranscriptRef.current.trim();
    if (!rawText) return;

    const cleanedText = stripNoiseTokens(rawText);
    const isJunk = cleanedText.length < 2 && !/^[\u0900-\u097F]+$/.test(cleanedText);

    if (cleanedText && !isJunk) {
      console.log('[Live] Sending to backend:', cleanedText);
      sendUserText(cleanedText);
      finalTranscriptRef.current = '';
      setStatus('processing');
      setUserTranscript(cleanedText);
      setAiTranscript('');
      setTranscript(`You: "${cleanedText}"`);
      pauseRecognition();
    } else {
      setTranscript(languageRef.current === 'hi' ? 'कोई आवाज़ नहीं सुनी। फिर से बोलिए।' : 'No speech detected. Try again.');
      finalTranscriptRef.current = '';
      setTimeout(() => {
        setStatus('listening');
        setTranscript(languageRef.current === 'hi' ? 'सुन रहा हूँ... अब बोलिए।' : 'Listening... Speak now.');
        resumeRecognition();
      }, 1500);
    }
  };

  const cancelAutoSubmit = () => {
    clearSubmitTimer();
    console.log('[Auto-Submit] Cancelled by user');
  };

  const interruptAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    clearSubmitTimer();
  };

  const setBackendDone = useCallback((done: boolean) => {
    isBackendDoneRef.current = done;
    if (done && !isPlayingRef.current && status === 'speaking') {
      onAudioFinished();
    }
  }, [status, onAudioFinished]);

  // ─── Language Hot-Swap ────────────────────────────────────────────────────
  useEffect(() => {
    if (lastLanguageRef.current !== language) {
      console.log(`[Live Debug] Language swapped: ${lastLanguageRef.current} → ${language}. Queueing STT restart...`);
      lastLanguageRef.current = language;
      pendingLanguageRestartRef.current = true;
    }
  }, [language]);

  useEffect(() => {
    if (!pendingLanguageRestartRef.current) return;
    // Wait until the system is idle before restarting
    if (status === 'processing' || status === 'speaking' || status === 'uploading' || isPlayingRef.current) return;

    console.log('[Live Debug] Safe to rebind STT engine to:', language);
    pendingLanguageRestartRef.current = false;

    stopRecording();
    setTimeout(() => startRecording({ preserveGreeting: true }), 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, status]);

  return { audioQueueRef, playNextAudioChunk, startRecording, stopRecording, interruptAudio, sendCurrentTranscript, resumeRecognition, cancelAutoSubmit, setBackendDone };
}
