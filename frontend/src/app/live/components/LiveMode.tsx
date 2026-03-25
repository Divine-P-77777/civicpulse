import React, { useEffect, useRef, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import PhotoReview from './PhotoReview';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { useLiveWebSocket } from '@/hooks/useLiveWebSocket';
import { useLiveCamera } from '@/hooks/useLiveCamera';
import { useLiveAudio } from '@/hooks/useLiveAudio';
import { useUpload } from '@/hooks/useUpload';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import { FiFileText, FiArrowRight } from 'react-icons/fi';
import { setLanguage } from '@/store/slices/uiSlice';

import { LiveBackground } from './LiveBackground';
import { LiveHeader } from './LiveHeader';
import { LiveControls } from './LiveControls';

interface LiveModeProps {
    onClose: () => void;
    onUploadClick: () => void;
}

export default function LiveMode({ onClose, onUploadClick }: LiveModeProps) {
    const { getToken } = useAuth();
    const clerk = useClerk();
    const dispatch = useAppDispatch();
    const language = useAppSelector((state) => state.ui.language) as 'en' | 'hi';

    const sessionIdRef = useRef<string>(Math.random().toString(36).substring(2, 10));
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [autoSubmitCountdown, setAutoSubmitCountdown] = useState<number | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Tour State
    const [runTour, setRunTour] = useState(false);
    useEffect(() => {
        const hasSeenTour = localStorage.getItem('civicpulse_live_tour_seen');
        if (!hasSeenTour) setRunTour(true);
    }, []);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(data.status)) {
            setRunTour(false);
            localStorage.setItem('civicpulse_live_tour_seen', 'true');
        }
    };

    const tourSteps: Step[] = [
        { target: '#tour-main', content: language === 'hi' ? 'कनेक्ट करने और बोलना शुरू करने के लिए नीला बटन दबाएँ। अपनी बात पूरी करने के बाद लाल बटन दबाकर भेजें।' : 'Tap the blue button to connect. When you finish speaking, tap the red button to send.', disableBeacon: true, placement: 'top' },
        { target: '#tour-upload', content: language === 'hi' ? 'दस्तावेज़ और फ़ाइलें विश्लेषण के लिए यहाँ से अपलोड करें।' : 'Upload documents or files for analysis here.', placement: 'top' },
        { target: '#tour-camera', content: language === 'hi' ? 'दस्तावेज़ों और छवियों को स्कैन करने के लिए अपने कैमरे का उपयोग करें।' : 'Use your camera to scan documents and images live.', placement: 'top' },
        { target: '#tour-help', content: language === 'hi' ? 'किसी भी समय ये निर्देश दोबारा देखने के लिए यहाँ दबाएँ।' : 'Tap here to see these instructions again at any time.', placement: 'bottom-end' }
    ];

    const audioQueueRef = useRef<string[]>([]);

    const { 
        wsRef, status, setStatus, transcript, setTranscript, userTranscript, setUserTranscript, aiTranscript, setAiTranscript, uploadProgress, draftData, 
        connectWebSocket, closeWebSocket, trackedSend
    } = useLiveWebSocket({
        sessionId: sessionIdRef.current,
        language,
        getToken,
        clerk,
        onClose,
        playNextAudioChunk: () => playNextAudioChunk(), 
        audioQueueRef,
        startRecording: () => startRecording(),         
        stopRecording: () => stopRecording(),           
        stopCamera: () => stopCamera(),                  
        setBackendDone: (done) => setBackendDone(done),
        onLanguageSwitch: (lang) => dispatch(setLanguage(lang))
    });

    const {
        cameraMode, isCameraActive, capturedImage, videoRef, canvasRef,
        startCamera, stopCamera, capturePhoto, handleRetry
    } = useLiveCamera({
        wsReadyState: wsRef.current?.readyState,
        sendCaptureFrame: (b64) => trackedSend({ type: 'camera_capture', data: b64 })
    });

    const { uploadFile } = useUpload({
        sessionId: sessionIdRef.current,
        trackedSend,
        setStatus,
        setTranscript,
        language
    });

    const {
        playNextAudioChunk, startRecording, stopRecording, interruptAudio, sendCurrentTranscript, resumeRecognition, cancelAutoSubmit, setBackendDone
    } = useLiveAudio({
        wsReadyState: wsRef.current?.readyState,
        sendUserText: (text) => {
            const draftRegex = /\b(?:create|make|write|generate|draft)\b.*\b(?:draft|complaint|notice|letter|document)\b/i;
            if (draftRegex.test(text) || text.toLowerCase().startsWith('draft')) {
                window.location.href = `/draftcreation?topic=${encodeURIComponent(text)}&source=live`;
                return;
            }
            trackedSend({ type: 'user_text', text })
        },
        requestGreeting: () => trackedSend({ type: 'request_greeting' }),
        status, setStatus, setTranscript, setUserTranscript, setAiTranscript, language, audioQueueRef,
        onAutoSubmitStart: (seconds) => {
            setAutoSubmitCountdown(seconds);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            const startTime = Date.now();
            countdownIntervalRef.current = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                const remaining = Math.max(0, seconds - elapsed);
                if (remaining <= 0) {
                    setAutoSubmitCountdown(null);
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                } else {
                    setAutoSubmitCountdown(Math.round(remaining * 10) / 10);
                }
            }, 100);
        },
        onAutoSubmitCancel: () => {
            setAutoSubmitCountdown(null);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        }
    });

    useEffect(() => {
        return () => { closeWebSocket(); stopRecording(); stopCamera(); interruptAudio(); };
    }, []);

    const handleAccept = async () => {
        if (!capturedImage) return;
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        uploadFile(new File([blob], "capture.jpg", { type: "image/jpeg" }), true);
        stopCamera();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
            setStatus('error');
            setTranscript(language === 'hi' ? 'अमान्य फ़ाइल प्रकार।' : 'Invalid file type.');
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
            trackedSend({ type: 'interrupt' });
            setStatus('listening');
            setTranscript(language === 'hi' ? 'रुकावट। सुन रहा हूँ...' : 'Interrupted. Listening...');
            resumeRecognition();
        } else if (status === 'listening') {
            sendCurrentTranscript();
        }
    };

    const statusConfig: Record<string, { label: string; color: string; pulse: boolean }> = {
        idle: { label: language === 'hi' ? 'कनेक्ट करें...' : 'Tap to Connect', color: 'text-gray-400', pulse: false },
        listening: { label: language === 'hi' ? 'सुन रहा है...' : 'Listening...', color: 'text-blue-600', pulse: true },
        processing: { label: language === 'hi' ? 'सोच रहा है...' : 'Thinking...', color: 'text-amber-500', pulse: true },
        speaking: { label: language === 'hi' ? 'बोल रहा है...' : 'Speaking...', color: 'text-emerald-500', pulse: true },
        uploading: { label: `${language === 'hi' ? 'प्रोसेसिंग' : 'Processing'} (${uploadProgress}%)`, color: 'text-blue-600', pulse: true },
        error: { label: language === 'hi' ? 'त्रुटि' : 'Error', color: 'text-red-400', pulse: false },
    };
    const currentStatus = statusConfig[status] || statusConfig.idle;

    // Refractive Halo Variants
    const haloVariants: Variants = {
        idle: { scale: 0.9, opacity: 0.2, rotate: 0 },
        listening: { scale: [1, 1.1, 1], opacity: 0.5, rotate: 360, transition: { duration: 8, repeat: Infinity, ease: "linear" } },
        processing: { scale: [1, 1.05, 1], opacity: 0.3, rotate: -360, transition: { duration: 12, repeat: Infinity, ease: "linear" } },
        speaking: { scale: [1, 1.25, 1.15], opacity: 0.6, transition: { duration: 0.5, repeat: Infinity, repeatType: "mirror" } },
    };

    return (
        <div className="relative w-full h-[100dvh] flex flex-col items-center justify-between animate-fade-in bg-slate-50 overflow-hidden">
            <LiveBackground status={status} />
            
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous
                showSkipButton
                showProgress
                hideCloseButton
                callback={handleJoyrideCallback}
                styles={{ options: { primaryColor: '#2A6CF0', zIndex: 10000 }, tooltip: { borderRadius: '16px', fontFamily: 'inherit' }, buttonNext: { borderRadius: '8px', fontWeight: 'bold', padding: '8px 16px' }, buttonBack: { marginRight: '8px' }, buttonSkip: { fontWeight: '600', color: '#64748b' } }}
            />

            {/* Help button */}
            <button id="tour-help" onClick={() => setRunTour(true)} className="absolute top-5 right-5 z-50 p-2 text-gray-400 hover:text-gray-900 bg-white/40 hover:bg-white/70 rounded-full backdrop-blur-md transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
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

            <LiveHeader 
                language={language} 
                status={status} 
                currentStatus={currentStatus} 
                cameraMode={cameraMode} 
            />

            {/* Status Add-ons (Transcript, Auto-submit, Draft) */}
            <div className={`px-6 w-full max-w-lg text-center z-20 flex flex-col items-center transition-all duration-700 ${cameraMode !== 'off' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                {status === 'uploading' && (
                    <div className="w-48 h-1 bg-gray-100 rounded-full mt-2 overflow-hidden mx-auto">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                )}

                {/* Transcripts removed per Gemini Live style */}

                {autoSubmitCountdown !== null && (
                    <button onClick={cancelAutoSubmit} className="mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium text-amber-700 hover:bg-amber-100 transition-all animate-pulse mx-auto">
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="62.83" strokeDashoffset={62.83 * (1 - (autoSubmitCountdown / 2.5))} strokeLinecap="round" className="text-amber-500" />
                        </svg>
                        {language === 'hi' ? `${autoSubmitCountdown.toFixed(1)}s में भेज रहा... रद्द करें` : `Sending in ${autoSubmitCountdown.toFixed(1)}s — tap to cancel`}
                    </button>
                )}

                {draftData && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-500 w-full max-w-sm mx-auto">
                        <Link href={`/draftcreation?type=${draftData.type}&topic=${encodeURIComponent(draftData.topic)}&useProfile=${draftData.use_profile || draftData.useProfile}&initialContext=${encodeURIComponent(draftData.initial_context || draftData.initialContext)}`} className="w-full bg-[#1E293B] hover:bg-black text-white text-sm font-semibold py-3 px-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_12px_24px_rgba(30,41,59,0.3)] hover:-translate-y-1">
                            <FiFileText className="text-lg text-[#2A6CF0]" />
                            {language === 'hi' ? 'दस्तावेज़ तैयार करना शुरू करें' : 'Start Official Drafting'}
                            <FiArrowRight className="ml-1" />
                        </Link>
                    </div>
                )}
            </div>

            {/* Glowing Animation Interaction Zone */}
            <div className={`relative w-full flex-1 flex items-center justify-center min-h-[300px] transition-all duration-700 ${cameraMode !== 'off' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                {/* Refractive Halos */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.div animate={status} variants={haloVariants} className="absolute w-80 h-80 rounded-full border border-white/40 bg-white/5 backdrop-blur-[2px] shadow-[inset_0_0_40px_rgba(255,255,255,0.2)]" />
                    <motion.div animate={status} variants={haloVariants} transition={{ delay: 0.1, duration: 0.8 }} className="absolute w-[360px] h-[360px] rounded-full border border-white/20 bg-white/2 backdrop-blur-[1px]" />
                    <motion.div animate={status} variants={haloVariants} transition={{ delay: 0.2, duration: 1 }} className="absolute w-[440px] h-[440px] rounded-full border border-white/10 bg-white/[0.01]" />
                </div>

                <div className="relative z-20 w-56 h-56 md:w-72 md:h-72 flex items-center justify-center">
                    <DotLottieReact
                        src={status === 'speaking' || status === 'processing' 
                            ? "https://lottie.host/53635bc2-9dd9-48ce-9231-ad0478168b0e/vbuHs1xbUF.lottie"
                            : "https://lottie.host/2c342fcf-0205-46d8-a32e-9b142677a943/OUVpfkBeoC.lottie"
                        }
                        loop
                        autoplay
                        className="w-full h-full drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]"
                    />
                </div>
            </div>

            <LiveControls 
                cameraMode={cameraMode}
                status={status}
                language={language}
                fileInputRef={fileInputRef}
                startCamera={startCamera}
                capturePhoto={capturePhoto}
                handleSilenceToggle={handleSilenceToggle}
                onClose={onClose}
            />

            <canvas ref={canvasRef} className="hidden" />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/*" className="hidden" />

            <style jsx>{`
                .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
}
