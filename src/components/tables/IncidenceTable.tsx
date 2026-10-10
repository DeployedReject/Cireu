import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowRight,
  Minus
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
      if (edge.source === nodeId && edge.target === nodeId) {
        const otherNode = nodes.find(n => n.id !== nodeId);
        if (otherNode) onUpdateEdge(edge.id, { target: otherNode.id });
      } else if (edge.source === nodeId) {
        const candidate = nodes.find(n => n.id !== nodeId && n.id !== edge.target);
        if (candidate) onUpdateEdge(edge.id, { source: candidate.id });
      } else if (edge.target === nodeId) {
        const candidate = nodes.find(n => n.id !== nodeId && n.id !== edge.source);
        if (candidate) onUpdateEdge(edge.id, { target: candidate.id });
      } else {
        onUpdateEdge(edge.id, { target: nodeId });
      }
    } else {
      const isSource = edge.source === nodeId;
      const isTarget = edge.target === nodeId;

      if (!isSource && !isTarget) {
        onUpdateEdge(edge.id, { source: nodeId });
      } else if (isSource && !isTarget) {
        onUpdateEdge(edge.id, { source: edge.target, target: nodeId });
      } else {
        const other = nodes.find(n => n.id !== nodeId);
        if (other) onUpdateEdge(edge.id, { target: other.id });
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
    <div className="flex flex-col h-full bg-[#111214] text-zinc-300 text-xs overflow-hidden">
      {/* Flat Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <span className="font-mono text-zinc-400">B[v, e] (Incidence)</span>

        <button
          onClick={handleAddNewEdge}
          disabled={nodes.length === 0}
          className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 border border-zinc-700"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Edge Column</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto p-3">
        {nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500">
            No vertices defined.
          </div>
        ) : edges.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500">
            No edges defined.
          </div>
        ) : (
          <table className="border-collapse font-mono text-xs">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 bg-zinc-900 border border-zinc-800 px-2 py-1 text-left text-zinc-500 font-normal min-w-[90px]">
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
                      className={`sticky top-0 z-10 border border-zinc-800 px-2 py-1 text-center min-w-[58px] font-normal ${
                        isEdgeHovered ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-bold">{edge.label || `e${idx + 1}`}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onUpdateEdge(edge.id, { directed: !edge.directed })}
                            title={edge.directed ? 'Directed' : 'Undirected'}
                            className="text-zinc-400 hover:text-zinc-200"
                          >
                            {edge.directed ? (
                              <ArrowRight className="w-3 h-3" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => onDeleteEdge(edge.id)}
                            className="text-zinc-500 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
                <th className="sticky top-0 z-10 bg-zinc-900 border border-zinc-800 px-2 py-1 text-center text-zinc-500 font-normal">
                  deg
                </th>
              </tr>
            </thead>
            <tbody>
              {nodes.map(node => {
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
                  <tr key={node.id}>
                    <td className="sticky left-0 z-10 bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-200">
                      <span className="font-bold">{node.id}</span>
                      <span className="text-zinc-500 text-[11px] ml-1.5">{node.label}</span>
                    </td>

                    {edges.map(edge => {
                      const isSource = edge.source === node.id;
                      const isTarget = edge.target === node.id;
                      const isSelfLoop = isSource && isTarget;

                      let cellValue = '0';
                      let cellClass = 'bg-zinc-950/40 text-zinc-600';

                      if (!edge.directed) {
                        if (isSelfLoop) {
                          cellValue = '2';
                          cellClass = 'bg-zinc-800 text-zinc-100 font-bold';
                        } else if (isSource || isTarget) {
                          cellValue = '1';
                          cellClass = 'bg-zinc-800 text-zinc-100 font-bold';
                        }
                      } else {
                        if (isSelfLoop) {
                          cellValue = '±1';
                          cellClass = 'bg-zinc-800 text-zinc-100 font-bold';
                        } else if (isSource) {
                          cellValue = '+1';
                          cellClass = 'bg-zinc-800 text-zinc-100 font-bold';
                        } else if (isTarget) {
                          cellValue = '−1';
                          cellClass = 'bg-zinc-800 text-zinc-100 font-bold';
                        }
                      }

                      return (
                        <td
                          key={edge.id}
                          onMouseEnter={() =>
                            setHoveredCell({ node: node.id, edge: edge.id })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => handleCellClick(node.id, edge)}
                          className={`border border-zinc-800 text-center cursor-pointer select-none py-1.5 ${cellClass}`}
                        >
                          {cellValue}
                        </td>
                      );
                    })}

                    <td className="border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-center font-mono text-zinc-400">
                      {totalDegree}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
