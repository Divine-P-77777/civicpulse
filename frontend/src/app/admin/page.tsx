'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import React, { useState } from 'react';

const ADMIN_EMAILS = [
    'admin@civicpulse.org', // Add whitelisted emails here
    'dynamicphillic77777@gmail.com'    // User's email
];

export default function AdminPage() {
    const { user, error, isLoading } = useUser();
    const [file, setFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState('{"type": "law", "region": "Assam"}');
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    if (isLoading) return <div className="text-gray-400">Loading user...</div>;
    if (error) return <div className="text-red-400">Error: {error.message}</div>;

    // Manual email check for extra security (in addition to backend check)
    const isAuthorized = user?.email && ADMIN_EMAILS.includes(user.email);

    if (!isAuthorized) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg text-center">
                <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
                <p className="text-gray-300">You are logged in as <span className="text-white font-mono">{user?.email}</span>, but you are not on the authorized admin whitelist.</p>
                <p className="text-sm text-gray-500 mt-4">Contact your system administrator for access.</p>
            </div>
        );
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setIsUploading(true);
        setStatus({ message: 'Starting ingestion pipeline...', type: 'info' });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('metadata', metadata);

            const response = await fetch('/api/admin/ingest-law', {
                method: 'POST',
                body: formData,
                // Authentication token will be sent via cookies by @auth0/nextjs-auth0 if configured, 
                // or we grab it from the session if needed. 
                // For simplicity with withPageAuthRequired, the session is already available.
            });

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

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-white">Document Ingestion Control</h2>
                <p className="text-gray-400">Process legal documents, laws, and ordinances into the CivicPulse Knowledge Base.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Form */}
                <section className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-400 mb-6 flex items-center gap-2">
                        <span>🚀</span> New Ingestion Job
                    </h3>

                    <form onSubmit={handleUpload} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Select Legal PDF</label>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Metadata (JSON)</label>
                            <textarea
                                value={metadata}
                                onChange={(e) => setMetadata(e.target.value)}
                                rows={4}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder='{"type": "law", "region": "Assam"}'
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!file || isUploading}
                            className={`w-full py-4 rounded-lg font-bold transition-all ${!file || isUploading
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                }`}
                        >
                            {isUploading ? '⚙️ Processing Pathway...' : '📥 Start Ingestion'}
                        </button>
                    </form>

                    {status && (
                        <div className={`mt-6 p-4 rounded-lg text-sm border ${status.type === 'success' ? 'bg-green-900/20 border-green-500/50 text-green-400' :
                            status.type === 'error' ? 'bg-red-900/20 border-red-500/50 text-red-400' :
                                'bg-blue-900/20 border-blue-500/50 text-blue-400'
                            }`}>
                            {status.message}
                        </div>
                    )}
                </section>

                {/* System Stats/History (Placeholder) */}
                <section className="space-y-6">
                    <div className="bg-gray-800/30 border border-gray-800 p-6 rounded-xl">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Pipeline Status</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">OpenSearch Vector Index</span>
                                <span className="text-green-500 flex items-center gap-1">● Healthy</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Bedrock Titan Engine</span>
                                <span className="text-green-500 flex items-center gap-1">● Online</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Textract OCR Job Queue</span>
                                <span className="text-gray-500">Idle</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-xl">
                        <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                            💡 Pro Tip
                        </h4>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Use "region" in your metadata to ensure local laws are correctly weighted during the RAG similarity search phase.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
