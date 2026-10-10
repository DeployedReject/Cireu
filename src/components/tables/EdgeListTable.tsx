import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  ArrowRight,
  Minus,
  Terminal,
  ArrowLeftRight
} from 'lucide-react';
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
  const [bulkText, setBulkText] = useState<string>('A - B\nB - C\nC - D\nD - A\nA -> C');

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const s = newSource.trim();
    const t = newTarget.trim();
    if (!s || !t) return;
    onAddEdge(s, t, newDirected, newLabel.trim() || undefined);
    setNewLabel('');
  };

  return (
    <div className="flex flex-col h-full bg-[#111214] text-zinc-200 overflow-hidden">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-800/90 bg-[#141517]">
        <div className="flex items-center gap-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Edge Table <span className="font-mono text-orange-400">E = &#123;(u, v)&#125;</span>
          </h3>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] font-mono text-zinc-400">
            {edges.length} edges
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onConvertAllEdgesDirection(false)}
            className="px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs transition-colors border border-zinc-700/60"
            title="Convert all edges to Undirected"
          >
            All Undirected
          </button>
          <button
            onClick={() => onConvertAllEdgesDirection(true)}
            className="px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs transition-colors border border-zinc-700/60"
            title="Convert all edges to Directed"
          >
            All Directed
          </button>
          <button
            onClick={() => setShowBulkParser(s => !s)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              showBulkParser
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-orange-400" />
            Bulk Text Parser
          </button>
        </div>
      </div>

      {/* Collapsible Bulk Text Parser */}
      <AnimatePresence>
        {showBulkParser && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-zinc-800 bg-[#16181b] overflow-hidden"
          >
            <div className="p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-300 font-medium">
                  Type or paste edge definitions (one per line or comma-separated: e.g.{' '}
                  <code className="text-orange-400 font-mono">A - B</code> for undirected,{' '}
                  <code className="text-sky-400 font-mono">A -&gt; B</code> for directed):
                </span>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  rows={3}
                  className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-orange-500"
                  placeholder="A - B, B - C, C -> A"
                />
                <button
                  onClick={() => onParseBulkEdgeText(bulkText)}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors shrink-0 self-end"
                >
                  Apply to Graph
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Add Edge Row Form */}
      <form
        onSubmit={handleQuickAdd}
        className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-zinc-800/80 bg-[#141517]/60"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-zinc-500">Source:</span>
          <input
            list="vertex-datalist"
            value={newSource}
            onChange={e => setNewSource(e.target.value)}
            placeholder="u (e.g. A)"
            className="w-24 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-100 focus:outline-none focus:border-orange-500"
          />
        </div>

        <button
          type="button"
          onClick={() => setNewDirected(d => !d)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
            newDirected
              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          }`}
          title="Click to toggle Directed vs Undirected"
        >
          {newDirected ? (
            <>
              <ArrowRight className="w-3.5 h-3.5" /> Directed (→)
            </>
          ) : (
            <>
              <Minus className="w-3.5 h-3.5" /> Undirected (—)
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-zinc-500">Target:</span>
          <input
            list="vertex-datalist"
            value={newTarget}
            onChange={e => setNewTarget(e.target.value)}
            placeholder="v (e.g. B)"
            className="w-24 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-100 focus:outline-none focus:border-orange-500"
          />
        </div>

        <datalist id="vertex-datalist">
          {nodes.map(n => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </datalist>

        <input
          type="text"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="Optional label (e.g. e1)"
          className="w-32 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
        />

        <button
          type="submit"
          className="flex items-center gap-1 px-3 py-1 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Edge
        </button>
      </form>

      {/* Edge Table List */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-[#141517] text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              <th className="py-2.5 px-4">#</th>
              <th className="py-2.5 px-3">Source (u)</th>
              <th className="py-2.5 px-3 text-center">Type</th>
              <th className="py-2.5 px-3">Target (v)</th>
              <th className="py-2.5 px-3">Label</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            <AnimatePresence initial={false}>
              {edges.map((edge, idx) => (
                <motion.tr
                  key={edge.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="hover:bg-zinc-900/60 transition-colors"
                >
                  <td className="py-2 px-4 text-zinc-500">{idx + 1}</td>

                  {/* Source Node Selector */}
                  <td className="py-2 px-3">
                    <select
                      value={edge.source}
                      onChange={e => onUpdateEdge(edge.id, { source: e.target.value })}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
                    >
                      {nodes.map(n => (
                        <option key={n.id} value={n.id}>
                          {n.id} ({n.label})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Direction Toggle Pill */}
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => onUpdateEdge(edge.id, { directed: !edge.directed })}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors ${
                        edge.directed
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-500/25'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                      }`}
                    >
                      {edge.directed ? 'u → v (Directed)' : 'u — v (Undirected)'}
                    </button>
                  </td>

                  {/* Target Node Selector */}
                  <td className="py-2 px-3">
                    <select
                      value={edge.target}
                      onChange={e => onUpdateEdge(edge.id, { target: e.target.value })}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
                    >
                      {nodes.map(n => (
                        <option key={n.id} value={n.id}>
                          {n.id} ({n.label})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Edge Label Input */}
                  <td className="py-2 px-3 font-sans">
                    <input
                      type="text"
                      value={edge.label || ''}
                      onChange={e => onUpdateEdge(edge.id, { label: e.target.value })}
                      placeholder="—"
                      className="bg-transparent border-b border-transparent focus:border-orange-500 focus:outline-none text-xs text-zinc-300 w-28"
                    />
                  </td>

                  {/* Row Actions */}
                  <td className="py-2 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() =>
                          onUpdateEdge(edge.id, {
                            source: edge.target,
                            target: edge.source
                          })
                        }
                        title="Swap u and v"
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteEdge(edge.id)}
                        title="Delete edge"
                        className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>

            {edges.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-zinc-500 font-sans">
                  No edges defined. Use the quick-add bar above or draw on the canvas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
