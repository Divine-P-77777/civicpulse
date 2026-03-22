import { useEffect, useRef, useState } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { useAppSelector } from './redux';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UseSupabaseRealtimeProps {
  sessionId: string;
  sessionType: 'live' | 'chat';
  onMessage?: (message: any) => void;
  onTyping?: (isTyping: boolean) => void;
  onAIResponse?: (response: any) => void;
}

export function useSupabaseRealtime({
  sessionId,
  sessionType,
  onMessage,
  onTyping,
  onAIResponse
}: UseSupabaseRealtimeProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { user } = useAppSelector((state: any) => state.auth);

  useEffect(() => {
    if (!sessionId || !user) return;

    // Create channel for the session
    const channelName = `${sessionType}_session_${sessionId}`;
    const channel = supabase.channel(channelName);

    // Subscribe to different tables based on session type
    if (sessionType === 'live') {
      // Subscribe to AI responses for live mode
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_responses',
        filter: `session_id=eq.${sessionId}`
      }, (payload: Record<string, any>) => {
        console.log('AI Response received:', payload);
        onAIResponse?.(payload.new);
      });

      // Subscribe to voice messages
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'voice_messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload: Record<string, any>) => {
        console.log('Voice message received:', payload);
        onMessage?.(payload.new);
      });

      // Subscribe to camera messages
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'camera_messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload: Record<string, any>) => {
        console.log('Camera message received:', payload);
        onMessage?.(payload.new);
      });

    } else if (sessionType === 'chat') {
      // Subscribe to chat messages
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload: Record<string, any>) => {
        console.log('Chat message received:', payload);
        onMessage?.(payload.new);
      });

      // Subscribe to typing indicators
      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'typing_indicators',
        filter: `session_id=eq.${sessionId}`
      }, (payload: Record<string, any>) => {
        console.log('Typing indicator updated:', payload);
        if (payload.new.user_id !== user.id) {
          onTyping?.(payload.new.is_typing);
        }
      });
    }

    // Handle connection status
    channel.on('system', {}, (payload: Record<string, any>) => {
      console.log('Channel status:', payload);
      if (payload.extension === 'postgres_changes') {
        setConnectionStatus('connected');
        setIsConnected(true);
      }
    });

    // Subscribe to the channel
    setConnectionStatus('connecting');
    channel.subscribe((status: string) => {
      console.log('Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('connected');
        setIsConnected(true);
      } else if (status === 'CHANNEL_ERROR') {
        setConnectionStatus('error');
        setIsConnected(false);
      } else if (status === 'TIMED_OUT') {
        setConnectionStatus('error');
        setIsConnected(false);
      } else if (status === 'CLOSED') {
        setConnectionStatus('disconnected');
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
  }, [sessionId, sessionType, user, onMessage, onTyping, onAIResponse]);

  // Send voice message
  const sendVoiceMessage = async (audioData: string, sequence: number) => {
    try {
      const { error } = await supabase
        .from('voice_messages')
        .insert({
          session_id: sessionId,
          type: 'voice_chunk',
          audio_data: audioData,
          sequence: sequence,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error sending voice message:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send voice message:', error);
      throw error;
    }
  };

  // Send camera capture
  const sendCameraCapture = async (imageData: string) => {
    try {
      const { error } = await supabase
        .from('camera_messages')
        .insert({
          session_id: sessionId,
          type: 'camera_capture',
          image_data: imageData,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error sending camera capture:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send camera capture:', error);
      throw error;
    }
  };

  // Send chat message
  const sendChatMessage = async (content: string, role: 'user' | 'assistant' = 'user', metadata?: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: role,
          content: content,
          metadata: metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error sending chat message:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send chat message:', error);
      throw error;
    }
  };

  // Update typing indicator
  const updateTypingIndicator = async (isTyping: boolean) => {
    try {
      const { error } = await supabase
        .from('typing_indicators')
        .upsert({
          session_id: sessionId,
          user_id: user.id,
          is_typing: isTyping,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating typing indicator:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update typing indicator:', error);
      throw error;
    }
  };

  // Create or update session
  const createSession = async () => {
    try {
      const sessionData = sessionType === 'live' 
        ? {
            id: sessionId,
            user_id: user.id,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        : {
            id: sessionId,
            user_id: user.id,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

      const tableName = sessionType === 'live' ? 'live_sessions' : 'chat_sessions';
      
      const { error } = await supabase
        .from(tableName)
        .upsert(sessionData);

      if (error) {
        console.error('Error creating session:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  };

  // End session
  const endSession = async () => {
    try {
      const tableName = sessionType === 'live' ? 'live_sessions' : 'chat_sessions';
      
      const { error } = await supabase
        .from(tableName)
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error ending session:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  };

  return {
    isConnected,
    connectionStatus,
    sendVoiceMessage,
    sendCameraCapture,
    sendChatMessage,
    updateTypingIndicator,
    createSession,
    endSession,
    supabase
  };
}