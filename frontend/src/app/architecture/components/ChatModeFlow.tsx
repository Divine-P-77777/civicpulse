"use client"
import React from 'react';
import { MessageSquare, Server, Cpu, Database, Zap, Share2, Info, Search, Layers, Activity } from 'lucide-react';

export const ChatModeFlowData = {
    nodes: [
        { 
            id: 'client_input', 
            type: 'architecture',
            position: { x: 0, y: 150 }, 
            data: { 
                label: 'Chat UI', 
                type: 'Frontend', 
                icon: <MessageSquare />, 
                color: 'indigo', 
                description: 'Next.js interface capturing user queries. Optimized for real-time token streaming and responsive UI feedback.' 
            } 
        },
        { 
            id: 'fastapi', 
            type: 'architecture',
            position: { x: 250, y: 150 }, 
            data: { 
                label: 'FastAPI Gateway', 
                type: 'Backend', 
                icon: <Server />, 
                color: 'emerald', 
                description: 'Handles WebSocket handshakes and validates user session via Clerk. Dispatches the multi-threaded RAG orchestration.' 
            } 
        },
        { 
            id: 'dynamo', 
            type: 'architecture',
            position: { x: 500, y: 50 }, 
            data: { 
                label: 'DynamoDB', 
                type: 'History', 
                icon: <Database />, 
                color: 'blue', 
                description: 'Fetches the last N-messages to maintain a sliding context window. Ensures the AI remembers previous exchanges for follow-up legal questions.' 
            } 
        },
        { 
            id: 'opensearch', 
            type: 'architecture',
            position: { x: 500, y: 250 }, 
            data: { 
                label: 'OpenSearch (Top 15)', 
                type: 'Retrieval', 
                icon: <Search />, 
                color: 'blue', 
                description: 'Queries the vector index for candidates. Broadens recall from 5 to 15 chunks to ensure legal nuances are captured.' 
            } 
        },
        { 
            id: 'rerank', 
            type: 'architecture',
            position: { x: 725, y: 150 }, 
            data: { 
                label: 'Cohere Rerank', 
                type: 'Refinement', 
                icon: <Zap />, 
                color: 'orange', 
                description: 'Re-scores the 15 candidates using multilingual-v3.0. Filters noise and selects the top 5 most relevant context segments.' 
            } 
        },
        { 
            id: 'rag_assembly', 
            type: 'architecture',
            position: { x: 950, y: 150 }, 
            data: { 
                label: 'RAG Assembly', 
                type: 'Logic', 
                icon: <Layers />, 
                color: 'emerald', 
                description: 'Combines [Refined Context + History + Query + Profile] into a single high-density payload for the model.' 
            } 
        },
        { 
            id: 'bedrock', 
            type: 'architecture',
            position: { x: 1150, y: 150 }, 
            data: { 
                label: 'Bedrock (Haiku)', 
                type: 'LLM', 
                icon: <Zap />, 
                color: 'purple', 
                description: 'Powered by Claude-3 Haiku. Optimized for ultra-low latency inference while maintaining high performance on legal reasoning.' 
            } 
        },
        { 
            id: 'streaming', 
            type: 'architecture',
            position: { x: 1350, y: 150 }, 
            data: { 
                label: 'Token Stream', 
                type: 'Output', 
                icon: <Activity />, 
                color: 'emerald', 
                description: 'Transmits tokens incrementally via WebSocket. This "chunked" delivery ensures users see text immediately without waiting for full generation.' 
            } 
        },
    ],
    edges: [
        { id: 'e-client-fastapi', source: 'client_input', target: 'fastapi', animated: true },
        { id: 'e-fastapi-dynamo', source: 'fastapi', target: 'dynamo', animated: true, label: 'Fetch' },
        { id: 'e-fastapi-opensearch', source: 'fastapi', target: 'opensearch', animated: true, label: 'Search' },
        { id: 'e-logic-rerank', source: 'dynamo', target: 'rerank', animated: true },
        { id: 'e-search-rerank', source: 'opensearch', target: 'rerank', animated: true },
        { id: 'e-rerank-rag', source: 'rerank', target: 'rag_assembly', animated: true, label: 'Top 5' },
        { id: 'e-rag-bedrock', source: 'rag_assembly', target: 'bedrock', animated: true },
        { id: 'e-bedrock-streaming', source: 'bedrock', target: 'streaming', animated: true },
        { id: 'e-streaming-client', source: 'streaming', target: 'client_input', animated: true, label: 'Chunks' },
    ],
    info: {
        title: "Streaming RAG Pipeline",
        description: "A deep dive into how CivicPulse provides real-time, contextually grounded legal advice.",
        features: [
            { icon: <Zap size={14}/>, text: "Precision: Cohere Multilingual Rerank" },
            { icon: <Database size={14}/>, text: "Memory: DynamoDB Context Window" },
            { icon: <Search size={14}/>, text: "Grounding: Top-15 Candidate Recall" }
        ]
    },
    hoverContent: {
        rag_assembly: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">Synthetic Prompt Engineering</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                    The prompt is dynamically constructed to be "grounded":
                </p>
                <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-2">
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] text-slate-500 uppercase">Context Injection</span>
                        <div className="text-[9px] text-emerald-400 font-mono">
                            {`{{history}}\n{{legal_chunks}}\n{{instruction}}\nQuestion: {{query}}`}
                        </div>
                    </div>
                </div>
            </div>
        ),
        opensearch: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm text-blue-400 font-mono tracking-tighter uppercase">RAG Isolation Rules</h4>
                <div className="bg-black/40 rounded-lg p-3 border border-white/5 font-mono text-[8px] text-blue-300">
                    {`query: {
  bool: {
    should: [
      { source: "global" }, 
      { must: [
        { owner: "$user_id" },
        { source: "private" }
      ]}
    ]
  }
}`}
                </div>
            </div>
        )
    }
};
