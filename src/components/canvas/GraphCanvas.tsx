import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles,
  RotateCcw,
  ArrowLeftRight,
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
  // Playback highlighting
  highlightedEdgeIds: string[];
  activeStepEdgeId?: string;
  highlightedNodeIds: string[];
  activeStepNodeId?: string;
  playbackMode?: 'eulerian' | 'hamiltonian' | null;
}

const NODE_COLORS = [
  '#3b82f6', // Google Blue
  '#f6821f', // Cloudflare Orange
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#eab308', // Amber
  '#06b6d4', // Cyan
  '#f43f5e'  // Rose
];

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
  playbackMode
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

  // Convert screen coordinates to SVG world coordinates
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

  // Clear connecting source when switching tools
  useEffect(() => {
    setConnectingSourceId(null);
  }, [activeTool]);

  // Keyboard shortcuts
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
      } else if (e.key === 'd' || e.key === '3') {
        setActiveTool('directed-edge');
      } else if (e.key === 'u' || e.key === '4') {
        setActiveTool('undirected-edge');
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

  // Group parallel edges between the same unordered pair of vertices so we can curve them cleanly
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
        labelX: number;
        labelY: number;
        isSelfLoop: boolean;
        ux: number;
        uy: number;
        vx: number;
        vy: number;
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
          const loopRadius = 28 + idx * 14;
          const x = u.x;
          const y = u.y - 22;
          const pathD = `M ${x - 12} ${y + 4} C ${x - loopRadius * 1.4} ${
            y - loopRadius * 1.8
          }, ${x + loopRadius * 1.4} ${y - loopRadius * 1.8}, ${x + 12} ${y + 4}`;
          geom.set(edge.id, {
            pathD,
            labelX: x,
            labelY: y - loopRadius * 1.35,
            isSelfLoop: true,
            ux: u.x,
            uy: u.y,
            vx: v.x,
            vy: v.y
          });
          return;
        }

        // Canonical vector between minId and maxId so curve offsets are deterministic
        const isCanonicalDir = edge.source < edge.target;
        const p1 = isCanonicalDir ? u : v;
        const p2 = isCanonicalDir ? v : u;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));

        // Normal perpendicular vector
        const nx = -dy / dist;
        const ny = dx / dist;

        // Offset index centered around 0
        const centeredIndex = idx - (count - 1) / 2;
        const curveSpread = count === 1 ? 0 : centeredIndex * 46;

        // Shorten endpoints slightly so arrowheads sit cleanly on node boundary (radius = 24)
        const nodeRadius = 24;
        const ux = u.x;
        const uy = u.y;
        const vx = v.x;
        const vy = v.y;

        const midX = (ux + vx) / 2 + nx * curveSpread;
        const midY = (uy + vy) / 2 + ny * curveSpread;

        // Vector from control point to target v for accurate arrowhead termination
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

        // Point on quadratic bezier at t = 0.5
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
          labelX,
          labelY,
          isSelfLoop: false,
          ux: sourceStartX,
          uy: sourceStartY,
          vx: targetEndX,
          vy: targetEndY
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

    // Shift+Click in select mode connects from currently selected node!
    if (activeTool === 'select' && e.shiftKey && selectedNodeId) {
      onAddEdge(selectedNodeId, nodeId, false);
      return;
    }

    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (activeTool === 'select' || activeTool === 'node') {
      if (!e.shiftKey) {
        setDraggingNodeId(nodeId);
        setSelectedNodeId(nodeId);
        setSelectedEdgeId(null);
      }
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
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleFitView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? edges.find(e => e.id === selectedEdgeId) : null;

  const toolItems: { id: CanvasTool; label: string; shortcut: string; icon: React.ReactNode }[] = [
    { id: 'select', label: 'Select / Drag', shortcut: 'V', icon: <MousePointer className="w-4 h-4" /> },
    { id: 'node', label: 'Add Vertex', shortcut: 'N', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'undirected-edge', label: 'Undirected Edge', shortcut: 'U', icon: <Minus className="w-4 h-4" /> },
    { id: 'directed-edge', label: 'Directed Edge', shortcut: 'D', icon: <ArrowUpRight className="w-4 h-4" /> },
    { id: 'erase', label: 'Delete Element', shortcut: 'E', icon: <Trash2 className="w-4 h-4" /> },
    { id: 'pan', label: 'Pan Canvas', shortcut: 'H', icon: <Hand className="w-4 h-4" /> }
  ];

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0c0d0e] overflow-hidden select-none">
      {/* Top Floating Canvas Toolbar (Cloudflare / Google Cloud Console style) */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Drawing Tools */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#141517]/95 border border-zinc-800/90 shadow-xl backdrop-blur-md pointer-events-auto">
          {toolItems.map(tool => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                title={`${tool.label} (${tool.shortcut})`}
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCanvasTool"
                    className="absolute inset-0 bg-gradient-to-b from-orange-500/20 to-orange-600/10 border border-orange-500/40 rounded-md"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className={`relative z-10 ${isActive ? 'text-orange-400' : ''}`}>
                  {tool.icon}
                </span>
                <span className="relative z-10 hidden sm:inline">{tool.label}</span>
                <kbd className="relative z-10 hidden md:inline-block text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-900/80 text-zinc-500 border border-zinc-800">
                  {tool.shortcut}
                </kbd>
              </button>
            );
          })}
        </div>

        {/* Right: Auto-Layout & Viewport Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Auto-Layout Bar */}
          <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#141517]/95 border border-zinc-800/90 shadow-xl backdrop-blur-md">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 px-2 hidden xl:inline">
              Layout
            </span>
            <button
              onClick={() => handleAutoLayout('circle')}
              title="Circular Layout"
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <CircleDot className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden lg:inline">Circle</span>
            </button>
            <button
              onClick={() => handleAutoLayout('force')}
              title="Force-Directed Spring Layout"
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden lg:inline">Spring</span>
            </button>
            <button
              onClick={() => handleAutoLayout('grid')}
              title="Grid Layout"
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Grid</span>
            </button>
          </div>

          {/* Canvas Toggles & Zoom */}
          <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#141517]/95 border border-zinc-800/90 shadow-xl backdrop-blur-md">
            <button
              onClick={() => setSnapToGrid(s => !s)}
              title="Toggle 20px Coordinate Grid Snap"
              className={`p-1.5 rounded text-xs transition-colors ${
                snapToGrid
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowDegreesOnCanvas(d => !d)}
              title="Toggle Vertex Degree Badges on Canvas"
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                showDegreesOnCanvas
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              deg(v)
            </button>
            <div className="w-px h-4 bg-zinc-800 mx-0.5" />
            <button
              onClick={() => setZoom(z => Math.max(0.4, +(z - 0.15).toFixed(2)))}
              title="Zoom Out"
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-zinc-400 min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(2.2, +(z + 0.15).toFixed(2)))}
              title="Zoom In"
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitView}
              title="Reset Viewport"
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contextual Hint Banner when connecting edges */}
      <AnimatePresence>
        {(activeTool === 'directed-edge' || activeTool === 'undirected-edge') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-zinc-900/95 border border-orange-500/40 text-xs text-zinc-200 shadow-lg flex items-center gap-2 pointer-events-none"
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            {connectingSourceId ? (
              <span>
                Connecting from{' '}
                <strong className="text-orange-400 font-mono">
                  {nodeMap.get(connectingSourceId)?.label || connectingSourceId}
                </strong>{' '}
                — click any target vertex (or same vertex for self-loop). Press Esc to cancel.
              </span>
            ) : (
              <span>
                Click a source vertex to start drawing a{' '}
                <strong className="text-orange-400">
                  {activeTool === 'directed-edge' ? 'directed (u → v)' : 'undirected (u — v)'}
                </strong>{' '}
                edge.
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Interactive SVG Canvas */}
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
          {/* Subtle Technical Dot & Line Grid Pattern */}
          <pattern
            id="cireu-grid"
            width={20 * zoom}
            height={20 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (20 * zoom)}, ${pan.y % (20 * zoom)})`}
          >
            <circle cx="1" cy="1" r="1" fill="#27272a" />
          </pattern>

          {/* Arrowhead markers for normal, selected, and highlighted edges */}
          <marker
            id="arrow-default"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#71717a" />
          </marker>
          <marker
            id="arrow-selected"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6.5"
            markerHeight="6.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>
          <marker
            id="arrow-highlight"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6.5"
            markerHeight="6.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f6821f" />
          </marker>
          <marker
            id="arrow-active-step"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#22c55e" />
          </marker>
        </defs>

        {/* Background Grid Rect */}
        <rect width="100%" height="100%" fill="url(#cireu-grid)" />

        {/* Transformed World Group */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Live Rubberband Line when creating an edge */}
          {connectingSourceId && nodeMap.get(connectingSourceId) && (
            <line
              x1={nodeMap.get(connectingSourceId)!.x}
              y1={nodeMap.get(connectingSourceId)!.y}
              x2={mouseWorldPos.x}
              y2={mouseWorldPos.y}
              stroke="#f6821f"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              markerEnd={activeTool === 'directed-edge' ? 'url(#arrow-highlight)' : undefined}
              className="pointer-events-none"
            />
          )}

          {/* Render Edges */}
          {edges.map(edge => {
            const geom = edgeGeometryMap.get(edge.id);
            if (!geom) return null;

            const isSelected = selectedEdgeId === edge.id;
            const highlightOrderIndex = highlightedEdgeIds.indexOf(edge.id);
            const isHighlighted = highlightOrderIndex !== -1;
            const isActiveStep = activeStepEdgeId === edge.id;

            // Count all occurrences of this edge in highlightedEdgeIds
            const stepNumbers: number[] = [];
            highlightedEdgeIds.forEach((id, idx) => {
              if (id === edge.id) stepNumbers.push(idx + 1);
            });

            let strokeColor = edge.color || '#52525b';
            let strokeWidth = 2.2;
            let markerEnd: string | undefined = edge.directed ? 'url(#arrow-default)' : undefined;

            if (isSelected) {
              strokeColor = '#38bdf8';
              strokeWidth = 3.2;
              if (edge.directed) markerEnd = 'url(#arrow-selected)';
            }
            if (isHighlighted) {
              strokeColor = '#f6821f';
              strokeWidth = 3.4;
              if (edge.directed) markerEnd = 'url(#arrow-highlight)';
            }
            if (isActiveStep) {
              strokeColor = '#22c55e';
              strokeWidth = 4.2;
              if (edge.directed) markerEnd = 'url(#arrow-active-step)';
            }

            return (
              <g
                key={edge.id}
                onClick={e => handleEdgeClick(e, edge.id)}
                className="group cursor-pointer"
              >
                {/* Invisible wider hit target for effortless clicking */}
                <path
                  d={geom.pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                />

                {/* Subtle outer glow when highlighted or active */}
                {(isHighlighted || isActiveStep || isSelected) && (
                  <path
                    d={geom.pathD}
                    fill="none"
                    stroke={isActiveStep ? '#22c55e' : isHighlighted ? '#f6821f' : '#38bdf8'}
                    strokeWidth={strokeWidth + 6}
                    strokeOpacity={0.2}
                    strokeLinecap="round"
                  />
                )}

                {/* Main Visible Edge Path */}
                <path
                  d={geom.pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  markerEnd={markerEnd}
                  strokeLinecap="round"
                  className="transition-colors duration-200 group-hover:stroke-zinc-300"
                />

                {/* Animated flow dashed overlay when active step */}
                {isActiveStep && (
                  <path
                    d={geom.pathD}
                    fill="none"
                    stroke="#bbf7d0"
                    strokeWidth={2}
                    strokeDasharray="6 6"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="24"
                      to="0"
                      dur="0.6s"
                      repeatCount="indefinite"
                    />
                  </path>
                )}

                {/* Edge Label / Weight or Step Order Pill */}
                {(edge.label || edge.weight !== undefined || stepNumbers.length > 0) && (
                  <g transform={`translate(${geom.labelX}, ${geom.labelY})`}>
                    <rect
                      x={-22}
                      y={-11}
                      width={44}
                      height={22}
                      rx={6}
                      fill={
                        isActiveStep
                          ? '#14532d'
                          : isHighlighted
                          ? '#431407'
                          : '#18181b'
                      }
                      stroke={
                        isActiveStep
                          ? '#22c55e'
                          : isHighlighted
                          ? '#f6821f'
                          : isSelected
                          ? '#38bdf8'
                          : '#27272a'
                      }
                      strokeWidth={1.2}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={`text-[10px] font-mono font-semibold ${
                        isActiveStep
                          ? 'fill-emerald-300'
                          : isHighlighted
                          ? 'fill-orange-300'
                          : 'fill-zinc-300'
                      }`}
                    >
                      {stepNumbers.length > 0
                        ? `#${stepNumbers.join(',')}`
                        : edge.label || edge.weight}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            const isConnectingSource = connectingSourceId === node.id;
            const isHighlighted = highlightedNodeIds.includes(node.id);
            const isActiveStep = activeStepNodeId === node.id;
            const deg = degreeInfo[node.id] || {
              inDegree: 0,
              outDegree: 0,
              degree: 0,
              isOdd: false
            };

            const baseColor = node.color || '#3b82f6';

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={e => handleNodeMouseDown(e, node.id)}
                onClick={e => handleNodeClick(e, node.id)}
                className="cursor-pointer group"
              >
                {/* Active Step Radar Pulse */}
                {isActiveStep && (
                  <circle
                    r={34}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    strokeOpacity={0.7}
                  >
                    <animate
                      attributeName="r"
                      from="24"
                      to="42"
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="stroke-opacity"
                      from="0.8"
                      to="0"
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Highlight / Selection Halo */}
                {(isSelected || isConnectingSource || isHighlighted || isActiveStep) && (
                  <circle
                    r={29}
                    fill="none"
                    stroke={
                      isActiveStep
                        ? '#22c55e'
                        : isConnectingSource || isHighlighted
                        ? '#f6821f'
                        : '#38bdf8'
                    }
                    strokeWidth={2}
                    strokeDasharray={isConnectingSource ? '4 3' : undefined}
                  />
                )}

                {/* Main Vertex Circle */}
                <circle
                  r={24}
                  fill="#141517"
                  stroke={
                    isActiveStep
                      ? '#22c55e'
                      : isHighlighted
                      ? '#f6821f'
                      : isSelected
                      ? '#38bdf8'
                      : baseColor
                  }
                  strokeWidth={isSelected || isHighlighted || isActiveStep ? 3 : 2.2}
                  className="transition-transform duration-150 group-hover:scale-105"
                />

                {/* Subtle Inner Tint */}
                <circle
                  r={21}
                  fill={
                    isActiveStep
                      ? '#22c55e'
                      : isHighlighted
                      ? '#f6821f'
                      : baseColor
                  }
                  fillOpacity={isActiveStep ? 0.28 : isHighlighted ? 0.22 : 0.14}
                />

                {/* Short ID inside Vertex */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-xs font-mono font-bold fill-zinc-100 pointer-events-none"
                >
                  {node.id.length > 5 ? node.id.slice(0, 5) : node.id}
                </text>

                {/* Full Vertex Label Pill Below */}
                <g transform="translate(0, 36)" className="pointer-events-none">
                  <rect
                    x={-Math.max(28, node.label.length * 3.6 + 8)}
                    y={-9}
                    width={Math.max(56, node.label.length * 7.2 + 16)}
                    height={18}
                    rx={4}
                    fill="#141517"
                    fillOpacity={0.9}
                    stroke="#27272a"
                    strokeWidth={1}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-[11px] font-medium fill-zinc-300"
                  >
                    {node.label}
                  </text>
                </g>

                {/* Degree Telemetry Badge (Top-Right of Vertex) */}
                {showDegreesOnCanvas && (
                  <g transform="translate(19, -19)" className="pointer-events-none">
                    <rect
                      x={-14}
                      y={-8}
                      width={28}
                      height={16}
                      rx={8}
                      fill={deg.isOdd ? '#451a03' : '#052e16'}
                      stroke={deg.isOdd ? '#f59e0b' : '#10b981'}
                      strokeWidth={1}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={`text-[9px] font-mono font-semibold ${
                        deg.isOdd ? 'fill-amber-300' : 'fill-emerald-300'
                      }`}
                    >
                      d:{deg.degree}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Bottom Floating Inspector Bar for Selected Node or Edge */}
      <AnimatePresence>
        {(selectedNode || selectedEdge) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#141517]/95 border border-zinc-800 shadow-2xl backdrop-blur-md"
          >
            {selectedNode && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Vertex [{selectedNode.id}]
                  </span>
                  <input
                    type="text"
                    value={selectedNode.label}
                    onChange={e => onUpdateNode(selectedNode.id, { label: e.target.value })}
                    placeholder="Vertex Label"
                    className="px-2.5 py-1 text-xs rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-sky-500 w-36"
                  />
                </div>

                {/* Color Swatches */}
                <div className="flex items-center gap-1 border-l border-zinc-800 pl-3">
                  {NODE_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => onUpdateNode(selectedNode.id, { color: c })}
                      style={{ backgroundColor: c }}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        selectedNode.color === c
                          ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-zinc-950'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>

                {/* Degree summary */}
                {degreeInfo[selectedNode.id] && (
                  <div className="text-[11px] font-mono text-zinc-400 border-l border-zinc-800 pl-3 flex items-center gap-2">
                    <span>deg: {degreeInfo[selectedNode.id].degree}</span>
                    <span className="text-zinc-600">|</span>
                    <span>in: {degreeInfo[selectedNode.id].inDegree}</span>
                    <span>out: {degreeInfo[selectedNode.id].outDegree}</span>
                  </div>
                )}

                <button
                  onClick={() => {
                    onDeleteNode(selectedNode.id);
                    setSelectedNodeId(null);
                  }}
                  className="ml-1 flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            )}

            {selectedEdge && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    Edge [{selectedEdge.source} {selectedEdge.directed ? '→' : '—'} {selectedEdge.target}]
                  </span>
                  <input
                    type="text"
                    value={selectedEdge.label || ''}
                    onChange={e => onUpdateEdge(selectedEdge.id, { label: e.target.value })}
                    placeholder="Edge label (e.g. Bridge 1)"
                    className="px-2.5 py-1 text-xs rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-orange-500 w-36"
                  />
                </div>

                <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-3">
                  <button
                    onClick={() =>
                      onUpdateEdge(selectedEdge.id, { directed: !selectedEdge.directed })
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
                    {selectedEdge.directed ? 'Directed (u → v)' : 'Undirected (u — v)'}
                  </button>

                  {selectedEdge.directed && (
                    <button
                      onClick={() =>
                        onUpdateEdge(selectedEdge.id, {
                          source: selectedEdge.target,
                          target: selectedEdge.source
                        })
                      }
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
                      title="Reverse Direction"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      Flip Direction
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    onDeleteEdge(selectedEdge.id);
                    setSelectedEdgeId(null);
                  }}
                  className="ml-1 flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom-Right Telemetry Status Bar */}
      <div className="absolute bottom-3 right-3 z-10 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#141517]/90 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 pointer-events-none">
        <span>|V| = {nodes.length}</span>
        <span className="text-zinc-700">•</span>
        <span>|E| = {edges.length}</span>
        {playbackMode && (
          <>
            <span className="text-zinc-700">•</span>
            <span className="text-orange-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Active Trace: {playbackMode.toUpperCase()}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
