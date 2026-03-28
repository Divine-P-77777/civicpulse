import React, { useState } from 'react';
import { Search, Activity, RefreshCw, Trash2, Database, Layers } from 'lucide-react';

interface VectorsTabProps {
    isDarkMode: boolean;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
    API_BASE: string;
}

export default function VectorsTab({ isDarkMode, authFetch, API_BASE }: VectorsTabProps) {
    const [vectors, setVectors] = useState<any>(null);
    const [vectorStats, setVectorStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(0);
    const [limit] = useState(20);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const [vecRes, statsRes] = await Promise.all([
                authFetch(`${API_BASE}/api/admin/vectors?page=${page * limit}&size=${limit}`),
                authFetch(`${API_BASE}/api/admin/vectors/stats`)
            ]);
            setVectors(await vecRes.json());
            setVectorStats(await statsRes.json());
        } catch (err: any) {
            console.error(`Failed to fetch vectors:`, err);
        } finally {
            setLoading(false);
        }
    }, [authFetch, API_BASE, page, limit]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteVector = async (id: string) => {
        if (!confirm(`Delete vector document ${id}?`)) return;
        await authFetch(`${API_BASE}/api/admin/vectors/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const handlePurgeVectors = async () => {
        if (!confirm('This will delete ALL vector documents. Are you sure?')) return;
        await authFetch(`${API_BASE}/api/admin/vectors`, { method: 'DELETE' });
        fetchData();
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = (items: any[], idField: string) => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i[idField])));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} selected vector documents?`)) return;

        try {
            setLoading(true);
            const promises = Array.from(selectedIds).map(id =>
                authFetch(`${API_BASE}/api/admin/vectors/${id}`, { method: 'DELETE' })
            );
            await Promise.allSettled(promises);
            setSelectedIds(new Set());
            fetchData();
        } catch (err) {
            console.error("Bulk delete failed", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {vectorStats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Documents', value: vectorStats.doc_count ?? '—', color: '#2A6CF0' },
                        { label: 'Health', value: vectorStats.status ?? '—', color: vectorStats.status === 'green' ? '#4CB782' : vectorStats.status === 'yellow' ? '#F4B740' : '#E45454' },
                        { label: 'Store Size', value: vectorStats.store_size ? `${(vectorStats.store_size / 1024).toFixed(1)} KB` : '—', color: '#2A6CF0' },
                    ].map((s, i) => (
                        <div key={i} className={`rounded-3xl border p-5 text-center transition-colors ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
                            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                            <p className={`text-xs uppercase mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{s.label}</p>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#2A6CF0]" />
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Vector Documents</h3>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Search */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${isDarkMode ? 'bg-gray-900/50 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                        <Search size={14} className="opacity-60" />
                        <input type="text" placeholder="Search Source or Index..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent text-sm outline-none w-40" />
                    </div>
                    <button onClick={fetchData} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl transition border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    {selectedIds.size > 0 && (
                        <button onClick={handleBulkDelete} className="text-sm px-3 py-1.5 bg-[#E45454]/10 hover:bg-[#E45454]/20 text-[#E45454] rounded-xl transition border border-[#E45454]/20 animate-in zoom-in duration-200">
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}
                    <button onClick={handlePurgeVectors} className={`flex items-center gap-2 text-sm px-3 py-1.5 bg-[#E45454]/10 hover:bg-[#E45454]/20 text-[#E45454] rounded-xl transition border border-[#E45454]/20 hidden sm:block`}>
                        <Trash2 className="w-3.5 h-3.5" />
                        Purge All
                    </button>
                </div>
            </div>
            {loading ? <p className={`text-center p-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Loading...</p> : (
                <div className={`rounded-3xl border overflow-hidden transition-colors ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                        <table className="w-full text-sm min-w-[600px]">
                            <thead className={`text-xs uppercase ${isDarkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                <tr>
                                    <th className="p-3 text-left w-10">
                                        <input type="checkbox" className="rounded border-gray-300 cursor-pointer"
                                            checked={vectors?.documents?.length > 0 && selectedIds.size === vectors.documents.length}
                                            onChange={() => toggleSelectAll(vectors?.documents || [], 'id')} />
                                    </th>
                                    <th className="p-3 text-left">ID</th>
                                    <th className="p-3 text-left">Source</th>
                                    <th className="p-3 text-left">Chunk</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vectors?.documents?.filter((d: any) => d.metadata?.source?.toLowerCase().includes(searchQuery.toLowerCase())).map((doc: any) => (
                                    <tr key={doc.id} className={`border-t transition ${isDarkMode ? 'border-gray-700/50 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50/50'} ${selectedIds.has(doc.id) ? (isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50/50') : ''}`}>
                                        <td className="p-3">
                                            <input type="checkbox" className="rounded border-gray-300 cursor-pointer"
                                                checked={selectedIds.has(doc.id)}
                                                onChange={() => toggleSelection(doc.id)} />
                                        </td>
                                        <td className={`p-3 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{doc.id.substring(0, 12)}...</td>
                                        <td className={`p-3 text-xs max-w-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{doc.metadata?.source || '—'}</td>
                                        <td className={`p-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{doc.metadata?.chunk_index ?? '—'}</td>
                                        <td className="p-3 text-right"><button onClick={() => handleDeleteVector(doc.id)} className="text-[#E45454] hover:text-[#c03c3c] text-xs font-medium">Delete</button></td>
                                    </tr>
                                )) || <tr><td colSpan={5} className={`p-8 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No documents found</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className={`p-3 flex items-center justify-between border-t ${isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50/50 border-gray-100'}`}>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Showing {page * limit + 1}-{Math.min((page + 1) * limit, vectors?.total || 0)} of {vectors?.total || 0} documents
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                                className={`px-3 py-1.5 text-xs rounded-xl font-medium transition ${page === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                Previous
                            </button>
                            <button onClick={() => setPage(page + 1)} disabled={!vectors?.documents || vectors.documents.length < limit}
                                className={`px-3 py-1.5 text-xs rounded-xl font-medium transition ${!vectors?.documents || vectors.documents.length < limit ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
