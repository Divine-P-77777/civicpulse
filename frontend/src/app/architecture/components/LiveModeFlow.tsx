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
                label: 'Live RAG', 
                type: 'Context', 
                icon: <Search />, 
                color: 'blue', 
                description: 'Performs sub-millisecond similarity search to fetch relevant law clauses. Matches context + query + prompt based on detected language.' 
            } 
        },
        { 
            id: 'bedrock', 
            type: 'architecture',
            position: { x: 1000, y: 150 }, 
            data: { 
                label: 'Bedrock (Sonnet)', 
                type: 'LLM', 
                icon: <Cpu />, 
                color: 'purple', 
                description: 'Powered by Claude-3 Sonnet. Generates culturally nuanced legal responses in the target language (Hindi/English) with minimal latency.' 
            } 
        },
        { 
            id: 'tts_selector', 
            type: 'architecture',
            position: { x: 1250, y: 150 }, 
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
            position: { x: 1500, y: 150 }, 
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
        { id: 'e-rag-bedrock', source: 'rag', target: 'bedrock', animated: true },
        { id: 'e-bedrock-tts', source: 'bedrock', target: 'tts_selector', animated: true },
        { id: 'e-tts-output', source: 'tts_selector', target: 'output', animated: true, label: 'Binary' },
        { id: 'e-output-ui', source: 'output', target: 'voice_input', animated: true, label: 'Loop' },
    ],
    info: {
        title: "Advanced Voice Pipeline",
        description: "A state-of-the-art multimodal pipeline handling rough audio to culturally nuanced speech synthesis.",
        features: [
            { icon: <Mic size={14}/>, text: "STT: Deepgram + Browser Fallback" },
            { icon: <Zap size={14}/>, text: "Brains: Claude-3 Sonnet Reasoning" },
            { icon: <Radio size={14}/>, text: "TTS: Sarvam (Hindi) / Eleven (EN)" }
        ]
    },
    hoverContent: {
        stt: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">Resilient Speech-to-Text</h4>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800 p-2 rounded border border-white/5">
                        <span className="text-[8px] font-bold text-indigo-400 block uppercase">Deepgram</span>
                        <span className="text-[7px] text-slate-500">WebSocket / Nova-2</span>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-white/5">
                        <span className="text-[8px] font-bold text-slate-400 block uppercase">Native</span>
                        <span className="text-[7px] text-slate-500">W3C Fallback SDK</span>
                    </div>
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
