import React from 'react';
import { motion } from 'framer-motion';
import {
  Share2,
  FolderKanban,
  Download,
  Upload,
  LayoutPanelLeft,
  Maximize2,
  Grid,
  Columns,
  ListTree,
  Plus,
  CheckCircle2,
  Copy
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
  onDuplicateGraph: () => void;
  onOpenLibraryModal: () => void;
  onExportAll: () => void;
  onQuickImportClick: () => void;
  lastSavedAt: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeGraph,
  savedGraphs,
  viewMode,
  setViewMode,
  onRenameGraph,
  onSelectGraph,
  onCreateNewGraph,
  onDuplicateGraph,
  onOpenLibraryModal,
  onExportAll,
  onQuickImportClick
}) => {
  const viewModes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'split', label: 'Split Studio', icon: <LayoutPanelLeft className="w-3.5 h-3.5" /> },
    { id: 'canvas-only', label: 'Canvas', icon: <Maximize2 className="w-3.5 h-3.5" /> },
    { id: 'matrix-only', label: 'Adjacency Matrix', icon: <Grid className="w-3.5 h-3.5" /> },
    { id: 'incidence-only', label: 'Incidence Matrix', icon: <Columns className="w-3.5 h-3.5" /> },
    { id: 'edges-only', label: 'Edge Table', icon: <ListTree className="w-3.5 h-3.5" /> }
  ];

  return (
    <header className="h-14 px-4 bg-[#141517] border-b border-zinc-800/90 flex items-center justify-between gap-3 select-none z-30 shrink-0">
      {/* Left: Brand + Active Graph Selector + Title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Brand Identity */}
        <div className="flex items-center gap-2.5 pr-3 border-r border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/15">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">Cireu</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-orange-400 border border-zinc-700">
                Graph Studio
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-none mt-0.5">
              Eulerian & Hamiltonian Topology
            </p>
          </div>
        </div>

        {/* Quick Preset & Saved Switcher */}
        <div className="flex items-center gap-2 min-w-0">
          <select
            value={activeGraph.id}
            onChange={e => {
              const found = savedGraphs.find(g => g.id === e.target.value);
              if (found) onSelectGraph(found);
            }}
            aria-label="Select saved or preset graph"
            className="bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-200 focus:outline-none focus:border-orange-500 transition-colors max-w-[180px] sm:max-w-[210px] truncate"
          >
            {savedGraphs.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.nodes.length}V, {g.edges.length}E)
              </option>
            ))}
          </select>

          {/* Editable Active Graph Title */}
          <input
            type="text"
            value={activeGraph.name}
            onChange={e => onRenameGraph(e.target.value)}
            aria-label="Rename active graph"
            className="hidden lg:block bg-transparent hover:bg-zinc-900/60 focus:bg-zinc-900 px-2.5 py-1 rounded-md border border-transparent focus:border-zinc-700 text-xs font-semibold text-zinc-100 focus:outline-none w-48 truncate transition-colors"
            title="Click to rename active graph"
          />

          <button
            onClick={onCreateNewGraph}
            title="Create New Graph"
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={onDuplicateGraph}
            title="Duplicate Current Graph in Cache"
            className="hidden md:flex p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Workspace View Switcher */}
      <div className="hidden md:flex items-center p-1 rounded-xl bg-[#0c0d0e] border border-zinc-800/90">
        {viewModes.map(mode => {
          const active = viewMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="headerViewModePill"
                  className="absolute inset-0 bg-zinc-800/90 border border-zinc-700/80 rounded-lg shadow-sm"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span className={`relative z-10 ${active ? 'text-orange-400' : ''}`}>
                {mode.icon}
              </span>
              <span className="relative z-10">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Cache Status & Import / Export Actions */}
      <div className="flex items-center gap-2">
        <div
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400"
          title="All changes automatically persist to browser local cache"
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Cached Locally</span>
        </div>

        <button
          onClick={onOpenLibraryModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-colors"
        >
          <FolderKanban className="w-3.5 h-3.5 text-orange-400" />
          <span>Saved Cache ({savedGraphs.length})</span>
        </button>

        <button
          onClick={onQuickImportClick}
          title="Import Graph Archive (.json)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Import</span>
        </button>

        <button
          onClick={onExportAll}
          title="Export All Saved Graphs as JSON File"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export File</span>
        </button>
      </div>
    </header>
  );
};
