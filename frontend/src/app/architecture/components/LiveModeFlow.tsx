"use client"
import React from 'react';
import { Globe, Mic, Server, Zap, Headphones, MessageSquare, Cpu, Search, Layers, Radio, Database, Clock } from 'lucide-react';

export const LiveModeFlowData = {
    nodes: [
        { 
            id: 'voice_input', 
            type: 'architecture',
            position: { x: 0, y: 150 }, 
            data: { 
                label: 'User Voice', 
                type: 'Capture', 
                icon: <Mic />, 
                color: 'indigo', 
                description: 'Captures rough analog voice input via client-side Web Audio API. PCM data is buffered for real-time transcription.' 
            } 
        },
        { 
            id: 'stt', 
            type: 'architecture',
            position: { x: 250, y: 150 }, 
            data: { 
                label: 'STT Engine', 
                type: 'Processing', 
                icon: <Radio />, 
                color: 'blue', 
                description: 'Deepgram WebSocket for ultra-low latency. If network jitter exceeds 200ms, the system falls back to browser-native Web Speech API.' 
            } 
        },
        { 
            id: 'session_db', 
            type: 'architecture',
            position: { x: 500, y: 0 }, 
            data: { 
                label: 'Session Context', 
                type: 'Memory', 
                icon: <Database />, 
                color: 'amber', 
                description: 'AWS DynamoDB stores the last 20 turns of conversation history with a 4-hour TTL for seamless multi-turn context awareness.' 
            } 
        },
        { 
            id: 'fastapi', 
            type: 'architecture',
            position: { x: 500, y: 150 }, 
            data: { 
                label: 'FastAPI (Live)', 
                type: 'Backend', 
                icon: <Server />, 
                color: 'emerald', 
                description: 'Orchestrates the live loop. Fetches history from DynamoDB, constructs RAG prompts, and manages real-time socket tasks.' 
            } 
        },
        { 
            id: 'rag', 
            type: 'architecture',
            position: { x: 750, y: 150 }, 
            data: { 
                label: 'Retrieval (Top 15)', 
                type: 'Search', 
                icon: <Search />, 
                color: 'blue', 
                description: 'Fetches the top 15 legal segments. Injected with current conversation history to maintain context-aware search results.' 
            } 
        },
        { 
            id: 'rerank', 
            type: 'architecture',
            position: { x: 925, y: 150 }, 
            data: { 
                label: 'Cohere Rerank', 
                type: 'Refinement', 
                icon: <Zap />, 
                color: 'orange', 
                description: 'Refines the 15 candidates down to the top 5 highly-relevant segments using multilingual-v3.0. Minimizes hallucinations in the voice response.' 
            } 
        },
        { 
            id: 'bedrock', 
            type: 'architecture',
            position: { x: 1125, y: 150 }, 
            data: { 
                label: 'Bedrock (Haiku)', 
                type: 'LLM', 
                icon: <Cpu />, 
                color: 'purple', 
                description: 'Powered by Claude-3 Haiku. Generates culturally nuanced legal responses in the target language (Hindi/English) with minimal latency.' 
            } 
        },
        { 
            id: 'tts_selector', 
            type: 'architecture',
            position: { x: 1325, y: 150 }, 
            data: { 
                label: 'TTS Router', 
                type: 'Logic', 
                icon: <Layers />, 
                color: 'orange', 
                description: 'Conditional routing: If response is Hindi, uses Sarvam AI. Otherwise, ElevenLabs handles English/Global synthesis.' 
            } 
        },
        { 
            id: 'output', 
            type: 'architecture',
            position: { x: 1575, y: 150 }, 
            data: { 
                label: 'Live Stream', 
                type: 'Streaming', 
                icon: <Headphones />, 
                color: 'emerald', 
                description: 'Audio is piped back via WebSocket in binary chunks for gapless, zero-jitter playback on the frontend.' 
            } 
        },
    ],
    edges: [
        { id: 'e-voice-stt', source: 'voice_input', target: 'stt', animated: true, label: 'Analog' },
        { id: 'e-stt-fastapi', source: 'stt', target: 'fastapi', animated: true, label: 'Text/Lang' },
        { id: 'e-fastapi-db', source: 'fastapi', target: 'session_db', label: 'Save', style: { strokeDasharray: '3,3' } },
        { id: 'e-db-fastapi', source: 'session_db', target: 'fastapi', label: 'Load', style: { strokeDasharray: '3,3' } },
        { id: 'e-fastapi-rag', source: 'fastapi', target: 'rag', animated: true },
        { id: 'e-rag-rerank', source: 'rag', target: 'rerank', animated: true, label: 'Top 15' },
        { id: 'e-rerank-bedrock', source: 'rerank', target: 'bedrock', animated: true, label: 'Top 5' },
        { id: 'e-bedrock-tts', source: 'bedrock', target: 'tts_selector', animated: true },
        { id: 'e-tts-output', source: 'tts_selector', target: 'output', animated: true, label: 'Binary' },
        { id: 'e-output-ui', source: 'output', target: 'voice_input', animated: true, label: 'Loop' },
    ],
    info: {
        title: "Advanced Voice Pipeline",
        description: "A state-of-the-art multimodal pipeline handling rough audio to culturally nuanced speech synthesis.",
        features: [
            { icon: <Clock size={14}/>, text: "4-Hour Session TTL" },
            { icon: <MessageSquare size={14}/>, text: "20-Turn Sliding Window" },
            { icon: <Radio size={14}/>, text: "Multi-modal Synthesis" }
        ]
    },
    hoverContent: {
        stt: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">Resilient Speech-to-Text</h4>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800 p-2 rounded border border-white/5">
                        <span className="text-[8px] font-bold text-indigo-400 block uppercase">Deepgram</span>
                        <span className="text-[7px] text-slate-500">Flux V2 / 80ms chunks</span>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-white/5">
                        <span className="text-[8px] font-bold text-slate-400 block uppercase">Native</span>
                        <span className="text-[7px] text-slate-500">W3C Fallback SDK</span>
                    </div>
                </div>
            </div>
        ),
        session_db: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm text-amber-500 uppercase tracking-widest">Session Persistence</h4>
                <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                    <span className="text-[8px] font-bold text-amber-400 block uppercase">Context Management</span>
                    <p className="text-[7px] text-slate-400 leading-tight mt-1">
                        Stores conversation history (user & AI turns) to preserve multi-turn reasoning context.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800 p-2 rounded border border-white/5">
                        <span className="text-[8px] font-bold text-amber-400 block uppercase">Sliding Window</span>
                        <span className="text-[7px] text-slate-500">20 Full Turns Max</span>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-white/5">
                        <span className="text-[8px] font-bold text-amber-400 block uppercase">Expiration</span>
                        <span className="text-[7px] text-slate-500">4-Hour Backend TTL</span>
                    </div>
                </div>
            </div>
        ),
        rerank: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm text-orange-400 uppercase tracking-widest">Precision Refinement</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                    Uses **Cohere Rerank v3.0** to re-evaluate the 15 chunks retrieved by OpenSearch. 
                    This step ensures that the LLM only receives the most semantically relevant legal context.
                </p>
                <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg">
                    <span className="text-[8px] font-bold text-orange-400 block uppercase">Multilingual-v3.0</span>
                    <span className="text-[7px] text-slate-500 italic">Resilient Fallback: Active</span>
                </div>
            </div>
        ),
        tts_selector: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm text-orange-400 font-mono tracking-tighter uppercase">Condition Voice Branching</h4>
                <div className="bg-black/40 rounded-lg p-3 border border-white/5 font-mono text-[8px] text-orange-300">
                    {`if (response.language === "hindi") {
  provider: "SARVAM_AI",
  model: "bulbul-v1"
} else {
  provider: "ELEVENLABS",
  model: "turbo-v2.5"
}`}
                </div>
            </div>
        ),
        output: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm text-emerald-400 uppercase tracking-widest">Binary Chunk Streaming</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                    Audio is transmitted as <code className="text-emerald-300">Uint8Array</code> chunks via WebSockets, allowing for true "streaming" playback with zero wait time.
                </p>
            </div>
        )
    }
};
