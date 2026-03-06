import React, { useState } from 'react';

interface DynamoDBTabProps {
    isDarkMode: boolean;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
    API_BASE: string;
}

export default function DynamoDBTab({ isDarkMode, authFetch, API_BASE }: DynamoDBTabProps) {
    const [dynamoItems, setDynamoItems] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(0);
    const [limit] = useState(20);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/api/admin/dynamodb?limit=${limit}`);
            setDynamoItems(await res.json());
        } catch (err: any) {
            console.error(`Failed to fetch dynamodb:`, err);
        } finally {
            setLoading(false);
        }
    }, [authFetch, API_BASE, limit]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteDynamo = async (id: string) => {
        if (!confirm(`Delete DynamoDB record ${id}?`)) return;
        await authFetch(`${API_BASE}/api/admin/dynamodb/${id}`, { method: 'DELETE' });
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
        if (!confirm(`Delete ${selectedIds.size} selected items?`)) return;

        try {
            setLoading(true);
            const promises = Array.from(selectedIds).map(id =>
                authFetch(`${API_BASE}/api/admin/dynamodb/${id}`, { method: 'DELETE' })
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>🗃️ Analysis Results</h3>
                <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={fetchData} className={`text-sm px-3 py-1.5 rounded-xl transition border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>🔄 Refresh</button>
                    {selectedIds.size > 0 && (
                        <button onClick={handleBulkDelete} className="text-sm px-3 py-1.5 bg-[#E45454]/10 hover:bg-[#E45454]/20 text-[#E45454] rounded-xl transition border border-[#E45454]/20 animate-in zoom-in duration-200">
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}
                </div>
            </div>
            {loading ? <p className={`text-center p-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Loading...</p> : (
                <div className="space-y-3">
                    {dynamoItems?.items?.length > 0 && (
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <input type="checkbox" className="rounded border-gray-300 cursor-pointer"
                                checked={selectedIds.size === dynamoItems.items.length}
                                onChange={() => toggleSelectAll(dynamoItems.items, 'doc_id')} />
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Select All Page Results</span>
                        </div>
                    )}
                    {dynamoItems?.items?.map((item: any) => (
                        <div key={item.doc_id} className={`rounded-2xl border p-4 transition-all ${isDarkMode ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]'} ${selectedIds.has(item.doc_id) ? (isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50/50') : ''}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <input type="checkbox" className="rounded border-gray-300 cursor-pointer"
                                            checked={selectedIds.has(item.doc_id)}
                                            onChange={() => toggleSelection(item.doc_id)} />
                                        <p className={`text-xs font-mono ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.doc_id}</p>
                                    </div>
                                    <p className={`text-sm font-medium mb-1 truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Q: {item.Query}</p>
                                    <p className={`text-xs line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.Summary?.substring(0, 200)}...</p>
                                    <div className={`flex gap-3 mt-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F4B740]/10 text-[#c08e26]">Risk: {item.RiskScore}</span>
                                        <span>{new Date(item.Timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteDynamo(item.doc_id)} className="text-[#E45454] hover:text-[#c03c3c] text-xs font-medium ml-4 shrink-0">Delete</button>
                            </div>
                        </div>
                    )) || <p className={`text-center p-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No results found</p>}

                    {/* Pagination Controls */}
                    <div className={`mt-4 p-3 flex items-center justify-between border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Showing {page * limit + 1}-{Math.min((page + 1) * limit, dynamoItems?.count || 0)} of {dynamoItems?.count || 0} results
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                                className={`px-3 py-1.5 text-xs rounded-xl font-medium transition ${page === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                Previous
                            </button>
                            <button onClick={() => setPage(page + 1)} disabled={!dynamoItems?.items || dynamoItems.items.length < limit}
                                className={`px-3 py-1.5 text-xs rounded-xl font-medium transition ${!dynamoItems?.items || dynamoItems.items.length < limit ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
