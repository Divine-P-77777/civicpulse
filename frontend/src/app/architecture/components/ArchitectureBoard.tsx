"use client"
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
    ReactFlow, 
    Background, 
    Controls, 
    MiniMap, 
    applyNodeChanges, 
    applyEdgeChanges,
    addEdge,
    Node,
    Edge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ArchitectureNode from './ArchitectureNode';
import { Settings, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const nodeTypes = {
    architecture: ArchitectureNode,
};

interface ArchitectureNodeData extends Record<string, unknown> {
    label: string;
    type: string;
    icon: React.ReactNode;
    color: string;
    description: string;
}

type ArchitectureNode = Node<ArchitectureNodeData>;

interface ArchitectureBoardProps {
    flowId: string;
    initialNodes: ArchitectureNode[];
    initialEdges: Edge[];
    hoverContent: Record<string, React.ReactNode>;
}

const ArchitectureBoard = ({ flowId, initialNodes, initialEdges, hoverContent }: ArchitectureBoardProps) => {
    const [nodes, setNodes] = useState<ArchitectureNode[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);
    const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(null);

    const STORAGE_KEY = useMemo(() => `civicpulse_positions_${flowId}`, [flowId]);

    // Sync nodes/edges when flow changes + LOAD from localStorage
    useEffect(() => {
        const savedPositionsStr = localStorage.getItem(STORAGE_KEY);
        let finalNodes = initialNodes;

        if (savedPositionsStr) {
            try {
                const savedPositions = JSON.parse(savedPositionsStr);
                finalNodes = initialNodes.map(node => {
                    if (savedPositions[node.id]) {
                        return { ...node, position: savedPositions[node.id] };
                    }
                    return node;
                });
            } catch (e) {
                console.error("Failed to parse saved positions:", e);
            }
        }

        setNodes(finalNodes);
        setEdges(initialEdges);
        setSelectedNode(null);

        // Optional: fitView after positions are loaded
    }, [flowId, initialNodes, initialEdges, STORAGE_KEY]);

    const onNodesChange: OnNodesChange<ArchitectureNode> = useCallback(
        (changes) => {
            setNodes((nds) => {
                const nextNodes = applyNodeChanges<ArchitectureNode>(changes, nds);
                
                // Track if any position changes occurred to batch localStorage update
                const positionChanges = changes.filter(c => c.type === 'position' && 'position' in c && c.position);
                
                if (positionChanges.length > 0) {
                    const savedPositionsStr = localStorage.getItem(STORAGE_KEY);
                    let currentPositions: Record<string, any> = {};
                    try {
                        currentPositions = savedPositionsStr ? JSON.parse(savedPositionsStr) : {};
                    } catch (e) {}

                    positionChanges.forEach(change => {
                        if ('position' in change && change.position) {
                            currentPositions[change.id] = change.position;
                        }
                    });

                    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPositions));
                }
                
                return nextNodes;
            });
        },
        [STORAGE_KEY]
    );
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );
    const onConnect: OnConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        []
    );

    const onNodeClick = useCallback((_: React.MouseEvent, node: ArchitectureNode) => {
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    return (
        <div className="flex-1 h-full relative group">
            <ReactFlow<ArchitectureNode, Edge>
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                colorMode="dark"
                className="bg-slate-950"
            >
                <Background 
                    variant={BackgroundVariant.Dots} 
                    gap={20} 
                    size={1} 
                    color="#1e293b" 
                />
                <Controls className="!bg-slate-900 !border-white/10 !fill-white" />
                <MiniMap 
                    style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    nodeColor={(n) => (n.data as ArchitectureNodeData).color === 'indigo' ? '#6366f1' : '#10b981'}
                    maskColor="rgba(0, 0, 0, 0.5)"
                />
            </ReactFlow>

            {/* Responsive Configuration Panel: Bottom Sheet (Mobile) / Sidebar (Desktop) */}
            <AnimatePresence>
                {selectedNode && (
                    <motion.div
                        initial={{ y: '100%', x: 0 }}
                        animate={{ 
                            y: 0,
                            x: 0
                        }}
                        exit={{ y: '100%', x: 0 }}
                        variants={{
                            desktop: { x: 0, y: 0 },
                            mobile: { x: 0, y: 0 }
                        }}
                        className="fixed md:absolute bottom-0 md:top-0 right-0 h-[60vh] md:h-full w-full md:w-80 bg-slate-900/95 md:bg-slate-900 backdrop-blur-xl md:backdrop-blur-none border-t md:border-t-0 md:border-l border-white/10 z-[70] p-6 shadow-2xl overflow-y-auto rounded-t-[2rem] md:rounded-t-none"
                    >
                        {/* Mobile Drag Handle */}
                        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 md:hidden" />
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Settings className="w-5 h-5 text-indigo-400" />
                                Node Configuration
                            </h3>
                            <button 
                                onClick={() => setSelectedNode(null)}
                                className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Instance Info</label>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-2 rounded-lg bg-${selectedNode.data.color}-400/10 text-${selectedNode.data.color}-400`}>
                                            {selectedNode.data.icon}
                                        </div>
                                        <div className="font-bold text-white leading-tight">
                                            {selectedNode.data.label}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed italic">
                                        {selectedNode.data.description}
                                    </p>
                                </div>
                            </div>

                            {/* Detailed Logic (From hoverContent) */}
                            {hoverContent[selectedNode.id] && (
                                <div className="pt-6 border-t border-white/5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Technical Logic</label>
                                    <div className="text-xs">
                                        {hoverContent[selectedNode.id]}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Connection Status</label>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full w-fit">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    ACTIVE PIPELINE
                                </div>
                            </div>
                        </div>

                        {/* Mobile Spacer (for bottom nav) */}
                        <div className="h-20 md:hidden" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hint Overlay (Mobile) */}
            <div className={`absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none transition-opacity duration-300 ${selectedNode ? 'opacity-0' : 'opacity-100 hidden md:block'}`}>
                <div className="bg-slate-900/80 backdrop-blur-md border border-white/5 px-4 py-2 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Info size={14} className="text-indigo-400" />
                    Select a node to configure parameters
                </div>
            </div>
        </div>
    );
};

export default ArchitectureBoard;
