import { describe, expect, it } from "vitest"
import { parsePlan } from "./parse.ts"
import { sampleRawPlan } from "./sample.ts"
import type { PlanNode, WarningRule } from "../types.ts"

// Mirrors the spec §4 rules directly (warnings.ts doesn't exist yet — that's
// a separate issue) so the sample plan's warning count can be pinned down
// independently of that implementation.
function firedRules(root: PlanNode): WarningRule[] {
  const fired: WarningRule[] = []

  function visit(node: PlanNode, parent: PlanNode | undefined) {
    const rows = node["Actual Rows"] ?? 0
    const loops = node["Actual Loops"] ?? 1

    if (node["Node Type"] === "Seq Scan" && rows * loops > 10000) {
      fired.push("seq-scan")
    }

    const planRows = Math.max(node["Plan Rows"], 1)
    const actualRows = Math.max(rows, 1)
    const misestimate = Math.max(actualRows / planRows, planRows / actualRows)
    if (misestimate > 10) {
      fired.push("cardinality-misestimate")
    }

    const sortMethod = node["Sort Method"]
    if (typeof sortMethod === "string" && sortMethod.includes("external")) {
      fired.push("sort-spilled-to-disk")
    }

    if (parent?.["Node Type"] === "Nested Loop" && node["Parent Relationship"] === "Inner") {
      if ((node["Actual Loops"] ?? 1) > 1000) {
        fired.push("expensive-nested-loop")
      }
    }

    for (const child of node.Plans ?? []) visit(child, node)
  }

  visit(root, undefined)
  return fired
}

describe("sample plan", () => {
  it("parses into a nested PlanNode tree", () => {
    const root = parsePlan(sampleRawPlan)
    expect(root["Node Type"]).toBe("Limit")
    expect(root.Plans?.[0]["Node Type"]).toBe("Sort")
  })

  it("fires exactly two warnings: expensive-nested-loop and cardinality-misestimate", () => {
    const root = parsePlan(sampleRawPlan)
    const fired = firedRules(root)
    expect(fired.sort()).toEqual(["cardinality-misestimate", "expensive-nested-loop"])
  })

  it("has a Nested Loop with an Inner-side child", () => {
    const root = parsePlan(sampleRawPlan)
    let found = false
    function visit(node: PlanNode) {
      if (node["Node Type"] === "Nested Loop") {
        found = (node.Plans ?? []).some((c) => c["Parent Relationship"] === "Inner")
      }
      for (const child of node.Plans ?? []) visit(child)
    }
    visit(root)
    expect(found).toBe(true)
  })
})
