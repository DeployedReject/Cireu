import React, { useState } from 'react';

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
    <div className="flex flex-col h-full bg-white text-gray-800 text-xs overflow-hidden font-sans">
      {/* Normal Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-gray-300 bg-gray-100">
        <span className="font-mono font-bold text-gray-700">B[v, e] (Incidence Matrix)</span>

        <button
          onClick={handleAddNewEdge}
          disabled={nodes.length === 0}
          className="px-2 py-0.5 bg-gray-100 hover:bg-white disabled:opacity-40 text-gray-800 border border-gray-400 shadow-sm"
        >
          + Edge Column
        </button>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto p-2">
        {nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            No vertices defined.
          </div>
        ) : edges.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            No edges defined.
          </div>
        ) : (
          <table className="border-collapse font-mono text-xs">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 bg-gray-200 border border-gray-400 px-2 py-1 text-left text-gray-600 font-bold min-w-[90px]">
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
                      className={`sticky top-0 z-10 border border-gray-400 px-2 py-1 text-center min-w-[54px] font-normal ${
                        isEdgeHovered ? 'bg-gray-100 text-gray-900' : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-bold">{edge.label || `e${idx + 1}`}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onUpdateEdge(edge.id, { directed: !edge.directed })}
                            title={edge.directed ? 'Directed' : 'Undirected'}
                            className="text-gray-600 hover:text-gray-900 font-bold"
                          >
                            {edge.directed ? '→' : '—'}
                          </button>
                          <button
                            onClick={() => onDeleteEdge(edge.id)}
                            className="text-gray-400 hover:text-red-700 font-bold"
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
                <th className="sticky top-0 z-10 bg-gray-200 border border-gray-400 px-2 py-1 text-center text-gray-600 font-bold">
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
                    <td className="sticky left-0 z-10 bg-gray-100 border border-gray-400 px-2 py-1 text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 border border-gray-400 inline-block shrink-0"
                          style={{ backgroundColor: node.color || '#93c5fd' }}
                        />
                        <span className="font-bold">{node.id}</span>
                        <span className="text-gray-500 text-[11px] ml-1">{node.label}</span>
                      </div>
                    </td>

                    {edges.map(edge => {
                      const isSource = edge.source === node.id;
                      const isTarget = edge.target === node.id;
                      const isSelfLoop = isSource && isTarget;

                      let cellValue = '0';
                      let cellClass = 'bg-white text-gray-400';

                      if (!edge.directed) {
                        if (isSelfLoop) {
                          cellValue = '2';
                          cellClass = 'bg-purple-100 text-purple-900 font-bold';
                        } else if (isSource || isTarget) {
                          cellValue = '1';
                          cellClass = 'bg-green-100 text-green-900 font-bold';
                        }
                      } else {
                        if (isSelfLoop) {
                          cellValue = '±1';
                          cellClass = 'bg-purple-100 text-purple-900 font-bold';
                        } else if (isSource) {
                          cellValue = '+1';
                          cellClass = 'bg-blue-100 text-blue-900 font-bold';
                        } else if (isTarget) {
                          cellValue = '−1';
                          cellClass = 'bg-amber-100 text-amber-900 font-bold';
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
                          className={`border border-gray-300 text-center cursor-pointer select-none py-1 transition-colors ${cellClass}`}
                        >
                          {cellValue}
                        </td>
                      );
                    })}

                    <td className="border border-gray-400 bg-gray-50 px-2 py-1 text-center font-mono text-gray-700 font-bold">
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
