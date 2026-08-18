/**
 * Stable per-node identity: a dot-separated path of child indices from the
 * root (`"0"`, `"0.1.2"`). Shared between `warnings.ts` (which assigns each
 * `Warning` a `nodeId`) and `PlanTree` (which threads the same path down
 * while recursing, so it can look warnings up per node) — one definition so
 * the two walks can't drift out of sync.
 */
export const ROOT_NODE_ID = "0"

export function childNodeId(parentId: string, childIndex: number): string {
  return `${parentId}.${childIndex}`
}
