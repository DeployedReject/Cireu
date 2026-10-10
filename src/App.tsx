import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  GraphData,
  GraphNode,
  GraphEdge,
  CanvasTool,
  ViewMode,
  FullAnalysisResult
} from './types/graph';
import {
  getSavedGraphs,
  getActiveGraphId,
  saveGraph,
  deleteGraph,
  exportLibraryToJson,
  exportSingleGraphToJson,
  importGraphsFromJson
} from './storage/graphStorage';
import { analyzeEulerian } from './algorithms/eulerian';
import { analyzeHamiltonian } from './algorithms/hamiltonian';
import { computeLayout } from './algorithms/layout';
import { Header } from './components/header/Header';
import { GraphCanvas } from './components/canvas/GraphCanvas';
import { AdjacencyMatrixTable } from './components/tables/AdjacencyMatrixTable';
import { IncidenceTable } from './components/tables/IncidenceTable';
import { EdgeListTable } from './components/tables/EdgeListTable';
import { CircuitAnalysisPanel } from './components/analysis/CircuitAnalysisPanel';
import { SavedGraphsModal } from './components/library/SavedGraphsModal';

const VERTEX_PALETTE = [
  '#3b82f6',
  '#f6821f',
  '#10b981',
  '#ec4899',
  '#8b5cf6',
  '#eab308',
  '#06b6d4'
];

export function App() {
  const [savedGraphs, setSavedGraphs] = useState<GraphData[]>(() => getSavedGraphs());
  const [activeGraph, setActiveGraph] = useState<GraphData>(() => {
    const list = getSavedGraphs();
    const targetId = getActiveGraphId();
    return list.find(g => g.id === targetId) || list[0];
  });

  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [bottomDockTab, setBottomDockTab] = useState<'matrix' | 'incidence' | 'edges'>('matrix');
  const [isBottomDockOpen, setIsBottomDockOpen] = useState<boolean>(true);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Playback highlight states
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<string[]>([]);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [activeStepEdgeId, setActiveStepEdgeId] = useState<string | undefined>(undefined);
  const [activeStepNodeId, setActiveStepNodeId] = useState<string | undefined>(undefined);
  const [activeFromNodeId, setActiveFromNodeId] = useState<string | undefined>(undefined);
  const [playbackMode, setPlaybackMode] = useState<'eulerian' | 'hamiltonian' | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Persist active graph updates to local cache
  const commitGraphUpdate = useCallback((updated: GraphData) => {
    const stamped = { ...updated, updatedAt: Date.now() };
    setActiveGraph(stamped);
    saveGraph(stamped);
    setSavedGraphs(getSavedGraphs());
  }, []);

  // Live Eulerian & Hamiltonian analysis
  const analysis: FullAnalysisResult = useMemo(() => {
    const eulerian = analyzeEulerian(activeGraph.nodes, activeGraph.edges);
    const hamiltonian = analyzeHamiltonian(activeGraph.nodes, activeGraph.edges);
    return {
      eulerian,
      hamiltonian,
      timestamp: activeGraph.updatedAt
    };
  }, [activeGraph.nodes, activeGraph.edges, activeGraph.updatedAt]);

  // Generate next short alphabetic/numeric ID for new vertices
  const getNextVertexId = (existingNodes: GraphNode[]): string => {
    const usedIds = new Set(existingNodes.map(n => n.id));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < alphabet.length; i++) {
      if (!usedIds.has(alphabet[i])) return alphabet[i];
    }
    let counter = existingNodes.length + 1;
    while (usedIds.has(`V${counter}`)) {
      counter++;
    }
    return `V${counter}`;
  };

  // Node operations
  const handleAddNode = (x?: number, y?: number) => {
    const newId = getNextVertexId(activeGraph.nodes);
    const idx = activeGraph.nodes.length;
    const defaultX = x ?? Math.round(380 + 140 * Math.cos((2 * Math.PI * idx) / 8));
    const defaultY = y ?? Math.round(280 + 140 * Math.sin((2 * Math.PI * idx) / 8));

    const newNode: GraphNode = {
      id: newId,
      label: `Vertex ${newId}`,
      x: defaultX,
      y: defaultY,
      color: VERTEX_PALETTE[idx % VERTEX_PALETTE.length]
    };

    commitGraphUpdate({
      ...activeGraph,
      nodes: [...activeGraph.nodes, newNode]
    });
  };

  const handleUpdateNode = (id: string, patch: Partial<GraphNode>) => {
    commitGraphUpdate({
      ...activeGraph,
      nodes: activeGraph.nodes.map(n => (n.id === id ? { ...n, ...patch } : n))
    });
  };

  const handleDeleteNode = (id: string) => {
    commitGraphUpdate({
      ...activeGraph,
      nodes: activeGraph.nodes.filter(n => n.id !== id),
      edges: activeGraph.edges.filter(e => e.source !== id && e.target !== id)
    });
  };

  const handleBulkUpdateNodes = (nodes: GraphNode[]) => {
    commitGraphUpdate({
      ...activeGraph,
      nodes
    });
  };

  // Edge operations
  const handleAddEdge = (
    sourceRaw: string,
    targetRaw: string,
    directed: boolean,
    label?: string
  ) => {
    const source = sourceRaw.trim();
    const target = targetRaw.trim();
    if (!source || !target) return;

    let updatedNodes = [...activeGraph.nodes];
    const nodeIds = new Set(updatedNodes.map(n => n.id));

    if (!nodeIds.has(source)) {
      updatedNodes.push({
        id: source,
        label: `Vertex ${source}`,
        x: 320 + Math.round(Math.random() * 180),
        y: 240 + Math.round(Math.random() * 160),
        color: VERTEX_PALETTE[updatedNodes.length % VERTEX_PALETTE.length]
      });
      nodeIds.add(source);
    }

    if (!nodeIds.has(target)) {
      updatedNodes.push({
        id: target,
        label: `Vertex ${target}`,
        x: 360 + Math.round(Math.random() * 180),
        y: 260 + Math.round(Math.random() * 160),
        color: VERTEX_PALETTE[updatedNodes.length % VERTEX_PALETTE.length]
      });
      nodeIds.add(target);
    }

    const newEdge: GraphEdge = {
      id: `e${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 4)}`,
      source,
      target,
      directed,
      label
    };

    commitGraphUpdate({
      ...activeGraph,
      nodes: updatedNodes,
      edges: [...activeGraph.edges, newEdge]
    });
  };

  const handleUpdateEdge = (id: string, patch: Partial<GraphEdge>) => {
    commitGraphUpdate({
      ...activeGraph,
      edges: activeGraph.edges.map(e => (e.id === id ? { ...e, ...patch } : e))
    });
  };

  const handleDeleteEdge = (id: string) => {
    commitGraphUpdate({
      ...activeGraph,
      edges: activeGraph.edges.filter(e => e.id !== id)
    });
  };

  // Adjacency Matrix cell edit handler
  const handleSetEdgeCountBetween = (
    sourceId: string,
    targetId: string,
    newCount: number,
    directed: boolean
  ) => {
    const count = Math.max(0, Math.min(6, newCount));

    // Remove existing edges matching this cell
    const remainingEdges = activeGraph.edges.filter(e => {
      if (directed) {
        return !(e.directed && e.source === sourceId && e.target === targetId);
      } else {
        const matchesForward = e.source === sourceId && e.target === targetId;
        const matchesBackward = e.source === targetId && e.target === sourceId;
        return !(matchesForward || matchesBackward);
      }
    });

    const addedEdges: GraphEdge[] = [];
    for (let i = 0; i < count; i++) {
      addedEdges.push({
        id: `e_${sourceId}_${targetId}_${i + 1}_${Math.random().toString(36).slice(2, 5)}`,
        source: sourceId,
        target: targetId,
        directed
      });
    }

    commitGraphUpdate({
      ...activeGraph,
      edges: [...remainingEdges, ...addedEdges]
    });
  };

  // Bulk text edge parser (e.g. "A - B, B -> C")
  const handleParseBulkEdgeText = (text: string) => {
    const tokens = text
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (tokens.length === 0) return;

    const nodeMap = new Map<string, GraphNode>();
    activeGraph.nodes.forEach(n => nodeMap.set(n.id, n));

    const newEdges: GraphEdge[] = [];

    tokens.forEach((line, idx) => {
      // Match "u -> v" or "u - v" or "u v"
      const directedMatch = line.match(/^([^\s\-><]+)\s*->\s*([^\s\-><]+)$/);
      const undirectedMatch = line.match(/^([^\s\-><]+)\s*(?:-|—|--|\s)\s*([^\s\-><]+)$/);

      const match = directedMatch || undirectedMatch;
      if (!match) return;

      const u = match[1].trim();
      const v = match[2].trim();
      const isDir = Boolean(directedMatch);

      if (!nodeMap.has(u)) {
        nodeMap.set(u, {
          id: u,
          label: `Vertex ${u}`,
          x: 400,
          y: 300,
          color: VERTEX_PALETTE[nodeMap.size % VERTEX_PALETTE.length]
        });
      }
      if (!nodeMap.has(v)) {
        nodeMap.set(v, {
          id: v,
          label: `Vertex ${v}`,
          x: 400,
          y: 300,
          color: VERTEX_PALETTE[nodeMap.size % VERTEX_PALETTE.length]
        });
      }

      newEdges.push({
        id: `eb_${idx + 1}_${Math.random().toString(36).slice(2, 5)}`,
        source: u,
        target: v,
        directed: isDir
      });
    });

    if (newEdges.length > 0) {
      const laidOutNodes = computeLayout(
        Array.from(nodeMap.values()),
        newEdges,
        'circle',
        800,
        520
      );
      commitGraphUpdate({
        ...activeGraph,
        nodes: laidOutNodes,
        edges: newEdges
      });
      triggerToast(`Parsed ${laidOutNodes.length} vertices and ${newEdges.length} edges`);
    }
  };

  const handleConvertAllEdgesDirection = (directed: boolean) => {
    commitGraphUpdate({
      ...activeGraph,
      edges: activeGraph.edges.map(e => ({ ...e, directed }))
    });
    triggerToast(`Converted all edges to ${directed ? 'Directed' : 'Undirected'}`);
  };

  // Library / Workspace Management
  const handleCreateNewGraph = () => {
    const newGraph: GraphData = {
      id: `graph-${Date.now()}`,
      name: `Untitled Graph #${savedGraphs.length + 1}`,
      description: 'Custom interactive graph workspace.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: [
        { id: 'A', label: 'Vertex A', x: 300, y: 200, color: '#3b82f6' },
        { id: 'B', label: 'Vertex B', x: 520, y: 200, color: '#f6821f' },
        { id: 'C', label: 'Vertex C', x: 410, y: 380, color: '#10b981' }
      ],
      edges: [
        { id: 'e1', source: 'A', target: 'B', directed: false },
        { id: 'e2', source: 'B', target: 'C', directed: false },
        { id: 'e3', source: 'C', target: 'A', directed: false }
      ]
    };
    commitGraphUpdate(newGraph);
    triggerToast(`Created "${newGraph.name}"`);
  };

  const handleDeleteSavedGraph = (id: string) => {
    const remaining = deleteGraph(id);
    setSavedGraphs(remaining);
    if (activeGraph.id === id) {
      setActiveGraph(remaining[0]);
    }
    triggerToast('Removed graph from local cache');
  };

  // File Download Helper
  const downloadJsonString = (jsonStr: string, filename: string) => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const json = exportLibraryToJson(savedGraphs);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadJsonString(json, `cireu-graph-cache-${dateStr}.json`);
    triggerToast(`Exported ${savedGraphs.length} graphs to JSON file`);
  };

  const handleExportSingle = (graph: GraphData) => {
    const json = exportSingleGraphToJson(graph);
    const safeName = graph.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadJsonString(json, `${safeName || 'graph'}.json`);
    triggerToast(`Exported "${graph.name}"`);
  };

  const handleImportJsonString = (jsonStr: string) => {
    const res = importGraphsFromJson(jsonStr);
    if (res.success && res.graphs) {
      setSavedGraphs(res.graphs);
      const activeId = getActiveGraphId();
      const chosen = res.graphs.find(g => g.id === activeId) || res.graphs[0];
      if (chosen) setActiveGraph(chosen);
      triggerToast(res.message);
    }
    return { success: res.success, message: res.message };
  };

  const handleHighlightTrace = useCallback(
    (
      edgeIds: string[],
      nodeIds: string[],
      activeEdge?: string,
      activeNode?: string,
      mode?: 'eulerian' | 'hamiltonian' | null,
      activeFromNode?: string
    ) => {
      setHighlightedEdgeIds(edgeIds);
      setHighlightedNodeIds(nodeIds);
      setActiveStepEdgeId(activeEdge);
      setActiveStepNodeId(activeNode);
      setActiveFromNodeId(activeFromNode);
      setPlaybackMode(mode ?? null);
    },
    []
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0e0f11] text-zinc-200 overflow-hidden">
      {/* Top Navigation Header */}
      <Header
        activeGraph={activeGraph}
        savedGraphs={savedGraphs}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onRenameGraph={newName => commitGraphUpdate({ ...activeGraph, name: newName })}
        onSelectGraph={g => {
          setActiveGraph(g);
          saveGraph(g);
        }}
        onCreateNewGraph={handleCreateNewGraph}
        onOpenLibraryModal={() => setIsLibraryModalOpen(true)}
        onExportAll={handleExportAll}
      />

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Interactive Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {viewMode === 'split' && (
            <>
              {/* Upper Canvas Area */}
              <div className="flex-1 min-h-[260px] relative overflow-hidden">
                <GraphCanvas
                  nodes={activeGraph.nodes}
                  edges={activeGraph.edges}
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  onAddNode={handleAddNode}
                  onUpdateNode={handleUpdateNode}
                  onDeleteNode={handleDeleteNode}
                  onAddEdge={handleAddEdge}
                  onUpdateEdge={handleUpdateEdge}
                  onDeleteEdge={handleDeleteEdge}
                  onBulkUpdateNodes={handleBulkUpdateNodes}
                  degreeInfo={analysis.eulerian.degreeInfo}
                  highlightedEdgeIds={highlightedEdgeIds}
                  activeStepEdgeId={activeStepEdgeId}
                  highlightedNodeIds={highlightedNodeIds}
                  activeStepNodeId={activeStepNodeId}
                  activeFromNodeId={activeFromNodeId}
                  playbackMode={playbackMode}
                />
              </div>

              {/* Lower Synchronized Table Dock */}
              <div
                className={`border-t border-zinc-800 bg-[#111214] flex flex-col transition-all duration-200 ${
                  isBottomDockOpen ? 'h-[290px]' : 'h-9'
                }`}
              >
                {/* Dock Header Bar */}
                <div className="h-9 px-3 border-b border-zinc-800 flex items-center justify-between select-none shrink-0 bg-zinc-900/50">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setBottomDockTab('matrix');
                        setIsBottomDockOpen(true);
                      }}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        bottomDockTab === 'matrix' && isBottomDockOpen
                          ? 'bg-zinc-800 text-zinc-100 font-medium'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Adjacency
                    </button>

                    <button
                      onClick={() => {
                        setBottomDockTab('incidence');
                        setIsBottomDockOpen(true);
                      }}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        bottomDockTab === 'incidence' && isBottomDockOpen
                          ? 'bg-zinc-800 text-zinc-100 font-medium'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Incidence
                    </button>

                    <button
                      onClick={() => {
                        setBottomDockTab('edges');
                        setIsBottomDockOpen(true);
                      }}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        bottomDockTab === 'edges' && isBottomDockOpen
                          ? 'bg-zinc-800 text-zinc-100 font-medium'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Edges ({activeGraph.edges.length})
                    </button>
                  </div>

                  <button
                    onClick={() => setIsBottomDockOpen(o => !o)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    title={isBottomDockOpen ? 'Collapse' : 'Expand'}
                  >
                    {isBottomDockOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Dock Body */}
                {isBottomDockOpen && (
                  <div className="flex-1 overflow-hidden">
                    {bottomDockTab === 'matrix' ? (
                      <AdjacencyMatrixTable
                        nodes={activeGraph.nodes}
                        edges={activeGraph.edges}
                        onAddNode={() => handleAddNode()}
                        onDeleteNode={handleDeleteNode}
                        onUpdateNode={handleUpdateNode}
                        onSetEdgeCountBetween={handleSetEdgeCountBetween}
                        onClearAllEdges={() =>
                          commitGraphUpdate({ ...activeGraph, edges: [] })
                        }
                      />
                    ) : bottomDockTab === 'incidence' ? (
                      <IncidenceTable
                        nodes={activeGraph.nodes}
                        edges={activeGraph.edges}
                        onAddEdge={handleAddEdge}
                        onUpdateEdge={handleUpdateEdge}
                        onDeleteEdge={handleDeleteEdge}
                        onSelectEdge={id => {
                          if (id) {
                            setHighlightedEdgeIds([id]);
                          } else {
                            setHighlightedEdgeIds([]);
                          }
                        }}
                      />
                    ) : (
                      <EdgeListTable
                        nodes={activeGraph.nodes}
                        edges={activeGraph.edges}
                        onAddEdge={handleAddEdge}
                        onUpdateEdge={handleUpdateEdge}
                        onDeleteEdge={handleDeleteEdge}
                        onParseBulkEdgeText={handleParseBulkEdgeText}
                        onConvertAllEdgesDirection={handleConvertAllEdgesDirection}
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {viewMode === 'canvas-only' && (
            <div className="flex-1 relative overflow-hidden">
              <GraphCanvas
                nodes={activeGraph.nodes}
                edges={activeGraph.edges}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                onAddNode={handleAddNode}
                onUpdateNode={handleUpdateNode}
                onDeleteNode={handleDeleteNode}
                onAddEdge={handleAddEdge}
                onUpdateEdge={handleUpdateEdge}
                onDeleteEdge={handleDeleteEdge}
                onBulkUpdateNodes={handleBulkUpdateNodes}
                degreeInfo={analysis.eulerian.degreeInfo}
                highlightedEdgeIds={highlightedEdgeIds}
                activeStepEdgeId={activeStepEdgeId}
                highlightedNodeIds={highlightedNodeIds}
                activeStepNodeId={activeStepNodeId}
                activeFromNodeId={activeFromNodeId}
                playbackMode={playbackMode}
              />
            </div>
          )}

          {viewMode === 'matrix-only' && (
            <div className="flex-1 overflow-hidden">
              <AdjacencyMatrixTable
                nodes={activeGraph.nodes}
                edges={activeGraph.edges}
                onAddNode={() => handleAddNode()}
                onDeleteNode={handleDeleteNode}
                onUpdateNode={handleUpdateNode}
                onSetEdgeCountBetween={handleSetEdgeCountBetween}
                onClearAllEdges={() => commitGraphUpdate({ ...activeGraph, edges: [] })}
              />
            </div>
          )}

          {viewMode === 'incidence-only' && (
            <div className="flex-1 overflow-hidden">
              <IncidenceTable
                nodes={activeGraph.nodes}
                edges={activeGraph.edges}
                onAddEdge={handleAddEdge}
                onUpdateEdge={handleUpdateEdge}
                onDeleteEdge={handleDeleteEdge}
                onSelectEdge={id => {
                  if (id) {
                    setHighlightedEdgeIds([id]);
                  } else {
                    setHighlightedEdgeIds([]);
                  }
                }}
              />
            </div>
          )}

          {viewMode === 'edges-only' && (
            <div className="flex-1 overflow-hidden">
              <EdgeListTable
                nodes={activeGraph.nodes}
                edges={activeGraph.edges}
                onAddEdge={handleAddEdge}
                onUpdateEdge={handleUpdateEdge}
                onDeleteEdge={handleDeleteEdge}
                onParseBulkEdgeText={handleParseBulkEdgeText}
                onConvertAllEdgesDirection={handleConvertAllEdgesDirection}
              />
            </div>
          )}
        </div>

        {/* Right Diagnostic & Playback Sidebar */}
        <aside className="w-[360px] lg:w-[400px] shrink-0 h-full overflow-hidden">
          <CircuitAnalysisPanel
            nodes={activeGraph.nodes}
            analysis={analysis}
            onHighlightTrace={handleHighlightTrace}
          />
        </aside>
      </div>

      {/* Saved Graphs & Export/Import Modal */}
      <SavedGraphsModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        savedGraphs={savedGraphs}
        activeGraphId={activeGraph.id}
        onSelectGraph={g => {
          setActiveGraph(g);
          saveGraph(g);
        }}
        onDeleteGraph={handleDeleteSavedGraph}
        onCreateNewGraph={handleCreateNewGraph}
        onExportAll={handleExportAll}
        onExportSingle={handleExportSingle}
        onImportJsonString={handleImportJsonString}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-200"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
