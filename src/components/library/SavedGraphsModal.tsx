import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  Download,
  Trash2,
  Plus
} from 'lucide-react';
import { GraphData } from '../../types/graph';

interface SavedGraphsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedGraphs: GraphData[];
  activeGraphId: string;
  onSelectGraph: (graph: GraphData) => void;
  onDeleteGraph: (id: string) => void;
  onCreateNewGraph: () => void;
  onExportAll: () => void;
  onExportSingle: (graph: GraphData) => void;
  onImportJsonString: (jsonStr: string) => { success: boolean; message: string };
}

export const SavedGraphsModal: React.FC<SavedGraphsModalProps> = ({
  isOpen,
  onClose,
  savedGraphs,
  activeGraphId,
  onSelectGraph,
  onDeleteGraph,
  onCreateNewGraph,
  onExportAll,
  onExportSingle,
  onImportJsonString
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        const res = onImportJsonString(content);
        setImportStatus(res.message);
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-2xl rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col max-h-[80vh] text-zinc-300 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <span className="font-semibold text-zinc-100">Saved Graphs</span>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/60">
          <button
            onClick={() => {
              onCreateNewGraph();
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Graph</span>
          </button>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
            <button
              onClick={onExportAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All</span>
            </button>
          </div>
        </div>

        {importStatus && (
          <div className="px-4 py-1.5 bg-zinc-800 text-zinc-300 border-b border-zinc-700 text-[11px]">
            {importStatus}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {savedGraphs.map(g => {
            const isActive = g.id === activeGraphId;
            return (
              <div
                key={g.id}
                className={`p-3 rounded border flex items-center justify-between transition-colors ${
                  isActive
                    ? 'bg-zinc-800/80 border-zinc-600 text-zinc-100'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200 text-xs truncate">{g.name}</span>
                    {isActive && (
                      <span className="text-[10px] text-zinc-400 font-mono">[active]</span>
                    )}
                  </div>
                  {g.description && (
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">{g.description}</p>
                  )}
                  <div className="text-[10px] text-zinc-500 font-mono mt-1">
                    {g.nodes.length} nodes • {g.edges.length} edges
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onExportSingle(g)}
                    title="Export as JSON"
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] border border-zinc-700"
                  >
                    Export
                  </button>

                  <button
                    onClick={() => {
                      onSelectGraph(g);
                      onClose();
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                      isActive
                        ? 'bg-zinc-700 text-zinc-200 border-zinc-600'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                    }`}
                  >
                    {isActive ? 'Loaded' : 'Load'}
                  </button>

                  <button
                    onClick={() => onDeleteGraph(g.id)}
                    title="Delete graph"
                    className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
