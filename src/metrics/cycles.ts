export interface CycleResult {
  readonly cycleCount: number;
  readonly cycles: readonly (readonly string[])[];
}

interface NodeState {
  index: number;
  lowlink: number;
  onStack: boolean;
}

// Iterative Tarjan's SCC algorithm
export function detectCycles(
  adjacency: ReadonlyMap<string, readonly string[]>,
): CycleResult {
  const state = new Map<string, NodeState>();
  const stack: string[] = [];
  const sccs: string[][] = [];
  let nextIndex = 0;

  // Frame for iterative DFS
  interface Frame {
    node: string;
    neighborIdx: number;
    neighbors: readonly string[];
  }

  for (const startNode of adjacency.keys()) {
    if (state.has(startNode)) continue;

    const dfsStack: Frame[] = [
      {
        node: startNode,
        neighborIdx: 0,
        neighbors: adjacency.get(startNode) ?? [],
      },
    ];

    // Initialize start node
    state.set(startNode, {
      index: nextIndex,
      lowlink: nextIndex,
      onStack: true,
    });
    nextIndex++;
    stack.push(startNode);

    while (dfsStack.length > 0) {
      const frame = dfsStack[dfsStack.length - 1];

      if (frame.neighborIdx < frame.neighbors.length) {
        const neighbor = frame.neighbors[frame.neighborIdx];
        frame.neighborIdx++;

        const neighborState = state.get(neighbor);

        if (!neighborState) {
          // Not yet visited — push new frame
          state.set(neighbor, {
            index: nextIndex,
            lowlink: nextIndex,
            onStack: true,
          });
          nextIndex++;
          stack.push(neighbor);

          dfsStack.push({
            node: neighbor,
            neighborIdx: 0,
            neighbors: adjacency.get(neighbor) ?? [],
          });
        } else if (neighborState.onStack) {
          // Back edge — update lowlink
          const nodeState = state.get(frame.node);
          if (nodeState) {
            state.set(frame.node, {
              ...nodeState,
              lowlink: Math.min(nodeState.lowlink, neighborState.index),
            });
          }
        }
      } else {
        // All neighbors processed — pop frame
        dfsStack.pop();

        const nodeState = state.get(frame.node);
        if (!nodeState) continue;

        // Propagate lowlink to parent
        if (dfsStack.length > 0) {
          const parentFrame = dfsStack[dfsStack.length - 1];
          const parentState = state.get(parentFrame.node);
          if (parentState) {
            state.set(parentFrame.node, {
              ...parentState,
              lowlink: Math.min(parentState.lowlink, nodeState.lowlink),
            });
          }
        }

        // Root of SCC — collect members
        if (nodeState.lowlink === nodeState.index) {
          const scc: string[] = [];
          let w: string | undefined;
          do {
            w = stack.pop();
            if (w === undefined) break;
            const ws = state.get(w);
            if (ws) {
              state.set(w, { ...ws, onStack: false });
            }
            scc.push(w);
          } while (w !== frame.node);

          if (scc.length > 1) {
            sccs.push(scc);
          }
        }
      }
    }
  }

  return { cycleCount: sccs.length, cycles: sccs };
}
