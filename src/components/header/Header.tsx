import React from 'react';
import {
  FolderKanban,
  Download,
  Plus
} from 'lucide-react';
import { GraphData, ViewMode } from '../../types/graph';

interface HeaderProps {
  activeGraph: GraphData;
  savedGraphs: GraphData[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onRenameGraph: (newName: string) => void;
  onSelectGraph: (graph: GraphData) => void;
  onCreateNewGraph: () => void;
  onOpenLibraryModal: () => void;
  onExportAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeGraph,
  savedGraphs,
  viewMode,
  setViewMode,
  onRenameGraph,
  onSelectGraph,
  onCreateNewGraph,
  onOpenLibraryModal,
  onExportAll
}) => {
  const viewModes: { id: ViewMode; label: string }[] = [
    { id: 'split', label: 'Split Studio' },
    { id: 'canvas-only', label: 'Canvas' },
    { id: 'matrix-only', label: 'Adjacency' },
    { id: 'incidence-only', label: 'Incidence' },
    { id: 'edges-only', label: 'Edges' }
  ];

  return (
    <header className="h-12 px-3 bg-[#111214] border-b border-zinc-800 flex items-center justify-between gap-3 select-none shrink-0 text-zinc-300">
      {/* Left: Brand + Graph Selection */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-sm text-zinc-100 tracking-tight pl-1 pr-2 border-r border-zinc-800">
          Cireu
        </span>

        <select
          value={activeGraph.id}
          onChange={e => {
            const found = savedGraphs.find(g => g.id === e.target.value);
            if (found) onSelectGraph(found);
          }}
          aria-label="Select graph"
          className="bg-zinc-900 border border-zinc-700/80 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 max-w-[170px] sm:max-w-[210px] truncate"
        >
          {savedGraphs.map(g => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.nodes.length}V, {g.edges.length}E)
            </option>
          ))}
        </select>

        <input
          type="text"
          value={activeGraph.name}
          onChange={e => onRenameGraph(e.target.value)}
          aria-label="Rename graph"
          className="hidden md:block bg-transparent hover:bg-zinc-900/50 focus:bg-zinc-900 px-2 py-1 rounded border border-transparent focus:border-zinc-700 text-xs text-zinc-200 focus:outline-none w-40 truncate"
          title="Click to rename"
        />

        <button
          onClick={onCreateNewGraph}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
          title="Create New Graph"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Center: View Switcher */}
      <div className="hidden md:flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-xs">
        {viewModes.map(mode => {
          const active = viewMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`px-2.5 py-1 rounded transition-colors ${
                active
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* Right: Storage & Export */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenLibraryModal}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
        >
          <FolderKanban className="w-3.5 h-3.5 text-zinc-400" />
          <span>Saved ({savedGraphs.length})</span>
        </button>

        <button
          onClick={onExportAll}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
          title="Export JSON"
        >
          <Download className="w-3.5 h-3.5 text-zinc-400" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
