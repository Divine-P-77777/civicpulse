import React, { useState } from 'react';

interface S3TabProps {
    isDarkMode: boolean;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
    API_BASE: string;
}

export default function S3Tab({ isDarkMode, authFetch, API_BASE }: S3TabProps) {
    const [s3Files, setS3Files] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/api/admin/s3`);
            setS3Files(await res.json());
        } catch (err: any) {
            console.error(`Failed to fetch s3 files:`, err);
        } finally {
            setLoading(false);
        }
    }, [authFetch, API_BASE]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteS3 = async (key: string) => {
        if (!confirm(`Delete S3 file ${key}?`)) return;
        await authFetch(`${API_BASE}/api/admin/s3/${encodeURIComponent(key)}`, { method: 'DELETE' });
        fetchData();
    };

    const handleDownloadS3 = async (key: string) => {
        const res = await authFetch(`${API_BASE}/api/admin/s3/download?key=${encodeURIComponent(key)}`);
        const data = await res.json();
        if (data.url) window.open(data.url, '_blank');
    };

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>☁️ S3 Files</h3>
                <button onClick={fetchData} className={`text-sm px-3 py-1.5 rounded-xl transition border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>🔄 Refresh</button>
            </div>
            {loading ? <p className={`text-center p-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Loading...</p> : (
                <div className={`rounded-2xl border overflow-hidden transition-colors ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
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
                                {s3Files?.files?.map((f: any) => (
                                    <tr key={f.key} className={`border-t transition ${isDarkMode ? 'border-gray-700/50 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50/50'}`}>
                                        <td className="p-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                                        <td className={`p-3 font-mono text-xs max-w-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{f.key}</td>
                                        <td className={`p-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{(f.size / 1024).toFixed(1)} KB</td>
                                        <td className={`p-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(f.last_modified).toLocaleString()}</td>
                                        <td className="p-3 text-right">
                                            <button onClick={() => handleDownloadS3(f.key)} className="text-[#2A6CF0] hover:text-[#2259D6] text-xs font-medium mr-3">Download</button>
                                            <button onClick={() => handleDeleteS3(f.key)} className="text-[#E45454] hover:text-[#c03c3c] text-xs font-medium">Delete</button>
                                        </td>
                                    </tr>
                                )) || <tr><td colSpan={5} className={`p-8 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No files found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {s3Files && <p className={`p-3 text-xs border-t ${isDarkMode ? 'bg-gray-800/80 border-gray-700 text-gray-400' : 'text-gray-400 border-gray-100'}`}>Total: {s3Files.count} files</p>}
                </div>
            )}
        </div>
    );
}
