import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  ArrowUpRight,
  Minus,
  Info,
  RotateCcw
} from 'lucide-react';
import { GraphNode, GraphEdge } from '../../types/graph';

interface AdjacencyMatrixTableProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onAddNode: () => void;
  onDeleteNode: (id: string) => void;
  onUpdateNode: (id: string, patch: Partial<GraphNode>) => void;
  onSetEdgeCountBetween: (
    sourceId: string,
    targetId: string,
    newCount: number,
    directed: boolean
  ) => void;
  onClearAllEdges: () => void;
}

export const AdjacencyMatrixTable: React.FC<AdjacencyMatrixTableProps> = ({
  nodes,
  edges,
  onAddNode,
  onDeleteNode,
  onUpdateNode,
  onSetEdgeCountBetween,
  onClearAllEdges
}) => {
  const [insertDirected, setInsertDirected] = useState<boolean>(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string } | null>(null);

  // Build matrix counts: cell[u][v] = number of edges usable from u to v
  const matrix = useMemo(() => {
    const map: Record<string, Record<string, { count: number; hasDirected: boolean; hasUndirected: boolean }>> = {};
    for (const u of nodes) {
      map[u.id] = {};
      for (const v of nodes) {
        map[u.id][v.id] = { count: 0, hasDirected: false, hasUndirected: false };
      }
    }

    for (const e of edges) {
      if (!map[e.source] || !map[e.source][e.target]) continue;
      if (e.directed) {
        map[e.source][e.target].count += 1;
        map[e.source][e.target].hasDirected = true;
      } else {
        map[e.source][e.target].count += 1;
        map[e.source][e.target].hasUndirected = true;
        if (e.source !== e.target && map[e.target]?.[e.source]) {
          map[e.target][e.source].count += 1;
          map[e.target][e.source].hasUndirected = true;
        }
      }
    }

    return map;
  }, [nodes, edges]);

  const handleCellClick = (uId: string, vId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const current = matrix[uId]?.[vId]?.count || 0;
    // Left click cycles 0 -> 1 -> 2 -> 0 (or toggles 0 -> 1 if not holding shift)
    if (e.shiftKey) {
      onSetEdgeCountBetween(uId, vId, current + 1, insertDirected);
    } else {
      const nextCount = current === 0 ? 1 : 0;
      onSetEdgeCountBetween(uId, vId, nextCount, insertDirected);
    }
  };

  const handleCellContextMenu = (uId: string, vId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const current = matrix[uId]?.[vId]?.count || 0;
    onSetEdgeCountBetween(uId, vId, current + 1, insertDirected);
  };

  return (
    <div className="flex flex-col h-full bg-[#111214] text-zinc-200 overflow-hidden">
      {/* Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-800/90 bg-[#141517]">
        <div className="flex items-center gap-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Adjacency Matrix <span className="font-mono text-orange-400">A[u, v]</span>
          </h3>
          <span className="text-[11px] text-zinc-500 hidden sm:inline">
            Click cell to toggle (0 ↔ 1) • Right-click or Shift+Click to add parallel multigraph edge
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Mode for Matrix Edits: Symmetric Undirected vs Directed */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <button
              onClick={() => setInsertDirected(false)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                !insertDirected
                  ? 'bg-zinc-800 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Minus className="w-3.5 h-3.5 text-emerald-400" />
              Symmetric (Undirected)
            </button>
            <button
              onClick={() => setInsertDirected(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                insertDirected
                  ? 'bg-zinc-800 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
              Asymmetric (Directed)
            </button>
          </div>

          <button
            onClick={onAddNode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Vertex
          </button>

          <button
            onClick={onClearAllEdges}
            title="Zero out matrix (remove all edges)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Zero Matrix
          </button>
        </div>
      </div>

      {/* Matrix Table Container */}
      <div className="flex-1 overflow-auto p-4">
        {nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <p className="text-sm text-zinc-400 mb-3">No vertices in the graph yet.</p>
            <button
              onClick={onAddNode}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Vertex
            </button>
          </div>
        ) : (
          <div className="inline-block min-w-full align-middle">
            <table className="border-collapse text-xs font-mono">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-20 bg-[#141517] border border-zinc-800 px-3 py-2 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                    u \ v
                  </th>
                  {nodes.map(colNode => {
                    const isColHovered = hoveredCell?.col === colNode.id;
                    return (
                      <th
                        key={colNode.id}
                        className={`sticky top-0 z-10 border border-zinc-800 px-2.5 py-2 text-center min-w-[54px] transition-colors ${
                          isColHovered ? 'bg-orange-500/15 text-orange-300' : 'bg-[#141517] text-zinc-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-bold text-xs">{colNode.id}</span>
                          <span className="text-[10px] font-sans font-normal text-zinc-500 truncate max-w-[64px]">
                            {colNode.label}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="sticky top-0 z-10 bg-[#141517] border border-zinc-800 px-3 py-2 text-center text-[10px] uppercase text-zinc-500">
                    Row Σ
                  </th>
                  <th className="sticky top-0 z-10 bg-[#141517] border border-zinc-800 px-2 py-2 text-center text-[10px] uppercase text-zinc-500">
                    Del
                  </th>
                </tr>
              </thead>
              <tbody>
                {nodes.map(rowNode => {
                  const isRowHovered = hoveredCell?.row === rowNode.id;
                  const rowSum = nodes.reduce(
                    (acc, colNode) => acc + (matrix[rowNode.id]?.[colNode.id]?.count || 0),
                    0
                  );

                  return (
                    <tr key={rowNode.id} className="group">
                      {/* Row Header with inline editable label */}
                      <td
                        className={`sticky left-0 z-10 border border-zinc-800 px-3 py-1.5 transition-colors ${
                          isRowHovered ? 'bg-orange-500/15 text-orange-300' : 'bg-[#141517] text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: rowNode.color || '#3b82f6' }}
                          />
                          <span className="font-bold min-w-[24px]">{rowNode.id}</span>
                          <input
                            type="text"
                            value={rowNode.label}
                            onChange={e => onUpdateNode(rowNode.id, { label: e.target.value })}
                            className="bg-transparent border-b border-transparent focus:border-orange-500 focus:outline-none text-[11px] font-sans text-zinc-400 focus:text-zinc-100 w-24"
                          />
                        </div>
                      </td>

                      {/* Matrix Cells */}
                      {nodes.map(colNode => {
                        const cell = matrix[rowNode.id]?.[colNode.id] || {
                          count: 0,
                          hasDirected: false,
                          hasUndirected: false
                        };
                        const isDiagonal = rowNode.id === colNode.id;
                        const isHovered =
                          hoveredCell?.row === rowNode.id && hoveredCell?.col === colNode.id;
                        const isCrosshair =
                          hoveredCell?.row === rowNode.id || hoveredCell?.col === colNode.id;

                        return (
                          <td
                            key={colNode.id}
                            onMouseEnter={() =>
                              setHoveredCell({ row: rowNode.id, col: colNode.id })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={e => handleCellClick(rowNode.id, colNode.id, e)}
                            onContextMenu={e => handleCellContextMenu(rowNode.id, colNode.id, e)}
                            className={`border border-zinc-800/90 p-0 text-center cursor-pointer select-none transition-colors ${
                              cell.count > 0
                                ? cell.hasDirected
                                  ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                : isDiagonal
                                ? 'bg-zinc-900/60 text-zinc-600 hover:bg-zinc-800/80'
                                : isCrosshair
                                ? 'bg-zinc-900/40 text-zinc-500 hover:bg-zinc-800'
                                : 'bg-[#0e0f11] text-zinc-600 hover:bg-zinc-800/60'
                            }`}
                          >
                            <motion.div
                              key={`${rowNode.id}-${colNode.id}-${cell.count}`}
                              initial={{ scale: 0.85 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              className={`w-full h-9 flex items-center justify-center font-semibold ${
                                isHovered ? 'ring-1 ring-inset ring-orange-400/70' : ''
                              }`}
                            >
                              {cell.count}
                            </motion.div>
                          </td>
                        );
                      })}

                      {/* Row Out-Degree Sum */}
                      <td className="border border-zinc-800 bg-[#141517] px-3 py-1.5 text-center font-semibold text-zinc-300">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            rowSum % 2 === 0
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {rowSum}
                        </span>
                      </td>

                      {/* Delete Row Node */}
                      <td className="border border-zinc-800 bg-[#141517] px-2 py-1.5 text-center">
                        <button
                          onClick={() => onDeleteNode(rowNode.id)}
                          title={`Delete vertex ${rowNode.label}`}
                          className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="px-4 py-2 border-t border-zinc-800/80 bg-[#141517] flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500" />
            Undirected Edge
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-500/30 border border-sky-500" />
            Directed Edge
          </span>
        </div>
        <div className="flex items-center gap-1 text-zinc-500">
          <Info className="w-3.5 h-3.5" />
          <span>Matrix edits synchronize in real time with the graph canvas & solvers</span>
        </div>
      </div>
    </div>
  );
};
