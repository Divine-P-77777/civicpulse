import React, { useEffect, useState, useRef } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import PhotoReview from './PhotoReview';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { setLanguage } from '@/store/slices/uiSlice';

interface LiveModeProps {
    onClose: () => void;
    onUploadClick: () => void;
}

export default function LiveMode({ onClose, onUploadClick }: LiveModeProps) {
    const { getToken } = useAuth();
    const clerk = useClerk();
    const dispatch = useAppDispatch();
    const language = useAppSelector((state) => state.ui.language);

    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'uploading'>('idle');
    const [transcript, setTranscript] = useState<string>('Connecting to Live Voice...');
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    // Camera Mode State
    const [cameraMode, setCameraMode] = useState<'off' | 'viewfinder' | 'review'>('off');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    // WebSockets & Audio Refs
    const wsRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioQueueRef = useRef<string[]>([]);
    const isPlayingRef = useRef<boolean>(false);
    const isListeningRef = useRef<boolean>(false);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const sessionIdRef = useRef<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Reconnection state
    const reconnectAttemptsRef = useRef<number>(0);
    const maxReconnectAttempts = 3;
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connectWebSocket = async () => {
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
            const wsUrl = `${wsBaseUrl}/api/live/ws/${sessionIdRef.current}?token=${token}`;

            console.log("Connecting to WebSocket:", wsUrl.split('?token=')[0]);
            setTranscript('Connecting to Live Voice...');
            setStatus('idle');

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
                    if (message.type === 'user_transcript') {
                        setTranscript(`You: "${message.text}"`);
                        setStatus('processing');
                    } else if (message.type === 'audio_stream') {
                        setStatus('speaking');
                        audioQueueRef.current.push(message.data);
                        playNextAudioChunk();
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
                // onclose will fire after onerror, so we handle reconnection there
            };

        } catch (err) {
            console.error("Failed to connect to WebSocket", err);
            setStatus('error');
            setTranscript('Failed to establish connection. Please check authentication.');
        }
    };

    useEffect(() => {
        // Initialize Audio Element for playback
        audioElementRef.current = new Audio();
        audioElementRef.current.onended = playNextAudioChunk;

        // Generate a random session ID for this live call
        sessionIdRef.current = Math.random().toString(36).substring(2, 10);

        // Do NOT connect immediately to avoid Audio Autoplay blocking.
        // The user must trigger the connection via click.
        setStatus('idle');
        setTranscript('Ready. Tap the button to connect.');

        return () => {
            // Prevent reconnection on unmount
            reconnectAttemptsRef.current = maxReconnectAttempts;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            stopRecording();
            stopCamera();
            if (wsRef.current) wsRef.current.close(1000, 'Component unmounted');
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current = null;
            }
        };
    }, []);

    // Effect to update language config on the fly
    useEffect(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log("Updating language config:", language);
            wsRef.current.send(JSON.stringify({ type: 'config', language }));
        }
    }, [language]);

    // Synchronization Effect to fix "Black Screen" issue
    // Ensures that whenever the video element is mounted (in any mode), it gets the active stream
    useEffect(() => {
        if (videoRef.current && streamRef.current) {
            console.log("Attaching stream to video element:", cameraMode);
            videoRef.current.srcObject = streamRef.current;
        }
    }, [cameraMode, isCameraActive]);

    // Frame capture loop (Passive Background Feed)
    useEffect(() => {
        if (isCameraActive && !cameraMode.includes('viewfinder') && wsRef.current?.readyState === WebSocket.OPEN) {
            frameIntervalRef.current = setInterval(() => {
                captureFrame();
            }, 1000);
        } else {
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
                frameIntervalRef.current = null;
            }
        }
        return () => {
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
        };
    }, [isCameraActive, cameraMode]);

    const captureFrame = () => {
        if (!videoRef.current || !canvasRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
            wsRef.current.send(JSON.stringify({ type: 'camera_capture', data: base64 }));
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            streamRef.current = stream;
            setCameraMode('viewfinder');
        } catch (err) {
            console.error('Camera access denied', err);
            setStatus('error');
            setTranscript('Camera access denied.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraMode('off');
        setCapturedImage(null);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(dataUrl);
            setCameraMode('review');
        }
    };

    const handleAccept = async () => {
        if (!capturedImage) return;
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        setCameraMode('off');
        uploadPhoto(file);
    };

    const handleRetry = () => {
        setCapturedImage(null);
        setCameraMode('viewfinder');
    };

    const handleCancel = () => {
        stopCamera();
    };

    const uploadPhoto = async (file: File) => {
        try {
            const token = await getToken();
            if (!token) return;
            setStatus('uploading');
            setUploadProgress(0);
            setTranscript('Uploading photo...');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'image');
            formData.append('metadata', JSON.stringify({ type: 'live_photo', session_id: sessionIdRef.current }));
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'X-Live-Session-ID': sessionIdRef.current },
                body: formData
            });
            if (!response.ok) throw new Error('Upload failed');
            setTranscript('Photo uploaded! Processing...');
        } catch (err) {
            console.error('Photo upload error', err);
            setStatus('error');
            setTranscript('Failed to upload photo.');
        }
    };

    const toggleCamera = async () => {
        if (!isCameraActive) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setIsCameraActive(true);
            } catch (err) {
                console.error('Camera access denied', err);
                setStatus('error');
                setTranscript('Camera access denied.');
            }
        } else {
            stopCamera();
            setIsCameraActive(false);
        }
    };

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
        const byteCharacters = atob(base64Audio!);
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
        isListeningRef.current = (status === 'listening');
    }, [status]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = (event) => {
                if (!isListeningRef.current) return;
                if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
                    const reader = new FileReader();
                    reader.readAsDataURL(event.data);
                    reader.onloadend = () => {
                        const base64data = (reader.result as string).split(',')[1];
                        wsRef.current?.send(JSON.stringify({ type: 'audio_chunk', data: base64data }));
                    };
                }
            };
            mediaRecorder.start(250);
            setStatus('listening');
            setTranscript('Listening... Speak now.');

            // Request AI Greeting now that user has interacted and mic is ready
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                console.log("Requesting AI Greeting...");
                wsRef.current.send(JSON.stringify({ type: 'request_greeting' }));
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

    const handleSilenceToggle = () => {
        // First click: connect to WebSocket and unlock audio
        if (!wsRef.current) {
            connectWebSocket();
            return;
        }

        if (status === 'speaking') {
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current.currentTime = 0;
            }
            audioQueueRef.current = [];
            isPlayingRef.current = false;

            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
            }
            setStatus('listening');
            setTranscript('Interrupted. Listening...');
        } else if (status === 'listening') {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'end_of_speech' }));
                setStatus('processing');
                setTranscript('Processing your speech...');
            }
        }
    };

    return (
        <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-between animate-fade-in bg-white overflow-hidden">
            {/* Camera Viewfinder */}
            {cameraMode === 'viewfinder' && (
                <div className="absolute inset-0 z-40 bg-black">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    {/* Viewfinder Overlay Guidance */}
                    <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 aspect-square border-2 border-white/30 rounded-3xl pointer-events-none" />
                </div>
            )}

            {/* Review Overlay */}
            {cameraMode === 'review' && capturedImage && (
                <PhotoReview
                    image={capturedImage}
                    onAccept={handleAccept}
                    onRetry={handleRetry}
                    onCancel={handleCancel}
                />
            )}

            {/* Existing Passive Camera Background Feed (Only if main camera is off) */}
            {cameraMode === 'off' && isCameraActive && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-30 grayscale"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white opacity-80" />
                </div>
            )}

            {/* Header / Info */}
            <div className={`pt-20 px-8 w-full max-w-lg text-center z-10 transition-opacity duration-500 ${cameraMode !== 'off' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="w-16 h-16 bg-gradient-to-br from-[#2A6CF0] to-[#4CB782] rounded-3xl flex items-center justify-center shadow-lg mx-auto mb-6 transform hover:scale-105 transition-transform relative group">
                    <span className="text-white text-3xl">⚖️</span>

                    {/* Floating Language Toggle */}
                    <div className="absolute -top-2 -right-12 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                        <button
                            onClick={() => dispatch(setLanguage('en'))}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${language === 'en' ? 'bg-[#2A6CF0] text-white border-[#2A6CF0]' : 'bg-white text-gray-400 border-gray-200'}`}
                        >EN</button>
                        <button
                            onClick={() => dispatch(setLanguage('hi'))}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${language === 'hi' ? 'bg-[#4CB782] text-white border-[#4CB782]' : 'bg-white text-gray-400 border-gray-200'}`}
                        >हि</button>
                    </div>
                </div>

                {/* Visible Language Toggle below icon purely for mobile/visibility */}
                <div className="flex justify-center gap-2 mb-4">
                    <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                        <button
                            onClick={() => dispatch(setLanguage('en'))}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${language === 'en' ? 'bg-white text-[#2A6CF0] shadow-sm' : 'text-gray-400'}`}
                        >EN</button>
                        <button
                            onClick={() => dispatch(setLanguage('hi'))}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${language === 'hi' ? 'bg-white text-[#4CB782] shadow-sm' : 'text-gray-400'}`}
                        >हि</button>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">CivicPulse Live</h2>
                <div className="flex flex-col items-center">
                    <p className={`text-sm font-medium uppercase tracking-widest ${status === 'error' ? 'text-red-400' : 'text-gray-400 animate-pulse'}`}>
                        {status === 'idle' ? 'Connecting...' :
                            status === 'listening' ? 'Listening...' :
                                status === 'processing' ? 'Thinking...' :
                                    status === 'speaking' ? 'Speaking...' :
                                        status === 'uploading' ? `Processing Photo (${uploadProgress}%)` :
                                            'Error'}
                    </p>
                    {status === 'uploading' && (
                        <div className="w-48 h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#2A6CF0] to-[#4CB782] transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    )}
                </div>
                <div className={`mt-8 text-lg md:text-xl text-gray-600 leading-relaxed px-4 opacity-80 min-h-[8rem] max-h-40 flex items-center justify-center break-words overflow-y-auto custom-scrollbar ${language === 'hi' ? 'font-medium' : 'font-light'}`}>
                    {transcript}
                </div>
            </div>

            {/* Glowing Bot Animation Area */}
            <div className={`relative w-full h-80 flex items-end justify-center pb-20 z-0 transition-opacity duration-500 ${cameraMode !== 'off' ? 'opacity-0' : 'opacity-100'}`}>
                <div className="absolute bottom-0 w-full h-96 flex items-center justify-center overflow-hidden mix-blend-multiply opacity-60">
                    <div className={`absolute w-[40vw] max-w-sm h-48 bg-[#2A6CF0] rounded-full blur-[80px] opacity-70 transition-all duration-1000 origin-center ${status === 'listening' ? 'scale-110 translate-y-4 animate-float' :
                        status === 'speaking' || status === 'uploading' ? 'scale-125 translate-y-0 animate-pulse' :
                            'scale-90 translate-y-10'
                        }`} style={{ animationDuration: '4s' }} />
                    <div className={`absolute w-[30vw] max-w-xs h-40 bg-[#4CB782] rounded-full blur-[70px] opacity-60 transition-all duration-1000 translate-x-32 origin-center ${status === 'listening' ? 'scale-100 translate-y-8 animate-float-delayed' :
                        status === 'speaking' || status === 'uploading' ? 'scale-110 -translate-y-4 animate-pulse' :
                            'scale-80 translate-y-12'
                        }`} style={{ animationDuration: '3s' }} />
                    <div className={`absolute w-[35vw] max-w-xs h-44 bg-purple-400 rounded-full blur-[80px] opacity-40 transition-all duration-1000 -translate-x-32 origin-center ${status === 'listening' ? 'scale-100 translate-y-8 animate-float' :
                        status === 'speaking' || status === 'uploading' ? 'scale-120 -translate-y-2 animate-pulse' :
                            'scale-80 translate-y-12'
                        }`} style={{ animationDuration: '5s' }} />
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-12 w-full flex flex-col items-center gap-8 z-50">
                {cameraMode === 'viewfinder' ? (
                    /* Shutter Button Interface */
                    <div className="flex items-center justify-center w-full pb-4">
                        <button
                            onClick={capturePhoto}
                            className="group relative w-20 h-20 flex items-center justify-center"
                        >
                            <div className="absolute inset-0 bg-white/20 rounded-full scale-125 blur-sm" />
                            <div className="absolute inset-0 border-4 border-white rounded-full group-active:scale-90 transition-transform" />
                            <div className="w-16 h-16 bg-white rounded-full group-hover:scale-105 active:scale-90 shadow-2xl transition-all" />
                        </button>
                    </div>
                ) : cameraMode === 'off' ? (
                    /* Standard Live Mode Controls - Only show when NOT in camera/review modes */
                    <div className="flex items-center justify-center gap-4 px-6 w-full">
                        <button
                            onClick={onUploadClick}
                            className="w-12 h-12 bg-white border border-gray-200 shadow-lg rounded-full flex items-center justify-center text-gray-500 hover:text-[#2A6CF0] hover:scale-110 active:scale-95 transition-all"
                            title="Upload Document"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                        </button>

                        <button
                            onClick={startCamera}
                            className="w-12 h-12 bg-white border border-gray-200 shadow-lg rounded-full flex items-center justify-center text-gray-400 hover:text-[#4CB782] hover:scale-110 active:scale-95 transition-all"
                            title="Open Camera"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" />
                            </svg>
                        </button>

                        {/* Main Send / Interrupt Button */}
                        <button
                            onClick={handleSilenceToggle}
                            className={`w-20 h-20 shadow-[0_8px_32px_rgba(42,108,240,0.4)] rounded-full flex items-center justify-center transition-all ${status === 'listening' ? 'bg-[#E45454] text-white animate-pulse shadow-[0_8px_32px_rgba(228,84,84,0.4)]' : 'bg-[#2A6CF0] text-white'
                                } hover:scale-105 active:scale-95`}
                            title={status === 'listening' ? "Tap to send speech" : "Interrupt AI"}
                        >
                            {status === 'listening' ? (
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>
                            ) : (
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                            )}
                        </button>

                        <button
                            onClick={onClose}
                            className="w-12 h-12 bg-white border border-gray-200 shadow-lg rounded-full flex items-center justify-center text-gray-500 hover:text-[#E45454] hover:scale-110 active:scale-95 transition-all"
                            title="End Live Mode"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                            </svg>
                        </button>
                    </div>
                ) : null}
            </div>

            {/* Hidden canvas for snapping */}
            <canvas ref={canvasRef} className="hidden" />

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) scale(1.1); }
                    50% { transform: translateY(-20px) scale(1.05); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(15px) scale(1.1); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float-delayed 7s ease-in-out infinite;
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
