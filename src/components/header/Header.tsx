import React from 'react';

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
    <header className="h-10 px-3 bg-gray-200 border-b border-gray-400 flex items-center justify-between gap-2 select-none shrink-0 text-gray-800 text-xs font-sans">
      {/* Left: Brand + Graph Selection */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-bold text-sm text-gray-900 tracking-tight pr-2 border-r border-gray-400">
          Cireu
        </span>

        <select
          value={activeGraph.id}
          onChange={e => {
            const found = savedGraphs.find(g => g.id === e.target.value);
            if (found) onSelectGraph(found);
          }}
          aria-label="Select graph"
          className="bg-white border border-gray-400 px-1.5 py-0.5 text-xs text-gray-900 max-w-[160px] sm:max-w-[200px] truncate"
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
          className="hidden md:block bg-white px-1.5 py-0.5 border border-gray-400 text-xs text-gray-900 w-36 truncate"
          title="Click to rename"
        />

        <button
          onClick={onCreateNewGraph}
          className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-white text-gray-800 border border-gray-400 shadow-sm"
          title="Create New Graph"
        >
          + New
        </button>
      </div>

      {/* Center: View Switcher */}
      <div className="hidden md:flex items-center border border-gray-400 bg-gray-300">
        {viewModes.map(mode => {
          const active = viewMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`px-2 py-0.5 text-xs ${
                active
                  ? 'bg-white text-gray-900 font-bold border-r border-gray-400 last:border-r-0'
                  : 'text-gray-700 hover:bg-gray-100 border-r border-gray-300 last:border-r-0'
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
          className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-white text-gray-800 border border-gray-400 shadow-sm"
        >
          Saved ({savedGraphs.length})
        </button>

        <button
          onClick={onExportAll}
          className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-white text-gray-800 border border-gray-400 shadow-sm"
          title="Export JSON"
        >
          Export
        </button>
      </div>
    </header>
  );
};
