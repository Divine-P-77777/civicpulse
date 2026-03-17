"use client"
import React from 'react';
import { Globe, Mic, Server, Zap, Headphones, MessageSquare, Cpu, Search, Layers, Radio } from 'lucide-react';

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
            id: 'fastapi', 
            type: 'architecture',
            position: { x: 500, y: 150 }, 
            data: { 
                label: 'FastAPI (Live)', 
                type: 'Backend', 
                icon: <Server />, 
                color: 'emerald', 
                description: 'Builds the multi-modal request object. Injects detected user language (Hindi/English) and maintains high-frequency WebSocket state.' 
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
                description: 'Fetches the top 15 most relevant legal candidates from OpenSearch using vector similarity. Ensures broad coverage for legal lookup.' 
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
            { icon: <Search size={14}/>, text: "Recall: Top-15 Context Search" },
            { icon: <Zap size={14}/>, text: "Brains: Cohere + Claude Haiku" },
            { icon: <Radio size={14}/>, text: "TTS: Multilingual Synthesis" }
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
