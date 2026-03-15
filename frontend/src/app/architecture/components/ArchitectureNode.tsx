"use client"
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const ArchitectureNode = ({ data, selected }: any) => {
    return (
        <div className={`px-4 py-3 rounded-xl border-2 transition-all duration-300 w-48 shadow-2xl ${
            selected 
            ? 'bg-slate-900 border-indigo-500 shadow-indigo-500/20 scale-105 z-50' 
            : 'bg-slate-900/80 backdrop-blur-md border-white/10 hover:border-white/20'
        }`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${data.color}-500/10 text-${data.color}-400`}>
                    {React.cloneElement(data.icon as React.ReactElement, { size: 20 })}
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">
                        {data.type}
                    </span>
                    <span className="text-sm font-bold text-white truncate leading-tight">
                        {data.label}
                    </span>
                </div>
            </div>
            
            {/* Connection Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 border-2 border-slate-900 bg-indigo-500 !-left-1.5"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 border-2 border-slate-900 bg-indigo-500 !-right-1.5"
            />
        </div>
    );
};

export default memo(ArchitectureNode);
