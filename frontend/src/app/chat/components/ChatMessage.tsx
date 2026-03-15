'use client';

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { FiFileText, FiArrowRight } from 'react-icons/fi';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    isStreaming?: boolean;
}

const ChatMessage = memo(function ChatMessage({ role, content, timestamp, isStreaming }: ChatMessageProps) {
    const isUser = role === 'user';

    // Parsing Draft Ready Taq
    const draftReadyRegex = /<DRAFT_READY\s+type="([^"]+)"\s+topic="([^"]+)"\s+use_profile="([^"]+)"\s+initial_context="([^"]+)"\s*\/>/;
    const draftMatch = content.match(draftReadyRegex);
    
    // Clean content of the tag for display
    const cleanDisplayContent = content.replace(draftReadyRegex, '').trim();
    
    const draftData = draftMatch ? {
        type: draftMatch[1],
        topic: draftMatch[2],
        useProfile: draftMatch[3] === 'true',
        initialContext: draftMatch[4]
    } : null;


    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} message-slide-in w-full`}>
            <div className={`flex items-start gap-3 max-w-[calc(100vw-2.5rem)] md:max-w-2xl ${isUser ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isUser ? 'bg-[#2A6CF0]' : 'bg-gradient-to-br from-[#2A6CF0] to-[#4CB782]'
                    }`}>
                    <span className="text-white text-xs md:text-sm">{isUser ? '🧑' : '⚖️'}</span>
                </div>

                {/* Bubble */}
                <div className={`rounded-2xl px-4 py-3 max-w-[calc(100vw-4.5rem)] md:max-w-none overflow-hidden ${isUser
                    ? 'bg-[#2A6CF0] text-white rounded-br-md shadow-[0_4px_14px_rgba(42,108,240,0.2)]'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-[0_2px_12px_rgba(0,0,0,0.04)]'
                    }`}>
                    {isUser ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>
                    ) : isStreaming ? (
                        /* During streaming: render as plain text for performance — no markdown re-parse per token */
                        <div className="text-sm leading-relaxed max-w-full">
                            <p className="whitespace-pre-wrap break-words">{content}<span className="text-[#2A6CF0] animate-pulse font-bold">▌</span></p>
                        </div>
                    ) : (
                        <div className="prose prose-sm max-w-full md:max-w-none
                            prose-p:my-1.5 prose-p:leading-relaxed
                            prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:text-gray-900
                            prose-h2:text-base prose-h3:text-sm
                            prose-li:my-0.5
                            prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-xl prose-pre:text-xs prose-pre:max-w-[calc(100vw-6.5rem)] md:prose-pre:max-w-none prose-pre:overflow-x-auto
                            prose-code:text-[#2A6CF0] prose-code:bg-[#2A6CF0]/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                            prose-table:text-sm prose-th:bg-gray-50 prose-th:px-3 prose-th:py-1.5 prose-th:text-left prose-th:font-medium prose-th:text-gray-700
                            prose-td:px-3 prose-td:py-1.5 prose-td:border-t prose-td:border-gray-100
                            prose-hr:border-gray-200
                            prose-strong:text-gray-900 prose-strong:font-semibold
                            prose-a:text-[#2A6CF0] prose-a:no-underline hover:prose-a:underline
                            prose-blockquote:border-l-[#2A6CF0] prose-blockquote:bg-[#2A6CF0]/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:not-italic
                            prose-ul:my-1 prose-ol:my-1 break-words">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    table: ({ node, ...props }: any) => (
                                        <div className="overflow-x-auto max-w-[calc(100vw-6.5rem)] md:max-w-none my-3 border border-gray-100 rounded-lg">
                                            <table className="min-w-full text-left border-collapse" {...props} />
                                        </div>
                                    )
                                }}
                            >
                                {cleanDisplayContent}
                            </ReactMarkdown>
                            
                            {draftData && !isStreaming && (
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <div className="bg-gradient-to-br from-[#F0F7FF] to-[#FFFFFF] rounded-2xl p-5 border border-blue-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
                                        {/* Subtle background pattern/glow */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/5 blur-3xl rounded-full -mr-16 -mt-16" />
                                        
                                        <div className="flex items-start gap-4 mb-5 relative z-10">
                                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-blue-50 flex items-center justify-center text-[#2A6CF0] shrink-0">
                                                <FiFileText className="text-2xl" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-[15px] font-bold text-gray-900 mb-0.5">Ready to Draft</h4>
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    I have gathered all the necessary details. We can now proceed to generate your professional 
                                                    <span className="text-[#2A6CF0] font-semibold mx-1 lowercase">{draftData.type.replace('_', ' ')}</span>.
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <Link 
                                            href={`/draftcreation?type=${draftData.type}&topic=${encodeURIComponent(draftData.topic)}&useProfile=${draftData.useProfile}&initialContext=${encodeURIComponent(draftData.initialContext)}`}
                                            className="w-full bg-[#1E293B] hover:bg-black text-white text-[15px] font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_rgba(30,41,59,0.2)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.2)] hover:-translate-y-1"
                                        >
                                            <FiFileText className="text-lg" />
                                            Start Official Drafting
                                            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                        
                                        <p className="mt-3 text-center text-[11px] text-gray-400 font-medium tracking-wide uppercase">
                                            Validated context ready for pre-filling
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <p className={`text-xs mt-2 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
                        {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>
        </div>
    );
});

export default ChatMessage;
