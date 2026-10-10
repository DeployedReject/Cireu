import { useState } from 'react';

import { GraphNode, GraphEdge } from '../../types/graph';

interface EdgeListTableProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onAddEdge: (source: string, target: string, directed: boolean, label?: string) => void;
  onUpdateEdge: (id: string, patch: Partial<GraphEdge>) => void;
  onDeleteEdge: (id: string) => void;
  onParseBulkEdgeText: (text: string) => void;
  onConvertAllEdgesDirection: (directed: boolean) => void;
}

export const EdgeListTable: React.FC<EdgeListTableProps> = ({
  nodes,
  edges,
  onAddEdge,
  onUpdateEdge,
  onDeleteEdge,
  onParseBulkEdgeText,
  onConvertAllEdgesDirection
}) => {
  const [newSource, setNewSource] = useState<string>(nodes[0]?.id || 'A');
  const [newTarget, setNewTarget] = useState<string>(nodes[1]?.id || nodes[0]?.id || 'B');
  const [newDirected, setNewDirected] = useState<boolean>(false);
  const [newLabel, setNewLabel] = useState<string>('');
  const [showBulkParser, setShowBulkParser] = useState<boolean>(false);
  const [bulkText, setBulkText] = useState<string>('A - B\nB - C\nC - D\nD - A');

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const s = newSource.trim();
    const t = newTarget.trim();
    if (!s || !t) return;
    onAddEdge(s, t, newDirected, newLabel.trim() || undefined);
    setNewLabel('');
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800 text-xs overflow-hidden font-sans">
      {/* Normal Top Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-gray-300 bg-orange-500">
        <span className="font-mono font-bold text-gray-700">Edges ({edges.length})</span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onConvertAllEdgesDirection(false)}
            className="px-2 py-0.5 bg-orange-500 hover:bg-white text-gray-700 border border-gray-400 shadow-sm"
          >
            All Undirected
          </button>
          <button
            onClick={() => onConvertAllEdgesDirection(true)}
            className="px-2 py-0.5 bg-orange-500 hover:bg-white text-gray-700 border border-gray-400 shadow-sm"
          >
            All Directed
          </button>
          <button
            onClick={() => setShowBulkParser(s => !s)}
            className="px-2 py-0.5 bg-orange-500 hover:bg-white text-gray-700 border border-gray-400 shadow-sm"
          >
            {showBulkParser ? 'Hide Bulk' : 'Bulk Text'}
          </button>
        </div>
      </div>

      {showBulkParser && (
        <div className="p-2 border-b border-gray-300 bg-gray-50 flex gap-2">
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={2}
            className="flex-1 bg-white border border-gray-400 p-1.5 font-mono text-gray-900 text-xs"
            placeholder="A - B, B -> C"
          />
          <button
            onClick={() => onParseBulkEdgeText(bulkText)}
            className="px-2.5 py-1 bg-gray-200 hover:bg-white text-gray-900 border border-gray-400 font-bold self-end"
          >
            Parse
          </button>
        </div>
      )}

      {/* Quick Add Bar */}
      <form
        onSubmit={handleQuickAdd}
        className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-300 bg-gray-50"
      >
        <span className="text-gray-500 font-mono">u:</span>
        <input
          list="edge-vertex-list"
          value={newSource}
          onChange={e => setNewSource(e.target.value)}
          placeholder="A"
          className="w-16 px-1.5 py-0.5 bg-white border border-gray-400 font-mono text-gray-900"
        />

        <button
          type="button"
          onClick={() => setNewDirected(d => !d)}
          className="px-2 py-0.5 bg-white border border-gray-400 text-gray-800 font-bold text-[11px]"
        >
          {newDirected ? '→' : '—'}
        </button>

        <span className="text-gray-500 font-mono">v:</span>
        <input
          list="edge-vertex-list"
          value={newTarget}
          onChange={e => setNewTarget(e.target.value)}
          placeholder="B"
          className="w-16 px-1.5 py-0.5 bg-white border border-gray-400 font-mono text-gray-900"
        />

        <datalist id="edge-vertex-list">
          {nodes.map(n => (
            <option key={n.id} value={n.id} />
          ))}
        </datalist>

        <input
          type="text"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="label (opt)"
          className="w-24 px-1.5 py-0.5 bg-white border border-gray-400 text-gray-900"
        />

        <button
          type="submit"
          className="px-2.5 py-0.5 bg-gray-200 hover:bg-white text-gray-900 border border-gray-400 font-bold"
        >
          Add
        </button>
      </form>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-gray-300 bg-orange-500 text-gray-600 font-bold">
              <th className="py-1 px-3">#</th>
              <th className="py-1 px-2">Source</th>
              <th className="py-1 px-2 text-center">Type</th>
              <th className="py-1 px-2">Target</th>
              <th className="py-1 px-2">Label</th>
              <th className="py-1 px-3 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {edges.map((edge, idx) => (
              <tr key={edge.id} className="hover:bg-gray-50">
                <td className="py-1 px-3 text-gray-400">{idx + 1}</td>
                <td className="py-1 px-2">
                  <select
                    value={edge.source}
                    onChange={e => onUpdateEdge(edge.id, { source: e.target.value })}
                    className="bg-white border border-gray-300 px-1 py-0.5 text-gray-800"
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.id}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1 px-2 text-center">
                  <button
                    onClick={() => onUpdateEdge(edge.id, { directed: !edge.directed })}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                      edge.directed
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-green-100 text-green-900 border-green-300'
                    }`}
                  >
                    {edge.directed ? '→' : '—'}
                  </button>
                </td>
                <td className="py-1 px-2">
                  <select
                    value={edge.target}
                    onChange={e => onUpdateEdge(edge.id, { target: e.target.value })}
                    className="bg-white border border-gray-300 px-1 py-0.5 text-gray-800"
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.id}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1 px-2 font-sans">
                  <input
                    type="text"
                    value={edge.label || ''}
                    onChange={e => onUpdateEdge(edge.id, { label: e.target.value })}
                    placeholder="—"
                    className="bg-transparent border-none text-gray-700 w-20"
                  />
                </td>
                <td className="py-1 px-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() =>
                        onUpdateEdge(edge.id, {
                          source: edge.target,
                          target: edge.source
                        })
                      }
                      title="Swap"
                      className="text-gray-500 hover:text-gray-900 font-bold"
                    >
                      ⇄
                    </button>
                    <button
                      onClick={() => onDeleteEdge(edge.id)}
                      title="Delete"
                      className="text-gray-400 hover:text-red-700 font-bold"
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {edges.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-400 font-sans">
                  No edges.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
