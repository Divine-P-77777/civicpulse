"use client"
import React, { useMemo } from 'react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    Tooltip,
    BarChart,
    Bar
} from 'recharts';
import { Activity, Zap, Cpu, Clock } from 'lucide-react';

const OperationalGraphs = () => {
    // Mock data for the sparklines
    const latencyData = useMemo(() => Array.from({ length: 20 }, (_, i) => ({ 
        value: 40 + Math.random() * 20 
    })), []);

    const throughputData = useMemo(() => Array.from({ length: 15 }, (_, i) => ({ 
        value: 200 + Math.random() * 300 
    })), []);

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Latency Sparkline */}
            <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <Clock size={12} className="text-emerald-400" />
                        Avg Latency
                    </div>
                    <span className="text-[10px] font-black text-emerald-400 font-mono">42ms</span>
                </div>
                <div className="h-12 w-full bg-emerald-500/5 rounded-lg overflow-hidden border border-emerald-500/10">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={latencyData}>
                            <defs>
                                <linearGradient id="gradientLatency" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#10b981" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#gradientLatency)" 
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Throughput Bar Chart */}
            <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <Zap size={12} className="text-amber-400" />
                        Tokens / Min
                    </div>
                    <span className="text-[10px] font-black text-amber-400 font-mono">1.2k</span>
                </div>
                <div className="h-12 w-full bg-amber-500/5 rounded-lg overflow-hidden border border-amber-500/10">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={throughputData}>
                            <Bar 
                                dataKey="value" 
                                fill="#f59e0b" 
                                opacity={0.6}
                                radius={[2, 2, 0, 0]}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* System Health Indicators */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex flex-col gap-1">
                    <span className="text-[8px] font-bold text-slate-500 uppercase">Uptime</span>
                    <span className="text-sm font-black text-white font-mono tracking-tighter">99.98%</span>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                        <div className="w-[99%] h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    </div>
                </div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex flex-col gap-1">
                    <span className="text-[8px] font-bold text-slate-500 uppercase">Storage</span>
                    <span className="text-sm font-black text-white font-mono tracking-tighter">1.4 TB</span>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                        <div className="w-[65%] h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                    </div>
                </div>
            </div>

            {/* Active Load Pulse */}
            <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Activity size={16} className="text-indigo-400" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Bedrock Load</span>
                </div>
                <span className="text-[10px] font-black text-white px-2 py-0.5 bg-indigo-500 rounded">NOMINAL</span>
            </div>
        </div>
    );
};

export default OperationalGraphs;
