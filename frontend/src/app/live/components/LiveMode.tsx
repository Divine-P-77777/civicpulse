import React, { useEffect, useRef, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import PhotoReview from './PhotoReview';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { setLanguage } from '@/store/slices/uiSlice';
import { useLiveWebSocket } from '@/hooks/useLiveWebSocket';
import { useLiveCamera } from '@/hooks/useLiveCamera';
import { useLiveAudio } from '@/hooks/useLiveAudio';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

interface LiveModeProps {
    onClose: () => void;
    onUploadClick: () => void;
}

export default function LiveMode({ onClose, onUploadClick }: LiveModeProps) {
    const { getToken } = useAuth();
    const clerk = useClerk();
    const dispatch = useAppDispatch();
    const language = useAppSelector((state) => state.ui.language);

    const sessionIdRef = useRef<string>(Math.random().toString(36).substring(2, 10));
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Tour State
    const [runTour, setRunTour] = useState(false);
    useEffect(() => {
        const hasSeenTour = localStorage.getItem('civicpulse_live_tour_seen');
        if (!hasSeenTour) {
            setRunTour(true);
        }
    }, []);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(status)) {
            setRunTour(false);
            localStorage.setItem('civicpulse_live_tour_seen', 'true');
        }
    };

    const tourSteps: Step[] = [
        {
            target: '#tour-main',
            content: language === 'hi' ? 'कनेक्ट करने और बोलना शुरू करने के लिए नीला बटन दबाएँ। अपनी बात पूरी करने के बाद लाल बटन दबाकर भेजें।' : 'Tap the blue button to connect. When you finish speaking, tap the red button to send.',
            disableBeacon: true,
            placement: 'top',
        },
        {
            target: '#tour-upload',
            content: language === 'hi' ? 'दस्तावेज़ और फ़ाइलें विश्लेषण के लिए यहाँ से अपलोड करें।' : 'Upload documents or files for analysis here.',
            placement: 'top',
        },
        {
            target: '#tour-camera',
            content: language === 'hi' ? 'दस्तावेज़ों और छवियों को स्कैन करने के लिए अपने कैमरे का उपयोग करें।' : 'Use your camera to scan documents and images live.',
            placement: 'top',
        },
        {
            target: '#tour-help',
            content: language === 'hi' ? 'किसी भी समय ये निर्देश दोबारा देखने के लिए यहाँ दबाएँ।' : 'Tap here to see these instructions again at any time.',
            placement: 'bottom-end',
        }
    ];

    // Audio State Init Hook (requires cyclic references, handling cleanly)
    const audioQueueRef = useRef<string[]>([]);

    const { 
        wsRef, status, setStatus, transcript, setTranscript, uploadProgress, 
        connectWebSocket, closeWebSocket 
    } = useLiveWebSocket({
        sessionId: sessionIdRef.current,
        language: language as 'en' | 'hi',
        getToken,
        clerk,
        onClose,
        playNextAudioChunk: () => playNextAudioChunk(), // Linked below
        audioQueueRef,
        startRecording: () => startRecording(),         // Linked below
        stopRecording: () => stopRecording(),           // Linked below
        stopCamera: () => stopCamera()                  // Linked below
    });

    const {
        cameraMode, isCameraActive, capturedImage, videoRef, canvasRef,
        startCamera, stopCamera, capturePhoto, toggleCamera, handleRetry
    } = useLiveCamera({
        wsReadyState: wsRef.current?.readyState,
        sendCaptureFrame: (b64) => wsRef.current?.send(JSON.stringify({ type: 'camera_capture', data: b64 }))
    });

    const {
        playNextAudioChunk, startRecording, stopRecording, interruptAudio, sendCurrentTranscript, resumeRecognition
    } = useLiveAudio({
        wsReadyState: wsRef.current?.readyState,
        sendUserText: (text) => wsRef.current?.send(JSON.stringify({ type: 'user_text', text })),
        requestGreeting: () => wsRef.current?.send(JSON.stringify({ type: 'request_greeting' })),
        status, setStatus, setTranscript,
        language: language as 'en' | 'hi',
        audioQueueRef
    });

    useEffect(() => {
        return () => {
            closeWebSocket();
            stopRecording();
            stopCamera();
            interruptAudio();
        };
    }, []);

    const uploadFile = async (file: File, isPhoto: boolean = false) => {
        try {
            const token = await getToken();
            if (!token) return;

            setStatus('uploading');
            const isHindi = language === 'hi';
            setTranscript(isPhoto ? (isHindi ? 'फ़ोटो अपलोड हो रही है...' : 'Uploading photo...') : (isHindi ? 'फ़ाइल अपलोड हो रही है...' : 'Uploading file...'));

            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', file.type.startsWith('image/') ? 'image' : 'pdf');
            formData.append('metadata', JSON.stringify({ type: isPhoto ? 'live_photo' : 'live_upload', session_id: sessionIdRef.current }));

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'X-Live-Session-ID': sessionIdRef.current },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');
            setTranscript(isHindi ? 'फ़ाइल अपलोड हो गई! प्रोसेसिंग हो रही है...' : 'File uploaded! Processing...');
        } catch (err) {
            setStatus('error');
            setTranscript(language === 'hi' ? 'फ़ाइल अपलोड करने में विफल।' : 'Failed to upload file.');
        }
    };

    const handleAccept = async () => {
        if (!capturedImage) return;
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        stopCamera();
        uploadFile(file, true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
            setStatus('error');
            setTranscript(language === 'hi' ? 'अमान्य फ़ाइल प्रकार। कृपया PDF या इमेज अपलोड करें।' : 'Invalid file type. Please upload PDF or image.');
            return;
        }
        uploadFile(file, false);
        e.target.value = '';
    };

    const handleSilenceToggle = () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            connectWebSocket();
            return;
        }
        if (status === 'speaking') {
            interruptAudio();
            wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
            setStatus('listening');
            setTranscript(language === 'hi' ? 'रुकावट। सुन रहा हूँ...' : 'Interrupted. Listening...');
            resumeRecognition();
        } else if (status === 'listening') {
            sendCurrentTranscript();
        }
    };

    // Status indicator color/label
    const statusConfig: Record<string, { label: string; color: string; pulse: boolean }> = {
        idle: { label: language === 'hi' ? 'कनेक्ट करें...' : 'Tap to Connect', color: 'text-gray-400', pulse: false },
        listening: { label: language === 'hi' ? 'सुन रहा है...' : 'Listening...', color: 'text-[#2A6CF0]', pulse: true },
        processing: { label: language === 'hi' ? 'सोच रहा है...' : 'Thinking...', color: 'text-amber-500', pulse: true },
        speaking: { label: language === 'hi' ? 'बोल रहा है...' : 'Speaking...', color: 'text-[#4CB782]', pulse: true },
        uploading: { label: `${language === 'hi' ? 'प्रोसेसिंग' : 'Processing'} (${uploadProgress}%)`, color: 'text-[#2A6CF0]', pulse: true },
        error: { label: language === 'hi' ? 'त्रुटि' : 'Error', color: 'text-red-400', pulse: false },
    };
    const currentStatus = statusConfig[status] || statusConfig.idle;

    // Main button config
    const getMainButtonStyle = () => {
        if (status === 'listening') return 'bg-[#E45454] shadow-[0_8px_32px_rgba(228,84,84,0.35)] scale-105';
        if (status === 'processing') return 'bg-amber-500 shadow-[0_8px_32px_rgba(245,158,11,0.35)] animate-pulse';
        if (status === 'speaking') return 'bg-[#4CB782] shadow-[0_8px_32px_rgba(76,183,130,0.35)]';
        return 'bg-[#2A6CF0] shadow-[0_8px_32px_rgba(42,108,240,0.35)]';
    };

    return (
        <div className="relative w-full h-[100dvh] flex flex-col items-center justify-between animate-fade-in bg-white overflow-hidden">
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous
                showSkipButton
                showProgress
                hideCloseButton
                callback={handleJoyrideCallback}
                styles={{
                    options: {
                        primaryColor: '#2A6CF0',
                        zIndex: 10000,
                    },
                    tooltip: {
                        borderRadius: '16px',
                        fontFamily: 'inherit',
                    },
                    buttonNext: {
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        padding: '8px 16px',
                    },
                    buttonBack: {
                        marginRight: '8px',
                    },
                    buttonSkip: {
                        fontWeight: '600',
                        color: '#64748b',
                    }
                }}
            />

            {/* Back button */}
            <button onClick={onClose} className="absolute top-5 left-5 z-50 p-2.5 text-gray-400 hover:text-gray-900 bg-white/60 hover:bg-white/90 rounded-full backdrop-blur-md transition-all shadow-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>

            {/* Help button */}
            <button id="tour-help" onClick={() => { localStorage.removeItem('civicpulse_live_tour_seen'); setRunTour(true); }} className="absolute top-5 right-5 z-50 p-2.5 text-gray-400 hover:text-gray-900 bg-white/60 hover:bg-white/90 rounded-full backdrop-blur-md transition-all shadow-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </button>

            {/* Camera modes */}
            {cameraMode === 'viewfinder' && (
               <div className="absolute inset-0 z-40 bg-black">
                   <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                   <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 aspect-square border-2 border-white/30 rounded-3xl pointer-events-none" />
               </div>
            )}
            {cameraMode === 'review' && capturedImage && (
                <PhotoReview image={capturedImage} onAccept={handleAccept} onRetry={handleRetry} onCancel={stopCamera} />
            )}
            {cameraMode === 'off' && isCameraActive && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover opacity-30 grayscale" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white opacity-80" />
                </div>
            )}

            {/* ─── Header Section ─────────────────────────────────── */}
            <div className={`mt-12 sm:mt-16 px-6 w-full max-w-lg text-center z-10 flex flex-col items-center transition-opacity duration-500 ${cameraMode !== 'off' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="w-12 h-12 bg-gradient-to-br from-[#2A6CF0] to-[#4CB782] rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">⚖️</span>
                </div>

                <div className="flex justify-center gap-2 mb-2 mt-3">
                    <div className="bg-gray-100 p-0.5 rounded-lg flex gap-0.5">
                        <button onClick={() => dispatch(setLanguage('en'))} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${language === 'en' ? 'bg-white text-[#2A6CF0] shadow-sm' : 'text-gray-400'}`}>EN</button>
                        <button onClick={() => dispatch(setLanguage('hi'))} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${language === 'hi' ? 'bg-white text-[#4CB782] shadow-sm' : 'text-gray-400'}`}>हि</button>
                    </div>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">CivicPulse Live</h2>
                
                {/* Status indicator pill */}
                <div className="mt-2 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'listening' ? 'bg-[#2A6CF0]' : status === 'speaking' ? 'bg-[#4CB782]' : status === 'processing' ? 'bg-amber-500' : status === 'error' ? 'bg-red-400' : 'bg-gray-300'} ${currentStatus.pulse ? 'animate-pulse' : ''}`} />
                    <p className={`text-xs font-semibold uppercase tracking-widest ${currentStatus.color}`}>{currentStatus.label}</p>
                </div>

                {/* Upload progress bar */}
                {status === 'uploading' && (
                    <div className="w-48 h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#2A6CF0] to-[#4CB782] transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                )}

                {/* Transcript area */}
                <div className={`mt-3 w-full max-h-[5rem] text-base text-gray-600 leading-relaxed px-4 overflow-y-auto rounded-xl ${transcript ? 'opacity-90' : 'opacity-40'} ${language === 'hi' ? 'font-medium' : 'font-light'}`}>
                    {transcript || (language === 'hi' ? 'कनेक्ट करने के लिए नीचे बटन दबाएँ' : 'Tap the button below to connect')}
                </div>
            </div>

            {/* ─── Glowing Animation Zone ─────────────────────────── */}
            <div className={`relative w-full flex-1 flex items-center justify-center min-h-[100px] transition-opacity duration-500 ${cameraMode !== 'off' ? 'opacity-0' : 'opacity-100'}`}>
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden mix-blend-multiply opacity-60">
                    <div className={`absolute w-[40vw] max-w-xs h-32 rounded-full blur-[60px] transition-all duration-700 ${status === 'listening' ? 'bg-[#2A6CF0] scale-110 translate-y-4 animate-float opacity-70' : status === 'speaking' ? 'bg-[#4CB782] scale-125 translate-y-0 animate-pulse opacity-80' : status === 'processing' ? 'bg-amber-400 scale-105 animate-pulse opacity-60' : 'bg-[#2A6CF0] scale-90 translate-y-10 opacity-40'}`} style={{ animationDuration: '4s' }} />
                    <div className={`absolute w-[30vw] max-w-xs h-28 rounded-full blur-[50px] transition-all duration-700 translate-x-16 ${status === 'listening' ? 'bg-[#4CB782] scale-100 translate-y-8 animate-float-delayed opacity-60' : status === 'speaking' ? 'bg-[#2A6CF0] scale-110 -translate-y-4 animate-pulse opacity-60' : status === 'processing' ? 'bg-orange-300 scale-95 animate-pulse opacity-50' : 'bg-[#4CB782] scale-80 translate-y-12 opacity-30'}`} style={{ animationDuration: '3s' }} />
                </div>
            </div>

            {/* ─── Controls Section ───────────────────────────────── */}
            <div className="relative w-full flex flex-col items-center gap-5 z-50 pb-6">
                {cameraMode === 'viewfinder' ? (
                    <div className="flex items-center justify-center w-full pb-4">
                        <button onClick={capturePhoto} className="group relative w-16 h-16 flex items-center justify-center">
                            <div className="absolute inset-0 bg-white/20 rounded-full scale-125 blur-sm" />
                            <div className="absolute inset-0 border-4 border-white rounded-full group-active:scale-90 transition-transform" />
                            <div className="w-12 h-12 bg-white rounded-full transition-all" />
                        </button>
                    </div>
                ) : cameraMode === 'off' ? (
                    <div className="flex items-center justify-center gap-3 sm:gap-4 px-6 w-full">
                        {/* Upload button */}
                        <button id="tour-upload" onClick={() => fileInputRef.current?.click()} className="w-11 h-11 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center text-gray-500 hover:text-[#2A6CF0] hover:border-[#2A6CF0]/30 transition-all active:scale-95">
                            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        </button>

                        {/* Camera button */}
                        <button id="tour-camera" onClick={startCamera} className="w-11 h-11 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center text-gray-400 hover:text-[#4CB782] hover:border-[#4CB782]/30 transition-all active:scale-95">
                            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                        </button>

                        {/* Main action button — changes color/icon based on status */}
                        <button id="tour-main" onClick={handleSilenceToggle} className={`w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all duration-300 ${getMainButtonStyle()} text-white active:scale-95`}>
                            {status === 'listening' ? (
                                /* Stop/Send icon */
                                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            ) : status === 'processing' ? (
                                /* Thinking dots */
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                                </div>
                            ) : status === 'speaking' ? (
                                /* Sound wave / interrupt icon */
                                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="6" y="6" width="12" height="12" rx="2" ry="2" /></svg>
                            ) : (
                                /* Mic icon — default/idle */
                                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                            )}
                        </button>

                        {/* Close button */}
                        <button onClick={onClose} className="w-11 h-11 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center text-gray-500 hover:text-[#E45454] hover:border-[#E45454]/30 transition-all active:scale-95">
                            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                ) : null}

                {/* Hint text below buttons */}
                {cameraMode === 'off' && status === 'idle' && (
                    <p className="text-[11px] text-gray-400 font-medium -mt-1">{language === 'hi' ? 'शुरू करने के लिए बटन दबाएँ' : 'Tap the mic to start'}</p>
                )}
                {cameraMode === 'off' && status === 'listening' && (
                    <p className="text-[11px] text-gray-400 font-medium -mt-1">{language === 'hi' ? 'बोलें, फिर ▶ दबाएँ' : 'Speak, then tap ▶ to send'}</p>
                )}

                {/* Professional UI Disclaimer */}
                {cameraMode === 'off' && (
                    <p className="text-[10px] text-gray-400 mt-2 text-center px-8 min-h-[16px] leading-[1.2]">
                        {language === 'hi' ? 'AI पर आधारित। कानूनी मामलों के लिए पेशेवर वकील से परामर्श लें।' : 'CivicPulse is an AI assistant, not a lawyer. For serious matters, always consult a qualified lawyer.'}
                    </p>
                )}
            </div>

            <canvas ref={canvasRef} className="hidden" />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/*" className="hidden" />

            <style jsx>{`
                @keyframes float { 0%, 100% { transform: translateY(0) scale(1.1); } 50% { transform: translateY(-20px) scale(1.05); } }
                @keyframes float-delayed { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(15px) scale(1.1); } }
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite; }
                .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
}
