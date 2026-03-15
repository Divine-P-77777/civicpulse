import { useRef, useState, useEffect } from 'react';

type LiveStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'uploading';

interface UseLiveWebSocketParams {
  sessionId: string;
  language: 'en' | 'hi';
  getToken: () => Promise<string | null>;
  clerk: any;
  onClose: () => void;
  playNextAudioChunk: () => void;
  audioQueueRef: React.MutableRefObject<string[]>;
  startRecording: () => void;
  stopRecording: () => void;
  stopCamera: () => void;
  setBackendDone: (done: boolean) => void;
}

export function useLiveWebSocket({
  sessionId, language, getToken, clerk, onClose,
  playNextAudioChunk, audioQueueRef, startRecording, stopRecording, stopCamera, setBackendDone
}: UseLiveWebSocketParams) {
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [transcript, setTranscript] = useState<string>('Ready. Tap the button to connect.');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 3;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);



  const lastRequestTimeRef = useRef<number | null>(null);
  const ttftMeasuredRef = useRef<boolean>(false);

  const connectWebSocket = async () => {
    // Clean up any existing connection first
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close(1000, 'Reconnecting');
        }
      } catch (e) { /* ignore */ }
      wsRef.current = null;
    }

    try {
      const token = await getToken();
      if (!token) {
        setStatus('error');
        setTranscript('Authentication required.');
        clerk.openSignIn();
        onClose();
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const wsBaseUrl = backendUrl.replace(/^http/, 'ws');
      const wsUrl = `${wsBaseUrl}/api/live/ws/${sessionId}?token=${token}`;

      console.log("Connecting to WebSocket:", wsUrl.split('?token=')[0]);
      setTranscript('Connecting to Live Voice...');
      setStatus('idle');

      // Reset reconnect counter for fresh connections
      reconnectAttemptsRef.current = 0;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected.");
        reconnectAttemptsRef.current = 0;
        ws.send(JSON.stringify({ type: 'config', language }));
        startRecording();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Benchmark Tracking
          if ((message.type === 'audio_stream' || message.type === 'ai_transcript') && lastRequestTimeRef.current && !ttftMeasuredRef.current) {
            const ttft = performance.now() - lastRequestTimeRef.current;
            ttftMeasuredRef.current = true;
            console.log(
                `%c ⚡ CivicPulse AI Benchmark [Live Mode] %c TTFT: ${(ttft / 1000).toFixed(2)}s `,
                'background: #059669; color: #fff; font-weight: bold; padding: 2px 4px; border-radius: 3px 0 0 3px;',
                'background: #1e293b; color: #fff; padding: 2px 4px; border-radius: 0 3px 3px 0;'
            );
          }

          if (message.type === 'user_transcript') {
            setTranscript(`You: "${message.text}"`);
            setStatus('processing');
          } else if (message.type === 'audio_stream') {
            setStatus('speaking');
            setBackendDone(false); // New stream started
            audioQueueRef.current.push(message.data);
            playNextAudioChunk();
          } else if (message.type === 'speaking_done') {
            console.log("[WS] Received speaking_done signal");
            setBackendDone(true);
          } else if (message.type === 'ai_transcript') {
            setTranscript(`AI: "${message.text}"`);
          } else if (message.type === 'ingestion_progress') {
            setStatus('uploading');
            setUploadProgress(message.progress);
            setTranscript(message.message);
            if (message.progress === 100) {
              setTimeout(() => {
                setStatus('listening');
                setUploadProgress(0);
              }, 2000);
            }
          } else if (message.type === 'error') {
            setStatus('error');
            setTranscript(`Error: ${message.message}`);
          }
        } catch (err) {
          console.error("Failed to parse WS message", err);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected.", event.code, event.reason);
        stopRecording();
        stopCamera();
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 8000);
          setTranscript(`Connection lost. Reconnecting in ${delay / 1000}s... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          setStatus('idle');
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setStatus('error');
          setTranscript('Could not connect to Live Voice. Please check your backend server and try again.');
        } else {
          setStatus('idle');
          setTranscript('Call ended.');
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
      };

    } catch (err) {
      console.error("Failed to connect to WebSocket", err);
      setStatus('error');
      setTranscript('Failed to establish connection. Please check authentication.');
    }
  };

  const closeWebSocket = () => {
    reconnectAttemptsRef.current = maxReconnectAttempts;
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) wsRef.current.close(1000, 'Component unmounted');
  };

  // Update language on-the-fly
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("Updating language config:", language);
      wsRef.current.send(JSON.stringify({ type: 'config', language }));
    }
  }, [language]);

  // Tracked send for benchmarking
  const trackedSend = (data: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const stringified = typeof data === 'string' ? data : JSON.stringify(data);
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (parsed.type === 'user_text' || parsed.type === 'request_greeting' || parsed.type === 'ingestion_complete') {
        lastRequestTimeRef.current = performance.now();
        ttftMeasuredRef.current = false;
      }
      wsRef.current.send(stringified);
    }
  };

  return { wsRef, status, setStatus, transcript, setTranscript, uploadProgress, setUploadProgress, connectWebSocket, closeWebSocket, trackedSend };
}
