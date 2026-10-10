import React, { useRef, useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 font-sans">
      <div className="w-full max-w-2xl bg-white border border-gray-400 flex flex-col max-h-[80vh] text-gray-800 text-xs shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-300 bg-gray-200">
          <span className="font-bold text-gray-900 text-sm">Saved Graphs</span>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-black font-bold text-base px-1"
          >
            ×
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-300 bg-orange-500">
          <button
            onClick={() => {
              onCreateNewGraph();
              onClose();
            }}
            className="px-2 py-0.5 bg-gray-200 hover:bg-white text-gray-900 border border-gray-400 font-bold"
          >
            + New Graph
          </button>

          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-0.5 bg-orange-500 hover:bg-white text-gray-800 border border-gray-400"
            >
              Import JSON
            </button>
            <button
              onClick={onExportAll}
              className="px-2 py-0.5 bg-orange-500 hover:bg-white text-gray-800 border border-gray-400"
            >
              Export All
            </button>
          </div>
        </div>

        {importStatus && (
          <div className="px-3 py-1 bg-yellow-50 text-yellow-900 border-b border-yellow-200 text-[11px]">
            {importStatus}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {savedGraphs.map(g => {
            const isActive = g.id === activeGraphId;
            return (
              <div
                key={g.id}
                className={`p-2.5 border flex items-center justify-between ${
                  isActive
                    ? 'bg-blue-50 border-blue-400 text-gray-900'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-xs truncate">{g.name}</span>
                    {isActive && (
                      <span className="text-[10px] text-blue-700 font-bold font-mono">[active]</span>
                    )}
                  </div>
                  {g.description && (
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{g.description}</p>
                  )}
                  <div className="text-[10px] text-gray-500 font-mono mt-1">
                    {g.nodes.length} nodes • {g.edges.length} edges
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onExportSingle(g)}
                    title="Export as JSON"
                    className="px-2 py-0.5 bg-orange-500 hover:bg-white text-gray-700 text-[11px] border border-gray-400"
                  >
                    Export
                  </button>

                  <button
                    onClick={() => {
                      onSelectGraph(g);
                      onClose();
                    }}
                    className={`px-2 py-0.5 text-[11px] font-bold border ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-orange-500 hover:bg-white text-gray-800 border-gray-400'
                    }`}
                  >
                    {isActive ? 'Loaded' : 'Load'}
                  </button>

                  <button
                    onClick={() => onDeleteGraph(g.id)}
                    title="Delete graph"
                    className="px-1 text-gray-400 hover:text-red-700 font-bold"
                  >
                    ×
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
