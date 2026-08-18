/**
 * Raw `EXPLAIN (ANALYZE, FORMAT JSON)` text -> PlanNode tree.
 * See CONTEXT.md for Node/Child vocabulary, spec §2 for the input format,
 * and spec §8 for the three failure modes this throws typed errors for.
 */
import { ParseError, type PlanNode } from "../types.ts"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function hasActualTotalTime(node: Record<string, unknown>): boolean {
  if (typeof node["Actual Total Time"] === "number") return true
  const children = node["Plans"]
  if (!Array.isArray(children)) return false
  return children.some((child) => isRecord(child) && hasActualTotalTime(child))
}

function normalizeNode(raw: Record<string, unknown>): PlanNode {
  const node = { ...raw } as PlanNode
  const children = raw["Plans"]
  if (Array.isArray(children)) {
    node.Plans = children.filter(isRecord).map(normalizeNode)
  } else {
    delete node.Plans
  }
  return node
}

/** Parses raw `EXPLAIN (ANALYZE, FORMAT JSON)` output into a `PlanNode` tree. */
export function parsePlan(raw: string): PlanNode {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new ParseError(
      "invalid-json",
      "This doesn't parse as JSON. Run EXPLAIN (ANALYZE, FORMAT JSON) and paste the full result.",
    )
  }

  // The top-level array always has one element in practice; if it has more,
  // element [0] is taken and the rest are silently ignored (grilling decision).
  const root = Array.isArray(json) ? json[0] : undefined
  if (!isRecord(root) || !isRecord(root["Plan"])) {
    throw new ParseError(
      "no-plan",
      'No execution plan found. The output should start with [{ "Plan": ... }].',
    )
  }

  const plan = root["Plan"]
  if (!hasActualTotalTime(plan)) {
    throw new ParseError(
      "missing-actual-time",
      "This plan has estimates but no measurements. Re-run with ANALYZE to see actual timings.",
    )
  }

  return normalizeNode(plan)
}
