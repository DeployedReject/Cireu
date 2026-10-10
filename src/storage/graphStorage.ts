import { GraphData } from '../types/graph';

const STORAGE_KEY = 'cireu_graph_library_v1';
const CURRENT_GRAPH_ID_KEY = 'cireu_current_active_graph_id';

export const PRESET_GRAPHS: GraphData[] = [
  {
    id: 'preset-konigsberg',
    name: 'Königsberg Seven Bridges',
    description: 'The historical 1736 problem solved by Euler. 4 landmasses connected by 7 bridges. All nodes have odd degrees (3, 3, 3, 5), so no Eulerian path or circuit exists.',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    isDirectedDefault: false,
    nodes: [
      { id: 'A', label: 'North Bank (A)', x: 400, y: 150, color: '#3b82f6' },
      { id: 'B', label: 'South Bank (B)', x: 400, y: 450, color: '#3b82f6' },
      { id: 'C', label: 'Kneiphof Island (C)', x: 300, y: 300, color: '#f59e0b' },
      { id: 'D', label: 'Lomse Island (D)', x: 550, y: 300, color: '#10b981' }
    ],
    edges: [
      { id: 'e1', source: 'A', target: 'C', directed: false, label: 'Bridge 1' },
      { id: 'e2', source: 'A', target: 'C', directed: false, label: 'Bridge 2' },
      { id: 'e3', source: 'B', target: 'C', directed: false, label: 'Bridge 3' },
      { id: 'e4', source: 'B', target: 'C', directed: false, label: 'Bridge 4' },
      { id: 'e5', source: 'A', target: 'D', directed: false, label: 'Bridge 5' },
      { id: 'e6', source: 'B', target: 'D', directed: false, label: 'Bridge 6' },
      { id: 'e7', source: 'C', target: 'D', directed: false, label: 'Bridge 7' }
    ]
  },
  {
    id: 'preset-eulerian-envelope',
    name: 'Eulerian House (Open Envelope)',
    description: 'Classic single-stroke drawing puzzle. Exactly 2 vertices have odd degree (the two bottom corners), yielding a valid Eulerian Path starting at one bottom corner and ending at the other.',
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
    isDirectedDefault: false,
    nodes: [
      { id: 'Roof', label: 'Roof Peak (R)', x: 400, y: 140, color: '#ec4899' },
      { id: 'TL', label: 'Top Left (TL)', x: 260, y: 260, color: '#3b82f6' },
      { id: 'TR', label: 'Top Right (TR)', x: 540, y: 260, color: '#3b82f6' },
      { id: 'BL', label: 'Bottom Left (BL)', x: 260, y: 460, color: '#f59e0b' },
      { id: 'BR', label: 'Bottom Right (BR)', x: 540, y: 460, color: '#f59e0b' }
    ],
    edges: [
      { id: 'e1', source: 'Roof', target: 'TL', directed: false },
      { id: 'e2', source: 'Roof', target: 'TR', directed: false },
      { id: 'e3', source: 'TL', target: 'TR', directed: false },
      { id: 'e4', source: 'TL', target: 'BL', directed: false },
      { id: 'e5', source: 'TR', target: 'BR', directed: false },
      { id: 'e6', source: 'BL', target: 'BR', directed: false },
      { id: 'e7', source: 'TL', target: 'BR', directed: false },
      { id: 'e8', source: 'TR', target: 'BL', directed: false }
    ]
  },
  {
    id: 'preset-petersen',
    name: 'Petersen Graph',
    description: 'A famous cubic graph known as a counterexample in graph theory. It is hypohamiltonian: it has NO Hamiltonian Circuit, but deleting any single vertex creates a Hamiltonian graph. It has Hamiltonian paths.',
    createdAt: 1700000002000,
    updatedAt: 1700000002000,
    isDirectedDefault: false,
    nodes: [
      // Outer pentagon
      { id: 'u0', label: '0 (Outer)', x: 400, y: 120, color: '#6366f1' },
      { id: 'u1', label: '1 (Outer)', x: 571, y: 244, color: '#6366f1' },
      { id: 'u2', label: '2 (Outer)', x: 506, y: 446, color: '#6366f1' },
      { id: 'u3', label: '3 (Outer)', x: 294, y: 446, color: '#6366f1' },
      { id: 'u4', label: '4 (Outer)', x: 229, y: 244, color: '#6366f1' },
      // Inner star
      { id: 'v0', label: '5 (Inner)', x: 400, y: 230, color: '#f43f5e' },
      { id: 'v1', label: '6 (Inner)', x: 495, y: 299, color: '#f43f5e' },
      { id: 'v2', label: '7 (Inner)', x: 459, y: 410, color: '#f43f5e' },
      { id: 'v3', label: '8 (Inner)', x: 341, y: 410, color: '#f43f5e' },
      { id: 'v4', label: '9 (Inner)', x: 305, y: 299, color: '#f43f5e' }
    ],
    edges: [
      // Outer ring
      { id: 'e_u01', source: 'u0', target: 'u1', directed: false },
      { id: 'e_u12', source: 'u1', target: 'u2', directed: false },
      { id: 'e_u23', source: 'u2', target: 'u3', directed: false },
      { id: 'e_u34', source: 'u3', target: 'u4', directed: false },
      { id: 'e_u40', source: 'u4', target: 'u0', directed: false },
      // Spokes
      { id: 'e_uv0', source: 'u0', target: 'v0', directed: false },
      { id: 'e_uv1', source: 'u1', target: 'v1', directed: false },
      { id: 'e_uv2', source: 'u2', target: 'v2', directed: false },
      { id: 'e_uv3', source: 'u3', target: 'v3', directed: false },
      { id: 'e_uv4', source: 'u4', target: 'v4', directed: false },
      // Inner star
      { id: 'e_v02', source: 'v0', target: 'v2', directed: false },
      { id: 'e_v24', source: 'v2', target: 'v4', directed: false },
      { id: 'e_v41', source: 'v4', target: 'v1', directed: false },
      { id: 'e_v13', source: 'v1', target: 'v3', directed: false },
      { id: 'e_v30', source: 'v3', target: 'v0', directed: false }
    ]
  },
  {
    id: 'preset-k5-complete',
    name: 'Complete Graph K₅',
    description: 'Every node connects to every other node. All 5 nodes have even degree (degree 4). Has both Eulerian circuits and numerous Hamiltonian circuits.',
    createdAt: 1700000003000,
    updatedAt: 1700000003000,
    isDirectedDefault: false,
    nodes: [
      { id: 'A', label: 'Vertex A', x: 400, y: 140, color: '#10b981' },
      { id: 'B', label: 'Vertex B', x: 570, y: 260, color: '#10b981' },
      { id: 'C', label: 'Vertex C', x: 505, y: 450, color: '#10b981' },
      { id: 'D', label: 'Vertex D', x: 295, y: 450, color: '#10b981' },
      { id: 'E', label: 'Vertex E', x: 230, y: 260, color: '#10b981' }
    ],
    edges: [
      { id: 'k_ab', source: 'A', target: 'B', directed: false },
      { id: 'k_ac', source: 'A', target: 'C', directed: false },
      { id: 'k_ad', source: 'A', target: 'D', directed: false },
      { id: 'k_ae', source: 'A', target: 'E', directed: false },
      { id: 'k_bc', source: 'B', target: 'C', directed: false },
      { id: 'k_bd', source: 'B', target: 'D', directed: false },
      { id: 'k_be', source: 'B', target: 'E', directed: false },
      { id: 'k_cd', source: 'C', target: 'D', directed: false },
      { id: 'k_ce', source: 'C', target: 'E', directed: false },
      { id: 'k_de', source: 'D', target: 'E', directed: false }
    ]
  },
  {
    id: 'preset-directed-tour',
    name: 'Directed Eulerian & Hamiltonian Cycle',
    description: 'A directed balanced graph where every vertex has in-degree equal to out-degree, containing directed Eulerian cycles and directed Hamiltonian cycles.',
    createdAt: 1700000004000,
    updatedAt: 1700000004000,
    isDirectedDefault: true,
    nodes: [
      { id: 'N1', label: 'N1 (Core)', x: 400, y: 160, color: '#0ea5e9' },
      { id: 'N2', label: 'N2 (East)', x: 560, y: 280, color: '#0ea5e9' },
      { id: 'N3', label: 'N3 (South)', x: 480, y: 450, color: '#0ea5e9' },
      { id: 'N4', label: 'N4 (West)', x: 320, y: 450, color: '#0ea5e9' },
      { id: 'N5', label: 'N5 (NorthWest)', x: 240, y: 280, color: '#0ea5e9' }
    ],
    edges: [
      { id: 'de1', source: 'N1', target: 'N2', directed: true },
      { id: 'de2', source: 'N2', target: 'N3', directed: true },
      { id: 'de3', source: 'N3', target: 'N4', directed: true },
      { id: 'de4', source: 'N4', target: 'N5', directed: true },
      { id: 'de5', source: 'N5', target: 'N1', directed: true },
      { id: 'de6', source: 'N1', target: 'N3', directed: true },
      { id: 'de7', source: 'N3', target: 'N5', directed: true },
      { id: 'de8', source: 'N5', target: 'N2', directed: true },
      { id: 'de9', source: 'N2', target: 'N4', directed: true },
      { id: 'de10', source: 'N4', target: 'N1', directed: true }
    ]
  }
];

export function getSavedGraphs(): GraphData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESET_GRAPHS));
      return PRESET_GRAPHS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return PRESET_GRAPHS;
  } catch (err) {
    console.error('Failed to load graphs from localStorage:', err);
    return PRESET_GRAPHS;
  }
}

export function saveGraph(graph: GraphData): void {
  const current = getSavedGraphs();
  const existingIdx = current.findIndex(g => g.id === graph.id);
  const updatedGraph = { ...graph, updatedAt: Date.now() };

  let updatedList: GraphData[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = updatedGraph;
  } else {
    updatedList = [updatedGraph, ...current];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  localStorage.setItem(CURRENT_GRAPH_ID_KEY, updatedGraph.id);
}

export function deleteGraph(id: string): GraphData[] {
  const current = getSavedGraphs();
  const filtered = current.filter(g => g.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.length > 0 ? filtered : PRESET_GRAPHS));
  return filtered.length > 0 ? filtered : PRESET_GRAPHS;
}

export function getActiveGraphId(): string {
  return localStorage.getItem(CURRENT_GRAPH_ID_KEY) || PRESET_GRAPHS[1].id;
}

export function setActiveGraphId(id: string): void {
  localStorage.setItem(CURRENT_GRAPH_ID_KEY, id);
}

export function exportLibraryToJson(graphs?: GraphData[]): string {
  const list = graphs || getSavedGraphs();
  const exportPayload = {
    app: 'Cireu Graph Studio',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    graphs: list
  };
  return JSON.stringify(exportPayload, null, 2);
}

export function exportSingleGraphToJson(graph: GraphData): string {
  const exportPayload = {
    app: 'Cireu Graph Studio',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    graphs: [graph]
  };
  return JSON.stringify(exportPayload, null, 2);
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  message: string;
  graphs?: GraphData[];
}

export function importGraphsFromJson(jsonString: string): ImportResult {
  try {
    const data = JSON.parse(jsonString);
    let candidateGraphs: GraphData[] = [];

    if (Array.isArray(data)) {
      candidateGraphs = data;
    } else if (data && Array.isArray(data.graphs)) {
      candidateGraphs = data.graphs;
    } else if (data && data.nodes && data.edges) {
      candidateGraphs = [data as GraphData];
    } else {
      return { success: false, importedCount: 0, message: 'Invalid JSON format: missing graph data structures.' };
    }

    // Validate and sanitize
    const validGraphs: GraphData[] = [];
    for (const g of candidateGraphs) {
      if (!g.name || !Array.isArray(g.nodes) || !Array.isArray(g.edges)) {
        continue;
      }
      validGraphs.push({
        id: g.id || `graph-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: g.name,
        description: g.description || '',
        nodes: g.nodes.map(n => ({
          id: String(n.id),
          label: n.label || String(n.id),
          x: typeof n.x === 'number' ? n.x : 400 + (Math.random() * 200 - 100),
          y: typeof n.y === 'number' ? n.y : 300 + (Math.random() * 200 - 100),
          color: n.color
        })),
        edges: g.edges.map((e, idx) => ({
          id: e.id || `e-${idx}-${Date.now()}`,
          source: String(e.source),
          target: String(e.target),
          directed: Boolean(e.directed),
          weight: typeof e.weight === 'number' ? e.weight : undefined,
          label: e.label,
          color: e.color
        })),
        createdAt: g.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDirectedDefault: Boolean(g.isDirectedDefault)
      });
    }

    if (validGraphs.length === 0) {
      return { success: false, importedCount: 0, message: 'No valid graphs could be parsed from the file.' };
    }

    // Merge into local storage
    const current = getSavedGraphs();
    const map = new Map<string, GraphData>();
    current.forEach(g => map.set(g.id, g));
    validGraphs.forEach(g => map.set(g.id, g));

    const merged = Array.from(map.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    if (validGraphs.length > 0) {
      localStorage.setItem(CURRENT_GRAPH_ID_KEY, validGraphs[0].id);
    }

    return {
      success: true,
      importedCount: validGraphs.length,
      message: `Successfully imported ${validGraphs.length} graph(s).`,
      graphs: merged
    };
  } catch (err) {
    return {
      success: false,
      importedCount: 0,
      message: `Failed to parse JSON file: ${(err as Error).message}`
    };
  }
}
