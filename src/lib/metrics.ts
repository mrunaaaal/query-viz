/**
 * The timing math (spec §3): exclusive time, heat value, misestimate ratio.
 * See CONTEXT.md for the glossary and ADR-0001 for why heat is normalized by
 * total accounted work rather than `Execution Time` (the spec's formula
 * overflows past 1.0 on parallel plans).
 */
import type { PlanNode } from "../types.ts"

/** A node's inclusive time: `Actual Total Time`, scaled up from per-loop to total. */
function inclusiveMs(node: PlanNode): number {
  return (node["Actual Total Time"] ?? 0) * (node["Actual Loops"] ?? 1)
}

/** Exclusive time: this node's inclusive time, children's inclusive time removed. */
export function exclusiveMs(node: PlanNode): number {
  const self = inclusiveMs(node)
  const children = (node.Plans ?? []).reduce((sum, c) => sum + inclusiveMs(c), 0)
  return Math.max(0, self - children)
}

/** Symmetric planned-vs-actual row ratio, per-loop, always >= 1. */
export function misestimate(node: PlanNode): number {
  const est = Math.max(node["Plan Rows"], 1)
  const act = Math.max(node["Actual Rows"] ?? 0, 1)
  return Math.max(act / est, est / act)
}

/** Per-node heat values for a whole plan tree, keyed by node identity. */
export interface HeatMap {
  /** Each node's share of total accounted exclusive time, in [0, 1]. */
  heat: Map<PlanNode, number>
  /** The largest heat value in the tree — the denominator for relative color scaling (ADR-0002). */
  maxHeat: number
  /** True when total exclusive time is 0 (a plan too fast to profile): all heat is 0, no divide-by-zero. */
  tooFastToProfile: boolean
}

/**
 * Heat per ADR-0001: `exclusiveMs(node) / Σ exclusiveMs(all nodes)`, each
 * node's share of total work, not of wall-clock `Execution Time`.
 */
export function computeHeat(root: PlanNode): HeatMap {
  const nodes: PlanNode[] = []
  const exclusive = new Map<PlanNode, number>()

  function walk(node: PlanNode): void {
    exclusive.set(node, exclusiveMs(node))
    nodes.push(node)
    for (const child of node.Plans ?? []) walk(child)
  }
  walk(root)

  const total = [...exclusive.values()].reduce((sum, ms) => sum + ms, 0)
  const tooFastToProfile = total === 0

  const heat = new Map<PlanNode, number>()
  let maxHeat = 0
  for (const node of nodes) {
    const value = tooFastToProfile ? 0 : (exclusive.get(node) ?? 0) / total
    heat.set(node, value)
    if (value > maxHeat) maxHeat = value
  }

  return { heat, maxHeat, tooFastToProfile }
}

/** A node's heat position relative to the hottest node in the tree (ADR-0002), in [0, 1]. */
export function relativeHeat(heat: number, maxHeat: number): number {
  return maxHeat > 0 ? heat / maxHeat : 0
}
