import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  ArrowUpRight,
  Minus
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
    <div className="flex flex-col h-full bg-[#111214] text-zinc-300 text-xs overflow-hidden">
      {/* Flat Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <span className="font-mono text-zinc-400">A[u, v] (Adjacency)</span>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-0.5 text-xs">
            <button
              onClick={() => setInsertDirected(false)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                !insertDirected ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Minus className="w-3 h-3" />
              <span>Undirected</span>
            </button>
            <button
              onClick={() => setInsertDirected(true)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                insertDirected ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>Directed</span>
            </button>
          </div>

          <button
            onClick={onAddNode}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Vertex</span>
          </button>

          <button
            onClick={onClearAllEdges}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
          >
            Clear Edges
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="flex-1 overflow-auto p-3">
        {nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500">
            No vertices defined.
          </div>
        ) : (
          <table className="border-collapse font-mono text-xs">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 bg-zinc-900 border border-zinc-800 px-2 py-1 text-left text-zinc-500 font-normal">
                  u \ v
                </th>
                {nodes.map(colNode => (
                  <th
                    key={colNode.id}
                    className="sticky top-0 z-10 bg-zinc-900 border border-zinc-800 px-2 py-1 text-center min-w-[44px] text-zinc-300 font-normal"
                  >
                    {colNode.id}
                  </th>
                ))}
                <th className="sticky top-0 z-10 bg-zinc-900 border border-zinc-800 px-2 py-1 text-center text-zinc-500 font-normal">
                  Σ
                </th>
                <th className="sticky top-0 z-10 bg-zinc-900 border border-zinc-800 px-1 py-1 text-center text-zinc-500 font-normal" />
              </tr>
            </thead>
            <tbody>
              {nodes.map(rowNode => {
                const rowSum = nodes.reduce(
                  (acc, colNode) => acc + (matrix[rowNode.id]?.[colNode.id]?.count || 0),
                  0
                );

                return (
                  <tr key={rowNode.id}>
                    <td className="sticky left-0 z-10 bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{rowNode.id}</span>
                        <input
                          type="text"
                          value={rowNode.label}
                          onChange={e => onUpdateNode(rowNode.id, { label: e.target.value })}
                          className="bg-transparent border-none text-zinc-400 text-[11px] focus:outline-none w-20"
                        />
                      </div>
                    </td>

                    {nodes.map(colNode => {
                      const cell = matrix[rowNode.id]?.[colNode.id] || { count: 0 };
                      const isHovered =
                        hoveredCell?.row === rowNode.id && hoveredCell?.col === colNode.id;

                      return (
                        <td
                          key={colNode.id}
                          onMouseEnter={() =>
                            setHoveredCell({ row: rowNode.id, col: colNode.id })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={e => handleCellClick(rowNode.id, colNode.id, e)}
                          onContextMenu={e => handleCellContextMenu(rowNode.id, colNode.id, e)}
                          className={`border border-zinc-800 text-center cursor-pointer select-none py-1.5 ${
                            cell.count > 0
                              ? 'bg-zinc-800 text-zinc-100 font-bold'
                              : isHovered
                              ? 'bg-zinc-800/40 text-zinc-400'
                              : 'bg-zinc-950/40 text-zinc-600'
                          }`}
                        >
                          {cell.count}
                        </td>
                      );
                    })}

                    <td className="border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-center font-mono text-zinc-400">
                      {rowSum}
                    </td>

                    <td className="border border-zinc-800 bg-zinc-900/40 px-1 py-1 text-center">
                      <button
                        onClick={() => onDeleteNode(rowNode.id)}
                        className="p-0.5 rounded text-zinc-600 hover:text-rose-400"
                        title="Delete vertex"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
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
