import React, { useState, useMemo } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface S3TabProps {
    isDarkMode: boolean;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
    API_BASE: string;
}

const ITEMS_PER_PAGE = 10;

export default function S3Tab({ isDarkMode, authFetch, API_BASE }: S3TabProps) {
    const [s3Files, setS3Files] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    
    // Modal state
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleteVectors, setDeleteVectors] = useState(true);

    // Filter and Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/api/admin/s3`);
            setS3Files(await res.json());
            // Reset to first page whenever data is refreshed
            setCurrentPage(1);
        } catch (err: any) {
            console.error(`Failed to fetch s3 files:`, err);
        } finally {
            setLoading(false);
        }
    }, [authFetch, API_BASE]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const confirmDeleteS3 = async () => {
        if (!deleteTarget) return;
        
        const key = deleteTarget;
        setDeleteTarget(null); // Close modal immediately
        
        try {
            await authFetch(`${API_BASE}/api/admin/s3/${encodeURIComponent(key)}?delete_vectors=${deleteVectors}`, { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error("Failed to delete file", err);
            alert("Failed to delete file");
        }
    };

    const handleDownloadS3 = async (key: string) => {
        const res = await authFetch(`${API_BASE}/api/admin/s3/download?key=${encodeURIComponent(key)}`);
        const data = await res.json();
        if (data.url) window.open(data.url, '_blank');
    };

    // --- Derived State: Filtering & Pagination ---
    
    // Reset page to 1 when filters change
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

    const handleClearFilters = () => {
        setSearchQuery('');
        setDateFilter('');
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>☁️ S3 Files</h3>
                <button onClick={fetchData} className={`text-sm px-3 py-1.5 rounded-xl transition border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>🔄 Refresh</button>
            </div>
            
            {/* Filter Bar */}
            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 items-center transition-colors ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
                {/* Search Input */}
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
                
                {/* Date Input */}
                <div className="relative flex-none w-full md:w-auto">
                    <input 
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className={`w-full md:w-44 px-4 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#2A6CF0]/50 transition ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200 color-scheme-dark' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        title="Show files modified after this date"
                    />
                </div>

                {/* Clear Filters Button */}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`p-6 rounded-2xl w-full max-w-sm border shadow-xl ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
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

            {loading ? <p className={`text-center p-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Loading...</p> : (
                <div className={`rounded-2xl border overflow-hidden transition-colors flex flex-col ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className={`text-xs uppercase ${isDarkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                <tr>
                                    <th className="p-3 text-left w-10"><input type="checkbox" className="rounded border-gray-300" /></th>
                                    <th className="p-3 text-left">Key</th>
                                    <th className="p-3 text-left">Size</th>
                                    <th className="p-3 text-left">Modified</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedFiles.length > 0 ? (
                                    paginatedFiles.map((f: any) => (
                                        <tr key={f.key} className={`border-t transition ${isDarkMode ? 'border-gray-700/50 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50/50'}`}>
                                            <td className="p-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                                            <td className={`p-3 font-mono text-xs max-w-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} title={f.key}>{f.key}</td>
                                            <td className={`p-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{(f.size / 1024).toFixed(1)} KB</td>
                                            <td className={`p-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(f.last_modified).toLocaleString()}</td>
                                            <td className="p-3 text-right whitespace-nowrap">
                                                <button onClick={() => handleDownloadS3(f.key)} className="text-[#2A6CF0] hover:text-[#2259D6] text-xs font-medium mr-3">Download</button>
                                                <button onClick={() => setDeleteTarget(f.key)} className="text-[#E45454] hover:text-[#c03c3c] text-xs font-medium">Delete</button>
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
