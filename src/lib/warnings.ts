/**
 * The four warning rules (spec §4). See CONTEXT.md for Inner side / rescan
 * count, and the issue's grilling note: the nested-loop rule keys off
 * `Parent Relationship === "Inner"`, never `Plans[1]` — that also drops
 * SubPlan/InitPlan children for free. Materialize/Memoize suppress the
 * warning since Postgres already mitigated the rescan.
 */
import type { PlanNode, Warning, WarningRule } from "../types.ts"
import { exclusiveMs, misestimate } from "./metrics.ts"
import { childNodeId, ROOT_NODE_ID } from "./nodeId.ts"

const SEQ_SCAN_ROW_THRESHOLD = 10000
const MISESTIMATE_THRESHOLD = 10
const NESTED_LOOP_INNER_LOOP_THRESHOLD = 1000
const REWRAPPED_INNER_NODE_TYPES = new Set(["Materialize", "Memoize"])

function findInnerChild(node: PlanNode): PlanNode | undefined {
  return (node.Plans ?? []).find((child) => child["Parent Relationship"] === "Inner")
}

function rulesForNode(node: PlanNode): Array<{ rule: WarningRule; message: string }> {
  const found: Array<{ rule: WarningRule; message: string }> = []

  if (node["Node Type"] === "Seq Scan") {
    const rows = (node["Actual Rows"] ?? 0) * (node["Actual Loops"] ?? 1)
    if (rows > SEQ_SCAN_ROW_THRESHOLD) {
      found.push({
        rule: "seq-scan",
        message: `Sequential scan over ${rows} rows — check for a usable index`,
      })
    }
  }

  const misestimateRatio = misestimate(node)
  if (misestimateRatio > MISESTIMATE_THRESHOLD) {
    const estimated = Math.max(node["Plan Rows"], 1)
    const actual = Math.max(node["Actual Rows"] ?? 0, 1)
    found.push({
      rule: "cardinality-misestimate",
      message: `Planner expected ${estimated} rows, got ${actual} — statistics may be stale`,
    })
  }

  if (node["Node Type"] === "Nested Loop") {
    const inner = findInnerChild(node)
    const innerLoops = inner?.["Actual Loops"] ?? 0
    const innerType = inner?.["Node Type"]
    if (
      inner &&
      innerLoops > NESTED_LOOP_INNER_LOOP_THRESHOLD &&
      !(innerType && REWRAPPED_INNER_NODE_TYPES.has(innerType))
    ) {
      found.push({
        rule: "expensive-nested-loop",
        message: `Inner side executed ${innerLoops} times — a hash join may be cheaper`,
      })
    }
  }

  const sortMethod = node["Sort Method"]
  if (typeof sortMethod === "string" && sortMethod.includes("external")) {
    found.push({
      rule: "sort-spilled-to-disk",
      message: "Sort spilled to disk — consider raising work_mem",
    })
  }

  return found
}

/** Walks the plan tree and returns every fired warning, unsorted. */
export function findWarnings(root: PlanNode): Warning[] {
  const warnings: Warning[] = []

  function walk(node: PlanNode, path: string): void {
    const exclusive = exclusiveMs(node)
    for (const { rule, message } of rulesForNode(node)) {
      warnings.push({ nodeId: path, rule, message, exclusiveMs: exclusive })
    }
    node.Plans?.forEach((child, i) => walk(child, childNodeId(path, i)))
  }
  walk(root, ROOT_NODE_ID)

  return warnings
}
