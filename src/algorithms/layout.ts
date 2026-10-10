import { GraphNode, GraphEdge } from '../types/graph';

export type LayoutType = 'circle' | 'force' | 'grid' | 'concentric';

export function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  type: LayoutType,
  width = 800,
  height = 600
): GraphNode[] {
  const n = nodes.length;
  if (n === 0) return [];

  const cx = width / 2;
  const cy = height / 2;

  if (type === 'circle') {
    const radius = Math.min(width, height) * 0.34;
    return nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return {
        ...node,
        x: Math.round(cx + radius * Math.cos(angle)),
        y: Math.round(cy + radius * Math.sin(angle))
      };
    });
  }

  if (type === 'grid') {
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const spacingX = Math.min(160, (width * 0.7) / Math.max(1, cols - 1));
    const spacingY = Math.min(140, (height * 0.7) / Math.max(1, rows - 1));
    const startX = cx - ((cols - 1) * spacingX) / 2;
    const startY = cy - ((rows - 1) * spacingY) / 2;

    return nodes.map((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...node,
        x: Math.round(cols === 1 ? cx : startX + col * spacingX),
        y: Math.round(rows === 1 ? cy : startY + row * spacingY)
      };
    });
  }

  if (type === 'concentric') {
    if (n <= 4) {
      return computeLayout(nodes, edges, 'circle', width, height);
    }
    const innerCount = Math.floor(n / 2);
    const outerCount = n - innerCount;
    const outerR = Math.min(width, height) * 0.36;
    const innerR = Math.min(width, height) * 0.17;

    return nodes.map((node, i) => {
      if (i < outerCount) {
        const angle = (2 * Math.PI * i) / outerCount - Math.PI / 2;
        return {
          ...node,
          x: Math.round(cx + outerR * Math.cos(angle)),
          y: Math.round(cy + outerR * Math.sin(angle))
        };
      } else {
        const j = i - outerCount;
        const angle = (2 * Math.PI * j) / innerCount - Math.PI / 2;
        return {
          ...node,
          x: Math.round(cx + innerR * Math.cos(angle)),
          y: Math.round(cy + innerR * Math.sin(angle))
        };
      }
    });
  }

  // Force-directed Fruchterman-Reingold spring layout
  const positions = nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / n;
    return {
      id: node.id,
      x: node.x || cx + 150 * Math.cos(angle),
      y: node.y || cy + 150 * Math.sin(angle),
      vx: 0,
      vy: 0
    };
  });

  const posMap = new Map<string, (typeof positions)[0]>();
  positions.forEach(p => posMap.set(p.id, p));

  const k = Math.sqrt((width * height * 0.45) / Math.max(1, n));
  const iterations = 120;

  for (let iter = 0; iter < iterations; iter++) {
    const temp = (1 - iter / iterations) * 35;

    for (const p of positions) {
      p.vx = 0;
      p.vy = 0;
    }

    // Repulsive forces between all pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const u = positions[i];
        const v = positions[j];
        let dx = u.x - v.x;
        let dy = u.y - v.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        u.vx += fx;
        u.vy += fy;
        v.vx -= fx;
        v.vy -= fy;
      }
    }

    // Attractive forces along edges
    for (const e of edges) {
      const u = posMap.get(e.source);
      const v = posMap.get(e.target);
      if (!u || !v || u === v) continue;
      const dx = u.x - v.x;
      const dy = u.y - v.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      u.vx -= fx;
      u.vy -= fy;
      v.vx += fx;
      v.vy += fy;
    }

    // Mild gravity toward center
    for (const p of positions) {
      p.vx += (cx - p.x) * 0.05;
      p.vy += (cy - p.y) * 0.05;

      const vMag = Math.max(1, Math.sqrt(p.vx * p.vx + p.vy * p.vy));
      p.x += (p.vx / vMag) * Math.min(vMag, temp);
      p.y += (p.vy / vMag) * Math.min(vMag, temp);

      // Keep inside bounds
      p.x = Math.max(80, Math.min(width - 80, p.x));
      p.y = Math.max(80, Math.min(height - 80, p.y));
    }
  }

  return nodes.map((node, i) => ({
    ...node,
    x: Math.round(positions[i].x),
    y: Math.round(positions[i].y)
  }));
}
