export type EdgeType = 'directed' | 'undirected';

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string;
  radius?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  directed: boolean;
  weight?: number;
  label?: string;
  color?: string;
}

export interface GraphData {
  id: string;
  name: string;
  description?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  updatedAt: number;
  createdAt: number;
  isDirectedDefault?: boolean;
}

export interface NodeDegreeInfo {
  inDegree: number;
  outDegree: number;
  degree: number; // for undirected: total; for directed: in + out
  isOdd: boolean;
}

export interface EulerianStep {
  step: number;
  fromNodeId: string;
  toNodeId: string;
  edgeId: string;
  remainingEdgesCount: number;
  stackState: string[];
  circuitSoFar: string[];
  note: string;
}

export interface EulerianResult {
  hasEulerianCircuit: boolean;
  hasEulerianPath: boolean;
  type: 'none' | 'path' | 'circuit';
  startNodeId?: string;
  endNodeId?: string;
  pathNodes: string[]; // sequence of node IDs in traversal
  pathEdges: string[]; // sequence of edge IDs traversed
  degreeInfo: Record<string, NodeDegreeInfo>;
  oddDegreeNodes: string[];
  isolatedNodesCount: number;
  connectedComponentsCount: number;
  explanation: string;
  detailedSteps: EulerianStep[];
  isDirectedGraph: boolean;
  isMixedGraph: boolean;
}

export interface HamiltonianStep {
  step: number;
  currentNodeId: string;
  pathSoFar: string[];
  edgesTraversed: string[];
  decision: 'visit' | 'backtrack' | 'found_path' | 'found_circuit' | 'prune';
  note: string;
}

export interface HamiltonianResult {
  hasHamiltonianCircuit: boolean;
  hasHamiltonianPath: boolean;
  circuits: {
    nodes: string[];
    edges: string[];
  }[];
  paths: {
    nodes: string[];
    edges: string[];
  }[];
  primaryCircuit?: {
    nodes: string[];
    edges: string[];
  };
  primaryPath?: {
    nodes: string[];
    edges: string[];
  };
  diracConditionSatisfied?: boolean;
  oreConditionSatisfied?: boolean;
  explanation: string;
  detailedSteps: HamiltonianStep[];
  nodesVisitedCount: number;
  backtrackCount: number;
  executionTimeMs: number;
  truncatedDueToComplexity?: boolean;
}

export interface FullAnalysisResult {
  eulerian: EulerianResult;
  hamiltonian: HamiltonianResult;
  timestamp: number;
}

export type CanvasTool = 'select' | 'node' | 'directed-edge' | 'undirected-edge' | 'erase' | 'pan';
export type ViewMode = 'split' | 'canvas-only' | 'matrix-only' | 'incidence-only' | 'edges-only';
