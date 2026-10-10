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
    <div className="flex flex-col h-full bg-white border-l border-gray-300 text-gray-800 text-xs overflow-hidden select-none font-sans">
      {/* Normal Tabs */}
      <div className="flex border-b border-gray-300 bg-gray-200">
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
              className={`flex-1 py-1.5 text-center text-xs border-r border-gray-300 last:border-r-0 ${
                active
                  ? 'bg-white text-gray-900 font-bold border-t-2 border-t-blue-600'
                  : 'text-gray-700 hover:bg-orange-500'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Playback Controller (when walk steps exist) */}
      {activeTab !== 'degrees' && activeTrace.steps.length > 0 && (
        <div className="p-2.5 border-b border-gray-300 bg-gray-50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={isPlaying ? () => setIsPlaying(false) : handleStartPlayback}
                className="flex items-center gap-1 px-2.5 py-1 bg-gray-200 hover:bg-white text-gray-900 border border-gray-400 font-bold text-xs"
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
                className="p-1 bg-orange-500 hover:bg-white disabled:opacity-40 text-gray-700 border border-gray-400"
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
                className="p-1 bg-orange-500 hover:bg-white disabled:opacity-40 text-gray-700 border border-gray-400"
                title="Next Step"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleResetPlayback}
                className="p-1 bg-orange-500 hover:bg-white text-gray-700 border border-gray-400"
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
                  className={`px-1.5 py-0.5 border border-gray-400 ${
                    speedMs === s.ms ? 'bg-white text-gray-900 font-bold' : 'bg-orange-500 text-gray-600 hover:bg-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-gray-600">
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
              className="text-gray-700 hover:underline"
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
            className="w-full h-1.5 bg-gray-300 rounded cursor-pointer"
          />

          {currentStepIdx >= 0 && activeTrace.steps[currentStepIdx] && (
            <div className="px-2 py-1 bg-green-50 border border-green-300 text-[11px] font-mono text-green-900 font-bold">
              {activeTrace.steps[currentStepIdx].note}
            </div>
          )}
        </div>
      )}

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'eulerian' && (
          <div className="space-y-3">
            {/* Diagnostic summary */}
            <div
              className={`p-2.5 border ${
                eulerian.hasEulerianCircuit
                  ? 'bg-green-50 border-green-300 text-green-900'
                  : eulerian.hasEulerianPath
                  ? 'bg-blue-50 border-blue-300 text-blue-900'
                  : 'bg-orange-500 border-gray-300 text-gray-800'
              }`}
            >
              <div className="font-bold mb-1 flex items-center gap-1.5">
                {eulerian.hasEulerianCircuit ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Eulerian Circuit Exists</span>
                  </>
                ) : eulerian.hasEulerianPath ? (
                  <>
                    <Check className="w-4 h-4 text-blue-600" />
                    <span>Eulerian Path Exists (No Circuit)</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-red-600" />
                    <span>No Eulerian Walk</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">{eulerian.explanation}</p>
            </div>

            {/* Sequence */}
            {eulerian.pathNodes.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-gray-600 font-bold">Traversal Sequence:</span>
                <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border border-gray-300 text-xs font-mono">
                  {eulerian.pathNodes.map((nodeId, idx) => (
                    <button
                      key={`${nodeId}-${idx}`}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStepIdx(Math.max(0, idx - 1));
                      }}
                      className={`px-1.5 py-0.5 border text-[11px] ${
                        currentStepIdx >= 0 && idx === currentStepIdx + 1
                          ? 'bg-green-600 text-white font-bold border-green-700'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-orange-500'
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
                <span className="text-[11px] font-mono text-gray-600 font-bold">Step Log:</span>
                <div className="space-y-0.5 max-h-56 overflow-y-auto">
                  {eulerian.detailedSteps.map((s, idx) => (
                    <button
                      key={s.step}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStepIdx(idx);
                      }}
                      className={`w-full text-left px-2 py-1 border text-[11px] font-mono flex items-center justify-between ${
                        currentStepIdx === idx
                          ? 'bg-blue-100 border-blue-400 text-blue-900 font-bold'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>
                        #{s.step}: {s.fromNodeId} → {s.toNodeId}
                      </span>
                      <span className="text-gray-400 text-[10px]">{s.edgeId}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'hamiltonian' && (
          <div className="space-y-3">
            <div
              className={`p-2.5 border ${
                hamiltonian.hasHamiltonianCircuit
                  ? 'bg-green-50 border-green-300 text-green-900'
                  : hamiltonian.hasHamiltonianPath
                  ? 'bg-blue-50 border-blue-300 text-blue-900'
                  : 'bg-orange-500 border-gray-300 text-gray-800'
              }`}
            >
              <div className="font-bold mb-1 flex items-center gap-1.5">
                {hamiltonian.hasHamiltonianCircuit ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Hamiltonian Circuit Exists</span>
                  </>
                ) : hamiltonian.hasHamiltonianPath ? (
                  <>
                    <Check className="w-4 h-4 text-blue-600" />
                    <span>Hamiltonian Path Exists (No Circuit)</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-red-600" />
                    <span>No Hamiltonian Walk</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">{hamiltonian.explanation}</p>
            </div>

            {/* Dirac & Ore checks */}
            {hamiltonian.diracConditionSatisfied !== undefined && (
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-gray-50 border border-gray-300">
                  <span className="text-gray-500 font-mono font-bold">Dirac Condition</span>
                  <div
                    className={`font-bold mt-0.5 ${
                      hamiltonian.diracConditionSatisfied ? 'text-green-700' : 'text-gray-600'
                    }`}
                  >
                    {hamiltonian.diracConditionSatisfied ? 'Satisfied' : 'Not met'}
                  </div>
                </div>
                <div className="p-2 bg-gray-50 border border-gray-300">
                  <span className="text-gray-500 font-mono font-bold">Ore Condition</span>
                  <div
                    className={`font-bold mt-0.5 ${
                      hamiltonian.oreConditionSatisfied ? 'text-green-700' : 'text-gray-600'
                    }`}
                  >
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
                    className={`flex-1 py-1 text-xs border ${
                      hamVariantType === 'circuit'
                        ? 'bg-white border-gray-400 text-gray-900 font-bold'
                        : 'bg-orange-500 border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40'
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
                    className={`flex-1 py-1 text-xs border ${
                      hamVariantType === 'path'
                        ? 'bg-white border-gray-400 text-gray-900 font-bold'
                        : 'bg-orange-500 border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40'
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
                        className={`w-full text-left p-1.5 border text-[11px] font-mono truncate ${
                          hamVariantIdx === idx
                            ? 'bg-blue-100 border-blue-400 text-blue-900 font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
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
                <tr className="border-b border-gray-300 text-gray-600 bg-orange-500 font-bold">
                  <th className="py-1 px-1">Node</th>
                  <th className="py-1 text-center">In</th>
                  <th className="py-1 text-center">Out</th>
                  <th className="py-1 text-center">Total</th>
                  <th className="py-1 text-right px-1">Parity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {nodes.map(node => {
                  const info = eulerian.degreeInfo[node.id] || {
                    inDegree: 0,
                    outDegree: 0,
                    degree: 0,
                    isOdd: false
                  };
                  return (
                    <tr key={node.id} className="hover:bg-gray-50">
                      <td className="py-1 px-1 text-gray-900 font-bold flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 border border-gray-400 inline-block shrink-0"
                          style={{ backgroundColor: node.color || '#93c5fd' }}
                        />
                        <span>{node.id}</span>
                      </td>
                      <td className="py-1 text-center text-gray-600">{info.inDegree}</td>
                      <td className="py-1 text-center text-gray-600">{info.outDegree}</td>
                      <td className="py-1 text-center text-gray-900 font-bold">{info.degree}</td>
                      <td className="py-1 text-right px-1">
                        <span
                          className={`px-1.5 py-0.5 border text-[10px] ${
                            info.isOdd
                              ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                              : 'bg-green-100 text-green-900 border-green-300'
                          }`}
                        >
                          {info.isOdd ? 'odd' : 'even'}
                        </span>
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
