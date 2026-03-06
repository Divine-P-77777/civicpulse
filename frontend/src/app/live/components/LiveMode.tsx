'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';

interface LiveModeProps {
    onClose: () => void;
    onUploadClick: () => void;
}

export default function LiveMode({ onClose, onUploadClick }: LiveModeProps) {
    const { getToken } = useAuth();
    const clerk = useClerk();
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking' | 'error'>('idle');
    const [transcript, setTranscript] = useState<string>('Connecting to Live Voice...');
    const [isCameraActive, setIsCameraActive] = useState(false);

    // WebSockets & Audio Refs
    const wsRef = useRef<WebSocket | null>(null);
    const recognitionRef = useRef<any>(null);
    const accumulatedTextRef = useRef<string>('');
    const audioQueueRef = useRef<string[]>([]);
    const isPlayingRef = useRef<boolean>(false);
    const isListeningRef = useRef<boolean>(false); // Tracks if we should actually capture audio
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const sessionIdRef = useRef<string>('');

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
                clerk.openSignIn(); // Trigger the Clerk Sign In Modal
                onClose(); // Auto-close Live Mode while they sign in
                return;
            }

            // Use NEXT_PUBLIC_BACKEND_URL for direct backend connection
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
                reconnectAttemptsRef.current = 0; // Reset on successful connection
                ws.send(JSON.stringify({ type: 'config', language: 'en' }));
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

                // Auto-reconnect with exponential backoff (only if not a clean close)
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
            if (wsRef.current) {
                wsRef.current.close(1000, 'Component unmounted'); // Clean close
            }
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current = null;
            }
        };
    }, []);

    // Frame capture loop
    useEffect(() => {
        if (isCameraActive && wsRef.current?.readyState === WebSocket.OPEN) {
            frameIntervalRef.current = setInterval(() => {
                captureFrame();
            }, 1000); // Send 1 frame per second
        } else {
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
                frameIntervalRef.current = null;
            }
        }

        return () => {
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
            }
        };
    }, [isCameraActive]);

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
            wsRef.current.send(JSON.stringify({
                type: 'camera_capture',
                data: base64
            }));
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
                setIsCameraActive(true);
            } catch (err) {
                console.error('Camera access denied', err);
                setStatus('error');
                setTranscript('Camera access denied.');
            }
        } else {
            stopCamera();
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
        setIsCameraActive(false);
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
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);

        audioElementRef.current.src = url;
        audioElementRef.current.play().catch(e => {
            console.error("Audio play error", e);
            setTimeout(() => {
                isPlayingRef.current = false;
                playNextAudioChunk();
            }, 100);
        });
    };

    // Sync listening ref with status so closures have the latest state safely
    useEffect(() => {
        isListeningRef.current = (status === 'listening');
    }, [status]);

    const startRecording = () => {
        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                setStatus('error');
                setTranscript('Your browser does not support the Web Speech API. Please use Chrome or Edge.');
                return;
            }

            if (!recognitionRef.current) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onstart = () => {
                    setStatus('listening');
                    setTranscript('Listening... Speak now.');
                };

                recognition.onresult = (event: any) => {
                    if (!isListeningRef.current) return;

                    let interimTranscript = '';
                    let finalTranscriptForTurn = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscriptForTurn += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (finalTranscriptForTurn) {
                        accumulatedTextRef.current += ' ' + finalTranscriptForTurn;
                        const textToSend = accumulatedTextRef.current.trim();
                        setTranscript(`You: "${textToSend}"`);

                        // Auto-send on final pause!
                        if (wsRef.current?.readyState === WebSocket.OPEN && textToSend) {
                            console.log(`[ws-debug] Sending user text: ${textToSend}`);
                            wsRef.current.send(JSON.stringify({ type: 'user_text', text: textToSend }));
                            setStatus('processing');
                            setTranscript('Processing your speech...');
                            accumulatedTextRef.current = '';
                        }
                    } else if (interimTranscript) {
                        const currentSessionText = (accumulatedTextRef.current + ' ' + interimTranscript).trim();
                        setTranscript(`You: "${currentSessionText}"`);
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                };

                recognition.onend = () => {
                    // Try to restart if we are still supposed to be listening
                    if (isListeningRef.current && status === 'listening') {
                        try { recognition.start(); } catch (e) { }
                    }
                };

                recognitionRef.current = recognition;
            }

            try { recognitionRef.current.start(); } catch (e) { }

        } catch (err) {
            console.error("Microphone access denied or failed", err);
            setStatus('error');
            setTranscript('Microphone access denied.');
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
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
            const textToSend = accumulatedTextRef.current.trim();
            if (wsRef.current?.readyState === WebSocket.OPEN && textToSend) {
                wsRef.current.send(JSON.stringify({ type: 'user_text', text: textToSend }));
                setStatus('processing');
                setTranscript('Processing your speech...');
                accumulatedTextRef.current = '';
            }
        }
    };

    return (
        <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-between animate-fade-in bg-white">
            {/* Background Camera Feed */}
            {isCameraActive && (
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

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Header / Info */}
            <div className="pt-20 px-8 w-full max-w-lg text-center z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-[#2A6CF0] to-[#4CB782] rounded-3xl flex items-center justify-center shadow-lg mx-auto mb-6 transform hover:scale-105 transition-transform">
                    <span className="text-white text-3xl">⚖️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">CivicPulse Live</h2>
                <p className={`text-sm font-medium uppercase tracking-widest ${status === 'error' ? 'text-red-400' : 'text-gray-400 animate-pulse'}`}>
                    {status === 'idle' ? 'Connecting...' : status === 'listening' ? 'Listening...' : status === 'processing' ? 'Thinking...' : status === 'speaking' ? 'Speaking...' : 'Error'}
                </p>
                <div className="mt-8 text-xl text-gray-600 font-light leading-relaxed px-4 opacity-80 h-32 flex items-center justify-center break-words overflow-hidden">
                    {transcript}
                </div>
            </div>

            {/* Glowing Bot Animation Area */}
            <div className="relative w-full h-80 flex items-end justify-center pb-20 z-0">
                <div className="absolute bottom-0 w-full h-96 flex items-center justify-center overflow-hidden mix-blend-multiply opacity-60">
                    <div className={`absolute w-[40vw] max-w-sm h-48 bg-[#2A6CF0] rounded-full blur-[80px] opacity-70 transition-all duration-1000 origin-center ${status === 'listening' ? 'scale-110 translate-y-4 animate-float' :
                        status === 'speaking' ? 'scale-125 translate-y-0 animate-pulse' :
                            'scale-90 translate-y-10'
                        }`} style={{ animationDuration: '4s' }} />
                    <div className={`absolute w-[30vw] max-w-xs h-40 bg-[#4CB782] rounded-full blur-[70px] opacity-60 transition-all duration-1000 translate-x-32 origin-center ${status === 'listening' ? 'scale-100 translate-y-8 animate-float-delayed' :
                        status === 'speaking' ? 'scale-110 -translate-y-4 animate-pulse' :
                            'scale-80 translate-y-12'
                        }`} style={{ animationDuration: '3s' }} />
                    <div className={`absolute w-[35vw] max-w-xs h-44 bg-purple-400 rounded-full blur-[80px] opacity-40 transition-all duration-1000 -translate-x-32 origin-center ${status === 'listening' ? 'scale-100 translate-y-8 animate-float' :
                        status === 'speaking' ? 'scale-120 -translate-y-2 animate-pulse' :
                            'scale-80 translate-y-12'
                        }`} style={{ animationDuration: '5s' }} />
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-12 w-full flex items-center justify-center gap-6 z-10 px-6">
                <button
                    onClick={onUploadClick}
                    className="w-14 h-14 bg-white border border-gray-200 shadow-lg rounded-full flex items-center justify-center text-gray-500 hover:text-[#2A6CF0] hover:scale-110 active:scale-95 transition-all"
                    title="Upload Document"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
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
                    className="w-14 h-14 bg-white border border-gray-200 shadow-lg rounded-full flex items-center justify-center text-gray-500 hover:text-[#E45454] hover:scale-110 active:scale-95 transition-all"
                    title="End Live Mode"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                </button>
            </div>

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
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}

