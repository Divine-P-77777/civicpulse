"use client"
import React from 'react';
import { HardDrive, Search, Zap, Cpu, Lock, ShieldCheck, Clock, XCircle, Users, Layers, Rocket } from 'lucide-react';

export const IngestionFlowData = {
    nodes: [
        // Entry Points
        { 
            id: 'admin_entry', 
            type: 'architecture',
            position: { x: 0, y: 100 }, 
            data: { 
                label: 'Admin Panel', 
                type: 'Entry', 
                icon: <ShieldCheck />, 
                color: 'blue', 
                description: 'Super-user gateway for institutional knowledge. All data ingested here is tagged as "global" for the collective intelligence layer.' 
            } 
        },
        { 
            id: 'user_entry', 
            type: 'architecture',
            position: { x: 0, y: 300 }, 
            data: { 
                label: 'User Upload', 
                type: 'Entry', 
                icon: <Users />, 
                color: 'indigo', 
                description: 'Secure personal upload zone. Data is isolated as "private" using strict multi-tenancy rules and and is only accessible to the original uploader.' 
            } 
        },

        // Storage & Input
        { 
            id: 's3', 
            type: 'architecture',
            position: { x: 250, y: 200 }, 
            data: { 
                label: 'AWS S3', 
                type: 'Storage', 
                icon: <HardDrive />, 
                color: 'blue', 
                description: 'Encrypted object storage. Acts as the Single Source of Truth for raw legal documents before they are serialized into vectors.' 
            } 
        },

        // Processing Pipeline
        { 
            id: 'parsing', 
            type: 'architecture',
            position: { x: 500, y: 200 }, 
            data: { 
                label: 'Smart Parsing', 
                type: 'Pipeline', 
                icon: <Cpu />, 
                color: 'emerald', 
                description: 'Proprietary parsers extract semantic structure. Features a fail-safe OCR fallback using native libraries when Amazon Textract exceeds its 1,000 page/month free-tier limit.' 
            } 
        },
        { 
            id: 'chunking', 
            type: 'architecture',
            position: { x: 750, y: 200 }, 
            data: { 
                label: 'Semantic Chunking', 
                type: 'Logic', 
                icon: <Layers />, 
                color: 'emerald', 
                description: 'Converts text into overlapping fragments (512 tokens). This ensures no context is lost at the boundaries during vector retrieval.' 
            } 
        },
        { 
            id: 'bedrock', 
            type: 'architecture',
            position: { x: 1000, y: 200 }, 
            data: { 
                label: 'Titan Embedding G1', 
                type: 'Embedding', 
                icon: <Zap />, 
                color: 'purple', 
                description: 'The embedding engine. Amazon Titan G1 transforms semantic text into high-dimensional vectors (1536 dimensions), enabling similarity search in a mathematical space.' 
            } 
        },
        // Destination
        { 
            id: 'opensearch', 
            type: 'architecture',
            position: { x: 1250, y: 200 }, 
            data: { 
                label: 'OpenSearch Index', 
                type: 'Vector DB', 
                icon: <Search />, 
                color: 'blue', 
                description: 'Multi-tenant Vector Store. Implements cryptographic-grade isolation: User uploads are strictly "private", while Admin-ingested logic becomes "global" to power the shared Knowledge Base.' 
            } 
        },
        { 
            id: 'ready', 
            type: 'architecture',
            position: { x: 1500, y: 200 }, 
            data: { 
                label: 'Ready for Search', 
                type: 'Status', 
                icon: <Rocket />, 
                color: 'emerald', 
                description: 'Processing complete! Every word is now "numeralized" into high-dimensional space, ready for any similarity search including Cosine Similarity, Euclidean distance, and more.' 
            } 
        },
    ],
    edges: [
        { id: 'e-admin-s3', source: 'admin_entry', target: 's3', animated: true, label: 'Global' },
        { id: 'e-user-s3', source: 'user_entry', target: 's3', animated: true, label: 'Private' },
        { id: 'e-s3-parsing', source: 's3', target: 'parsing', animated: true },
        { id: 'e-parsing-chunking', source: 'parsing', target: 'chunking', animated: true },
        { id: 'e-chunking-bedrock', source: 'chunking', target: 'bedrock', animated: true },
        { id: 'e-bedrock-opensearch', source: 'bedrock', target: 'opensearch', animated: true },
        { id: 'e-opensearch-ready', source: 'opensearch', target: 'ready', animated: true, style: { stroke: '#10b981' } },
    ],
    info: {
        title: "Deep Ingestion Pipeline",
        description: "How CivicPulse transforms raw legal data into isolated, queryable intelligence.",
        features: [
            { icon: <ShieldCheck size={14}/>, text: "Privacy: Metadata-level isolation" },
            { icon: <Layers size={14}/>, text: "Scale: Semantic chunking (512 tokens)" },
            { icon: <Search size={14}/>, text: "Search: KNN Vector retrieval" }
        ]
    },
    hoverContent: {
        parsing: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">Multi-Source Adapters</h4>
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-800 p-2 rounded border border-white/5 text-center">
                        <span className="text-[8px] font-bold text-slate-400 block uppercase">PDF</span>
                        <span className="text-[7px] text-slate-500 italic">AWS Textract </span>
                        <span className="text-[6px] text-indigo-400 block mt-1 uppercase font-black">Fallback Active</span>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-white/5 text-center">
                        <span className="text-[8px] font-bold text-slate-400 block uppercase">Web</span>
                        <span className="text-[7px] text-slate-500">Playwright / Clean</span>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-white/5 text-center">
                        <span className="text-[8px] font-bold text-slate-400 block uppercase">Image</span>
                        <span className="text-[7px] text-slate-500">OCR Pipeline</span>
                    </div>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-2 rounded text-[8px] text-indigo-300">
                    <span className="font-bold block mb-1">Fail-Safe Logic:</span>
                    When AWS Textract (limit 1,000 pgs/mo) is exhausted, the system automatically hot-swaps to an application-level native OCR library to ensure zero interruption.
                </div>
            </div>
        ),
        chunking: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">Recursive Semantic Splitting</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                    Splits documents at logical boundaries (paragraphs, sentences) to maintain legal context.
                </p>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded text-[8px] font-mono text-emerald-400">
                    Chunk Size: 512 | Overlap: 80
                </div>
            </div>
        ),
        opensearch: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm text-blue-400 font-mono tracking-tighter uppercase">Knowledge Isolation Logics</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                    The engine distinguishes between collective and personal intelligence at the database level:
                </p>
                <div className="bg-black/40 rounded-lg p-3 border border-white/5 font-mono text-[8px] text-blue-300">
                    {`filter: {
  should: [
    { term: { source_type: "global" } }, // Used by all for Knowledge Base
    { bool: { must: [
        { term: { source_type: "private" } }, // User's isolated data
        { term: { uploaded_by: "$user_id" } }
    ]}}
  ]
}`}
                </div>
            </div>
        ),
        ready: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm text-emerald-400 uppercase tracking-widest">Similarity Search Enabled</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                    The legal knowledge is now fully "numeralized" into high-dimensional vector space.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                        <span className="text-[8px] font-bold text-emerald-400 block">COSINE</span>
                        <span className="text-[7px] text-slate-500 italic">Angle between vectors</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                        <span className="text-[8px] font-bold text-indigo-400 block">EUCLIDEAN</span>
                        <span className="text-[7px] text-slate-500 italic">Distance in space</span>
                    </div>
                </div>
            </div>
        )
    }
};
