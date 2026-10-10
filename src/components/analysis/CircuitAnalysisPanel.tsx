import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Check,
  X
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

  const [hamVariantType, setHamVariantType] = useState<'circuit' | 'path'>('circuit');
  const [hamVariantIdx, setHamVariantIdx] = useState<number>(0);

  const { eulerian, hamiltonian } = analysis;

  useEffect(() => {
    if (hamiltonian.hasHamiltonianCircuit) {
      setHamVariantType('circuit');
      setHamVariantIdx(0);
    } else if (hamiltonian.hasHamiltonianPath) {
      setHamVariantType('path');
      setHamVariantIdx(0);
    }
  }, [hamiltonian.hasHamiltonianCircuit, hamiltonian.hasHamiltonianPath, analysis.timestamp]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentStepIdx(-1);
    onHighlightTrace([], [], undefined, undefined, null);
  }, [analysis.timestamp]);

  const activeTrace = useMemo(() => {
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
          note: `Step ${idx + 1}: ${fromId} → ${toId}`
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
    <div className="flex flex-col h-full bg-[#111214] border-l border-zinc-800 text-zinc-300 text-xs overflow-hidden select-none">
      {/* Flat Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/50">
        {[
          { id: 'eulerian', label: 'Eulerian' },
          { id: 'hamiltonian', label: 'Hamiltonian' },
          { id: 'degrees', label: 'Degrees' }
        ].map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 text-center transition-colors ${
                active
                  ? 'border-b-2 border-zinc-300 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Flat Playback Controller (when walk steps exist) */}
      {activeTab !== 'degrees' && activeTrace.steps.length > 0 && (
        <div className="p-3 border-b border-zinc-800 bg-[#141517] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={isPlaying ? () => setIsPlaying(false) : handleStartPlayback}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 font-medium text-xs"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Walk'}</span>
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStepIdx(i => Math.max(0, i - 1));
                }}
                disabled={currentStepIdx <= 0}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 border border-zinc-700"
                title="Previous Step"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStepIdx(i => Math.min(activeTrace.steps.length - 1, i + 1));
                }}
                disabled={currentStepIdx >= activeTrace.steps.length - 1}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 border border-zinc-700"
                title="Next Step"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleResetPlayback}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
                title="Reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-mono">
              {[
                { label: '1x', ms: 750 },
                { label: '2x', ms: 350 }
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => setSpeedMs(s.ms)}
                  className={`px-1.5 py-0.5 rounded ${
                    speedMs === s.ms ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>
              {currentStepIdx >= 0
                ? `Step ${currentStepIdx + 1} / ${activeTrace.steps.length}`
                : `${activeTrace.steps.length} steps`}
            </span>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIdx(activeTrace.steps.length - 1);
              }}
              className="text-zinc-400 hover:text-zinc-200 underline"
            >
              Show all
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
            className="w-full h-1 bg-zinc-800 rounded accent-zinc-400 cursor-pointer"
          />

          {currentStepIdx >= 0 && activeTrace.steps[currentStepIdx] && (
            <div className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-emerald-400">
              {activeTrace.steps[currentStepIdx].note}
            </div>
          )}
        </div>
      )}

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'eulerian' && (
          <div className="space-y-3">
            {/* Flat diagnostic summary */}
            <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
              <div className="font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
                {eulerian.hasEulerianCircuit ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Eulerian Circuit Exists</span>
                  </>
                ) : eulerian.hasEulerianPath ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-sky-400" />
                    <span>Eulerian Path Exists (No Circuit)</span>
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5 text-rose-400" />
                    <span>No Eulerian Walk</span>
                  </>
                )}
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">{eulerian.explanation}</p>
            </div>

            {/* Sequence */}
            {eulerian.pathNodes.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-zinc-500">Traversal Sequence:</span>
                <div className="flex flex-wrap gap-1 p-2 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono">
                  {eulerian.pathNodes.map((nodeId, idx) => (
                    <button
                      key={`${nodeId}-${idx}`}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStepIdx(Math.max(0, idx - 1));
                      }}
                      className={`px-1.5 py-0.5 rounded text-[11px] ${
                        currentStepIdx >= 0 && idx === currentStepIdx + 1
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {nodeId}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Steps list */}
            {eulerian.detailedSteps.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-zinc-500">Step Log:</span>
                <div className="space-y-0.5 max-h-56 overflow-y-auto">
                  {eulerian.detailedSteps.map((s, idx) => (
                    <button
                      key={s.step}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStepIdx(idx);
                      }}
                      className={`w-full text-left px-2 py-1 rounded border text-[11px] font-mono flex items-center justify-between ${
                        currentStepIdx === idx
                          ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <span>
                        #{s.step}: {s.fromNodeId} → {s.toNodeId}
                      </span>
                      <span className="text-zinc-500 text-[10px]">{s.edgeId}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'hamiltonian' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
              <div className="font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
                {hamiltonian.hasHamiltonianCircuit ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hamiltonian Circuit Exists</span>
                  </>
                ) : hamiltonian.hasHamiltonianPath ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-sky-400" />
                    <span>Hamiltonian Path Exists (No Circuit)</span>
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5 text-rose-400" />
                    <span>No Hamiltonian Walk</span>
                  </>
                )}
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">{hamiltonian.explanation}</p>
            </div>

            {/* Dirac & Ore checks */}
            {hamiltonian.diracConditionSatisfied !== undefined && (
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 font-mono">Dirac</span>
                  <div className="font-medium mt-0.5">
                    {hamiltonian.diracConditionSatisfied ? 'Satisfied' : 'Not met'}
                  </div>
                </div>
                <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 font-mono">Ore</span>
                  <div className="font-medium mt-0.5">
                    {hamiltonian.oreConditionSatisfied ? 'Satisfied' : 'Not met'}
                  </div>
                </div>
              </div>
            )}

            {/* Solution options */}
            {(hamiltonian.circuits.length > 0 || hamiltonian.paths.length > 0) && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setHamVariantType('circuit');
                      setHamVariantIdx(0);
                    }}
                    disabled={hamiltonian.circuits.length === 0}
                    className={`flex-1 py-1 rounded text-xs border ${
                      hamVariantType === 'circuit'
                        ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-medium'
                        : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-40'
                    }`}
                  >
                    Circuits ({hamiltonian.circuits.length})
                  </button>
                  <button
                    onClick={() => {
                      setHamVariantType('path');
                      setHamVariantIdx(0);
                    }}
                    disabled={hamiltonian.paths.length === 0}
                    className={`flex-1 py-1 rounded text-xs border ${
                      hamVariantType === 'path'
                        ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-medium'
                        : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-40'
                    }`}
                  >
                    Paths ({hamiltonian.paths.length})
                  </button>
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(hamVariantType === 'circuit' ? hamiltonian.circuits : hamiltonian.paths).map(
                    (sol, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setHamVariantIdx(idx);
                          setIsPlaying(false);
                          setCurrentStepIdx(sol.edges.length - 1);
                          onHighlightTrace(sol.edges, sol.nodes, undefined, undefined, 'hamiltonian');
                        }}
                        className={`w-full text-left p-1.5 rounded border text-[11px] font-mono truncate ${
                          hamVariantIdx === idx
                            ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        #{idx + 1}: {sol.nodes.join(' → ')}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'degrees' && (
          <div className="space-y-2">
            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="py-1">Node</th>
                  <th className="py-1 text-center">In</th>
                  <th className="py-1 text-center">Out</th>
                  <th className="py-1 text-center">Total</th>
                  <th className="py-1 text-right">Parity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {nodes.map(node => {
                  const info = eulerian.degreeInfo[node.id] || {
                    inDegree: 0,
                    outDegree: 0,
                    degree: 0,
                    isOdd: false
                  };
                  return (
                    <tr key={node.id}>
                      <td className="py-1 text-zinc-200 font-bold">{node.id}</td>
                      <td className="py-1 text-center text-zinc-400">{info.inDegree}</td>
                      <td className="py-1 text-center text-zinc-400">{info.outDegree}</td>
                      <td className="py-1 text-center text-zinc-200">{info.degree}</td>
                      <td className="py-1 text-right text-zinc-400">
                        {info.isOdd ? 'odd' : 'even'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
