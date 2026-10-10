import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FolderOpen,
  Download,
  Upload,
  Trash2,
  Plus,
  Check,
  FileJson,
  HardDrive,
  Clock
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
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        const res = onImportJsonString(content);
        setImportStatus({
          type: res.success ? 'success' : 'error',
          text: res.message
        });
        setTimeout(() => setImportStatus(null), 4500);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="w-full max-w-3xl rounded-2xl bg-[#141517] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#18191c]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">
                    Local Graph Cache & Portable Archive
                  </h2>
                  <p className="text-xs text-zinc-400">
                    All graphs are automatically cached in browser storage. Export or import JSON archives anytime.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-b border-zinc-800/80 bg-[#141517]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onCreateNewGraph();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Empty Graph
                </button>
                <span className="text-xs font-mono text-zinc-500">
                  {savedGraphs.length} saved workspaces
                </span>
              </div>

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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  Import JSON File
                </button>
                <button
                  onClick={onExportAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Export All Cache (.json)
                </button>
              </div>
            </div>

            {/* Status Notification Banner */}
            {importStatus && (
              <div
                className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 ${
                  importStatus.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-300 border-b border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-b border-rose-500/30'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{importStatus.text}</span>
              </div>
            )}

            {/* Graph Cards Grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedGraphs.map(g => {
                const isActive = g.id === activeGraphId;
                return (
                  <motion.div
                    key={g.id}
                    layout
                    className={`group relative rounded-xl p-4 border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-zinc-900/95 border-orange-500/60 shadow-lg shadow-orange-500/5'
                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                          <span>{g.name}</span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-orange-500/20 text-orange-300 border border-orange-500/30">
                              Active
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onExportSingle(g)}
                            title="Export this graph as JSON"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                          >
                            <FileJson className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteGraph(g.id)}
                            title="Delete from local cache"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {g.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                          {g.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 mt-2">
                      <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {g.nodes.length}V
                        </span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {g.edges.length}E
                        </span>
                        <span className="flex items-center gap-1 text-zinc-500 text-[10px]">
                          <Clock className="w-3 h-3" />
                          {new Date(g.updatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          onSelectGraph(g);
                          onClose();
                        }}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-zinc-800 text-zinc-300'
                            : 'bg-orange-500/15 hover:bg-orange-500 text-orange-300 hover:text-white border border-orange-500/30'
                        }`}
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        {isActive ? 'Loaded' : 'Open'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
