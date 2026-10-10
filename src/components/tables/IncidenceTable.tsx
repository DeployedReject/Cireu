import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  ArrowRight,
  Minus,
  Info
} from 'lucide-react';
import { GraphNode, GraphEdge } from '../../types/graph';

interface IncidenceTableProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onAddEdge: (source: string, target: string, directed: boolean) => void;
  onUpdateEdge: (id: string, patch: Partial<GraphEdge>) => void;
  onDeleteEdge: (id: string) => void;
  onSelectEdge?: (id: string | null) => void;
}

export const IncidenceTable: React.FC<IncidenceTableProps> = ({
  nodes,
  edges,
  onAddEdge,
  onUpdateEdge,
  onDeleteEdge,
  onSelectEdge
}) => {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ node: string; edge: string } | null>(null);

  const handleCellClick = (nodeId: string, edge: GraphEdge) => {
    if (!edge.directed) {
      // Undirected: toggle membership
      if (edge.source === nodeId && edge.target === nodeId) {
        // Was self loop -> remove from one endpoint (pick another node if available)
        const otherNode = nodes.find(n => n.id !== nodeId);
        if (otherNode) {
          onUpdateEdge(edge.id, { target: otherNode.id });
        }
      } else if (edge.source === nodeId) {
        // Reassign source to another node
        const candidate = nodes.find(n => n.id !== nodeId && n.id !== edge.target);
        if (candidate) {
          onUpdateEdge(edge.id, { source: candidate.id });
        }
      } else if (edge.target === nodeId) {
        // Reassign target to another node
        const candidate = nodes.find(n => n.id !== nodeId && n.id !== edge.source);
        if (candidate) {
          onUpdateEdge(edge.id, { target: candidate.id });
        }
      } else {
        // Not incident -> replace target with this node
        onUpdateEdge(edge.id, { target: nodeId });
      }
    } else {
      // Directed: cycle 0 -> +1 (source) -> -1 (target) -> 0
      const isSource = edge.source === nodeId;
      const isTarget = edge.target === nodeId;

      if (!isSource && !isTarget) {
        // Make this node the new source
        onUpdateEdge(edge.id, { source: nodeId });
      } else if (isSource && !isTarget) {
        // Make this node the target instead
        onUpdateEdge(edge.id, { source: edge.target, target: nodeId });
      } else if (isTarget && !isSource) {
        // Make self-loop or shift target
        const other = nodes.find(n => n.id !== nodeId);
        if (other) {
          onUpdateEdge(edge.id, { target: other.id });
        }
      } else {
        // Self-loop: shift target
        const other = nodes.find(n => n.id !== nodeId);
        if (other) {
          onUpdateEdge(edge.id, { target: other.id });
        }
      }
    }
  };

  const handleAddNewEdge = () => {
    if (nodes.length === 0) return;
    const u = nodes[0].id;
    const v = nodes.length > 1 ? nodes[1].id : nodes[0].id;
    onAddEdge(u, v, false);
  };

  return (
    <div className="flex flex-col h-full bg-[#111214] text-zinc-200 overflow-hidden">
      {/* Table Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-800/90 bg-[#141517]">
        <div className="flex items-center gap-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Incidence Matrix <span className="font-mono text-orange-400">B[v, e]</span>
          </h3>
          <span className="text-[11px] text-zinc-500 hidden sm:inline">
            Vertices (|V|={nodes.length}) × Edges (|E|={edges.length}) • Directed: +1 (source), −1 (target) • Undirected: 1
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddNewEdge}
            disabled={nodes.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 disabled:opacity-40 text-orange-400 border border-orange-500/30 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Edge Column
          </button>
        </div>
      </div>

      {/* Main Matrix Area */}
      <div className="flex-1 overflow-auto p-4">
        {nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <p className="text-sm text-zinc-400 mb-2">Graph has no vertices.</p>
            <p className="text-xs text-zinc-500">Create vertices on the canvas to view incidence relationships.</p>
          </div>
        ) : edges.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <p className="text-sm text-zinc-400 mb-3">No edges in the graph.</p>
            <button
              onClick={handleAddNewEdge}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Edge
            </button>
          </div>
        ) : (
          <div className="inline-block min-w-full align-middle">
            <table className="border-collapse text-xs font-mono">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-20 bg-[#141517] border border-zinc-800 px-3 py-2 text-left text-[10px] uppercase tracking-wider text-zinc-500 min-w-[120px]">
                    v \ e
                  </th>
                  {edges.map((edge, idx) => {
                    const isEdgeHovered =
                      hoveredEdgeId === edge.id || hoveredCell?.edge === edge.id;

                    return (
                      <th
                        key={edge.id}
                        onMouseEnter={() => {
                          setHoveredEdgeId(edge.id);
                          onSelectEdge?.(edge.id);
                        }}
                        onMouseLeave={() => {
                          setHoveredEdgeId(null);
                          onSelectEdge?.(null);
                        }}
                        className={`sticky top-0 z-10 border border-zinc-800 px-2.5 py-2 text-center min-w-[70px] transition-colors ${
                          isEdgeHovered ? 'bg-orange-500/15 text-orange-300' : 'bg-[#141517] text-zinc-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-xs">{edge.label || `e${idx + 1}`}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onUpdateEdge(edge.id, { directed: !edge.directed })}
                              title={edge.directed ? 'Directed (click to make undirected)' : 'Undirected (click to make directed)'}
                              className={`p-0.5 rounded text-[10px] transition-colors ${
                                edge.directed
                                  ? 'text-sky-400 hover:bg-sky-500/20'
                                  : 'text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                            >
                              {edge.directed ? (
                                <ArrowRight className="w-3 h-3" />
                              ) : (
                                <Minus className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => onDeleteEdge(edge.id)}
                              title="Delete edge"
                              className="p-0.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-normal truncate max-w-[64px]">
                            {edge.source} {edge.directed ? '→' : '—'} {edge.target}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="sticky top-0 z-10 bg-[#141517] border border-zinc-800 px-3 py-2 text-center text-[10px] uppercase text-zinc-500 min-w-[75px]">
                    deg(v)
                  </th>
                </tr>
              </thead>
              <tbody>
                {nodes.map(node => {
                  const isNodeHovered = hoveredCell?.node === node.id;

                  // Calculate degree metrics from incidence
                  let inDeg = 0;
                  let outDeg = 0;
                  let undirDeg = 0;

                  for (const e of edges) {
                    if (e.directed) {
                      if (e.source === node.id) outDeg++;
                      if (e.target === node.id) inDeg++;
                    } else {
                      if (e.source === node.id && e.target === node.id) {
                        undirDeg += 2;
                      } else if (e.source === node.id || e.target === node.id) {
                        undirDeg += 1;
                      }
                    }
                  }

                  const totalDegree = undirDeg + inDeg + outDeg;

                  return (
                    <tr key={node.id} className="group">
                      {/* Vertex Row Header */}
                      <td
                        className={`sticky left-0 z-10 border border-zinc-800 px-3 py-2 transition-colors ${
                          isNodeHovered ? 'bg-orange-500/15 text-orange-300' : 'bg-[#141517] text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: node.color || '#3b82f6' }}
                          />
                          <span className="font-bold">{node.id}</span>
                          <span className="text-[11px] font-sans text-zinc-400 truncate max-w-[80px]">
                            {node.label}
                          </span>
                        </div>
                      </td>

                      {/* Matrix Cells */}
                      {edges.map(edge => {
                        const isSource = edge.source === node.id;
                        const isTarget = edge.target === node.id;
                        const isSelfLoop = isSource && isTarget;

                        let cellValue = '0';
                        let cellBadgeClass = 'text-zinc-600 bg-[#0e0f11]';

                        if (!edge.directed) {
                          if (isSelfLoop) {
                            cellValue = '2';
                            cellBadgeClass = 'bg-emerald-500/25 text-emerald-300 font-bold';
                          } else if (isSource || isTarget) {
                            cellValue = '1';
                            cellBadgeClass = 'bg-emerald-500/20 text-emerald-300 font-bold';
                          }
                        } else {
                          if (isSelfLoop) {
                            cellValue = '±1';
                            cellBadgeClass = 'bg-purple-500/25 text-purple-300 font-bold';
                          } else if (isSource) {
                            cellValue = '+1';
                            cellBadgeClass = 'bg-sky-500/20 text-sky-300 font-bold';
                          } else if (isTarget) {
                            cellValue = '−1';
                            cellBadgeClass = 'bg-amber-500/20 text-amber-300 font-bold';
                          }
                        }

                        const isCellHovered =
                          hoveredCell?.node === node.id && hoveredCell?.edge === edge.id;
                        const isCrosshair =
                          hoveredCell?.node === node.id ||
                          hoveredCell?.edge === edge.id ||
                          hoveredEdgeId === edge.id;

                        return (
                          <td
                            key={edge.id}
                            onMouseEnter={() =>
                              setHoveredCell({ node: node.id, edge: edge.id })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => handleCellClick(node.id, edge)}
                            className={`border border-zinc-800/90 p-0 text-center cursor-pointer select-none transition-colors ${
                              isCrosshair && cellValue === '0'
                                ? 'bg-zinc-900/40 text-zinc-500'
                                : cellBadgeClass
                            }`}
                          >
                            <motion.div
                              key={`${node.id}-${edge.id}-${cellValue}`}
                              initial={{ scale: 0.88 }}
                              animate={{ scale: 1 }}
                              className={`w-full h-9 flex items-center justify-center font-mono ${
                                isCellHovered ? 'ring-1 ring-inset ring-orange-400' : ''
                              }`}
                            >
                              {cellValue}
                            </motion.div>
                          </td>
                        );
                      })}

                      {/* Vertex Total Degree */}
                      <td className="border border-zinc-800 bg-[#141517] px-3 py-1.5 text-center font-semibold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            totalDegree % 2 === 0
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {totalDegree}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="px-4 py-2.5 border-t border-zinc-800/80 bg-[#141517] flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500" />
            <strong className="text-zinc-300">1</strong> (Incident Undirected)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-500/30 border border-sky-500" />
            <strong className="text-sky-300">+1</strong> (Source / Tail)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500" />
            <strong className="text-amber-300">−1</strong> (Target / Head)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/30 border border-purple-500" />
            <strong className="text-purple-300">2 / ±1</strong> (Self-Loop)
          </span>
        </div>

        <div className="flex items-center gap-1 text-zinc-500">
          <Info className="w-3.5 h-3.5" />
          <span>Click any cell to toggle incidence or reassign edge endpoints</span>
        </div>
      </div>
    </div>
  );
};
