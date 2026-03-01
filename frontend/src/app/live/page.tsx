'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

import { 
  setVoiceActive, 
  setCameraActive, 
  setRecording, 
  addMessage,
  setConnectionStatus,
  setError
} from '@/store/slices/liveSlice';
import { 
  Mic, 
  Camera, 
  CameraOff, 
  Loader2,
  AlertCircle,
  Volume2
} from 'lucide-react';

export default function LiveMode() {
  const dispatch = useAppDispatch();
  const { 
    isVoiceActive, 
    isCameraActive, 
    isRecording, 
    connectionStatus, 
    error,
  } = useAppSelector((state) => state.live);

  const { speak, isSpeaking } = useSpeechSynthesis({
    preferFemaleVoice: true,
    rate: 0.9,
    pitch: 1.1,
    volume: 0.8
  });

  
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [sessionId] = useState(`live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Supabase Realtime connection
  const {
    isConnected,
    connectionStatus: realtimeStatus,
    sendVoiceMessage,
    createSession,
    endSession
  } = useSupabaseRealtime({
    sessionId,
    sessionType: 'live',
    onAIResponse: (response) => {
      const aiMessage = {
        id: response.id,
        role: 'assistant' as const,
        content: response.content,
        timestamp: response.created_at,
        risk_assessment: response.risk_assessment,
        legal_references: response.legal_references,
      };
      
      dispatch(addMessage(aiMessage));
      
      // Speak the AI response
      speak(response.content);
    },
    onMessage: (message) => {
      console.log('Received message:', message);
    }
  });

  // Voice greeting on component mount
  useEffect(() => {
    if (!hasGreeted) {
      setTimeout(() => {
        speak("Hello! I&apos;m your AI legal assistant. I&apos;m here to help you understand legal documents and your civic rights. How can I assist you today?");
        setHasGreeted(true);
      }, 1000);
    }
  }, [hasGreeted, speak]);

  // Supabase Realtime connection management
  useEffect(() => {
    if (isVoiceActive || isCameraActive) {
      initializeSession();
    } else {
      terminateSession();
    }

    return () => {
      terminateSession();
    };
  }, [isVoiceActive, isCameraActive]);

  // Update connection status based on Supabase Realtime
  useEffect(() => {
    dispatch(setConnectionStatus(realtimeStatus));
  }, [realtimeStatus, dispatch]);

  const initializeSession = async () => {
    try {
      setIsConnecting(true);
      dispatch(setConnectionStatus('connecting'));
      
      await createSession();
      
      if (isConnected) {
        dispatch(setConnectionStatus('connected'));
        dispatch(setError(null));
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      dispatch(setConnectionStatus('error'));
      dispatch(setError('Failed to connect to server'));
    } finally {
      setIsConnecting(false);
    }
  };

  const terminateSession = async () => {
    try {
      await endSession();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

const toggleVoice = async () => {
  if (isVoiceActive) {
    stopRecording();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    dispatch(setVoiceActive(false));
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = async (e) => {
      if (!e.data.size) return;

      if (!isConnected) return; // silently ignore backend

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        sendVoiceMessage(base64, Date.now());
      };
      reader.readAsDataURL(e.data);
    };

    dispatch(setVoiceActive(true));
    dispatch(setError(null));
  } catch {
    dispatch(setError('Microphone permission denied'));
  }
};

  const toggleCamera = async () => {
    if (!isCameraActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
        dispatch(setCameraActive(true));
        dispatch(setError(null));
      } catch (err) {
        dispatch(setError('Camera access denied'));
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      dispatch(setCameraActive(false));
    }
  };

  

  const startRecording = () => {
    if (mediaRecorderRef.current && !isRecording) {
      mediaRecorderRef.current.start(1000); // Send chunks every second
      dispatch(setRecording(true));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      dispatch(setRecording(false));
    }
  };

  

  const handleMicClick = async () => {
  if (isRecording) {
    stopRecording();
    return;
  }

  if (!isVoiceActive) {
    await toggleVoice(); // mic permission + UI state
    return;
  }

  startRecording();
};

return (
  <Layout>
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex-1 flex flex-col relative">

        {/* Header */}
        <div className="md:flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm relative z-10 hidden">
          <div className="flex items-center space-x-2">
            <div
              className={`
                w-3 h-3 rounded-full
                ${connectionStatus === 'connected'
                  ? 'bg-green-400'
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-400 animate-pulse'
                  : connectionStatus === 'error'
                  ? 'bg-red-400'
                  : 'bg-gray-400'}
              `}
            />
            <span className="text-sm text-gray-300">
              {connectionStatus === 'connected'
                ? 'Live'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : connectionStatus === 'error'
                ? 'Error'
                : 'Offline'}
            </span>
          </div>

          {isCameraActive && (
            <button
              onClick={toggleCamera}
              className="p-2 rounded-full bg-white/10 backdrop-blur-sm"
            >
              <CameraOff size={20} />
            </button>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center relative px-6">

          {/* Orb */}
          <div className="relative mb-8">
            <div
              className={`
                w-40 h-40 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-full relative transition-all duration-300
                ${(isRecording || isSpeaking) ? 'scale-110' : 'scale-100'}
              `}
            >
              {/* Glow */}
              <div
                className={`
                  absolute -inset-4 rounded-full blur-xl transition-all
                  ${(isRecording || isSpeaking)
                    ? 'bg-gradient-to-br from-blue-400/50 via-purple-500/50 to-pink-500/50 animate-pulse'
                    : 'bg-gradient-to-br from-blue-600/30 via-purple-600/30 to-indigo-600/30'}
                `}
              />

              {/* Base */}
              <div
                className={`
                  absolute inset-0 rounded-full opacity-90
                  ${(isRecording || isSpeaking) ? 'gradient-orb-active' : 'gradient-orb'}
                `}
              />

              {/* Glass */}
              <div
                className={`
                  absolute inset-2 rounded-full backdrop-blur-xl border border-white/20
                  ${(isRecording || isSpeaking)
                    ? 'bg-gradient-to-br from-white/20 via-white/10 to-white/5'
                    : 'bg-gradient-to-br from-white/15 via-white/8 to-white/3'}
                `}
              />

              {/* Ripples */}
              {(isRecording || isSpeaking) && (
                <div className="absolute inset-0">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-0 rounded-full border-2 border-white/20 voice-ripple"
                      style={{ animationDelay: `${i * 0.6}s` }}
                    />
                  ))}
                </div>
              )}

              {/* Center Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                {isRecording ? (
                  <div className="w-4 h-4 sm:w-6 sm:h-6 bg-white rounded-sm animate-pulse shadow-lg" />
                ) : isSpeaking ? (
                  <Volume2 className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-pulse" />
                ) : (
                  <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white/90 animate-pulse" />
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-light mb-2">
              {isRecording ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Tap to speak'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isRecording
                ? 'I can hear you clearly'
                : isSpeaking
                ? 'Let me help you'
                : 'Tap the microphone to begin'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 max-w-sm">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Camera */}
          {isCameraActive && (
            <div className="absolute inset-0 z-0">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-black/50 backdrop-blur-sm">

          {/* Mic Button */}
          <div className="flex justify-center mb-6">
            <button
                onClick={handleMicClick}

              disabled={isConnecting}
              className={`
                w-20 h-20 rounded-full flex items-center justify-center transition-all
                ${isRecording
                  ? 'bg-red-500 hover:bg-red-600 scale-110'
                  : isVoiceActive
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-white/20 hover:bg-white/30'}
                ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}
                shadow-lg
              `}
            >
              {isConnecting ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : isRecording ? (
                <div className="w-6 h-6 bg-white rounded-sm" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
          </div>

          {/* Camera Toggle */}
          <div className="flex justify-center">
            <button
              onClick={toggleCamera}
              disabled={isConnecting}
              className={`
                p-4 rounded-full
                ${isCameraActive ? 'bg-white/20' : 'bg-white/10 text-gray-400'}
                hover:bg-white/30
              `}
            >
              {isCameraActive ? <CameraOff size={24} /> : <Camera size={24} />}
            </button>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  </Layout>
);

}