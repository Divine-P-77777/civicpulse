import { useRef, useEffect } from 'react';

interface UseLiveAudioParams {
  wsReadyState: number | undefined;
  sendAudioChunk: (base64: string) => void;
  requestGreeting: () => void;
  status: string;
  setStatus: (s: any) => void;
  setTranscript: (t: string) => void;
}

export function useLiveAudio({
  wsReadyState, sendAudioChunk, requestGreeting, status, setStatus, setTranscript
}: UseLiveAudioParams) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    isListeningRef.current = (status === 'listening');
  }, [status]);

  const playNextAudioChunk = () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioElementRef.current) {
      if (audioQueueRef.current.length === 0 && isPlayingRef.current) {
        isPlayingRef.current = false;
        setStatus('listening');
      }
      return;
    }
    isPlayingRef.current = true;
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
  };

  useEffect(() => {
    audioElementRef.current = new Audio();
    audioElementRef.current.onended = playNextAudioChunk;
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (!isListeningRef.current) return;
        if (event.data.size > 0 && wsReadyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.readAsDataURL(event.data);
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64data = result.split(',')[1];
            sendAudioChunk(base64data);
          };
        }
      };
      mediaRecorder.start(250);
      setStatus('listening');
      setTranscript('Listening... Speak now.');

      if (wsReadyState === WebSocket.OPEN) {
        requestGreeting();
      }
    } catch (err) {
      console.error("Microphone access denied or failed", err);
      setStatus('error');
      setTranscript('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
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

  return { audioQueueRef, playNextAudioChunk, startRecording, stopRecording, interruptAudio };
}
