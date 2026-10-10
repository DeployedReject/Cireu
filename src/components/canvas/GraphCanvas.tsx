import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MousePointer,
  PlusCircle,
  ArrowUpRight,
  Minus,
  Trash2,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  CircleDot,
  Compass,
  LayoutGrid
} from 'lucide-react';
import {
  GraphNode,
  GraphEdge,
  CanvasTool,
  NodeDegreeInfo
} from '../../types/graph';
import { computeLayout, LayoutType } from '../../algorithms/layout';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  onAddNode: (x: number, y: number) => void;
  onUpdateNode: (id: string, patch: Partial<GraphNode>) => void;
  onDeleteNode: (id: string) => void;
  onAddEdge: (source: string, target: string, directed: boolean) => void;
  onUpdateEdge: (id: string, patch: Partial<GraphEdge>) => void;
  onDeleteEdge: (id: string) => void;
  onBulkUpdateNodes: (nodes: GraphNode[]) => void;
  degreeInfo: Record<string, NodeDegreeInfo>;
  highlightedEdgeIds: string[];
  activeStepEdgeId?: string;
  highlightedNodeIds: string[];
  activeStepNodeId?: string;
  activeFromNodeId?: string;
  playbackMode?: 'eulerian' | 'hamiltonian' | null;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  activeTool,
  setActiveTool,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onAddEdge,
  onUpdateEdge,
  onDeleteEdge,
  onBulkUpdateNodes,
  degreeInfo,
  highlightedEdgeIds,
  activeStepEdgeId,
  highlightedNodeIds,
  activeStepNodeId,
  activeFromNodeId
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Viewport transform
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showDegreesOnCanvas, setShowDegreesOnCanvas] = useState<boolean>(true);

  // Interaction states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Edge creation state
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const screenToWorld = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = (clientX - rect.left - pan.x) / zoom;
    const rawY = (clientY - rect.top - pan.y) / zoom;
    return {
      x: snapToGrid ? Math.round(rawX / 20) * 20 : Math.round(rawX),
      y: snapToGrid ? Math.round(rawY / 20) * 20 : Math.round(rawY)
    };
  };

  useEffect(() => {
    setConnectingSourceId(null);
  }, [activeTool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          onDeleteNode(selectedNodeId);
          setSelectedNodeId(null);
        } else if (selectedEdgeId) {
          onDeleteEdge(selectedEdgeId);
          setSelectedEdgeId(null);
        }
      } else if (e.key === 'Escape') {
        setConnectingSourceId(null);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      } else if (e.key === 'v' || e.key === '1') {
        setActiveTool('select');
      } else if (e.key === 'n' || e.key === '2') {
        setActiveTool('node');
      } else if (e.key === 'u' || e.key === '3') {
        setActiveTool('undirected-edge');
      } else if (e.key === 'd' || e.key === '4') {
        setActiveTool('directed-edge');
      } else if (e.key === 'e' || e.key === '5') {
        setActiveTool('erase');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, onDeleteNode, onDeleteEdge, setActiveTool]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    nodes.forEach(n => m.set(n.id, n));
    return m;
  }, [nodes]);

  const edgeGeometryMap = useMemo(() => {
    const pairGroups = new Map<string, GraphEdge[]>();
    for (const e of edges) {
      const pairKey =
        e.source < e.target ? `${e.source}__${e.target}` : `${e.target}__${e.source}`;
      const list = pairGroups.get(pairKey) || [];
      list.push(e);
      pairGroups.set(pairKey, list);
    }

    const geom = new Map<
      string,
      {
        pathD: string;
        reversedPathD: string;
        labelX: number;
        labelY: number;
      }
    >();

    for (const [, group] of pairGroups.entries()) {
      const count = group.length;
      group.forEach((edge, idx) => {
        const u = nodeMap.get(edge.source);
        const v = nodeMap.get(edge.target);
        if (!u || !v) return;

        // Self-loop geometry
        if (edge.source === edge.target) {
          const loopRadius = 26 + idx * 14;
          const x = u.x;
          const y = u.y - 20;
          const pathD = `M ${x - 10} ${y + 2} C ${x - loopRadius * 1.3} ${
            y - loopRadius * 1.6
          }, ${x + loopRadius * 1.3} ${y - loopRadius * 1.6}, ${x + 10} ${y + 2}`;
          const reversedPathD = `M ${x + 10} ${y + 2} C ${x + loopRadius * 1.3} ${
            y - loopRadius * 1.6
          }, ${x - loopRadius * 1.3} ${y - loopRadius * 1.6}, ${x - 10} ${y + 2}`;

          geom.set(edge.id, {
            pathD,
            reversedPathD,
            labelX: x,
            labelY: y - loopRadius * 1.25
          });
          return;
        }

        const isCanonicalDir = edge.source < edge.target;
        const p1 = isCanonicalDir ? u : v;
        const p2 = isCanonicalDir ? v : u;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));

        const nx = -dy / dist;
        const ny = dx / dist;

        const centeredIndex = idx - (count - 1) / 2;
        const curveSpread = count === 1 ? 0 : centeredIndex * 42;

        const nodeRadius = 22;
        const ux = u.x;
        const uy = u.y;
        const vx = v.x;
        const vy = v.y;

        const midX = (ux + vx) / 2 + nx * curveSpread;
        const midY = (uy + vy) / 2 + ny * curveSpread;

        const toVdx = vx - midX;
        const toVdy = vy - midY;
        const toVDist = Math.max(1, Math.sqrt(toVdx * toVdx + toVdy * toVdy));
        const endPad = edge.directed ? nodeRadius + 5 : nodeRadius;
        const targetEndX = vx - (toVdx / toVDist) * endPad;
        const targetEndY = vy - (toVdy / toVDist) * endPad;

        const fromUdx = ux - midX;
        const fromUdy = uy - midY;
        const fromUDist = Math.max(1, Math.sqrt(fromUdx * fromUdx + fromUdy * fromUdy));
        const sourceStartX = ux - (fromUdx / fromUDist) * nodeRadius;
        const sourceStartY = uy - (fromUdy / fromUDist) * nodeRadius;

        const pathD =
          count === 1
            ? `M ${sourceStartX} ${sourceStartY} L ${targetEndX} ${targetEndY}`
            : `M ${sourceStartX} ${sourceStartY} Q ${midX} ${midY} ${targetEndX} ${targetEndY}`;

        const reversedPathD =
          count === 1
            ? `M ${targetEndX} ${targetEndY} L ${sourceStartX} ${sourceStartY}`
            : `M ${targetEndX} ${targetEndY} Q ${midX} ${midY} ${sourceStartX} ${sourceStartY}`;

        const labelX =
          count === 1
            ? (sourceStartX + targetEndX) / 2
            : 0.25 * sourceStartX + 0.5 * midX + 0.25 * targetEndX;
        const labelY =
          count === 1
            ? (sourceStartY + targetEndY) / 2
            : 0.25 * sourceStartY + 0.5 * midY + 0.25 * targetEndY;

        geom.set(edge.id, {
          pathD,
          reversedPathD,
          labelX,
          labelY
        });
      });
    }

    return geom;
  }, [edges, nodeMap]);

  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target !== svgRef.current && (e.target as Element).tagName !== 'rect') {
      return;
    }

    if (activeTool === 'pan' || e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const pos = screenToWorld(e.clientX, e.clientY);

    if (activeTool === 'node') {
      onAddNode(pos.x, pos.y);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    } else {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setConnectingSourceId(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setMouseWorldPos(worldPos);

    if (draggingNodeId) {
      onUpdateNode(draggingNodeId, { x: worldPos.x, y: worldPos.y });
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();

    if (activeTool === 'erase') {
      onDeleteNode(nodeId);
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      return;
    }

    if (activeTool === 'directed-edge' || activeTool === 'undirected-edge') {
      const isDirected = activeTool === 'directed-edge';
      if (!connectingSourceId) {
        setConnectingSourceId(nodeId);
      } else {
        onAddEdge(connectingSourceId, nodeId, isDirected);
        setConnectingSourceId(null);
      }
      return;
    }

    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (activeTool === 'select' || activeTool === 'node') {
      setDraggingNodeId(nodeId);
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
    }
  };

  const handleEdgeClick = (e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    if (activeTool === 'erase') {
      onDeleteEdge(edgeId);
      if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
      return;
    }
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
  };

  const handleAutoLayout = (type: LayoutType) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const w = rect ? rect.width : 800;
    const h = rect ? rect.height : 600;
    const updated = computeLayout(nodes, edges, type, w, h);
    onBulkUpdateNodes(updated);
  };

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? edges.find(e => e.id === selectedEdgeId) : null;

  const toolItems: { id: CanvasTool; label: string; icon: React.ReactNode }[] = [
    { id: 'select', label: 'Select', icon: <MousePointer className="w-3.5 h-3.5" /> },
    { id: 'node', label: 'Node', icon: <PlusCircle className="w-3.5 h-3.5" /> },
    { id: 'undirected-edge', label: 'Edge', icon: <Minus className="w-3.5 h-3.5" /> },
    { id: 'directed-edge', label: 'Directed', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
    { id: 'erase', label: 'Erase', icon: <Trash2 className="w-3.5 h-3.5" /> },
    { id: 'pan', label: 'Pan', icon: <Hand className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0e0f11] overflow-hidden select-none">
      {/* Flat Toolbar */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between gap-2 pointer-events-none">
        {/* Left: Tools */}
        <div className="flex items-center gap-0.5 p-0.5 rounded bg-zinc-900 border border-zinc-800 pointer-events-auto">
          {toolItems.map(tool => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                title={tool.label}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tool.icon}
                <span className="hidden sm:inline">{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Layout & View Controls */}
        <div className="flex items-center gap-1 pointer-events-auto">
          <div className="flex items-center gap-0.5 p-0.5 rounded bg-zinc-900 border border-zinc-800 text-xs">
            <button
              onClick={() => handleAutoLayout('circle')}
              title="Circular Layout"
              className="p-1 rounded text-zinc-400 hover:text-zinc-200"
            >
              <CircleDot className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAutoLayout('force')}
              title="Spring Layout"
              className="p-1 rounded text-zinc-400 hover:text-zinc-200"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAutoLayout('grid')}
              title="Grid Layout"
              className="p-1 rounded text-zinc-400 hover:text-zinc-200"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-zinc-800 mx-0.5" />
            <button
              onClick={() => setSnapToGrid(s => !s)}
              title="Grid Snap"
              className={`p-1 rounded ${snapToGrid ? 'text-zinc-200 bg-zinc-800' : 'text-zinc-500'}`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowDegreesOnCanvas(d => !d)}
              title="Toggle Degrees"
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                showDegreesOnCanvas ? 'text-zinc-200 bg-zinc-800' : 'text-zinc-500'
              }`}
            >
              deg
            </button>
            <div className="w-px h-3.5 bg-zinc-800 mx-0.5" />
            <button
              onClick={() => setZoom(z => Math.max(0.4, +(z - 0.15).toFixed(2)))}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(z => Math.min(2.2, +(z + 0.15).toFixed(2)))}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setPan({ x: 0, y: 0 });
                setZoom(1);
              }}
              title="Reset View"
              className="p-1 rounded text-zinc-400 hover:text-zinc-200"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        className={`w-full h-full flex-1 ${
          activeTool === 'node'
            ? 'cursor-crosshair'
            : activeTool === 'pan' || isPanning
            ? 'cursor-grab active:cursor-grabbing'
            : activeTool === 'erase'
            ? 'cursor-pointer'
            : 'cursor-default'
        }`}
      >
        <defs>
          <pattern
            id="cireu-grid"
            width={20 * zoom}
            height={20 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (20 * zoom)}, ${pan.y % (20 * zoom)})`}
          >
            <circle cx="1" cy="1" r="1" fill="#222326" />
          </pattern>

          <marker
            id="arrow-default"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#64748b" />
          </marker>
          <marker
            id="arrow-selected"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>
          <marker
            id="arrow-walk-direction"
            viewBox="0 0 10 10"
            refX="7.5"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#10b981" className="animate-arrow-nudge" />
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="url(#cireu-grid)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {connectingSourceId && nodeMap.get(connectingSourceId) && (
            <line
              x1={nodeMap.get(connectingSourceId)!.x}
              y1={nodeMap.get(connectingSourceId)!.y}
              x2={mouseWorldPos.x}
              y2={mouseWorldPos.y}
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="4 4"
              className="pointer-events-none"
            />
          )}

          {/* Edges */}
          {edges.map(edge => {
            const geom = edgeGeometryMap.get(edge.id);
            if (!geom) return null;

            const isSelected = selectedEdgeId === edge.id;
            const isHighlighted = highlightedEdgeIds.includes(edge.id);
            const isActiveStep = activeStepEdgeId === edge.id;

            const isReversedTraversal =
              isActiveStep &&
              activeFromNodeId !== undefined &&
              edge.target === activeFromNodeId &&
              edge.source !== activeFromNodeId;

            const edgePath = isReversedTraversal ? geom.reversedPathD : geom.pathD;

            const stepNumbers: number[] = [];
            highlightedEdgeIds.forEach((id, idx) => {
              if (id === edge.id) stepNumbers.push(idx + 1);
            });

            let strokeColor = edge.color || '#52525b';
            let strokeWidth = 2;
            let markerEnd: string | undefined = edge.directed ? 'url(#arrow-default)' : undefined;

            if (isSelected) {
              strokeColor = '#38bdf8';
              strokeWidth = 2.5;
              if (edge.directed) markerEnd = 'url(#arrow-selected)';
            } else if (isActiveStep) {
              strokeColor = '#22c55e';
              strokeWidth = 3.5;
              markerEnd = 'url(#arrow-walk-direction)';
            } else if (isHighlighted) {
              strokeColor = '#f97316';
              strokeWidth = 2.5;
            }

            return (
              <g
                key={edge.id}
                onClick={e => handleEdgeClick(e, edge.id)}
                className="cursor-pointer"
              >
                <path
                  d={geom.pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                />

                <path
                  d={edgePath}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  markerEnd={markerEnd}
                  strokeLinecap="round"
                />

                {/* Animated dash flow along the active traversal edge */}
                {isActiveStep && (
                  <path
                    d={edgePath}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth={strokeWidth}
                    className="animate-edge-flow pointer-events-none"
                    strokeLinecap="round"
                  />
                )}

                {(edge.label || stepNumbers.length > 0) && (
                  <g transform={`translate(${geom.labelX}, ${geom.labelY})`}>
                    <rect
                      x={-18}
                      y={-10}
                      width={36}
                      height={20}
                      rx={3}
                      fill={isActiveStep ? '#052e16' : '#18181b'}
                      stroke={isActiveStep ? '#22c55e' : '#3f3f46'}
                      strokeWidth={1}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={`text-[10px] font-mono ${
                        isActiveStep
                          ? 'fill-emerald-300 font-bold'
                          : isHighlighted
                          ? 'fill-orange-300'
                          : 'fill-zinc-400'
                      }`}
                    >
                      {stepNumbers.length > 0 ? `#${stepNumbers.join(',')}` : edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            const isConnectingSource = connectingSourceId === node.id;
            const isHighlighted = highlightedNodeIds.includes(node.id);
            const isActiveStepTarget = activeStepNodeId === node.id;
            const isActiveStepSource = activeFromNodeId === node.id;
            const deg = degreeInfo[node.id] || { degree: 0, isOdd: false };

            let strokeColor = node.color || '#52525b';
            let strokeWidth = 1.5;

            if (isActiveStepTarget) {
              strokeColor = '#22c55e';
              strokeWidth = 3;
            } else if (isActiveStepSource) {
              strokeColor = '#f59e0b';
              strokeWidth = 2.5;
            } else if (isSelected) {
              strokeColor = '#38bdf8';
              strokeWidth = 2.5;
            } else if (isConnectingSource || isHighlighted) {
              strokeColor = '#f97316';
              strokeWidth = 2;
            }

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={e => handleNodeMouseDown(e, node.id)}
                onClick={e => handleNodeClick(e, node.id)}
                className="cursor-pointer"
              >
                {/* Node Circle with distinct color */}
                <circle
                  r={22}
                  fill={node.color ? `${node.color}22` : '#18181b'}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                />

                {/* Node ID */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-xs font-mono font-medium fill-zinc-200 pointer-events-none"
                >
                  {node.id}
                </text>

                {/* Flat FROM / TO indicator */}
                {(isActiveStepSource || isActiveStepTarget) && (
                  <g transform="translate(0, -28)" className="pointer-events-none">
                    <rect
                      x={-16}
                      y={-7}
                      width={32}
                      height={14}
                      rx={2}
                      fill={isActiveStepTarget ? '#052e16' : '#451a03'}
                      stroke={isActiveStepTarget ? '#22c55e' : '#f59e0b'}
                      strokeWidth={1}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={`text-[8px] font-mono font-bold ${
                        isActiveStepTarget ? 'fill-emerald-300' : 'fill-amber-300'
                      }`}
                    >
                      {isActiveStepTarget ? 'TO' : 'FROM'}
                    </text>
                  </g>
                )}

                {/* Node Label Below */}
                <text
                  x={0}
                  y={32}
                  textAnchor="middle"
                  className="text-[10px] fill-zinc-400 pointer-events-none"
                >
                  {node.label}
                </text>

                {/* Degree indicator */}
                {showDegreesOnCanvas && (
                  <g transform="translate(16, -16)" className="pointer-events-none">
                    <circle
                      r={7}
                      fill={deg.isOdd ? '#451a03' : '#18181b'}
                      stroke={deg.isOdd ? '#f59e0b' : '#3f3f46'}
                      strokeWidth={1}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[8px] font-mono fill-zinc-300"
                    >
                      {deg.degree}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Flat Selected Item Inspector */}
      {(selectedNode || selectedEdge) && (
        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-2 p-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
          {selectedNode && (
            <>
              <span className="font-mono text-zinc-400">Vertex {selectedNode.id}</span>
              <input
                type="text"
                value={selectedNode.label}
                onChange={e => onUpdateNode(selectedNode.id, { label: e.target.value })}
                className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 focus:outline-none w-28"
              />
              <div className="flex items-center gap-1 px-1">
                {['#3b82f6', '#f97316', '#10b981', '#ec4899', '#8b5cf6', '#eab308', '#06b6d4'].map(c => (
                  <button
                    key={c}
                    onClick={() => onUpdateNode(selectedNode.id, { color: c })}
                    style={{ backgroundColor: c }}
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      selectedNode.color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                    title={c}
                  />
                ))}
              </div>
              <button
                onClick={() => {
                  onDeleteNode(selectedNode.id);
                  setSelectedNodeId(null);
                }}
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-rose-950 hover:text-rose-300 text-zinc-400 text-xs border border-zinc-700"
              >
                Delete
              </button>
            </>
          )}

          {selectedEdge && (
            <>
              <span className="font-mono text-zinc-400">
                Edge {selectedEdge.source} {selectedEdge.directed ? '→' : '—'} {selectedEdge.target}
              </span>
              <input
                type="text"
                value={selectedEdge.label || ''}
                onChange={e => onUpdateEdge(selectedEdge.id, { label: e.target.value })}
                placeholder="Label"
                className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 focus:outline-none w-24"
              />
              <button
                onClick={() =>
                  onUpdateEdge(selectedEdge.id, { directed: !selectedEdge.directed })
                }
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700"
              >
                {selectedEdge.directed ? 'Directed' : 'Undirected'}
              </button>
              <button
                onClick={() => {
                  onDeleteEdge(selectedEdge.id);
                  setSelectedEdgeId(null);
                }}
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-rose-950 hover:text-rose-300 text-zinc-400 text-xs border border-zinc-700"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
