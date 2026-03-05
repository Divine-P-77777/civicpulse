import React, { useState } from 'react';

interface IngestionTabProps {
    isDarkMode: boolean;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
    API_BASE: string;
}

export default function IngestionTab({ isDarkMode, authFetch, API_BASE }: IngestionTabProps) {
    const [file, setFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState('{"type": "law", "region": "Assam"}');
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [ingestType, setIngestType] = useState<'pdf' | 'image' | 'web'>('pdf');
    const [textInput, setTextInput] = useState('');
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (ingestType !== 'web') {
            setIsDragging(true);
        }
    }, [ingestType]);

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (ingestType === 'web') return;

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            // Auto switch type if they drop image/pdf while on the other tab roughly
            if (droppedFile.type.includes('image') && ingestType !== 'image') {
                setIngestType('image');
            } else if (droppedFile.type === 'application/pdf' && ingestType !== 'pdf') {
                setIngestType('pdf');
            }
            setFile(droppedFile);
            setTextInput(''); // Clear text
        }
    }, [ingestType]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate inputs based on type
        if (ingestType !== 'web' && !file) {
            setStatus({ type: 'error', message: 'Please select a file' });
            return;
        }
        if (ingestType === 'web' && !textInput.trim()) {
            setStatus({ type: 'error', message: 'Please enter a URL or text content' });
            return;
        }

        setIsUploading(true);
        setStatus(null);
        setProgress(15);

        try {
            const formData = new FormData();
            formData.append('metadata', metadata);
            formData.append('type', ingestType);

            if (ingestType === 'web') {
                formData.append('content', textInput);
            } else if (file) {
                formData.append('file', file);
            }

            setProgress(45);

            const res = await authFetch(`${API_BASE}/api/admin/ingest`, {
                method: 'POST',
                body: formData,
            });

            setProgress(85);

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();

            setProgress(100);
            setStatus({ type: 'success', message: data.message || `Successfully processed ${data.chunks_processed || 1} chunks!` });

            // Clean up
            setFile(null);
            setTextInput('');
            setTimeout(() => setProgress(0), 3000);
        } catch (err: any) {
            setProgress(0);
            setStatus({ type: 'error', message: err.message || 'Upload failed' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`rounded-2xl border p-6 transition-colors ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
                <div className="flex justify-between items-center mb-5">
                    <h3 className={`text-lg font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <span className="w-8 h-8 bg-[#2A6CF0]/10 rounded-lg flex items-center justify-center text-sm">📄</span>
                        New Ingestion Job
                    </h3>
                    {/* Type Selector */}
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
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative transition-all rounded-xl border-2 ${isDragging ? 'border-[#2A6CF0] bg-[#2A6CF0]/10' : 'border-transparent'}`}
                    >
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

                    {/* Progress Bar */}
                    {isUploading && progress > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                            <div className="bg-[#2A6CF0] h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                        </div>
                    )}

                    <button type="submit" disabled={(ingestType !== 'web' && !file) || (ingestType === 'web' && !textInput) || isUploading}
                        className={`w-full py-3 rounded-xl font-semibold transition-all ${((ingestType !== 'web' && !file) || (ingestType === 'web' && !textInput) || isUploading) ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed') : 'bg-[#2A6CF0] hover:bg-[#2259D6] text-white shadow-[0_4px_14px_rgba(42,108,240,0.25)]'}`}>
                        {isUploading ? `⏳ Processing (${progress}%)...` : '📥 Start Ingestion'}
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
                    Pro Tip
                </h4>
                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Use &quot;region&quot; in your metadata to ensure local laws are correctly weighted during the RAG similarity search phase.</p>
            </div>
        </div>
    );
}
