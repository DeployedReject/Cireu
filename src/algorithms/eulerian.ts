import {
  GraphNode,
  GraphEdge,
  EulerianResult,
  EulerianStep,
  NodeDegreeInfo
} from '../types/graph';

interface AdjEdge {
  edgeId: string;
  to: string;
  directed: boolean;
}

/**
 * Computes comprehensive Eulerian Circuit & Path analysis for Undirected, Directed, and Mixed graphs.
 * Uses Hierholzer's Algorithm for pure graphs and edge-orientation / DFS solver for mixed graphs.
 */
export function analyzeEulerian(nodes: GraphNode[], edges: GraphEdge[]): EulerianResult {
  const degreeInfo: Record<string, NodeDegreeInfo> = {};
  const nodeMap = new Map<string, GraphNode>();

  for (const n of nodes) {
    nodeMap.set(n.id, n);
    degreeInfo[n.id] = {
      inDegree: 0,
      outDegree: 0,
      degree: 0,
      isOdd: false
    };
  }

  // Filter edges whose endpoints exist
  const validEdges = edges.filter(
    e => nodeMap.has(e.source) && nodeMap.has(e.target)
  );

  const directedCount = validEdges.filter(e => e.directed).length;
  const undirectedCount = validEdges.filter(e => !e.directed).length;
  const isDirectedGraph = directedCount > 0 && undirectedCount === 0;
  const isMixedGraph = directedCount > 0 && undirectedCount > 0;

  // Compute degree metrics
  for (const edge of validEdges) {
    if (edge.directed) {
      degreeInfo[edge.source].outDegree += 1;
      degreeInfo[edge.target].inDegree += 1;
      degreeInfo[edge.source].degree += 1;
      degreeInfo[edge.target].degree += 1;
    } else {
      if (edge.source === edge.target) {
        // Self-loop in undirected graph adds 2 to degree
        degreeInfo[edge.source].degree += 2;
        degreeInfo[edge.source].inDegree += 1;
        degreeInfo[edge.source].outDegree += 1;
      } else {
        degreeInfo[edge.source].degree += 1;
        degreeInfo[edge.target].degree += 1;
        degreeInfo[edge.source].outDegree += 1;
        degreeInfo[edge.source].inDegree += 1;
        degreeInfo[edge.target].outDegree += 1;
        degreeInfo[edge.target].inDegree += 1;
      }
    }
  }

  const oddDegreeNodes: string[] = [];
  let isolatedNodesCount = 0;

  for (const n of nodes) {
    const info = degreeInfo[n.id];
    info.isOdd = info.degree % 2 !== 0;
    if (info.isOdd) {
      oddDegreeNodes.push(n.id);
    }
    if (info.degree === 0) {
      isolatedNodesCount += 1;
    }
  }

  // Base cases: empty or 0 edges
  if (nodes.length === 0) {
    return {
      hasEulerianCircuit: false,
      hasEulerianPath: false,
      type: 'none',
      pathNodes: [],
      pathEdges: [],
      degreeInfo,
      oddDegreeNodes: [],
      isolatedNodesCount: 0,
      connectedComponentsCount: 0,
      explanation: 'Graph is empty. Add vertices and edges to analyze Eulerian properties.',
      detailedSteps: [],
      isDirectedGraph: false,
      isMixedGraph: false
    };
  }

  if (validEdges.length === 0) {
    return {
      hasEulerianCircuit: false,
      hasEulerianPath: false,
      type: 'none',
      pathNodes: [],
      pathEdges: [],
      degreeInfo,
      oddDegreeNodes: [],
      isolatedNodesCount,
      connectedComponentsCount: nodes.length,
      explanation: 'Graph has no edges. Add at least one edge to form an Eulerian walk.',
      detailedSteps: [],
      isDirectedGraph: false,
      isMixedGraph: false
    };
  }

  // Compute underlying undirected connected components among non-isolated vertices
  const nonIsolatedNodes = nodes.filter(n => degreeInfo[n.id].degree > 0);
  const undirectedAdj = new Map<string, string[]>();
  for (const n of nonIsolatedNodes) {
    undirectedAdj.set(n.id, []);
  }
  for (const e of validEdges) {
    undirectedAdj.get(e.source)?.push(e.target);
    undirectedAdj.get(e.target)?.push(e.source);
  }

  const visited = new Set<string>();
  let connectedComponentsCount = 0;
  for (const n of nonIsolatedNodes) {
    if (!visited.has(n.id)) {
      connectedComponentsCount += 1;
      const queue = [n.id];
      visited.add(n.id);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const nb of undirectedAdj.get(curr) || []) {
          if (!visited.has(nb)) {
            visited.add(nb);
            queue.push(nb);
          }
        }
      }
    }
  }

  if (connectedComponentsCount > 1) {
    return {
      hasEulerianCircuit: false,
      hasEulerianPath: false,
      type: 'none',
      pathNodes: [],
      pathEdges: [],
      degreeInfo,
      oddDegreeNodes,
      isolatedNodesCount,
      connectedComponentsCount,
      explanation: `Disconnected edges: The graph's edges span ${connectedComponentsCount} separate connected components. All edges must belong to a single connected component for an Eulerian path or circuit to exist.`,
      detailedSteps: [],
      isDirectedGraph,
      isMixedGraph
    };
  }

  // Case 1: Pure Undirected Graph
  if (!isDirectedGraph && !isMixedGraph) {
    if (oddDegreeNodes.length !== 0 && oddDegreeNodes.length !== 2) {
      const oddLabels = oddDegreeNodes.map(id => nodeMap.get(id)?.label || id).join(', ');
      return {
        hasEulerianCircuit: false,
        hasEulerianPath: false,
        type: 'none',
        pathNodes: [],
        pathEdges: [],
        degreeInfo,
        oddDegreeNodes,
        isolatedNodesCount,
        connectedComponentsCount,
        explanation: `Euler's Theorem violated: An undirected graph has an Eulerian Circuit iff 0 vertices have odd degree, and an Eulerian Path iff 2 vertices have odd degree. Currently ${oddDegreeNodes.length} vertices have odd degree (${oddLabels}).`,
        detailedSteps: [],
        isDirectedGraph: false,
        isMixedGraph: false
      };
    }

    const isCircuit = oddDegreeNodes.length === 0;
    const startNodeId = isCircuit ? nonIsolatedNodes[0].id : oddDegreeNodes[0];

    const { pathNodes, pathEdges, detailedSteps } = runHierholzer(
      startNodeId,
      validEdges,
      nodeMap,
      false
    );

    const endNodeId = pathNodes[pathNodes.length - 1];
    const startLabel = nodeMap.get(startNodeId)?.label || startNodeId;
    const endLabel = nodeMap.get(endNodeId)?.label || endNodeId;

    return {
      hasEulerianCircuit: isCircuit,
      hasEulerianPath: true,
      type: isCircuit ? 'circuit' : 'path',
      startNodeId,
      endNodeId,
      pathNodes,
      pathEdges,
      degreeInfo,
      oddDegreeNodes,
      isolatedNodesCount,
      connectedComponentsCount,
      explanation: isCircuit
        ? `Eulerian Circuit confirmed! All ${nonIsolatedNodes.length} active vertices have even degree and are connected. Complete closed tour traverses all ${validEdges.length} edges starting and ending at ${startLabel}.`
        : `Eulerian Path confirmed (No Circuit)! Exactly 2 vertices have odd degree (${nodeMap.get(oddDegreeNodes[0])?.label} and ${nodeMap.get(oddDegreeNodes[1])?.label}). Open Eulerian walk starts at ${startLabel} and terminates at ${endLabel}.`,
      detailedSteps,
      isDirectedGraph: false,
      isMixedGraph: false
    };
  }

  // Case 2: Pure Directed Graph
  if (isDirectedGraph && !isMixedGraph) {
    let startCandidates: string[] = [];
    let endCandidates: string[] = [];
    let imbalancedNodes: string[] = [];

    for (const n of nonIsolatedNodes) {
      const info = degreeInfo[n.id];
      const diff = info.outDegree - info.inDegree;
      if (diff === 1) {
        startCandidates.push(n.id);
      } else if (diff === -1) {
        endCandidates.push(n.id);
      } else if (diff !== 0) {
        imbalancedNodes.push(n.id);
      }
    }

    const isCircuitBalance =
      startCandidates.length === 0 &&
      endCandidates.length === 0 &&
      imbalancedNodes.length === 0;
    const isPathBalance =
      startCandidates.length === 1 &&
      endCandidates.length === 1 &&
      imbalancedNodes.length === 0;

    if (!isCircuitBalance && !isPathBalance) {
      return {
        hasEulerianCircuit: false,
        hasEulerianPath: false,
        type: 'none',
        pathNodes: [],
        pathEdges: [],
        degreeInfo,
        oddDegreeNodes,
        isolatedNodesCount,
        connectedComponentsCount,
        explanation: `Directed degree balance failed: For a directed Eulerian Circuit, every vertex must have in-degree = out-degree. For a directed Eulerian Path, at most one vertex can have (out − in = 1) and one (in − out = 1).`,
        detailedSteps: [],
        isDirectedGraph: true,
        isMixedGraph: false
      };
    }

    const startNodeId = isCircuitBalance ? nonIsolatedNodes[0].id : startCandidates[0];
    const { pathNodes, pathEdges, detailedSteps } = runHierholzer(
      startNodeId,
      validEdges,
      nodeMap,
      true
    );

    // Verify all edges were actually reached in directed traversal
    if (pathEdges.length < validEdges.length) {
      return {
        hasEulerianCircuit: false,
        hasEulerianPath: false,
        type: 'none',
        pathNodes: [],
        pathEdges: [],
        degreeInfo,
        oddDegreeNodes,
        isolatedNodesCount,
        connectedComponentsCount,
        explanation: `Directed reachability failed: Although vertex in/out degrees appear balanced, the directed edges do not form a single strongly connected walk (only ${pathEdges.length} of ${validEdges.length} edges reachable).`,
        detailedSteps: [],
        isDirectedGraph: true,
        isMixedGraph: false
      };
    }

    const endNodeId = pathNodes[pathNodes.length - 1];
    const isCircuit = isCircuitBalance && startNodeId === endNodeId;
    const startLabel = nodeMap.get(startNodeId)?.label || startNodeId;
    const endLabel = nodeMap.get(endNodeId)?.label || endNodeId;

    return {
      hasEulerianCircuit: isCircuit,
      hasEulerianPath: true,
      type: isCircuit ? 'circuit' : 'path',
      startNodeId,
      endNodeId,
      pathNodes,
      pathEdges,
      degreeInfo,
      oddDegreeNodes,
      isolatedNodesCount,
      connectedComponentsCount,
      explanation: isCircuit
        ? `Directed Eulerian Circuit confirmed! Every vertex has matching in-degree and out-degree, and all ${validEdges.length} directed edges form a strongly connected closed tour starting at ${startLabel}.`
        : `Directed Eulerian Path confirmed! Source vertex ${startLabel} has (out − in = 1) and sink vertex ${endLabel} has (in − out = 1), traversing all ${validEdges.length} edges.`,
      detailedSteps,
      isDirectedGraph: true,
      isMixedGraph: false
    };
  }

  // Case 3: Mixed Graph (Both directed and undirected edges)
  return solveMixedEulerian(
    nonIsolatedNodes,
    validEdges,
    nodeMap,
    degreeInfo,
    oddDegreeNodes,
    isolatedNodesCount,
    connectedComponentsCount
  );
}

/**
 * Hierholzer's Algorithm with deterministic edge tracking and step-by-step trace generation.
 */
function runHierholzer(
  startNodeId: string,
  edges: GraphEdge[],
  nodeMap: Map<string, GraphNode>,
  isDirected: boolean
): {
  pathNodes: string[];
  pathEdges: string[];
  detailedSteps: EulerianStep[];
} {
  const adj = new Map<string, AdjEdge[]>();
  for (const id of nodeMap.keys()) {
    adj.set(id, []);
  }

  for (const e of edges) {
    adj.get(e.source)?.push({ edgeId: e.id, to: e.target, directed: e.directed });
    if (!isDirected && e.source !== e.target) {
      adj.get(e.target)?.push({ edgeId: e.id, to: e.source, directed: e.directed });
    }
  }

  const usedEdges = new Set<string>();
  const nodeStack: string[] = [startNodeId];
  const edgeStack: { edgeId: string; from: string; to: string }[] = [];

  const finalNodes: string[] = [];
  const finalEdges: string[] = [];
  const rawSteps: { from: string; to: string; edgeId: string; stackSnapshot: string[]; circuitSnapshot: string[] }[] = [];

  while (nodeStack.length > 0) {
    const u = nodeStack[nodeStack.length - 1];
    const neighbors = adj.get(u) || [];

    // Find next unused incident edge
    while (neighbors.length > 0 && usedEdges.has(neighbors[0].edgeId)) {
      neighbors.shift();
    }

    if (neighbors.length > 0) {
      const nextEdge = neighbors.shift()!;
      usedEdges.add(nextEdge.edgeId);
      nodeStack.push(nextEdge.to);
      edgeStack.push({ edgeId: nextEdge.edgeId, from: u, to: nextEdge.to });

      rawSteps.push({
        from: u,
        to: nextEdge.to,
        edgeId: nextEdge.edgeId,
        stackSnapshot: [...nodeStack],
        circuitSnapshot: [...finalNodes]
      });
    } else {
      const poppedNode = nodeStack.pop()!;
      finalNodes.push(poppedNode);
      if (edgeStack.length > 0) {
        const poppedEdge = edgeStack.pop()!;
        finalEdges.push(poppedEdge.edgeId);
      }
    }
  }

  finalNodes.reverse();
  finalEdges.reverse();

  // Build ordered playback steps matching the final Eulerian sequence
  const detailedSteps: EulerianStep[] = [];
  for (let i = 0; i < finalEdges.length; i++) {
    const fromId = finalNodes[i];
    const toId = finalNodes[i + 1];
    const edgeId = finalEdges[i];
    const fromLabel = nodeMap.get(fromId)?.label || fromId;
    const toLabel = nodeMap.get(toId)?.label || toId;

    detailedSteps.push({
      step: i + 1,
      fromNodeId: fromId,
      toNodeId: toId,
      edgeId,
      remainingEdgesCount: finalEdges.length - (i + 1),
      stackState: finalNodes.slice(0, i + 2),
      circuitSoFar: finalNodes.slice(0, i + 2),
      note: `Step ${i + 1}: Traverse edge [${edgeId}] from ${fromLabel} → ${toLabel} (${finalEdges.length - (i + 1)} edges remaining)`
    });
  }

  return {
    pathNodes: finalNodes,
    pathEdges: finalEdges,
    detailedSteps
  };
}

/**
 * Solves Eulerian Circuit / Path for Mixed Graphs (having both directed and undirected edges)
 */
function solveMixedEulerian(
  nonIsolatedNodes: GraphNode[],
  validEdges: GraphEdge[],
  nodeMap: Map<string, GraphNode>,
  degreeInfo: Record<string, NodeDegreeInfo>,
  oddDegreeNodes: string[],
  isolatedNodesCount: number,
  connectedComponentsCount: number
): EulerianResult {
  // Build adjacency with both directed and undirected edges
  const adj = new Map<string, AdjEdge[]>();
  for (const n of nonIsolatedNodes) {
    adj.set(n.id, []);
  }
  for (const e of validEdges) {
    adj.get(e.source)?.push({ edgeId: e.id, to: e.target, directed: e.directed });
    if (!e.directed && e.source !== e.target) {
      adj.get(e.target)?.push({ edgeId: e.id, to: e.source, directed: false });
    }
  }

  // Order candidate starting nodes: try nodes with odd degree or positive out-in balance first
  const candidates = [...nonIsolatedNodes.map(n => n.id)].sort((a, b) => {
    const aOdd = degreeInfo[a].isOdd ? 0 : 1;
    const bOdd = degreeInfo[b].isOdd ? 0 : 1;
    return aOdd - bOdd;
  });

  let bestCircuitNodes: string[] | null = null;
  let bestCircuitEdges: string[] | null = null;
  let bestPathNodes: string[] | null = null;
  let bestPathEdges: string[] | null = null;

  const totalEdges = validEdges.length;
  let operations = 0;
  const MAX_OPS = 60000;

  for (const startId of candidates) {
    const used = new Set<string>();
    const nodeSeq: string[] = [startId];
    const edgeSeq: string[] = [];

    function dfs(u: string): boolean {
      operations++;
      if (operations > MAX_OPS) return false;

      if (edgeSeq.length === totalEdges) {
        if (u === startId) {
          bestCircuitNodes = [...nodeSeq];
          bestCircuitEdges = [...edgeSeq];
          return true; // Found circuit!
        } else if (!bestPathNodes) {
          bestPathNodes = [...nodeSeq];
          bestPathEdges = [...edgeSeq];
        }
        return false;
      }

      const list = adj.get(u) || [];
      for (const item of list) {
        if (!used.has(item.edgeId)) {
          used.add(item.edgeId);
          nodeSeq.push(item.to);
          edgeSeq.push(item.edgeId);

          if (dfs(item.to)) return true;

          used.delete(item.edgeId);
          nodeSeq.pop();
          edgeSeq.pop();
        }
      }
      return false;
    }

    if (dfs(startId)) break;
  }

  const chosenNodes: string[] = bestCircuitNodes || bestPathNodes || [];
  const chosenEdges: string[] = bestCircuitEdges || bestPathEdges || [];
  const isCircuit = Boolean(bestCircuitNodes);
  const isPath = chosenEdges.length === totalEdges;

  if (!isPath) {
    return {
      hasEulerianCircuit: false,
      hasEulerianPath: false,
      type: 'none',
      pathNodes: [],
      pathEdges: [],
      degreeInfo,
      oddDegreeNodes,
      isolatedNodesCount,
      connectedComponentsCount,
      explanation: `Mixed Graph Analysis: No valid orientation of undirected edges allows traversing all ${totalEdges} edges in a single continuous walk while respecting directed edge constraints.`,
      detailedSteps: [],
      isDirectedGraph: false,
      isMixedGraph: true
    };
  }

  const detailedSteps: EulerianStep[] = chosenEdges.map((edgeId, i) => {
    const fromId = chosenNodes[i];
    const toId = chosenNodes[i + 1];
    const fromLabel = nodeMap.get(fromId)?.label || fromId;
    const toLabel = nodeMap.get(toId)?.label || toId;
    return {
      step: i + 1,
      fromNodeId: fromId,
      toNodeId: toId,
      edgeId,
      remainingEdgesCount: chosenEdges.length - (i + 1),
      stackState: chosenNodes.slice(0, i + 2),
      circuitSoFar: chosenNodes.slice(0, i + 2),
      note: `Step ${i + 1}: Traverse [${edgeId}] from ${fromLabel} → ${toLabel}`
    };
  });

  const startNodeId = chosenNodes[0];
  const endNodeId = chosenNodes[chosenNodes.length - 1];

  return {
    hasEulerianCircuit: isCircuit,
    hasEulerianPath: true,
    type: isCircuit ? 'circuit' : 'path',
    startNodeId,
    endNodeId,
    pathNodes: chosenNodes,
    pathEdges: chosenEdges,
    degreeInfo,
    oddDegreeNodes,
    isolatedNodesCount,
    connectedComponentsCount,
    explanation: isCircuit
      ? `Mixed Graph Eulerian Circuit confirmed! Undirected edges can be consistently oriented to form a closed Eulerian tour of all ${totalEdges} edges.`
      : `Mixed Graph Eulerian Path confirmed! Walk starts at ${nodeMap.get(startNodeId)?.label || startNodeId} and ends at ${nodeMap.get(endNodeId)?.label || endNodeId}.`,
    detailedSteps,
    isDirectedGraph: false,
    isMixedGraph: true
  };
}
