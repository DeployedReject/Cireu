import {
  GraphNode,
  GraphEdge,
  HamiltonianResult,
  HamiltonianStep
} from '../types/graph';

interface OutgoingConnection {
  edgeId: string;
  targetId: string;
}

/**
 * Computes comprehensive Hamiltonian Circuit & Path analysis for Undirected, Directed, and Mixed graphs.
 * Evaluates Dirac's & Ore's sufficient conditions and runs bounded backtracking with step recording.
 */
export function analyzeHamiltonian(nodes: GraphNode[], edges: GraphEdge[]): HamiltonianResult {
  const startTime = performance.now();
  const n = nodes.length;

  if (n === 0) {
    return {
      hasHamiltonianCircuit: false,
      hasHamiltonianPath: false,
      circuits: [],
      paths: [],
      explanation: 'Graph is empty. Add vertices and edges to analyze Hamiltonian properties.',
      detailedSteps: [],
      nodesVisitedCount: 0,
      backtrackCount: 0,
      executionTimeMs: 0
    };
  }

  const nodeMap = new Map<string, GraphNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Trivial 1-vertex case
  if (n === 1) {
    const onlyId = nodes[0].id;
    const selfLoop = edges.find(e => e.source === onlyId && e.target === onlyId);
    const hasCircuit = Boolean(selfLoop);
    return {
      hasHamiltonianCircuit: hasCircuit,
      hasHamiltonianPath: true,
      circuits: hasCircuit && selfLoop ? [{ nodes: [onlyId, onlyId], edges: [selfLoop.id] }] : [],
      paths: [{ nodes: [onlyId], edges: [] }],
      primaryCircuit: hasCircuit && selfLoop ? { nodes: [onlyId, onlyId], edges: [selfLoop.id] } : undefined,
      primaryPath: { nodes: [onlyId], edges: [] },
      explanation: hasCircuit
        ? 'Single vertex with self-loop forms a trivial Hamiltonian circuit and path.'
        : 'Single vertex forms a trivial Hamiltonian path of length 0.',
      detailedSteps: [
        {
          step: 1,
          currentNodeId: onlyId,
          pathSoFar: [onlyId],
          edgesTraversed: selfLoop ? [selfLoop.id] : [],
          decision: hasCircuit ? 'found_circuit' : 'found_path',
          note: `Start at ${nodes[0].label || onlyId}`
        }
      ],
      nodesVisitedCount: 1,
      backtrackCount: 0,
      executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100
    };
  }

  const validEdges = edges.filter(
    e => nodeMap.has(e.source) && nodeMap.has(e.target) && e.source !== e.target
  );

  // Build adjacency list mapping u -> Map<v, edgeId> (keep first edge between u and v for simple traversal)
  const adj = new Map<string, OutgoingConnection[]>();
  const simpleNeighborSet = new Map<string, Set<string>>();

  for (const node of nodes) {
    adj.set(node.id, []);
    simpleNeighborSet.set(node.id, new Set<string>());
  }

  let hasDirectedEdge = false;
  for (const e of validEdges) {
    if (e.directed) hasDirectedEdge = true;

    const uList = adj.get(e.source)!;
    if (!uList.some(item => item.targetId === e.target)) {
      uList.push({ edgeId: e.id, targetId: e.target });
    }
    simpleNeighborSet.get(e.source)!.add(e.target);

    if (!e.directed) {
      const vList = adj.get(e.target)!;
      if (!vList.some(item => item.targetId === e.source)) {
        vList.push({ edgeId: e.id, targetId: e.source });
      }
      simpleNeighborSet.get(e.target)!.add(e.source);
    }
  }

  // Evaluate Dirac's and Ore's sufficient conditions (applicable to undirected graphs with n >= 3)
  let diracConditionSatisfied: boolean | undefined = undefined;
  let oreConditionSatisfied: boolean | undefined = undefined;

  if (!hasDirectedEdge && n >= 3) {
    diracConditionSatisfied = nodes.every(
      u => (simpleNeighborSet.get(u.id)?.size || 0) >= n / 2
    );

    let oreHolds = true;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const uId = nodes[i].id;
        const vId = nodes[j].id;
        const uNeighbors = simpleNeighborSet.get(uId)!;
        if (!uNeighbors.has(vId)) {
          const degSum = uNeighbors.size + (simpleNeighborSet.get(vId)?.size || 0);
          if (degSum < n) {
            oreHolds = false;
            break;
          }
        }
      }
      if (!oreHolds) break;
    }
    oreConditionSatisfied = oreHolds;
  }

  const circuits: { nodes: string[]; edges: string[] }[] = [];
  const paths: { nodes: string[]; edges: string[] }[] = [];
  const seenCircuitSignatures = new Set<string>();
  const seenPathSignatures = new Set<string>();

  const MAX_SOLUTIONS = 20;
  const MAX_VISITS = 150000;
  const MAX_RECORDED_SEARCH_STEPS = 250;

  let nodesVisitedCount = 0;
  let backtrackCount = 0;
  let truncatedDueToComplexity = false;
  const searchSteps: HamiltonianStep[] = [];

  const visited = new Set<string>();
  const currentNodes: string[] = [];
  const currentEdges: string[] = [];

  function recordSearchStep(
    currentNodeId: string,
    decision: HamiltonianStep['decision'],
    note: string
  ) {
    if (searchSteps.length < MAX_RECORDED_SEARCH_STEPS) {
      searchSteps.push({
        step: searchSteps.length + 1,
        currentNodeId,
        pathSoFar: [...currentNodes],
        edgesTraversed: [...currentEdges],
        decision,
        note
      });
    }
  }

  function backtrack(uId: string, startId: string) {
    if (nodesVisitedCount >= MAX_VISITS) {
      truncatedDueToComplexity = true;
      return;
    }
    if (circuits.length >= MAX_SOLUTIONS && paths.length >= MAX_SOLUTIONS) {
      return;
    }

    nodesVisitedCount++;

    if (currentNodes.length === n) {
      // Found a Hamiltonian Path!
      const pathSig = currentNodes.join('->');
      if (!seenPathSignatures.has(pathSig) && paths.length < MAX_SOLUTIONS) {
        seenPathSignatures.add(pathSig);
        paths.push({
          nodes: [...currentNodes],
          edges: [...currentEdges]
        });
        const startLabel = nodeMap.get(startId)?.label || startId;
        const endLabel = nodeMap.get(uId)?.label || uId;
        recordSearchStep(
          uId,
          'found_path',
          `Hamiltonian Path reached! Visited all ${n} vertices (${startLabel} ⋯ ${endLabel}).`
        );
      }

      // Check if we can close the cycle back to startId
      const neighbors = adj.get(uId) || [];
      const closingEdge = neighbors.find(nb => nb.targetId === startId);
      if (closingEdge && (n > 2 || hasDirectedEdge || validEdges.filter(
        e => (e.source === uId && e.target === startId) || (!e.directed && e.source === startId && e.target === uId)
      ).length > 1)) {
        const cycleNodes = [...currentNodes, startId];
        const cycleEdges = [...currentEdges, closingEdge.edgeId];
        const sig = cycleNodes.join('->');
        if (!seenCircuitSignatures.has(sig) && circuits.length < MAX_SOLUTIONS) {
          seenCircuitSignatures.add(sig);
          circuits.push({
            nodes: cycleNodes,
            edges: cycleEdges
          });
          const startLabel = nodeMap.get(startId)?.label || startId;
          recordSearchStep(
            startId,
            'found_circuit',
            `Hamiltonian Circuit completed! Closed cycle back to ${startLabel} via edge [${closingEdge.edgeId}].`
          );
        }
      }
      return;
    }

    const neighbors = adj.get(uId) || [];
    for (const nb of neighbors) {
      if (!visited.has(nb.targetId)) {
        visited.add(nb.targetId);
        currentNodes.push(nb.targetId);
        currentEdges.push(nb.edgeId);

        const fromLabel = nodeMap.get(uId)?.label || uId;
        const toLabel = nodeMap.get(nb.targetId)?.label || nb.targetId;
        recordSearchStep(
          nb.targetId,
          'visit',
          `Advance ${fromLabel} → ${toLabel} (${currentNodes.length}/${n} vertices visited)`
        );

        backtrack(nb.targetId, startId);

        visited.delete(nb.targetId);
        currentNodes.pop();
        currentEdges.pop();
        backtrackCount++;

        recordSearchStep(
          uId,
          'backtrack',
          `Backtrack from ${toLabel} to ${fromLabel}`
        );

        if (
          truncatedDueToComplexity ||
          (circuits.length >= MAX_SOLUTIONS && paths.length >= MAX_SOLUTIONS)
        ) {
          return;
        }
      }
    }
  }

  // Run search from every starting vertex to ensure we find Hamiltonian paths even if no circuit exists
  for (const startNode of nodes) {
    visited.clear();
    currentNodes.length = 0;
    currentEdges.length = 0;

    visited.add(startNode.id);
    currentNodes.push(startNode.id);

    recordSearchStep(
      startNode.id,
      'visit',
      `Initialize search from root vertex ${startNode.label || startNode.id}`
    );

    backtrack(startNode.id, startNode.id);

    if (
      truncatedDueToComplexity ||
      (circuits.length >= MAX_SOLUTIONS && paths.length >= MAX_SOLUTIONS)
    ) {
      break;
    }
  }

  const hasHamiltonianCircuit = circuits.length > 0;
  const hasHamiltonianPath = paths.length > 0;
  const primaryCircuit = circuits[0];
  const primaryPath = paths[0];

  // Build clean direct step-by-step sequence for the primary solution if one exists,
  // so playback clearly steps through the winning circuit/path first!
  const solutionSteps: HamiltonianStep[] = [];
  const chosenSolution = primaryCircuit || primaryPath;

  if (chosenSolution) {
    const isCircuitSol = Boolean(primaryCircuit);
    for (let i = 0; i < chosenSolution.nodes.length; i++) {
      const currId = chosenSolution.nodes[i];
      const currLabel = nodeMap.get(currId)?.label || currId;

      if (i === 0) {
        solutionSteps.push({
          step: 1,
          currentNodeId: currId,
          pathSoFar: [currId],
          edgesTraversed: [],
          decision: 'visit',
          note: `Step 1: Start at vertex ${currLabel} (1/${n} visited)`
        });
      } else {
        const prevId = chosenSolution.nodes[i - 1];
        const prevLabel = nodeMap.get(prevId)?.label || prevId;
        const edgeId = chosenSolution.edges[i - 1];
        const isClosingStep = isCircuitSol && i === chosenSolution.nodes.length - 1;

        solutionSteps.push({
          step: i + 1,
          currentNodeId: currId,
          pathSoFar: chosenSolution.nodes.slice(0, i + 1),
          edgesTraversed: chosenSolution.edges.slice(0, i),
          decision: isClosingStep
            ? 'found_circuit'
            : i === n - 1
            ? 'found_path'
            : 'visit',
          note: isClosingStep
            ? `Step ${i + 1}: Return ${prevLabel} → ${currLabel} via [${edgeId}] to close the Hamiltonian Circuit!`
            : `Step ${i + 1}: Visit ${prevLabel} → ${currLabel} via [${edgeId}] (${Math.min(i + 1, n)}/${n} vertices)`
        });
      }
    }
  }

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  let explanation = '';
  if (hasHamiltonianCircuit) {
    const startLabel = nodeMap.get(primaryCircuit.nodes[0])?.label || primaryCircuit.nodes[0];
    explanation = `Hamiltonian Circuit confirmed! Found ${circuits.length}${
      circuits.length === MAX_SOLUTIONS ? '+' : ''
    } closed cycle(s) visiting all ${n} vertices exactly once and returning to ${startLabel}.`;
  } else if (hasHamiltonianPath) {
    const startLabel = nodeMap.get(primaryPath.nodes[0])?.label || primaryPath.nodes[0];
    const endLabel =
      nodeMap.get(primaryPath.nodes[primaryPath.nodes.length - 1])?.label ||
      primaryPath.nodes[primaryPath.nodes.length - 1];
    explanation = `Hamiltonian Path confirmed (No Circuit)! Found ${paths.length}${
      paths.length === MAX_SOLUTIONS ? '+' : ''
    } open path(s) visiting all ${n} vertices (e.g. ${startLabel} → ⋯ → ${endLabel}), but no closing edge completes a cycle.`;
  } else {
    explanation = `No Hamiltonian Circuit or Path exists. Exhausted ${nodesVisitedCount.toLocaleString()} state transitions with ${backtrackCount.toLocaleString()} backtracks without reaching all ${n} vertices in a simple walk.`;
  }

  return {
    hasHamiltonianCircuit,
    hasHamiltonianPath,
    circuits,
    paths,
    primaryCircuit,
    primaryPath,
    diracConditionSatisfied,
    oreConditionSatisfied,
    explanation,
    detailedSteps: solutionSteps.length > 0 ? solutionSteps : searchSteps,
    nodesVisitedCount,
    backtrackCount,
    executionTimeMs,
    truncatedDueToComplexity
  };
}
