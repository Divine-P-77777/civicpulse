import React, { useState, useMemo } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight, X, Eye, Trash2, Loader2, Zap, Database, DownloadCloud, CheckCircle2, Activity, RefreshCw, Tag, Edit3 } from 'lucide-react';

interface S3TabProps {
    isDarkMode: boolean;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
    API_BASE: string;
}

interface VectorChunk {
    id: string;
    text: string;
    chunk_index: number | string;
    source: string;
    type: string;
}

const ITEMS_PER_PAGE = 10;

export default function S3Tab({ isDarkMode, authFetch, API_BASE }: S3TabProps) {
    const [s3Files, setS3Files] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    
    // Delete modal state
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleteVectors, setDeleteVectors] = useState(true);

    // Edit Metadata modal state
    const [editMetadata, setEditMetadata] = useState<{ key: string, type: string, region: string } | null>(null);
    const [updatingMetadata, setUpdatingMetadata] = useState(false);

    // Vector viewer modal state
    const [vectorViewerKey, setVectorViewerKey] = useState<string | null>(null);
    const [vectors, setVectors] = useState<VectorChunk[]>([]);
    const [vectorsLoading, setVectorsLoading] = useState(false);
    const [selectedVectors, setSelectedVectors] = useState<Set<string>>(new Set());
    const [deletingVectors, setDeletingVectors] = useState(false);

    // S3 files multi-select state
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

    // Filter and Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());

    const fetchData = React.useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/api/admin/s3`);
            if (res.ok) {
                setS3Files(await res.json());
            }
        } catch (err: any) {
            console.error(`Failed to fetch s3 files:`, err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [authFetch, API_BASE]);

    const hasActiveJobs = useMemo(() => {
        return s3Files?.files?.some((f: any) => f.status === 'processing');
    }, [s3Files]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    React.useEffect(() => {
        if (!hasActiveJobs) return;

        const interval = setInterval(() => {
            fetchData(true);
        }, 5000);

        return () => clearInterval(interval);
    }, [hasActiveJobs, fetchData]);

    const confirmDeleteS3 = async () => {
        if (!deleteTarget) return;
        
        const key = deleteTarget;
        setDeleteTarget(null);
        
        try {
            const res = await authFetch(`${API_BASE}/api/admin/s3/${encodeURIComponent(key)}?delete_vectors=${deleteVectors}`, { method: 'DELETE' });
            const data = await res.json();
            
            if (deleteVectors) {
                const count = data.vectors_deleted || 0;
                if (count > 0) {
                    alert(`Deleted "${key.split('/').pop()}" + ${count} vector chunk(s) removed from OpenSearch.`);
                } else {
                    alert(`File deleted, but no associated vector chunks were found in OpenSearch.`);
                }
            }
            
            fetchData();
        } catch (err) {
            console.error("Failed to delete file", err);
            alert("Failed to delete file");
        }
    };

    const handleDeleteSelectedFiles = async () => {
        if (selectedFiles.size === 0) return;
        const confirmed = window.confirm(`Delete ${selectedFiles.size} selected file(s)? This cannot be undone. Associated vector chunks will also be deleted.`);
        if (!confirmed) return;

        setLoading(true);
        try {
            let deletedCount = 0;
            let vectorDeletedCount = 0;
            
            await Promise.all(Array.from(selectedFiles).map(async (key) => {
                const res = await authFetch(`${API_BASE}/api/admin/s3/${encodeURIComponent(key)}?delete_vectors=true`, { method: 'DELETE' });
                const data = await res.json();
                deletedCount++;
                if (data.vectors_deleted) vectorDeletedCount += data.vectors_deleted;
            }));
            
            alert(`Successfully deleted ${deletedCount} file(s) and ${vectorDeletedCount} associated vector chunk(s).`);
            setSelectedFiles(new Set());
            fetchData();
        } catch (err) {
            console.error("Failed to batch delete files:", err);
            alert("Failed to delete some files");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadS3 = async (key: string) => {
        const res = await authFetch(`${API_BASE}/api/admin/s3/download?key=${encodeURIComponent(key)}`);
        const data = await res.json();
        if (data.url) window.open(data.url, '_blank');
    };

    const handleUpdateTags = async () => {
        if (!editMetadata) return;
        setUpdatingMetadata(true);
        try {
            const res = await authFetch(`${API_BASE}/api/admin/s3/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: editMetadata.key,
                    tags: {
                        type: editMetadata.type,
                        region: editMetadata.region
                    }
                })
            });
            if (res.ok) {
                alert("Metadata updated successfully!");
                setEditMetadata(null);
                fetchData(true);
            } else {
                alert("Failed to update metadata");
            }
        } catch (err) {
            console.error("Failed to update tags:", err);
            alert("Error updating metadata");
        } finally {
            setUpdatingMetadata(false);
        }
    };

    const handleProcessFile = async (key: string) => {
        setProcessingFiles(prev => new Set(prev).add(key));
        try {
            const res = await authFetch(`${API_BASE}/api/admin/ingest/existing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_key: key
                })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Ingestion started for "${key.split('/').pop()}". Check the Jobs tab or refreshed Vector count soon.`);
            } else {
                alert(`Failed to start ingestion: ${data.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Failed to process file:", err);
            alert("Failed to start ingestion process");
        } finally {
            setProcessingFiles(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    };

    const handleBatchProcess = async () => {
        if (selectedFiles.size === 0) return;
        const confirmed = window.confirm(`Start processing ${selectedFiles.size} selected file(s) into the vector database?`);
        if (!confirmed) return;

        setLoading(true);
        try {
            let started = 0;
            await Promise.all(Array.from(selectedFiles).map(async (key) => {
                const res = await authFetch(`${API_BASE}/api/admin/ingest/existing`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_key: key
                    })
                });
                if (res.ok) started++;
            }));
            
            alert(`Ingestion initiated for ${started} file(s). You can monitor progress in the Jobs tab.`);
            setSelectedFiles(new Set());
        } catch (err) {
            console.error("Batch processing failed:", err);
            alert("Error during batch ingestion");
        } finally {
            setLoading(false);
        }
    };

    // ─── Vector Viewer ───
    const handleViewVectors = async (key: string) => {
        setVectorViewerKey(key);
        setVectorsLoading(true);
        setSelectedVectors(new Set());
        setVectors([]);
        try {
            const res = await authFetch(`${API_BASE}/api/admin/vectors/by-source?source=${encodeURIComponent(key)}`);
            const data = await res.json();
            setVectors(data.vectors || []);
        } catch (err) {
            console.error("Failed to fetch vectors:", err);
        } finally {
            setVectorsLoading(false);
        }
    };

    const toggleVectorSelection = (id: string) => {
        setSelectedVectors(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedVectors.size === vectors.length) {
            setSelectedVectors(new Set());
        } else {
            setSelectedVectors(new Set(vectors.map(v => v.id)));
        }
    };

    const handleDeleteSelectedVectors = async () => {
        if (selectedVectors.size === 0) return;
        const confirmed = window.confirm(`Delete ${selectedVectors.size} selected vector chunk(s)? This cannot be undone.`);
        if (!confirmed) return;

        setDeletingVectors(true);
        try {
            const res = await authFetch(`${API_BASE}/api/admin/vectors/batch-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedVectors) }),
            });
            const data = await res.json();
            alert(`Successfully deleted ${data.deleted} vector chunk(s).`);
            // Refresh the vector list
            if (vectorViewerKey) await handleViewVectors(vectorViewerKey);
        } catch (err) {
            console.error("Failed to batch delete vectors:", err);
            alert("Failed to delete vectors");
        } finally {
            setDeletingVectors(false);
        }
    };

    // --- Derived State: Filtering & Pagination ---
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, dateFilter]);

    const filteredFiles = useMemo(() => {
        if (!s3Files?.files) return [];
        let files = s3Files.files as any[];

        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            files = files.filter(f => f.key.toLowerCase().includes(lowerQuery));
        }

        if (dateFilter) {
            const filterDate = new Date(dateFilter).getTime();
            files = files.filter(f => new Date(f.last_modified).getTime() >= filterDate);
        }

        return files;
    }, [s3Files, searchQuery, dateFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredFiles.length / ITEMS_PER_PAGE));
    const paginatedFiles = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredFiles.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredFiles, currentPage]);

    const toggleFileSelection = (key: string) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleSelectAllFiles = () => {
        if (selectedFiles.size === paginatedFiles.length && paginatedFiles.length > 0) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(paginatedFiles.map(f => f.key)));
        }
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setDateFilter('');
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#2A6CF0]" />
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>S3 Storage</h3>
                </div>
                <button onClick={() => fetchData()} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl transition border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>
            
            {/* Filter Bar */}
            <div className={`p-4 rounded-3xl border flex flex-col md:flex-row gap-4 items-center transition-colors ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
                <div className="relative flex-1 w-full">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <input 
                        type="text" 
                        placeholder="Search by filename..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#2A6CF0]/50 transition ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                    />
                </div>
                
                <div className="relative flex-none w-full md:w-auto">
                    <input 
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className={`w-full md:w-44 px-4 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#2A6CF0]/50 transition ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200 color-scheme-dark' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        title="Show files modified after this date"
                    />
                </div>

                {(searchQuery || dateFilter) && (
                    <button 
                        onClick={handleClearFilters}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                    >
                        <X className="w-4 h-4" /> Clear
                    </button>
                )}
            </div>
            
            {/* Custom Delete Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" data-lenis-prevent>
                    <div className={`p-6 rounded-3xl w-full max-w-sm border shadow-xl ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <h4 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Delete File?</h4>
                        <p className={`text-sm mb-4 break-all ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Are you sure you want to delete <span className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded">{deleteTarget}</span>? This cannot be undone.
                        </p>
                        
                        <label className="flex items-center gap-2 mb-6 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={deleteVectors} 
                                onChange={(e) => setDeleteVectors(e.target.checked)}
                                className="rounded text-red-500 focus:ring-red-500 bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600" 
                            />
                            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Also delete associated Vector Data chunks
                            </span>
                        </label>
                        
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setDeleteTarget(null)} 
                                className={`px-4 py-2 text-sm rounded-xl transition ${isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDeleteS3} 
                                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-xl transition font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Metadata Modal */}
            {editMetadata && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" data-lenis-prevent>
                    <div className={`p-6 rounded-3xl w-full max-w-sm border shadow-xl ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-2 mb-4">
                            <Tag className="w-5 h-5 text-[#2A6CF0]" />
                            <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Metadata</h4>
                        </div>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Document Type</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. SGST, LegalNotice" 
                                    value={editMetadata.type}
                                    onChange={(e) => setEditMetadata(prev => ({ ...prev!, type: e.target.value }))}
                                    className={`w-full px-4 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#2A6CF0]/50 transition ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Region</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Assam, Delhi" 
                                    value={editMetadata.region}
                                    onChange={(e) => setEditMetadata(prev => ({ ...prev!, region: e.target.value }))}
                                    className={`w-full px-4 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#2A6CF0]/50 transition ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                />
                            </div>
                            <div className="pt-2">
                                <label className={`block text-[10px] font-medium opacity-50 mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>S3 Key (Read-only)</label>
                                <p className={`text-[10px] font-mono break-all opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{editMetadata.key}</p>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setEditMetadata(null)} 
                                className={`px-4 py-2 text-sm rounded-xl transition ${isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdateTags}
                                disabled={updatingMetadata}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#2A6CF0] hover:bg-[#2259D6] text-white rounded-xl transition font-medium disabled:opacity-50"
                            >
                                {updatingMetadata ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Vector Viewer Modal ═══ */}
            {vectorViewerKey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className={`rounded-3xl w-full max-w-3xl border shadow-xl flex flex-col max-h-[85vh] ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                        {/* Header */}
                        <div className={`p-5 border-b flex items-center justify-between flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-lg font-semibold truncate flex items-center gap-2">
                                    <Search className="w-5 h-5 text-[#2A6CF0]" />
                                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Vector Chunks</span>
                                </h4>
                                <p className={`text-xs font-mono truncate mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{vectorViewerKey}</p>
                            </div>
                            <button onClick={() => setVectorViewerKey(null)} className={`ml-3 p-1.5 rounded-lg transition flex-shrink-0 ${isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Actions bar */}
                        {vectors.length > 0 && (
                            <div className={`px-5 py-3 border-b flex items-center justify-between flex-shrink-0 ${isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {selectedVectors.size > 0 ? `${selectedVectors.size} of ${vectors.length} selected` : `${vectors.length} chunk(s) found`}
                                </span>
                                <button
                                    onClick={handleDeleteSelectedVectors}
                                    disabled={selectedVectors.size === 0 || deletingVectors}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
                                >
                                    {deletingVectors ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    Delete Selected
                                </button>
                            </div>
                        )}

                        {/* Body */}
                        <div className="overflow-y-auto flex-1 p-1" data-lenis-prevent>
                            {vectorsLoading ? (
                                <div className={`flex items-center justify-center py-16 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading vectors...
                                </div>
                            ) : vectors.length === 0 ? (
                                <div className={`text-center py-16 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <p className="text-sm">No vector chunks found for this file.</p>
                                    <p className="text-xs mt-1 opacity-70">The file may not have been ingested yet.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className={`text-xs uppercase sticky top-0 z-10 ${isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'}`}>
                                        <tr>
                                            <th className="p-3 text-left w-10">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedVectors.size === vectors.length && vectors.length > 0}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-gray-300" 
                                                />
                                            </th>
                                            <th className="p-3 text-left w-16">#</th>
                                            <th className="p-3 text-left">Text Preview</th>
                                            <th className="p-3 text-left w-24">Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vectors.map((v) => (
                                            <tr 
                                                key={v.id} 
                                                className={`border-t transition cursor-pointer ${
                                                    selectedVectors.has(v.id) 
                                                        ? (isDarkMode ? 'bg-[#2A6CF0]/10 border-gray-700/50' : 'bg-[#2A6CF0]/5 border-gray-100') 
                                                        : (isDarkMode ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50/50')
                                                }`}
                                                onClick={() => toggleVectorSelection(v.id)}
                                            >
                                                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedVectors.has(v.id)} 
                                                        onChange={() => toggleVectorSelection(v.id)}
                                                        className="rounded border-gray-300" 
                                                    />
                                                </td>
                                                <td className={`p-3 font-mono text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {v.chunk_index}
                                                </td>
                                                <td className={`p-3 text-xs leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {v.text || '(empty)'}
                                                    {v.text && v.text.length >= 200 && <span className="opacity-50">…</span>}
                                                </td>
                                                <td className="p-3">
                                                    <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                        {v.type}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {loading ? <p className={`text-center p-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Loading...</p> : (
                <div className={`rounded-3xl border overflow-hidden transition-colors flex flex-col ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
                    {/* S3 File Actions bar when items are selected */}
                    {s3Files?.files?.length > 0 && selectedFiles.size > 0 && (
                        <div className={`px-5 py-3 border-b flex items-center justify-between transition-all ${isDarkMode ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-gray-50'}`}>
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {selectedFiles.size} file(s) selected
                            </span>
                            <div className="flex gap-2">
                                    <button
                                    onClick={handleBatchProcess}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#2A6CF0] hover:bg-[#2259D6] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition font-medium shadow-sm"
                                    title="Process all selected files into vector database"
                                >
                                    <Zap className="w-3.5 h-3.5" /> Process All
                                </button>
                                <button
                                    onClick={handleDeleteSelectedFiles}
                                    disabled={selectedFiles.size === 0 || loading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition font-medium shadow-sm hover:shadow"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Selected
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                        <table className="w-full text-sm min-w-[700px]">
                            <thead className={`text-xs uppercase ${isDarkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                <tr>
                                    <th className="p-3 text-left w-10">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedFiles.size === paginatedFiles.length && paginatedFiles.length > 0}
                                            onChange={toggleSelectAllFiles}
                                            className="rounded border-gray-300" 
                                        />
                                    </th>
                                    <th className="p-3 text-left">Name</th>
                                    <th className="p-3 text-left w-24">Status</th>
                                    <th className="p-3 text-left w-24">Size</th>
                                    <th className="p-3 text-left w-40">Modified</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedFiles.length > 0 ? (
                                    paginatedFiles.map((f: any) => (
                                        <tr 
                                            key={f.key} 
                                            className={`border-t transition ${
                                                selectedFiles.has(f.key) 
                                                    ? (isDarkMode ? 'bg-[#2A6CF0]/10 border-gray-700/50' : 'bg-[#2A6CF0]/5 border-gray-100') 
                                                    : (isDarkMode ? 'border-gray-700/50 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50/50')
                                            }`}
                                        >
                                            <td className="p-3">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedFiles.has(f.key)}
                                                    onChange={() => toggleFileSelection(f.key)}
                                                    className="rounded border-gray-300" 
                                                />
                                            </td>
                                            <td className={`p-3 font-medium text-sm flex items-center gap-2 ${f.status === 'processing' ? 'text-[#2A6CF0] font-bold' : (isDarkMode ? 'text-gray-200' : 'text-gray-800')}`}>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="truncate max-w-[200px]" title={f.key}>
                                                        {(() => {
                                                            const type = f.tags?.type || "";
                                                            const region = f.tags?.region || "";
                                                            if (!type && !region) return f.key.split('/').pop();
                                                            const combined = `${type}${region}`;
                                                            return combined.length > 30 ? combined.substring(0, 30) + "..." : combined;
                                                        })()}
                                                    </span>
                                                    {(f.tags?.type || f.tags?.region) && (
                                                        <span className="text-[10px] opacity-50 font-normal truncate max-w-[200px]">
                                                            {f.tags?.type && `Type: ${f.tags.type}`} {f.tags?.region && `• Region: ${f.tags.region}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {f.status === 'processing' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 animate-pulse">
                                                        <Activity className="w-2.5 h-2.5" /> Ingesting
                                                    </span>
                                                ) : f.status === 'processed' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="w-2.5 h-2.5" /> Indexed
                                                        {f.vector_count > 0 && <span className="ml-0.5 opacity-70">({f.vector_count})</span>}
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`p-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{(f.size / 1024).toFixed(1)} KB</td>
                                            <td className={`p-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(f.last_modified).toLocaleDateString()}</td>
                                            <td className="p-3 text-right whitespace-nowrap">
                                                <button 
                                                    onClick={() => setEditMetadata({ 
                                                        key: f.key, 
                                                        type: f.tags?.type || "", 
                                                        region: f.tags?.region || "" 
                                                    })}
                                                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Edit Metadata"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleProcessFile(f.key)}
                                                    disabled={processingFiles.has(f.key) || f.status === 'processing'}
                                                    className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Process into Vector DB"
                                                >
                                                    {processingFiles.has(f.key) || f.status === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                                </button>
                                                <button 
                                                    onClick={() => handleViewVectors(f.key)} 
                                                    className="p-2 text-[#8B5CF6] hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
                                                    title="View Vector Chunks"
                                                >
                                                    <Database className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDownloadS3(f.key)} 
                                                    className="p-2 text-[#2A6CF0] hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Download File"
                                                >
                                                    <DownloadCloud className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteTarget(f.key)} 
                                                    className="p-2 text-[#E45454] hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete File"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={5} className={`p-8 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No files found matching criteria</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Footer */}
                    {s3Files && (
                        <div className={`p-3 text-xs border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                                Showing {filteredFiles.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredFiles.length)} of {filteredFiles.length} files
                                {filteredFiles.length !== s3Files.files?.length && ` (filtered from ${s3Files.files?.length})`}
                            </span>
                            
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1 bg-transparent">
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className={`p-1.5 rounded-lg border flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-white text-gray-700'}`}
                                        title="Previous Page"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    
                                    <span className={`px-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className={`p-1.5 rounded-lg border flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-white text-gray-700'}`}
                                        title="Next Page"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
