"use client"
import React from 'react';
import { FileText, Database, Zap, HardDrive, Layout, Server } from 'lucide-react';

export const DraftingFlowData = {
    nodes: [
        { 
            id: 'client', 
            type: 'architecture',
            position: { x: 50, y: 300 }, 
            data: { 
                label: 'Drafting Lab', 
                type: 'Frontend', 
                icon: <Layout />, 
                color: 'indigo', 
                description: 'The creative workbench. Implements real-time dynamic document preview using the Fetch ReadableStream API, providing instant visual feedback as the AI generates legal content.' 
            } 
        },
        { 
            id: 'fastapi', 
            type: 'architecture',
            position: { x: 300, y: 150 }, 
            data: { 
                label: 'FastAPI Core', 
                type: 'Backend', 
                icon: <Server />, 
                color: 'emerald', 
                description: 'The drafting orchestrator. Manages stateful sessions and executes the PDF generation pipeline via the "pdf-lib" library, enabling high-precision layouts for court-ready documents.' 
            } 
        },
        { 
            id: 'bedrock', 
            type: 'architecture',
            position: { x: 550, y: 150 }, 
            data: { 
                label: 'Bedrock (Sonnet)', 
                type: 'LLM', 
                icon: <Zap />, 
                color: 'purple', 
                description: 'Powered by Claude-3 Sonnet. Utilizes complex prompt engineering for high-precision legal drafting, ensuring document adherence to strict regulatory formats.' 
            } 
        },
        { 
            id: 'dynamo', 
            type: 'architecture',
            position: { x: 800, y: 150 }, 
            data: { 
                label: 'DynamoDB', 
                type: 'DB', 
                icon: <Database />, 
                color: 'blue', 
                description: 'The persistent memory layer. Saves versioned drafts and custom user templates with zero-downtime reliability.' 
            } 
        },
        { 
            id: 's3', 
            type: 'architecture',
            position: { x: 1050, y: 300 }, 
            data: { 
                label: 'AWS S3 Export', 
                type: 'Storage', 
                icon: <HardDrive />, 
                color: 'blue', 
                description: 'The final repository for generated legal masters. Stores print-ready PDFs and archival-grade document versions for long-term compliance.' 
            } 
        },
    ],
    edges: [
        { id: 'e-client-fastapi', source: 'client', target: 'fastapi', animated: true },
        { id: 'e-fastapi-bedrock', source: 'fastapi', target: 'bedrock', animated: true },
        { id: 'e-bedrock-fastapi', source: 'bedrock', target: 'fastapi', animated: true },
        { id: 'e-fastapi-dynamo', source: 'fastapi', target: 'dynamo', animated: true },
        { id: 'e-fastapi-s3', source: 'fastapi', target: 's3', animated: true },
    ],
    info: {
        title: "Legal Document Drafting",
        description: "Transforming user input into structured, professional legal documents using AI-driven templates.",
        features: [
            { icon: <FileText size={14}/>, text: "Output: Print-ready professional PDFs" },
            { icon: <Database size={14}/>, text: "Logic: State-persistent drafting" },
            { icon: <Zap size={14}/>, text: "Model: High-precision Claude Sonnet" }
        ]
    },
    hoverContent: {
        client: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">Real-time Preview Engine</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                    Utilizes **Fetch API + TextDecoder** to process incoming chunks from Bedrock. 
                    The UI performs reactive re-renders, simulating a "live-typing" experience for the legal master.
                </p>
                <div className="flex items-center gap-2 text-[9px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded-md border border-indigo-400/20">
                    <Zap size={10} />
                    STREAMING: ACTIVE
                </div>
            </div>
        ),
        fastapi: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">PDF Master Pipeline</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                    Powered by **pdf-lib**. Implements low-level layout primitives:
                </p>
                <ul className="text-[9px] text-emerald-400 space-y-1 list-disc pl-4">
                    <li>Dynamic Margin Calculation</li>
                    <li>Multi-font Embedding (Standard Fonts)</li>
                    <li>Automated Page Wrapping</li>
                    <li>Subtle Cryptographic Watermarking</li>
                </ul>
            </div>
        ),
        dynamo: (
            <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">Draft Tracker Schema</h4>
                <div className="bg-black/40 rounded-xl p-3 border border-white/5 font-mono text-[9px] text-blue-300 overflow-x-auto whitespace-pre">
                    {`{
  job_id: "DRAFT_777",
  status: "completed",
  s3_key: "drafts/file.pdf",
  template_id: "fir_template_v1",
  created_at: "2026-03-15...",
  metadata: { ... }
}`}
                </div>
            </div>
        )
    }
};
