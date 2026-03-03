'use client';

import { useUser, useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import React, { useState, useEffect, useCallback } from 'react';

const ADMIN_EMAILS_STR = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
const ADMIN_EMAILS = ADMIN_EMAILS_STR.split(',').map(email => email.trim()).filter(email => email !== '');

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type Tab = 'ingestion' | 'vectors' | 'dynamodb' | 's3';

export default function AdminPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const { getToken } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('ingestion');

    // Helper: fetch with Clerk auth token
    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        const token = await getToken();
        return fetch(url, {
            ...options,
            headers: { ...options.headers as Record<string, string>, 'Authorization': `Bearer ${token}` },
        });
    }, [getToken]);

    // Ingestion state
    const [file, setFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState('{"type": "law", "region": "Assam"}');
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Data state
    const [vectors, setVectors] = useState<any>(null);
    const [vectorStats, setVectorStats] = useState<any>(null);
    const [dynamoItems, setDynamoItems] = useState<any>(null);
    const [s3Files, setS3Files] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setIsUploading(true);
        setStatus({ message: 'Starting ingestion pipeline...', type: 'info' });
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('metadata', metadata);
            const response = await authFetch(`${API_BASE}/api/admin/ingest-law`, { method: 'POST', body: formData });
            const result = await response.json();
            if (response.ok) {
                setStatus({ message: `Success: ${result.message} (${result.chunks_processed} chunks)`, type: 'success' });
                setFile(null);
            } else {
                setStatus({ message: `Error: ${result.detail || 'Upload failed'}`, type: 'error' });
            }
        } catch (err: any) {
            setStatus({ message: `Error: ${err.message}`, type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    const fetchData = useCallback(async (tab: Tab) => {
        setLoading(true);
        try {
            if (tab === 'vectors') {
                const [vecRes, statsRes] = await Promise.all([
                    authFetch(`${API_BASE}/api/admin/vectors?size=50`),
                    authFetch(`${API_BASE}/api/admin/vectors/stats`)
                ]);
                setVectors(await vecRes.json());
                setVectorStats(await statsRes.json());
            } else if (tab === 'dynamodb') {
                const res = await authFetch(`${API_BASE}/api/admin/dynamodb?limit=50`);
                setDynamoItems(await res.json());
            } else if (tab === 's3') {
                const res = await authFetch(`${API_BASE}/api/admin/s3`);
                setS3Files(await res.json());
            }
        } catch (err: any) {
            console.error(`Failed to fetch ${tab}:`, err);
        } finally {
            setLoading(false);
        }
    }, [authFetch]);

    useEffect(() => {
        if (activeTab !== 'ingestion') {
            fetchData(activeTab);
        }
    }, [activeTab, fetchData]);

    const handleDeleteVector = async (id: string) => {
        if (!confirm(`Delete vector document ${id}?`)) return;
        await authFetch(`${API_BASE}/api/admin/vectors/${id}`, { method: 'DELETE' });
        fetchData('vectors');
    };

    const handleDeleteDynamo = async (id: string) => {
        if (!confirm(`Delete DynamoDB record ${id}?`)) return;
        await authFetch(`${API_BASE}/api/admin/dynamodb/${id}`, { method: 'DELETE' });
        fetchData('dynamodb');
    };

    const handleDeleteS3 = async (key: string) => {
        if (!confirm(`Delete S3 file ${key}?`)) return;
        await authFetch(`${API_BASE}/api/admin/s3/${encodeURIComponent(key)}`, { method: 'DELETE' });
        fetchData('s3');
    };

    const handleDownloadS3 = async (key: string) => {
        const res = await authFetch(`${API_BASE}/api/admin/s3/download?key=${encodeURIComponent(key)}`);
        const data = await res.json();
        if (data.url) window.open(data.url, '_blank');
    };

    const handlePurgeVectors = async () => {
        if (!confirm('⚠️ DANGER: This will delete ALL vector documents. Are you sure?')) return;
        await authFetch(`${API_BASE}/api/admin/vectors`, { method: 'DELETE' });
        fetchData('vectors');
    };

    // ─── Auth Guards ───
    if (!isLoaded) return <div className="text-gray-400 p-8">Loading...</div>;

    if (!isSignedIn) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-10 text-center max-w-md shadow-xl">
                    <div className="text-5xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Admin Access Required</h2>
                    <p className="text-gray-400 mb-6">Sign in to access the CivicPulse Admin Dashboard.</p>
                    <SignInButton mode="modal">
                        <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-blue-500/20 cursor-pointer">
                            🔑 Sign In
                        </button>
                    </SignInButton>
                </div>
            </div>
        );
    }

    const primaryEmail = user?.primaryEmailAddress?.emailAddress;
    const isAuthorized = primaryEmail && ADMIN_EMAILS.includes(primaryEmail);

    if (!isAuthorized) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg text-center">
                <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
                <p className="text-gray-300">Logged in as <span className="text-white font-mono">{primaryEmail}</span> — not on the admin whitelist.</p>
                <div className="mt-4"><UserButton /></div>
            </div>
        );
    }

    // ─── Tab Config ───
    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'ingestion', label: 'Ingestion', icon: '📥' },
        { key: 'vectors', label: 'Vectors', icon: '🧬' },
        { key: 'dynamodb', label: 'DynamoDB', icon: '🗃️' },
        { key: 's3', label: 'S3 Files', icon: '☁️' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Admin Dashboard</h2>
                    <p className="text-gray-400">Manage your CivicPulse data pipeline and storage.</p>
                </div>
                <UserButton />
            </header>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-gray-800/50 p-1 rounded-xl border border-gray-700">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'ingestion' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <section className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl">
                        <h3 className="text-lg font-semibold text-blue-400 mb-6">🚀 New Ingestion Job</h3>
                        <form onSubmit={handleUpload} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Select Legal PDF</label>
                                <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Metadata (JSON)</label>
                                <textarea value={metadata} onChange={(e) => setMetadata(e.target.value)} rows={3}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <button type="submit" disabled={!file || isUploading}
                                className={`w-full py-3 rounded-lg font-bold transition-all ${!file || isUploading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`}>
                                {isUploading ? '⚙️ Processing...' : '📥 Start Ingestion'}
                            </button>
                        </form>
                        {status && (
                            <div className={`mt-4 p-3 rounded-lg text-sm border ${status.type === 'success' ? 'bg-green-900/20 border-green-500/50 text-green-400' : status.type === 'error' ? 'bg-red-900/20 border-red-500/50 text-red-400' : 'bg-blue-900/20 border-blue-500/50 text-blue-400'}`}>
                                {status.message}
                            </div>
                        )}
                    </section>
                    <section className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-xl">
                        <h4 className="text-blue-400 font-semibold mb-2">💡 Pro Tip</h4>
                        <p className="text-sm text-gray-400">Use "region" in your metadata to ensure local laws are correctly weighted during the RAG similarity search phase.</p>
                    </section>
                </div>
            )}

            {activeTab === 'vectors' && (
                <div className="space-y-6">
                    {/* Stats Bar */}
                    {vectorStats && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl text-center">
                                <p className="text-2xl font-bold text-white">{vectorStats.doc_count ?? '—'}</p>
                                <p className="text-xs text-gray-500 uppercase">Documents</p>
                            </div>
                            <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl text-center">
                                <p className={`text-2xl font-bold ${vectorStats.status === 'green' ? 'text-green-400' : vectorStats.status === 'yellow' ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {vectorStats.status ?? '—'}
                                </p>
                                <p className="text-xs text-gray-500 uppercase">Health</p>
                            </div>
                            <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl text-center">
                                <p className="text-2xl font-bold text-white">{vectorStats.store_size ? `${(vectorStats.store_size / 1024).toFixed(1)} KB` : '—'}</p>
                                <p className="text-xs text-gray-500 uppercase">Store Size</p>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-blue-400">🧬 Vector Documents</h3>
                        <div className="flex gap-2">
                            <button onClick={() => fetchData('vectors')} className="text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition">🔄 Refresh</button>
                            <button onClick={handlePurgeVectors} className="text-sm px-3 py-1.5 bg-red-900/30 hover:bg-red-800/50 text-red-400 rounded-lg transition border border-red-500/30">🗑️ Purge All</button>
                        </div>
                    </div>
                    {loading ? <p className="text-gray-500">Loading...</p> : (
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-900/50 text-gray-500 uppercase text-xs">
                                    <tr><th className="p-3 text-left">ID</th><th className="p-3 text-left">Source</th><th className="p-3 text-left">Chunk</th><th className="p-3 text-right">Actions</th></tr>
                                </thead>
                                <tbody>
                                    {vectors?.documents?.map((doc: any) => (
                                        <tr key={doc.id} className="border-t border-gray-800 hover:bg-gray-700/30">
                                            <td className="p-3 text-gray-300 font-mono text-xs">{doc.id.substring(0, 12)}...</td>
                                            <td className="p-3 text-gray-400 text-xs max-w-xs truncate">{doc.metadata?.source || '—'}</td>
                                            <td className="p-3 text-gray-400 text-xs">{doc.metadata?.chunk_index ?? '—'}</td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleDeleteVector(doc.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                                            </td>
                                        </tr>
                                    )) || <tr><td colSpan={4} className="p-6 text-center text-gray-500">No documents found</td></tr>}
                                </tbody>
                            </table>
                            {vectors && <p className="p-3 text-xs text-gray-500 border-t border-gray-800">Total: {vectors.total} documents</p>}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'dynamodb' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-blue-400">🗃️ Analysis Results (DynamoDB)</h3>
                        <button onClick={() => fetchData('dynamodb')} className="text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition">🔄 Refresh</button>
                    </div>
                    {loading ? <p className="text-gray-500">Loading...</p> : (
                        <div className="space-y-3">
                            {dynamoItems?.items?.map((item: any) => (
                                <div key={item.DocumentId} className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-500 font-mono mb-1">{item.DocumentId}</p>
                                            <p className="text-sm text-gray-300 font-medium mb-1 truncate">Q: {item.Query}</p>
                                            <p className="text-xs text-gray-400 line-clamp-2">{item.Summary?.substring(0, 200)}...</p>
                                            <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                                <span>Risk: <span className="text-yellow-400">{item.RiskScore}</span></span>
                                                <span>{item.Timestamp}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteDynamo(item.DocumentId)} className="text-red-400 hover:text-red-300 text-xs ml-4 shrink-0">Delete</button>
                                    </div>
                                </div>
                            )) || <p className="text-gray-500 text-center p-6">No results found</p>}
                            {dynamoItems && <p className="text-xs text-gray-500">Showing {dynamoItems.count} results</p>}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 's3' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-blue-400">☁️ S3 Files</h3>
                        <button onClick={() => fetchData('s3')} className="text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition">🔄 Refresh</button>
                    </div>
                    {loading ? <p className="text-gray-500">Loading...</p> : (
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-900/50 text-gray-500 uppercase text-xs">
                                    <tr><th className="p-3 text-left">Key</th><th className="p-3 text-left">Size</th><th className="p-3 text-left">Modified</th><th className="p-3 text-right">Actions</th></tr>
                                </thead>
                                <tbody>
                                    {s3Files?.files?.map((f: any) => (
                                        <tr key={f.key} className="border-t border-gray-800 hover:bg-gray-700/30">
                                            <td className="p-3 text-gray-300 font-mono text-xs max-w-xs truncate">{f.key}</td>
                                            <td className="p-3 text-gray-400 text-xs">{(f.size / 1024).toFixed(1)} KB</td>
                                            <td className="p-3 text-gray-400 text-xs">{f.last_modified?.substring(0, 10)}</td>
                                            <td className="p-3 text-right flex gap-2 justify-end">
                                                <button onClick={() => handleDownloadS3(f.key)} className="text-blue-400 hover:text-blue-300 text-xs">Download</button>
                                                <button onClick={() => handleDeleteS3(f.key)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                                            </td>
                                        </tr>
                                    )) || <tr><td colSpan={4} className="p-6 text-center text-gray-500">No files found</td></tr>}
                                </tbody>
                            </table>
                            {s3Files && <p className="p-3 text-xs text-gray-500 border-t border-gray-800">Total: {s3Files.count} files</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
