'use client';

import { useUser, useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import React, { useState, useEffect, useCallback } from 'react';

const ADMIN_EMAILS = ['admin@civicpulse.org', 'dynamicphillic77777@gmail.com'];
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type Tab = 'ingestion' | 'vectors' | 'dynamodb' | 's3';

export default function AdminPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const { getToken } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('ingestion');

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
        } catch (err: any) { console.error(`Failed to fetch ${tab}:`, err); }
        finally { setLoading(false); }
    }, [authFetch]);

    useEffect(() => {
        if (activeTab !== 'ingestion') fetchData(activeTab);
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
        if (!confirm('⚠️ This will delete ALL vector documents. Are you sure?')) return;
        await authFetch(`${API_BASE}/api/admin/vectors`, { method: 'DELETE' });
        fetchData('vectors');
    };

    // ─── Auth Guards ───
    if (!isLoaded) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
            <div className="w-10 h-10 border-3 border-[#2A6CF0] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!isSignedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
                <div className="bg-white rounded-2xl p-10 text-center max-w-md shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100">
                    <div className="w-16 h-16 bg-[#2A6CF0]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <span className="text-3xl">🔒</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
                    <p className="text-gray-500 mb-6">Sign in to access the CivicPulse Admin Dashboard.</p>
                    <SignInButton mode="modal">
                        <button className="bg-[#2A6CF0] hover:bg-[#2259D6] text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-[0_4px_14px_rgba(42,108,240,0.3)] cursor-pointer">
                            Sign In
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
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
                <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#E45454]/20">
                    <div className="w-14 h-14 bg-[#E45454]/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-2xl">🚫</span></div>
                    <h2 className="text-xl font-bold text-[#E45454] mb-2">Access Denied</h2>
                    <p className="text-gray-600">Logged in as <span className="font-mono text-gray-900">{primaryEmail}</span> — not on the admin whitelist.</p>
                    <div className="mt-4"><UserButton /></div>
                </div>
            </div>
        );
    }

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'ingestion', label: 'Ingestion', icon: '📥' },
        { key: 'vectors', label: 'Vectors', icon: '🧬' },
        { key: 'dynamodb', label: 'DynamoDB', icon: '🗃️' },
        { key: 's3', label: 'S3 Files', icon: '☁️' },
    ];

    return (
        <div className="min-h-screen p-6 lg:p-8" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <header className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
                        <p className="text-gray-500 text-sm">Manage your CivicPulse data pipeline and storage.</p>
                    </div>
                    <UserButton />
                </header>

                {/* Tab Navigation */}
                <div className="flex gap-1 bg-white/80 p-1.5 rounded-2xl border border-gray-200/60 shadow-sm backdrop-blur-sm">
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === tab.key
                                    ? 'bg-[#2A6CF0] text-white shadow-[0_4px_14px_rgba(42,108,240,0.25)]'
                                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                }`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ═══ INGESTION ═══ */}
                {activeTab === 'ingestion' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                            <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                                <span className="w-8 h-8 bg-[#2A6CF0]/10 rounded-lg flex items-center justify-center text-sm">📄</span>
                                New Ingestion Job
                            </h3>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Legal PDF</label>
                                    <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#2A6CF0]/30 outline-none transition" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Metadata (JSON)</label>
                                    <textarea value={metadata} onChange={(e) => setMetadata(e.target.value)} rows={3}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-[#2A6CF0]/30 outline-none transition" />
                                </div>
                                <button type="submit" disabled={!file || isUploading}
                                    className={`w-full py-3 rounded-xl font-semibold transition-all ${!file || isUploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#2A6CF0] hover:bg-[#2259D6] text-white shadow-[0_4px_14px_rgba(42,108,240,0.25)]'}`}>
                                    {isUploading ? '⏳ Processing...' : '📥 Start Ingestion'}
                                </button>
                            </form>
                            {status && (
                                <div className={`mt-4 p-3 rounded-xl text-sm border ${status.type === 'success' ? 'bg-[#4CB782]/10 border-[#4CB782]/30 text-[#3a8f65]' :
                                        status.type === 'error' ? 'bg-[#E45454]/10 border-[#E45454]/30 text-[#c03c3c]' :
                                            'bg-[#2A6CF0]/10 border-[#2A6CF0]/30 text-[#2259D6]'
                                    }`}>{status.message}</div>
                            )}
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                            <h4 className="text-[#2A6CF0] font-semibold mb-3 flex items-center gap-2">
                                <span className="w-8 h-8 bg-[#2A6CF0]/10 rounded-lg flex items-center justify-center text-sm">💡</span>
                                Pro Tip
                            </h4>
                            <p className="text-sm text-gray-600 leading-relaxed">Use &quot;region&quot; in your metadata to ensure local laws are correctly weighted during the RAG similarity search phase.</p>
                        </div>
                    </div>
                )}

                {/* ═══ VECTORS ═══ */}
                {activeTab === 'vectors' && (
                    <div className="space-y-5">
                        {vectorStats && (
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Documents', value: vectorStats.doc_count ?? '—', color: '#2A6CF0' },
                                    { label: 'Health', value: vectorStats.status ?? '—', color: vectorStats.status === 'green' ? '#4CB782' : vectorStats.status === 'yellow' ? '#F4B740' : '#E45454' },
                                    { label: 'Store Size', value: vectorStats.store_size ? `${(vectorStats.store_size / 1024).toFixed(1)} KB` : '—', color: '#2A6CF0' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                                        <p className="text-xs text-gray-500 uppercase mt-1">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">🧬 Vector Documents</h3>
                            <div className="flex gap-2">
                                <button onClick={() => fetchData('vectors')} className="text-sm px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 rounded-xl transition border border-gray-200">🔄 Refresh</button>
                                <button onClick={handlePurgeVectors} className="text-sm px-3 py-1.5 bg-[#E45454]/10 hover:bg-[#E45454]/20 text-[#E45454] rounded-xl transition border border-[#E45454]/20">🗑️ Purge All</button>
                            </div>
                        </div>
                        {loading ? <p className="text-gray-400 text-center p-8">Loading...</p> : (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs"><tr><th className="p-3 text-left">ID</th><th className="p-3 text-left">Source</th><th className="p-3 text-left">Chunk</th><th className="p-3 text-right">Actions</th></tr></thead>
                                    <tbody>
                                        {vectors?.documents?.map((doc: any) => (
                                            <tr key={doc.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition">
                                                <td className="p-3 text-gray-600 font-mono text-xs">{doc.id.substring(0, 12)}...</td>
                                                <td className="p-3 text-gray-500 text-xs max-w-xs truncate">{doc.metadata?.source || '—'}</td>
                                                <td className="p-3 text-gray-500 text-xs">{doc.metadata?.chunk_index ?? '—'}</td>
                                                <td className="p-3 text-right"><button onClick={() => handleDeleteVector(doc.id)} className="text-[#E45454] hover:text-[#c03c3c] text-xs font-medium">Delete</button></td>
                                            </tr>
                                        )) || <tr><td colSpan={4} className="p-8 text-center text-gray-400">No documents found</td></tr>}
                                    </tbody>
                                </table>
                                {vectors && <p className="p-3 text-xs text-gray-400 border-t border-gray-100">Total: {vectors.total} documents</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ DYNAMODB ═══ */}
                {activeTab === 'dynamodb' && (
                    <div className="space-y-5">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">🗃️ Analysis Results</h3>
                            <button onClick={() => fetchData('dynamodb')} className="text-sm px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 rounded-xl transition border border-gray-200">🔄 Refresh</button>
                        </div>
                        {loading ? <p className="text-gray-400 text-center p-8">Loading...</p> : (
                            <div className="space-y-3">
                                {dynamoItems?.items?.map((item: any) => (
                                    <div key={item.doc_id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-400 font-mono mb-1">{item.doc_id}</p>
                                                <p className="text-sm text-gray-800 font-medium mb-1 truncate">Q: {item.Query}</p>
                                                <p className="text-xs text-gray-500 line-clamp-2">{item.Summary?.substring(0, 200)}...</p>
                                                <div className="flex gap-3 mt-2 text-xs text-gray-400">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F4B740]/10 text-[#c08e26]">Risk: {item.RiskScore}</span>
                                                    <span>{item.Timestamp}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteDynamo(item.doc_id)} className="text-[#E45454] hover:text-[#c03c3c] text-xs font-medium ml-4 shrink-0">Delete</button>
                                        </div>
                                    </div>
                                )) || <p className="text-gray-400 text-center p-8">No results found</p>}
                                {dynamoItems && <p className="text-xs text-gray-400">Showing {dynamoItems.count} results</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ S3 ═══ */}
                {activeTab === 's3' && (
                    <div className="space-y-5">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">☁️ S3 Files</h3>
                            <button onClick={() => fetchData('s3')} className="text-sm px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 rounded-xl transition border border-gray-200">🔄 Refresh</button>
                        </div>
                        {loading ? <p className="text-gray-400 text-center p-8">Loading...</p> : (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs"><tr><th className="p-3 text-left">Key</th><th className="p-3 text-left">Size</th><th className="p-3 text-left">Modified</th><th className="p-3 text-right">Actions</th></tr></thead>
                                    <tbody>
                                        {s3Files?.files?.map((f: any) => (
                                            <tr key={f.key} className="border-t border-gray-100 hover:bg-gray-50/50 transition">
                                                <td className="p-3 text-gray-600 font-mono text-xs max-w-xs truncate">{f.key}</td>
                                                <td className="p-3 text-gray-500 text-xs">{(f.size / 1024).toFixed(1)} KB</td>
                                                <td className="p-3 text-gray-500 text-xs">{f.last_modified?.substring(0, 10)}</td>
                                                <td className="p-3 text-right flex gap-3 justify-end">
                                                    <button onClick={() => handleDownloadS3(f.key)} className="text-[#2A6CF0] hover:text-[#2259D6] text-xs font-medium">Download</button>
                                                    <button onClick={() => handleDeleteS3(f.key)} className="text-[#E45454] hover:text-[#c03c3c] text-xs font-medium">Delete</button>
                                                </td>
                                            </tr>
                                        )) || <tr><td colSpan={4} className="p-8 text-center text-gray-400">No files found</td></tr>}
                                    </tbody>
                                </table>
                                {s3Files && <p className="p-3 text-xs text-gray-400 border-t border-gray-100">Total: {s3Files.count} files</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
