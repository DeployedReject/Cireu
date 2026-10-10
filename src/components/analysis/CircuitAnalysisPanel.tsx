import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Route,
  Compass,
  Activity,
  ChevronRight,
  Clock,
  Cpu
} from 'lucide-react';
import {
  GraphNode,
  FullAnalysisResult
} from '../../types/graph';

interface CircuitAnalysisPanelProps {
  nodes: GraphNode[];
  analysis: FullAnalysisResult;
  onHighlightTrace: (
    edgeIds: string[],
    nodeIds: string[],
    activeEdgeId?: string,
    activeNodeId?: string,
    mode?: 'eulerian' | 'hamiltonian' | null,
    activeFromNodeId?: string
  ) => void;
}

export const CircuitAnalysisPanel: React.FC<CircuitAnalysisPanelProps> = ({
  nodes,
  analysis,
  onHighlightTrace
}) => {
  const [activeTab, setActiveTab] = useState<'eulerian' | 'hamiltonian' | 'degrees'>('eulerian');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(-1);
  const [speedMs, setSpeedMs] = useState<number>(750);

  // Selected Hamiltonian variant (circuit vs path and index)
  const [hamVariantType, setHamVariantType] = useState<'circuit' | 'path'>('circuit');
  const [hamVariantIdx, setHamVariantIdx] = useState<number>(0);

  const { eulerian, hamiltonian } = analysis;

  // Automatically pick 'path' if Hamiltonian has no circuit but has paths
  useEffect(() => {
    if (hamiltonian.hasHamiltonianCircuit) {
      setHamVariantType('circuit');
      setHamVariantIdx(0);
    } else if (hamiltonian.hasHamiltonianPath) {
      setHamVariantType('path');
      setHamVariantIdx(0);
    }
  }, [hamiltonian.hasHamiltonianCircuit, hamiltonian.hasHamiltonianPath, analysis.timestamp]);

  // Stop playback when graph changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentStepIdx(-1);
    onHighlightTrace([], [], undefined, undefined, null);
  }, [analysis.timestamp]);

  // Active sequence of edges and nodes based on current tab & variant
  const activeTrace = React.useMemo(() => {
    if (activeTab === 'eulerian') {
      return {
        mode: 'eulerian' as const,
        nodes: eulerian.pathNodes,
        edges: eulerian.pathEdges,
        steps: eulerian.detailedSteps.map(s => ({
          step: s.step,
          edgeId: s.edgeId,
          fromNodeId: s.fromNodeId,
          nodeId: s.toNodeId,
          edgesSoFar: eulerian.pathEdges.slice(0, s.step),
          nodesSoFar: eulerian.pathNodes.slice(0, s.step + 1),
          note: s.note
        }))
      };
    } else {
      const list =
        hamVariantType === 'circuit' ? hamiltonian.circuits : hamiltonian.paths;
      const chosen = list[hamVariantIdx] || list[0];
      if (!chosen) {
        return {
          mode: 'hamiltonian' as const,
          nodes: [],
          edges: [],
          steps: []
        };
      }
      const steps = chosen.edges.map((edgeId, idx) => {
        const fromId = chosen.nodes[idx];
        const toId = chosen.nodes[idx + 1];
        return {
          step: idx + 1,
          edgeId,
          fromNodeId: fromId,
          nodeId: toId,
          edgesSoFar: chosen.edges.slice(0, idx + 1),
          nodesSoFar: chosen.nodes.slice(0, idx + 2),
          note: `Step ${idx + 1}: Visit ${fromId} → ${toId} via edge [${edgeId}]`
        };
      });
      return {
        mode: 'hamiltonian' as const,
        nodes: chosen.nodes,
        edges: chosen.edges,
        steps
      };
    }
  }, [activeTab, eulerian, hamiltonian, hamVariantType, hamVariantIdx]);

  // Step timer loop
  useEffect(() => {
    if (!isPlaying) return;
    if (activeTrace.steps.length === 0) {
      setIsPlaying(false);
      return;
    }

    const timer = setInterval(() => {
      setCurrentStepIdx(prev => {
        const next = prev + 1;
        if (next >= activeTrace.steps.length) {
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, speedMs);

    return () => clearInterval(timer);
  }, [isPlaying, speedMs, activeTrace.steps.length]);

  // Sync currentStepIdx with canvas highlights
  useEffect(() => {
    if (currentStepIdx < 0 || currentStepIdx >= activeTrace.steps.length) {
      return;
    }
    const stepObj = activeTrace.steps[currentStepIdx];
    onHighlightTrace(
      stepObj.edgesSoFar,
      stepObj.nodesSoFar,
      stepObj.edgeId,
      stepObj.nodeId,
      activeTrace.mode,
      stepObj.fromNodeId
    );
  }, [currentStepIdx, activeTrace]);

  const handleShowFullTrace = (tab: 'eulerian' | 'hamiltonian') => {
    setIsPlaying(false);
    setActiveTab(tab);
    if (tab === 'eulerian') {
      if (eulerian.pathEdges.length > 0) {
        setCurrentStepIdx(eulerian.pathEdges.length - 1);
        onHighlightTrace(eulerian.pathEdges, eulerian.pathNodes, undefined, undefined, 'eulerian');
      }
    } else {
      const list =
        hamVariantType === 'circuit' ? hamiltonian.circuits : hamiltonian.paths;
      const chosen = list[hamVariantIdx] || list[0];
      if (chosen) {
        setCurrentStepIdx(chosen.edges.length - 1);
        onHighlightTrace(chosen.edges, chosen.nodes, undefined, undefined, 'hamiltonian');
      }
    }
  };

  const handleStartPlayback = () => {
    if (activeTrace.steps.length === 0) return;
    if (currentStepIdx >= activeTrace.steps.length - 1 || currentStepIdx < 0) {
      setCurrentStepIdx(0);
    }
    setIsPlaying(true);
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    setCurrentStepIdx(-1);
    onHighlightTrace([], [], undefined, undefined, null);
  };

  return (
    <div className="flex flex-col h-full bg-[#111214] border-l border-zinc-800/90 text-zinc-200 select-none overflow-hidden">
      {/* Top Status Summary Cards */}
      <div className="p-3.5 border-b border-zinc-800/90 bg-[#141517] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-orange-400" />
            Circuit & Path Diagnostic Engine
          </span>
          <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {hamiltonian.executionTimeMs}ms
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Eulerian Summary Card */}
          <button
            onClick={() => handleShowFullTrace('eulerian')}
            className={`text-left p-2.5 rounded-xl border transition-all ${
              activeTab === 'eulerian'
                ? 'bg-zinc-900/90 border-orange-500/50 shadow-lg shadow-orange-500/5'
                : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Eulerian Walk
              </span>
              {eulerian.hasEulerianCircuit ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : eulerian.hasEulerianPath ? (
                <AlertCircle className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
            <div className="text-xs font-semibold">
              {eulerian.hasEulerianCircuit ? (
                <span className="text-emerald-400">Circuit Exists</span>
              ) : eulerian.hasEulerianPath ? (
                <span className="text-sky-400">Path Only</span>
              ) : (
                <span className="text-zinc-500">None</span>
              )}
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-0.5 truncate">
              {eulerian.oddDegreeNodes.length === 0
                ? '0 odd vertices'
                : `${eulerian.oddDegreeNodes.length} odd vertices`}
            </div>
          </button>

          {/* Hamiltonian Summary Card */}
          <button
            onClick={() => handleShowFullTrace('hamiltonian')}
            className={`text-left p-2.5 rounded-xl border transition-all ${
              activeTab === 'hamiltonian'
                ? 'bg-zinc-900/90 border-orange-500/50 shadow-lg shadow-orange-500/5'
                : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Hamiltonian
              </span>
              {hamiltonian.hasHamiltonianCircuit ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : hamiltonian.hasHamiltonianPath ? (
                <AlertCircle className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
            <div className="text-xs font-semibold">
              {hamiltonian.hasHamiltonianCircuit ? (
                <span className="text-emerald-400">Circuit Exists</span>
              ) : hamiltonian.hasHamiltonianPath ? (
                <span className="text-sky-400">Path Only</span>
              ) : (
                <span className="text-zinc-500">None</span>
              )}
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-0.5 truncate">
              {hamiltonian.circuits.length} circuits • {hamiltonian.paths.length} paths
            </div>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-800 bg-[#141517] px-2">
        {[
          { id: 'eulerian', label: 'Eulerian', icon: <Route className="w-3.5 h-3.5" /> },
          { id: 'hamiltonian', label: 'Hamiltonian', icon: <Compass className="w-3.5 h-3.5" /> },
          { id: 'degrees', label: 'Degrees & Telemetry', icon: <Cpu className="w-3.5 h-3.5" /> }
        ].map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                active ? 'text-orange-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {active && (
                <motion.div
                  layoutId="analysisActiveTabIndicator"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-orange-500 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Step-by-Step Animator Bar (shown for Eulerian & Hamiltonian tabs when a valid walk exists) */}
      {activeTab !== 'degrees' && activeTrace.steps.length > 0 && (
        <div className="p-3 border-b border-zinc-800 bg-[#16181c] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={isPlaying ? () => setIsPlaying(false) : handleStartPlayback}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Animate Walk
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStepIdx(i => Math.max(0, i - 1));
                }}
                disabled={currentStepIdx <= 0}
                title="Previous Step"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 transition-colors"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStepIdx(i => Math.min(activeTrace.steps.length - 1, i + 1));
                }}
                disabled={currentStepIdx >= activeTrace.steps.length - 1}
                title="Next Step"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleResetPlayback}
                title="Clear Highlight"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-md border border-zinc-800">
              {[
                { label: '0.5x', ms: 1200 },
                { label: '1x', ms: 700 },
                { label: '2x', ms: 350 }
              ].map(sp => (
                <button
                  key={sp.label}
                  onClick={() => setSpeedMs(sp.ms)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    speedMs === sp.ms
                      ? 'bg-zinc-800 text-orange-400 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Scrubber */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-zinc-400">
              <span>
                {currentStepIdx >= 0
                  ? `Step ${currentStepIdx + 1} of ${activeTrace.steps.length}`
                  : `Ready (${activeTrace.steps.length} transitions)`}
              </span>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStepIdx(activeTrace.steps.length - 1);
                }}
                className="text-orange-400 hover:underline text-[10px]"
              >
                Show Complete Tour
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, activeTrace.steps.length - 1)}
              value={currentStepIdx < 0 ? 0 : currentStepIdx}
              onChange={e => {
                setIsPlaying(false);
                setCurrentStepIdx(Number(e.target.value));
              }}
              className="w-full accent-orange-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Current Step Note Banner */}
          {currentStepIdx >= 0 && activeTrace.steps[currentStepIdx] && (
            <motion.div
              key={currentStepIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-emerald-300"
            >
              {activeTrace.steps[currentStepIdx].note}
            </motion.div>
          )}
        </div>
      )}

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === 'eulerian' && (
            <motion.div
              key="eulerian-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4"
            >
              {/* Diagnostic Explanation Box */}
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  eulerian.hasEulerianCircuit
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : eulerian.hasEulerianPath
                    ? 'bg-sky-950/20 border-sky-500/30 text-sky-200'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  {eulerian.hasEulerianCircuit ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Eulerian Circuit Verified</span>
                    </>
                  ) : eulerian.hasEulerianPath ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Eulerian Path Verified (Open Walk)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>No Eulerian Circuit or Path</span>
                    </>
                  )}
                </div>
                <p className="text-zinc-300 text-[11px]">{eulerian.explanation}</p>
              </div>

              {/* Ordered Vertex Sequence */}
              {eulerian.pathNodes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      Traversal Sequence ({eulerian.pathEdges.length} edges)
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
                    {eulerian.pathNodes.map((nodeId, idx) => {
                      const isCurrent =
                        currentStepIdx >= 0 && idx === currentStepIdx + 1;
                      const isVisited = currentStepIdx >= 0 && idx <= currentStepIdx + 1;
                      return (
                        <React.Fragment key={`${nodeId}-${idx}`}>
                          <button
                            onClick={() => {
                              setIsPlaying(false);
                              setCurrentStepIdx(Math.max(0, idx - 1));
                            }}
                            className={`px-2 py-0.5 rounded font-mono text-xs transition-all ${
                              isCurrent
                                ? 'bg-emerald-500 text-zinc-950 font-bold scale-105 shadow'
                                : isVisited
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                          >
                            {nodeId}
                          </button>
                          {idx < eulerian.pathNodes.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-zinc-600" />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step-by-Step Edge Log */}
              {eulerian.detailedSteps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    Hierholzer Edge Steps
                  </h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {eulerian.detailedSteps.map((s, idx) => {
                      const isSelectedStep = currentStepIdx === idx;
                      return (
                        <button
                          key={s.step}
                          onClick={() => {
                            setIsPlaying(false);
                            setCurrentStepIdx(idx);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-[11px] font-mono flex items-center justify-between transition-colors ${
                            isSelectedStep
                              ? 'bg-orange-500/15 border-orange-500/40 text-orange-200'
                              : 'bg-zinc-900/40 border-zinc-800/70 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                          }`}
                        >
                          <span>
                            <strong className="text-zinc-300">#{s.step}</strong>: {s.fromNodeId} →{' '}
                            {s.toNodeId}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">
                            edge: {s.edgeId}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'hamiltonian' && (
            <motion.div
              key="hamiltonian-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4"
            >
              {/* Diagnostic Explanation Box */}
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  hamiltonian.hasHamiltonianCircuit
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : hamiltonian.hasHamiltonianPath
                    ? 'bg-sky-950/20 border-sky-500/30 text-sky-200'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  {hamiltonian.hasHamiltonianCircuit ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Hamiltonian Circuit Verified</span>
                    </>
                  ) : hamiltonian.hasHamiltonianPath ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Hamiltonian Path Only (Hypohamiltonian / Acyclic)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>No Hamiltonian Circuit or Path</span>
                    </>
                  )}
                </div>
                <p className="text-zinc-300 text-[11px]">{hamiltonian.explanation}</p>
              </div>

              {/* Theorem Checks (Dirac & Ore) */}
              {hamiltonian.diracConditionSatisfied !== undefined && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                    <div className="text-[10px] font-mono uppercase text-zinc-500">
                      Dirac's Theorem
                    </div>
                    <div className="text-xs font-semibold mt-0.5 flex items-center gap-1">
                      {hamiltonian.diracConditionSatisfied ? (
                        <span className="text-emerald-400">Satisfied (deg ≥ n/2)</span>
                      ) : (
                        <span className="text-zinc-400">Not met (Inconclusive)</span>
                      )}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                    <div className="text-[10px] font-mono uppercase text-zinc-500">
                      Ore's Theorem
                    </div>
                    <div className="text-xs font-semibold mt-0.5 flex items-center gap-1">
                      {hamiltonian.oreConditionSatisfied ? (
                        <span className="text-emerald-400">Satisfied (deg u+v ≥ n)</span>
                      ) : (
                        <span className="text-zinc-400">Not met (Inconclusive)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Toggle between Discovered Circuits and Paths */}
              {(hamiltonian.circuits.length > 0 || hamiltonian.paths.length > 0) && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
                    <button
                      onClick={() => {
                        setHamVariantType('circuit');
                        setHamVariantIdx(0);
                        setCurrentStepIdx(-1);
                      }}
                      disabled={hamiltonian.circuits.length === 0}
                      className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                        hamVariantType === 'circuit'
                          ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 disabled:opacity-40'
                      }`}
                    >
                      Circuits ({hamiltonian.circuits.length})
                    </button>
                    <button
                      onClick={() => {
                        setHamVariantType('path');
                        setHamVariantIdx(0);
                        setCurrentStepIdx(-1);
                      }}
                      disabled={hamiltonian.paths.length === 0}
                      className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                        hamVariantType === 'path'
                          ? 'bg-zinc-800 text-sky-400 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 disabled:opacity-40'
                      }`}
                    >
                      Paths ({hamiltonian.paths.length})
                    </button>
                  </div>

                  {/* List of Discovered Solutions */}
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {(hamVariantType === 'circuit'
                      ? hamiltonian.circuits
                      : hamiltonian.paths
                    ).map((sol, idx) => {
                      const isSelected = hamVariantIdx === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setHamVariantIdx(idx);
                            setIsPlaying(false);
                            setCurrentStepIdx(sol.edges.length - 1);
                            onHighlightTrace(
                              sol.edges,
                              sol.nodes,
                              undefined,
                              undefined,
                              'hamiltonian'
                            );
                          }}
                          className={`w-full text-left p-2.5 rounded-lg border text-xs font-mono transition-all ${
                            isSelected
                              ? 'bg-orange-500/15 border-orange-500/50 text-orange-200'
                              : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase text-zinc-400">
                              {hamVariantType === 'circuit' ? 'Circuit' : 'Path'} #{idx + 1}
                            </span>
                            <span className="text-[10px] text-orange-400">Click to visualize</span>
                          </div>
                          <div className="truncate text-[11px]">{sol.nodes.join(' → ')}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Backtracking Telemetry */}
              <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>States Visited: {hamiltonian.nodesVisitedCount.toLocaleString()}</span>
                <span>Backtracks: {hamiltonian.backtrackCount.toLocaleString()}</span>
              </div>
            </motion.div>
          )}

          {activeTab === 'degrees' && (
            <motion.div
              key="degrees-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-3"
            >
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Components</div>
                  <div className="text-sm font-mono font-bold text-zinc-200 mt-0.5">
                    {eulerian.connectedComponentsCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Odd Vertices</div>
                  <div
                    className={`text-sm font-mono font-bold mt-0.5 ${
                      eulerian.oddDegreeNodes.length === 0
                        ? 'text-emerald-400'
                        : eulerian.oddDegreeNodes.length === 2
                        ? 'text-sky-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {eulerian.oddDegreeNodes.length}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Isolated</div>
                  <div className="text-sm font-mono font-bold text-zinc-200 mt-0.5">
                    {eulerian.isolatedNodesCount}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-[#141517] border-b border-zinc-800 text-[10px] text-zinc-500 uppercase">
                      <th className="py-2 px-3">Vertex</th>
                      <th className="py-2 px-2 text-center">In</th>
                      <th className="py-2 px-2 text-center">Out</th>
                      <th className="py-2 px-2 text-center">Total</th>
                      <th className="py-2 px-3 text-right">Parity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {nodes.map(node => {
                      const info = eulerian.degreeInfo[node.id] || {
                        inDegree: 0,
                        outDegree: 0,
                        degree: 0,
                        isOdd: false
                      };
                      return (
                        <tr key={node.id} className="hover:bg-zinc-900/50">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: node.color || '#3b82f6' }}
                              />
                              <span className="font-bold text-zinc-200">{node.id}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center text-zinc-400">{info.inDegree}</td>
                          <td className="py-2 px-2 text-center text-zinc-400">{info.outDegree}</td>
                          <td className="py-2 px-2 text-center font-bold text-zinc-200">
                            {info.degree}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                info.isOdd
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {info.isOdd ? 'ODD' : 'EVEN'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
