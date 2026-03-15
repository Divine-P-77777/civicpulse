
import React, { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DRAFT_TYPES } from '../constants';

interface GeneratingStepProps {
    streamingContent: string;
    draftType: string;
}

export function GeneratingStep({ streamingContent, draftType }: GeneratingStepProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Autoscroll during streaming
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [streamingContent]);

    // Custom renderer mapping to add a subtle fade-in animation to newly streamed elements
    const fadeAnimationClass = "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both";
    
    const components = {
        h1: ({node, ...props}: any) => <h1 className={fadeAnimationClass} {...props} />,
        h2: ({node, ...props}: any) => <h2 className={fadeAnimationClass} {...props} />,
        h3: ({node, ...props}: any) => <h3 className={fadeAnimationClass} {...props} />,
        p: ({node, ...props}: any) => <p className={fadeAnimationClass} {...props} />,
        ul: ({node, ...props}: any) => <ul className={fadeAnimationClass} {...props} />,
        ol: ({node, ...props}: any) => <ol className={fadeAnimationClass} {...props} />,
        li: ({node, ...props}: any) => <li className={fadeAnimationClass} {...props} />,
        blockquote: ({node, ...props}: any) => <blockquote className={fadeAnimationClass} {...props} />
    };

    return (
        <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(42,108,240,0.08)] border border-white overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-indigo-50/30 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">Generating your draft…</p>
                        <p className="text-xs text-slate-400">{DRAFT_TYPES.find(t => t.id === draftType)?.label} · AI writing</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    {[0, 0.15, 0.3].map((d, i) => (
                        <div key={i} className="w-2 h-2 bg-[#2A6CF0]/40 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                    ))}
                </div>
            </div>

            <div ref={scrollRef} className="p-8 max-h-[60vh] overflow-y-auto overscroll-contain bg-[url('/grid.svg')] bg-center transition-all duration-300">
                <div className="prose prose-slate prose-sm max-w-none prose-headings:font-bold prose-a:text-[#2A6CF0]">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={components}
                    >
                        {streamingContent || 'Initiating intelligent legal drafting engine…'}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}
