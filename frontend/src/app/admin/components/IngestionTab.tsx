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

interface ActiveJob {
    job_id: string;
    file_key: string;
    status: string;
    stage: string;
    progress: number;
    message: string;
    detail: IngestionDetail;
    started_at: number;
    cancelling?: boolean;
}

const STAGES = ['upload', 'extraction', 'chunking', 'embedding', 'storing', 'done'] as const;
type Stage = typeof STAGES[number] | 'error' | 'unknown' | 'cancelled';

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

    // Stage-aware state for the CURRENT form upload
    const [currentStage, setCurrentStage] = useState<Stage>('upload');
    const [detail, setDetail] = useState<IngestionDetail>({});
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number | null>(null);

    const socketRef = useRef<Socket | null>(null);

    // ─── Multi-job tracking ───
    const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    // ─── Reconnect: fetch ALL running jobs on mount ───
    useEffect(() => {
        const checkRunningJobs = async () => {
            try {
                console.log('[JobReconnect] Checking for running jobs...');
                const res = await authFetch(`${API_BASE}/api/admin/jobs?status=running`);
                const jobs = await res.json();
                console.log('[JobReconnect] Running jobs:', jobs);
                if (jobs.length > 0) {
                    const mapped: ActiveJob[] = jobs.map((j: any) => ({
                        job_id: j.job_id,
                        file_key: j.file_key || 'unknown',
                        status: j.status,
                        stage: j.stage || 'upload',
                        progress: j.progress || 0,
                        message: j.message || '',
                        detail: j.detail || {},
                        started_at: j.started_at,
                    }));
                    setActiveJobs(mapped);
                    setStatus({ type: 'info', message: `🔄 Reconnected to ${mapped.length} running job(s)` });
                }
            } catch (err) {
                console.warn('[JobReconnect] Could not check for running jobs:', err);
            }
        };
        checkRunningJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Poll ALL active jobs for progress updates ───
    useEffect(() => {
        if (activeJobs.length === 0) {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            return;
        }
        pollRef.current = setInterval(async () => {
            try {
                const res = await authFetch(`${API_BASE}/api/admin/jobs?status=running`);
                const jobs = await res.json();
                // Also fetch recently completed/failed/cancelled to update UI
                const res2 = await authFetch(`${API_BASE}/api/admin/jobs`);
                const allJobs = await res2.json();

                setActiveJobs(prev => {
                    const updated: ActiveJob[] = [];
                    for (const pj of prev) {
                        const fresh = allJobs.find((j: any) => j.job_id === pj.job_id);
                        if (fresh) {
                            if (fresh.status === 'completed' || fresh.status === 'failed' || fresh.status === 'cancelled') {
                                // Keep it for 5s so user sees the final state, then remove
                                updated.push({ ...pj, ...fresh, cancelling: pj.cancelling });
                            } else {
                                updated.push({ ...pj, ...fresh, cancelling: pj.cancelling });
                            }
                        }
                        // If job not found at all, drop it
                    }
                    // Add any new running jobs not already tracked
                    for (const j of jobs) {
                        if (!updated.find(u => u.job_id === j.job_id)) {
                            updated.push({
                                job_id: j.job_id,
                                file_key: j.file_key || 'unknown',
                                status: j.status,
                                stage: j.stage || 'upload',
                                progress: j.progress || 0,
                                message: j.message || '',
                                detail: j.detail || {},
                                started_at: j.started_at,
                            });
                        }
                    }
                    return updated;
                });
            } catch (err) {
                console.warn('Job poll error:', err);
            }
        }, 2000);
        return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeJobs.length]);

    // ─── Auto-remove completed/cancelled jobs from activeJobs after 5s ───
    useEffect(() => {
        const done = activeJobs.filter(j => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled');
        if (done.length > 0) {
            const timer = setTimeout(() => {
                setActiveJobs(prev => prev.filter(j => j.status === 'running'));
            }, 5000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [activeJobs]);

    // Elapsed time tracker
    useEffect(() => {
        if (isUploading && !timerRef.current) {
            // Only set startTimeRef if it hasn't been set already (e.g. by reconnect handler)
            if (!startTimeRef.current) {
                startTimeRef.current = Date.now();
            }
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
        startTimeRef.current = null;
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
            // Add to active jobs list for multi-job tracking
            if (data.job_id) {
                const fileName = file?.name || textInput.substring(0, 40) || 'unknown';
                setActiveJobs(prev => [...prev, {
                    job_id: data.job_id,
                    file_key: fileName,
                    status: 'running',
                    stage: 'upload',
                    progress: 2,
                    message: 'Starting...',
                    detail: {},
                    started_at: Date.now() / 1000,
                }]);
            }
            setStatus({ type: 'info', message: data.message || "Ingestion started in background..." });
            // Reset form so user can immediately queue another file
            setFile(null);
            setIsUploading(false);
            setProgress(0);
            setCurrentStage('upload');
        } catch (err: any) {
            setProgress(0);
            setIsUploading(false);
            setCurrentStage('upload');
            setStatus({ type: 'error', message: err.message || 'Upload failed' });
        }
    };

    const handleCancelJob = async (jobId: string) => {
        if (!window.confirm("Are you sure you want to cancel this ingestion? Any partial data will be cleaned up.")) return;
        setActiveJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, cancelling: true } : j));
        try {
            const res = await authFetch(`${API_BASE}/api/admin/jobs/${jobId}/cancel`, { method: 'POST' });
            if (!res.ok) throw new Error(await res.text());
            setActiveJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, status: 'cancelled', cancelling: false, progress: 0, message: 'Cancelled & cleaned up' } : j));
        } catch (err: any) {
            setActiveJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, cancelling: false } : j));
            alert(`Failed to cancel job: ${err.message}`);
        }
    };

    const getJobStageStatus = (jobStage: string, checkStage: string): 'completed' | 'active' | 'pending' => {
        if (jobStage === 'done') return 'completed';
        const currentIdx = STAGES.indexOf(jobStage as any);
        const stageIdx = STAGES.indexOf(checkStage as any);
        if (stageIdx < currentIdx) return 'completed';
        if (stageIdx === currentIdx) return 'active';
        return 'pending';
    };

    // Auto-cleanup on completion or error (for form-level upload state only)
    useEffect(() => {
        if (progress >= 100 && isUploading) {
            setFile(null);
            setTextInput('');
            setIsUploading(false);
            setCurrentStage('done');
            startTimeRef.current = null;
            setTimeout(() => { setProgress(0); setCurrentStage('upload'); setDetail({}); }, 8000);
        }
    }, [progress, isUploading]);


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

                    <button type="submit" disabled={(ingestType !== 'web' && !file) || (ingestType === 'web' && !textInput) || isUploading}
                        className={`w-full py-3 rounded-xl font-semibold transition-all ${((ingestType !== 'web' && !file) || (ingestType === 'web' && !textInput) || isUploading) ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed') : 'bg-[#2A6CF0] hover:bg-[#2259D6] text-white shadow-[0_4px_14px_rgba(42,108,240,0.25)]'}`}>
                        {isUploading ? '⏳ Uploading...' : '📥 Start Ingestion'}
                    </button>
                </form>

                {status && (
                    <div className={`mt-4 p-3 rounded-xl text-sm border ${status.type === 'success' ? 'bg-[#4CB782]/10 border-[#4CB782]/30 text-[#3a8f65]' :
                        status.type === 'error' ? 'bg-[#E45454]/10 border-[#E45454]/30 text-[#c03c3c]' :
                            'bg-[#2A6CF0]/10 border-[#2A6CF0]/30 text-[#2259D6]'
                        }`}>{status.message}</div>
                )}

                {/* ═══ Active Jobs Panel ═══ */}
                {activeJobs.length > 0 && (
                    <div className="mt-5 space-y-3">
                        <h4 className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2A6CF0] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2A6CF0]"></span>
                            </span>
                            Active Jobs ({activeJobs.filter(j => j.status === 'running').length} running)
                        </h4>
                        {activeJobs.map(job => (
                            <div key={job.job_id} className={`rounded-xl p-4 border transition-all ${
                                job.status === 'cancelled' ? (isDarkMode ? 'bg-red-900/10 border-red-800/30' : 'bg-red-50 border-red-200') :
                                job.status === 'completed' ? (isDarkMode ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50 border-emerald-200') :
                                job.status === 'failed' ? (isDarkMode ? 'bg-red-900/10 border-red-800/30' : 'bg-red-50 border-red-200') :
                                (isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50/80 border-gray-200')}`}>
                                {/* Header row: filename + cancel */}
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="text-sm">📄</span>
                                        <span className={`text-xs font-semibold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            {job.file_key.split('/').pop()}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                            job.status === 'running' ? 'bg-[#2A6CF0]/10 text-[#2A6CF0]' :
                                            job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                            job.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                            'bg-red-100 text-red-600'
                                        }`}>{job.status}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-mono ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {formatTime(Math.floor((Date.now() / 1000) - job.started_at))}
                                        </span>
                                        {job.status === 'running' && (
                                            <button onClick={() => handleCancelJob(job.job_id)} disabled={job.cancelling}
                                                className={`p-1.5 rounded-lg transition-all text-xs ${
                                                    isDarkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'
                                                } ${job.cancelling ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                title="Cancel this job">
                                                {job.cancelling ? '⏳' : '✕'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Stage dots */}
                                <div className="flex items-center gap-0.5 mb-2">
                                    {STAGES.map((stage, i) => {
                                        const ss = getJobStageStatus(job.stage, stage);
                                        return (
                                            <React.Fragment key={stage}>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300
                                                    ${ss === 'completed' ? 'bg-emerald-500 text-white' : ''}
                                                    ${ss === 'active' ? 'bg-[#2A6CF0] text-white animate-pulse' : ''}
                                                    ${ss === 'pending' ? (isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400') : ''}
                                                `}>
                                                    {ss === 'completed' ? '✓' : STAGE_ICONS[stage]}
                                                </div>
                                                {i < STAGES.length - 1 && (
                                                    <div className={`h-0.5 flex-1 rounded-full transition-colors duration-300
                                                        ${getJobStageStatus(job.stage, STAGES[i + 1]) !== 'pending' ? 'bg-emerald-400' : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')}
                                                    `} />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>

                                {/* Progress bar */}
                                <div className={`w-full rounded-full h-2.5 overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                    <div className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                                        job.status === 'cancelled' ? 'bg-red-400' :
                                        job.status === 'completed' ? 'bg-emerald-400' :
                                        'bg-gradient-to-r from-[#2A6CF0] to-emerald-400'
                                    }`} style={{ width: `${job.progress}%` }} />
                                </div>

                                {/* Counters */}
                                {(job.detail.total_chunks || job.detail.total_pages) && (
                                    <div className="flex gap-3 mt-2">
                                        {job.detail.total_pages ? (
                                            <span className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                📄 {job.detail.pages_extracted || 0}/{job.detail.total_pages} pages
                                            </span>
                                        ) : null}
                                        {job.detail.total_chunks ? (
                                            <span className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                🧠 {job.detail.chunks_embedded || 0}/{job.detail.total_chunks} embedded
                                            </span>
                                        ) : null}
                                        {job.detail.total_chunks ? (
                                            <span className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                💾 {job.detail.chunks_stored || 0}/{job.detail.total_chunks} stored
                                            </span>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
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
