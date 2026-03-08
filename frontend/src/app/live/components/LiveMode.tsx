import React, { useEffect, useRef } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import PhotoReview from './PhotoReview';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { setLanguage } from '@/store/slices/uiSlice';
import { useLiveWebSocket } from '@/hooks/useLiveWebSocket';
import { useLiveCamera } from '@/hooks/useLiveCamera';
import { useLiveAudio } from '@/hooks/useLiveAudio';

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
        playNextAudioChunk, startRecording, stopRecording, interruptAudio, sendCurrentTranscript
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
        } else if (status === 'listening') {
            // Send accumulated speech transcript to backend
            sendCurrentTranscript();
        }
    };

    return (
        <div className="relative w-full h-[100dvh] flex flex-col items-center justify-between animate-fade-in bg-white overflow-hidden">
            
            <button onClick={onClose} className="absolute top-6 left-6 z-50 p-2 text-gray-400 hover:text-gray-900 bg-white/50 hover:bg-white/90 rounded-full backdrop-blur-md transition-all border border-transparent shadow-sm">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>

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

            <div className={`mt-14 sm:mt-20 px-6 w-full max-w-lg text-center z-10 flex flex-col items-center transition-opacity duration-500 ${cameraMode !== 'off' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="w-14 h-14 bg-gradient-to-br from-[#2A6CF0] to-[#4CB782] rounded-2xl flex items-center justify-center shadow-lg relative group">
                    <span className="text-white text-2xl">⚖️</span>
                </div>

                <div className="flex justify-center gap-2 mb-3 mt-4">
                    <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                        <button onClick={() => dispatch(setLanguage('en'))} className={`px-3 py-1 rounded-lg text-xs font-bold ${language === 'en' ? 'bg-white text-[#2A6CF0] shadow-sm' : 'text-gray-400'}`}>EN</button>
                        <button onClick={() => dispatch(setLanguage('hi'))} className={`px-3 py-1 rounded-lg text-xs font-bold ${language === 'hi' ? 'bg-white text-[#4CB782] shadow-sm' : 'text-gray-400'}`}>हि</button>
                    </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">CivicPulse Live</h2>
                <div className="flex flex-col items-center">
                    <p className={`text-sm font-medium uppercase tracking-widest ${status === 'error' ? 'text-red-400' : 'text-gray-400 animate-pulse'}`}>
                        {status === 'idle' ? 'Connecting...' : status === 'listening' ? 'Listening...' : status === 'processing' ? 'Thinking...' : status === 'speaking' ? 'Speaking...' : status === 'uploading' ? `Processing Photo (${uploadProgress}%)` : 'Error'}
                    </p>
                    {status === 'uploading' && (
                        <div className="w-48 h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#2A6CF0] to-[#4CB782] transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                    )}
                </div>
                <div className={`mt-4 text-lg text-gray-600 leading-relaxed px-4 opacity-80 h-[6rem] flex items-center justify-center overflow-y-auto ${language === 'hi' ? 'font-medium' : 'font-light'}`}>
                    {transcript}
                </div>
            </div>

            <div className={`relative w-full flex-1 flex items-center justify-center min-h-[120px] transition-opacity duration-500 ${cameraMode !== 'off' ? 'opacity-0' : 'opacity-100'}`}>
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden mix-blend-multiply opacity-60">
                    <div className={`absolute w-[40vw] max-w-xs h-32 bg-[#2A6CF0] rounded-full blur-[60px] opacity-70 transition-all ${status === 'listening' ? 'scale-110 translate-y-4 animate-float' : status === 'speaking' || status === 'uploading' ? 'scale-125 translate-y-0 animate-pulse' : 'scale-90 translate-y-10'}`} style={{ animationDuration: '4s' }} />
                    <div className={`absolute w-[30vw] max-w-xs h-28 bg-[#4CB782] rounded-full blur-[50px] opacity-60 transition-all translate-x-16 ${status === 'listening' ? 'scale-100 translate-y-8 animate-float-delayed' : status === 'speaking' || status === 'uploading' ? 'scale-110 -translate-y-4 animate-pulse' : 'scale-80 translate-y-12'}`} style={{ animationDuration: '3s' }} />
                </div>
            </div>

            <div className="relative w-full flex flex-col items-center gap-6 z-50 pb-12">
                {cameraMode === 'viewfinder' ? (
                    <div className="flex items-center justify-center w-full pb-4">
                        <button onClick={capturePhoto} className="group relative w-16 h-16 flex items-center justify-center">
                            <div className="absolute inset-0 bg-white/20 rounded-full scale-125 blur-sm" />
                            <div className="absolute inset-0 border-4 border-white rounded-full group-active:scale-90 transition-transform" />
                            <div className="w-12 h-12 bg-white rounded-full transition-all" />
                        </button>
                    </div>
                ) : cameraMode === 'off' ? (
                    <div className="flex items-center justify-center gap-4 px-6 w-full">
                        <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 bg-white border border-gray-200 shadow-lg rounded-full flex items-center justify-center text-gray-500 hover:text-[#2A6CF0] transition-all">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        </button>
                        <button onClick={startCamera} className="w-12 h-12 bg-white border border-gray-200 shadow-lg rounded-full flex items-center justify-center text-gray-400 hover:text-[#4CB782] transition-all">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                        </button>
                        <button onClick={handleSilenceToggle} className={`w-20 h-20 shadow-[0_8px_32px_rgba(42,108,240,0.4)] rounded-full flex items-center justify-center transition-all ${status === 'listening' ? 'bg-[#E45454] shadow-[0_8px_32px_rgba(228,84,84,0.4)]' : 'bg-[#2A6CF0]'} text-white`}>
                            {status === 'listening' ? (
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="6" y="6" width="12" height="12" rx="2" ry="2" /></svg>
                            ) : (
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                            )}
                        </button>
                        <button onClick={onClose} className="w-12 h-12 bg-white border border-gray-200 shadow-lg rounded-full flex items-center justify-center text-gray-500 hover:text-[#E45454] transition-all">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                ) : null}
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
