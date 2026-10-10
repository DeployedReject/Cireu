import React, { useState, useMemo } from 'react';

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
    <div className="flex flex-col h-full bg-white text-gray-800 text-xs overflow-hidden font-sans">
      {/* Normal Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-gray-300 bg-gray-100">
        <span className="font-mono font-bold text-gray-700">A[u, v] (Adjacency Matrix)</span>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center border border-gray-400 bg-gray-200">
            <button
              onClick={() => setInsertDirected(false)}
              className={`px-2 py-0.5 text-xs ${
                !insertDirected ? 'bg-white font-bold text-gray-900 border-r border-gray-400' : 'text-gray-700 hover:bg-white border-r border-gray-300'
              }`}
            >
              Undirected
            </button>
            <button
              onClick={() => setInsertDirected(true)}
              className={`px-2 py-0.5 text-xs ${
                insertDirected ? 'bg-white font-bold text-gray-900' : 'text-gray-700 hover:bg-white'
              }`}
            >
              Directed
            </button>
          </div>

          <button
            onClick={onAddNode}
            className="px-2 py-0.5 bg-gray-100 hover:bg-white text-gray-800 border border-gray-400 shadow-sm"
          >
            + Vertex
          </button>

          <button
            onClick={onClearAllEdges}
            className="px-2 py-0.5 bg-gray-100 hover:bg-white text-gray-700 border border-gray-400 shadow-sm"
          >
            Clear Edges
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="flex-1 overflow-auto p-2">
        {nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            No vertices defined.
          </div>
        ) : (
          <table className="border-collapse font-mono text-xs">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 bg-gray-200 border border-gray-400 px-2 py-1 text-left text-gray-600 font-bold">
                  u \ v
                </th>
                {nodes.map(colNode => (
                  <th
                    key={colNode.id}
                    className="sticky top-0 z-10 bg-gray-200 border border-gray-400 px-2 py-1 text-center min-w-[40px] text-gray-800 font-bold"
                  >
                    {colNode.id}
                  </th>
                ))}
                <th className="sticky top-0 z-10 bg-gray-200 border border-gray-400 px-2 py-1 text-center text-gray-600 font-bold">
                  Σ
                </th>
                <th className="sticky top-0 z-10 bg-gray-200 border border-gray-400 px-1 py-1 text-center" />
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
                    <td className="sticky left-0 z-10 bg-gray-100 border border-gray-400 px-2 py-1 text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 border border-gray-400 inline-block shrink-0"
                          style={{ backgroundColor: rowNode.color || '#93c5fd' }}
                        />
                        <span className="font-bold">{rowNode.id}</span>
                        <input
                          type="text"
                          value={rowNode.label}
                          onChange={e => onUpdateNode(rowNode.id, { label: e.target.value })}
                          className="bg-transparent border-none text-gray-600 text-[11px] focus:bg-white w-20"
                        />
                      </div>
                    </td>

                    {nodes.map(colNode => {
                      const cell = matrix[rowNode.id]?.[colNode.id] || { count: 0, hasDirected: false, hasUndirected: false };
                      const isHovered =
                        hoveredCell?.row === rowNode.id && hoveredCell?.col === colNode.id;

                      let cellStyle = 'bg-white text-gray-400';
                      if (cell.count > 0) {
                        if (cell.hasDirected && cell.hasUndirected) {
                          cellStyle = 'bg-purple-100 text-purple-900 font-bold';
                        } else if (cell.hasDirected) {
                          cellStyle = 'bg-blue-100 text-blue-900 font-bold';
                        } else {
                          cellStyle = 'bg-green-100 text-green-900 font-bold';
                        }
                      } else if (isHovered) {
                        cellStyle = 'bg-gray-100 text-gray-700';
                      }

                      return (
                        <td
                          key={colNode.id}
                          onMouseEnter={() =>
                            setHoveredCell({ row: rowNode.id, col: colNode.id })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={e => handleCellClick(rowNode.id, colNode.id, e)}
                          onContextMenu={e => handleCellContextMenu(rowNode.id, colNode.id, e)}
                          className={`border border-gray-300 text-center cursor-pointer select-none py-1 transition-colors ${cellStyle}`}
                        >
                          {cell.count}
                        </td>
                      );
                    })}

                    <td className="border border-gray-400 bg-gray-50 px-2 py-1 text-center font-mono text-gray-700 font-bold">
                      {rowSum}
                    </td>

                    <td className="border border-gray-400 bg-gray-50 px-1 py-1 text-center">
                      <button
                        onClick={() => onDeleteNode(rowNode.id)}
                        className="px-1 text-gray-500 hover:text-red-700 font-bold"
                        title="Delete vertex"
                      >
                        ×
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
