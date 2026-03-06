import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from './redux';

interface UseSocketProps {
    sessionId: string;
    onMessage?: (message: any) => void;
    onAIResponse?: (response: any) => void;
}

export function useSocket({
    sessionId,
    onMessage,
    onAIResponse
}: UseSocketProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const socketRef = useRef<Socket | null>(null);
    const { user } = useAppSelector((state: any) => state.auth);

    useEffect(() => {
        if (!sessionId || !user) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const socket = io(API_URL);

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            setIsConnected(true);
            setConnectionStatus('connected');
            socket.emit('join_session', { sessionId });
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
            setConnectionStatus('disconnected');
        });

        socket.on('reconnect_attempt', () => {
            console.log('Socket reconnecting...');
            setConnectionStatus('connecting');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setConnectionStatus('error');
        });

        socket.on('error', (error) => {
            console.error('Socket internal error:', error);
            setConnectionStatus('error');
        });

        socket.on('voice_received', (data) => {
            onMessage?.(data);
        });

        socket.on('camera_received', (data) => {
            onMessage?.(data);
        });

        socket.on('ai_response', (data) => {
            onAIResponse?.(data);
        });

        socketRef.current = socket;

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [sessionId, user]);

    const sendVoiceMessage = (audioData: string, sequence: number) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('voice_chunk', {
                sessionId,
                audioData,
                sequence,
                timestamp: new Date().toISOString()
            });
        }
    };

    const sendCameraCapture = (imageData: string) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('camera_capture', {
                sessionId,
                imageData,
                timestamp: new Date().toISOString()
            });
        }
    };

    // Mocked for compatibility with LiveMode refactor
    const createSession = async () => { };
    const endSession = async () => { };

    return {
        isConnected,
        connectionStatus,
        sendVoiceMessage,
        sendCameraCapture,
        createSession,
        endSession
    };
}
