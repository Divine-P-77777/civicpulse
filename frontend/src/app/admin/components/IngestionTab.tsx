import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface IngestionTabProps {
    isDarkMode: boolean;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
    API_BASE: string;
}

interface IngestionDetail {
    pages_extracted?: number;
    total_pages?: number;
    chunks_created?: number;
    chunks_embedded?: number;
    chunks_stored?: number;
    total_chunks?: number;
    engine?: string;
}

interface IngestionProgressEvent {
    progress: number;
    message: string;
    stage: string;
    detail: IngestionDetail;
}

const STAGES = ['upload', 'extraction', 'chunking', 'embedding', 'storing', 'done'] as const;
type Stage = typeof STAGES[number] | 'error' | 'unknown';

const STAGE_LABELS: Record<string, string> = {
    upload: 'Upload',
    extraction: 'Extraction',
    chunking: 'Chunking',
    embedding: 'Embedding',
    storing: 'Storing',
    done: 'Done',
};

const STAGE_ICONS: Record<string, string> = {
    upload: '📤',
    extraction: '🔍',
    chunking: '✂️',
    embedding: '🧠',
    storing: '💾',
    done: '✅',
};

export default function IngestionTab({ isDarkMode, authFetch, API_BASE }: IngestionTabProps) {
    const [file, setFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState('{"type": "law", "region": "Assam"}');
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [ingestType, setIngestType] = useState<'pdf' | 'image' | 'web'>('pdf');
    const [textInput, setTextInput] = useState('');
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // Stage-aware state
    const [currentStage, setCurrentStage] = useState<Stage>('upload');
    const [detail, setDetail] = useState<IngestionDetail>({});
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number | null>(null);

    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socket = io(API_BASE);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Ingestion socket connected:', socket.id);
        });

        socket.on('ingestion_progress', (data: IngestionProgressEvent) => {
            setProgress(data.progress);
            if (data.stage) setCurrentStage(data.stage as Stage);
            if (data.detail) setDetail(data.detail);
            if (data.message) {
                const isError = data.stage === 'error';
                setStatus({ type: isError ? 'error' : 'info', message: data.message });
            }
        });

        return () => { socket.disconnect(); };
    }, [API_BASE]);

    // Elapsed time tracker
    useEffect(() => {
        if (isUploading && !timerRef.current) {
            startTimeRef.current = Date.now();
            timerRef.current = setInterval(() => {
                if (startTimeRef.current) {
                    setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
                }
            }, 1000);
        }
        if (!isUploading && timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isUploading]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
    };

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (ingestType !== 'web') setIsDragging(true);
    }, [ingestType]);

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = React.useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragging(false);
        if (ingestType === 'web') return;
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            if (droppedFile.type.includes('image') && ingestType !== 'image') setIngestType('image');
            else if (droppedFile.type === 'application/pdf' && ingestType !== 'pdf') setIngestType('pdf');
            setFile(droppedFile);
            setTextInput('');
        }
    }, [ingestType]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (ingestType !== 'web' && !file) { setStatus({ type: 'error', message: 'Please select a file' }); return; }
        if (ingestType === 'web' && !textInput.trim()) { setStatus({ type: 'error', message: 'Please enter a URL or text content' }); return; }

        setIsUploading(true);
        setCurrentStage('upload');
        setDetail({});
        setElapsedSeconds(0);
        setStatus({ type: 'info', message: 'Uploading to S3...' });
        setProgress(2);

        try {
            const formData = new FormData();
            formData.append('metadata', metadata);
            formData.append('type', ingestType);
            if (ingestType === 'web') formData.append('content', textInput);
            else if (file) formData.append('file', file);

            const headers: any = {};
            if (socketRef.current?.id) headers['X-Socket-ID'] = socketRef.current.id;

            const res = await authFetch(`${API_BASE}/api/admin/ingest`, {
                method: 'POST', headers, body: formData,
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setStatus({ type: 'info', message: data.message || "Ingestion started in background..." });
        } catch (err: any) {
            setProgress(0);
            setIsUploading(false);
            setCurrentStage('upload');
            setStatus({ type: 'error', message: err.message || 'Upload failed' });
        }
    };

    // Auto-cleanup on completion or error
    useEffect(() => {
        if (progress >= 100 && isUploading) {
            setFile(null);
            setTextInput('');
            setIsUploading(false);
            setCurrentStage('done');
            setTimeout(() => { setProgress(0); setCurrentStage('upload'); setDetail({}); }, 8000);
        }
    }, [progress, isUploading]);

    // ─── Determine completed stages ───
    const getStageStatus = (stage: string): 'completed' | 'active' | 'pending' => {
        if (currentStage === 'done') return 'completed';
        if (currentStage === 'error') {
            const idx = STAGES.indexOf(stage as any);
            const errorIdx = STAGES.indexOf(currentStage as any);
            return idx < errorIdx ? 'completed' : stage === currentStage ? 'active' : 'pending';
        }
        const currentIdx = STAGES.indexOf(currentStage as any);
        const stageIdx = STAGES.indexOf(stage as any);
        if (stageIdx < currentIdx) return 'completed';
        if (stageIdx === currentIdx) return 'active';
        return 'pending';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`rounded-2xl border p-6 transition-colors ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
                <div className="flex justify-between items-center mb-5">
                    <h3 className={`text-lg font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <span className="w-8 h-8 bg-[#2A6CF0]/10 rounded-lg flex items-center justify-center text-sm">📄</span>
                        New Ingestion Job
                    </h3>
                    <div className={`flex gap-1 p-1 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        {['pdf', 'image', 'web'].map(t => (
                            <button key={t} type="button" onClick={() => { setIngestType(t as any); setStatus(null); setFile(null); }}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${ingestType === t ? 'bg-[#2A6CF0] text-white shadow-sm' : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                        className={`relative transition-all rounded-xl border-2 ${isDragging ? 'border-[#2A6CF0] bg-[#2A6CF0]/10' : 'border-transparent'}`}>
                        <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {ingestType === 'pdf' ? 'Select or Drag Legal PDF' : ingestType === 'image' ? 'Select or Drag Image (JPG/PNG)' : 'Web URL or Text Content'}
                        </label>
                        {ingestType === 'web' ? (
                            <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} rows={3} placeholder="https://example.com OR Raw Text..."
                                className={`w-full rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#2A6CF0]/30 outline-none transition ${isDarkMode ? 'bg-gray-900/50 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                        ) : (
                            <div className="relative">
                                <input type="file" accept={ingestType === 'pdf' ? '.pdf' : 'image/*'} onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className={`w-full rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#2A6CF0]/30 outline-none transition file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-[#2A6CF0]/10 file:text-[#2A6CF0] hover:file:bg-[#2A6CF0]/20 ${isDarkMode ? 'bg-gray-900/50 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-900'} ${isDragging ? 'ring-2 ring-[#2A6CF0]' : ''}`} />
                                {isDragging && (
                                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[#2A6CF0]/20 backdrop-blur-[2px] border-2 border-dashed border-[#2A6CF0] pointer-events-none">
                                        <p className="text-[#2A6CF0] font-semibold">Drop file here to upload</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {file && ingestType !== 'web' && (
                            <p className="mt-2 text-xs text-[#2A6CF0] font-medium flex items-center gap-1">
                                <span>📎</span> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                        )}
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Metadata (JSON)</label>
                        <textarea value={metadata} onChange={(e) => setMetadata(e.target.value)} rows={3}
                            className={`w-full rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-[#2A6CF0]/30 outline-none transition ${isDarkMode ? 'bg-gray-900/50 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                    </div>

                    {/* ═══ Stage Pipeline Visualization ═══ */}
                    {isUploading && (
                        <div className={`rounded-xl p-4 border ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50/80 border-gray-200'}`}>
                            {/* Elapsed time */}
                            <div className="flex justify-between items-center mb-3">
                                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    ⏱️ Elapsed: {formatTime(elapsedSeconds)}
                                </span>
                                {detail.engine && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                        {detail.engine}
                                    </span>
                                )}
                            </div>

                            {/* Stage Steps */}
                            <div className="flex items-center gap-1 mb-4">
                                {STAGES.map((stage, i) => {
                                    const stageStatus = getStageStatus(stage);
                                    return (
                                        <React.Fragment key={stage}>
                                            <div className={`flex flex-col items-center flex-1 min-w-0`}>
                                                <div className={`
                                                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                                                    ${stageStatus === 'completed' ? 'bg-emerald-500 text-white shadow-sm' : ''}
                                                    ${stageStatus === 'active' ? 'bg-[#2A6CF0] text-white shadow-md shadow-[#2A6CF0]/30 animate-pulse' : ''}
                                                    ${stageStatus === 'pending' ? (isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400') : ''}
                                                `}>
                                                    {stageStatus === 'completed' ? '✓' : STAGE_ICONS[stage] || (i + 1)}
                                                </div>
                                                <span className={`text-[10px] mt-1 font-medium truncate w-full text-center
                                                    ${stageStatus === 'active' ? 'text-[#2A6CF0] font-bold' : ''}
                                                    ${stageStatus === 'completed' ? 'text-emerald-600' : ''}
                                                    ${stageStatus === 'pending' ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : ''}
                                                `}>
                                                    {STAGE_LABELS[stage]}
                                                </span>
                                            </div>
                                            {i < STAGES.length - 1 && (
                                                <div className={`h-0.5 flex-shrink-0 w-4 mt-[-14px] rounded-full transition-colors duration-300
                                                    ${getStageStatus(STAGES[i + 1]) !== 'pending' ? 'bg-emerald-400' : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')}
                                                `} />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {/* Overall progress bar */}
                            <div className={`w-full rounded-full h-2 overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <div className="bg-gradient-to-r from-[#2A6CF0] to-emerald-400 h-2 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${progress}%` }} />
                            </div>

                            {/* Live Counters */}
                            {(detail.total_pages || detail.total_chunks) ? (
                                <div className="grid grid-cols-3 gap-3 mt-3">
                                    {detail.total_pages ? (
                                        <div className={`text-center p-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                            <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                {detail.pages_extracted || 0}
                                                <span className="text-xs font-normal text-gray-400">/{detail.total_pages}</span>
                                            </div>
                                            <div className={`text-[10px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pages</div>
                                        </div>
                                    ) : null}
                                    {detail.total_chunks ? (
                                        <>
                                            <div className={`text-center p-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                                <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {detail.chunks_embedded || 0}
                                                    <span className="text-xs font-normal text-gray-400">/{detail.total_chunks}</span>
                                                </div>
                                                <div className={`text-[10px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Embedded</div>
                                            </div>
                                            <div className={`text-center p-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                                <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {detail.chunks_stored || 0}
                                                    <span className="text-xs font-normal text-gray-400">/{detail.total_chunks}</span>
                                                </div>
                                                <div className={`text-[10px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Stored</div>
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    )}

                    <button type="submit" disabled={(ingestType !== 'web' && !file) || (ingestType === 'web' && !textInput) || isUploading}
                        className={`w-full py-3 rounded-xl font-semibold transition-all ${((ingestType !== 'web' && !file) || (ingestType === 'web' && !textInput) || isUploading) ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed') : 'bg-[#2A6CF0] hover:bg-[#2259D6] text-white shadow-[0_4px_14px_rgba(42,108,240,0.25)]'}`}>
                        {isUploading ? `⏳ ${STAGE_LABELS[currentStage] || 'Processing'}... (${progress}%)` : '📥 Start Ingestion'}
                    </button>
                </form>
                {status && (
                    <div className={`mt-4 p-3 rounded-xl text-sm border ${status.type === 'success' ? 'bg-[#4CB782]/10 border-[#4CB782]/30 text-[#3a8f65]' :
                        status.type === 'error' ? 'bg-[#E45454]/10 border-[#E45454]/30 text-[#c03c3c]' :
                            'bg-[#2A6CF0]/10 border-[#2A6CF0]/30 text-[#2259D6]'
                        }`}>{status.message}</div>
                )}
            </div>
            <div className={`rounded-2xl border p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h4 className="text-[#2A6CF0] font-semibold mb-3 flex items-center gap-2">
                    <span className="w-8 h-8 bg-[#2A6CF0]/10 rounded-lg flex items-center justify-center text-sm">💡</span>
                    Pipeline Stages
                </h4>
                <div className={`space-y-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="flex gap-2 items-start"><span>🔍</span><div><strong className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>Extraction</strong> — PDF text is extracted via AWS Textract or local OCR (Pytesseract). Page-by-page progress is reported.</div></div>
                    <div className="flex gap-2 items-start"><span>✂️</span><div><strong className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>Chunking</strong> — Extracted text is split into ~800 character chunks with 100 char overlap for optimal retrieval.</div></div>
                    <div className="flex gap-2 items-start"><span>🧠</span><div><strong className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>Embedding</strong> — Each chunk is converted to a 1536-dim vector using Amazon Titan Embeddings.</div></div>
                    <div className="flex gap-2 items-start"><span>💾</span><div><strong className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>Storing</strong> — Vectors are indexed in OpenSearch for real-time similarity search.</div></div>
                </div>
                <div className={`mt-4 p-3 rounded-lg text-xs ${isDarkMode ? 'bg-gray-900 text-gray-500' : 'bg-gray-50 text-gray-500'}`}>
                    💎 Tip: Use <code className="font-mono">&quot;region&quot;</code> in your metadata to ensure local laws are correctly weighted during RAG search.
                </div>
            </div>
        </div>
    );
}
