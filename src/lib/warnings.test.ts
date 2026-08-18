import { describe, expect, it } from "vitest"
import { findWarnings } from "./warnings.ts"
import type { PlanNode } from "../types.ts"

function node(overrides: Partial<PlanNode> = {}): PlanNode {
  return {
    "Startup Cost": 0,
    "Total Cost": 0,
    "Plan Rows": 1,
    "Plan Width": 0,
    ...overrides,
  }
}

describe("findWarnings", () => {
  it("fires seq-scan when a Seq Scan node's rows * loops exceeds 10000", () => {
    const scan = node({
      "Node Type": "Seq Scan",
      "Plan Rows": 5001,
      "Actual Rows": 5001,
      "Actual Loops": 3,
      "Actual Total Time": 1,
    })
    const warnings = findWarnings(scan)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].rule).toBe("seq-scan")
    expect(warnings[0].message).toBe("Sequential scan over 15003 rows — check for a usable index")
  })

  it("does not fire seq-scan at or under the 10000 row threshold", () => {
    const scan = node({
      "Node Type": "Seq Scan",
      "Plan Rows": 100,
      "Actual Rows": 100,
      "Actual Loops": 100,
    })
    expect(findWarnings(scan)).toHaveLength(0)
  })

  it("fires cardinality-misestimate when misestimate exceeds 10", () => {
    const n = node({ "Node Type": "Index Scan", "Plan Rows": 10, "Actual Rows": 200 })
    const warnings = findWarnings(n)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].rule).toBe("cardinality-misestimate")
    expect(warnings[0].message).toBe("Planner expected 10 rows, got 200 — statistics may be stale")
  })

  it("does not fire cardinality-misestimate at or under a ratio of 10", () => {
    const n = node({ "Plan Rows": 10, "Actual Rows": 100 })
    expect(findWarnings(n)).toHaveLength(0)
  })

  it("fires expensive-nested-loop when the Inner child's loops exceed 1000", () => {
    const outer = node({ "Node Type": "Seq Scan", "Parent Relationship": "Outer" })
    const inner = node({
      "Node Type": "Index Scan",
      "Parent Relationship": "Inner",
      "Actual Loops": 1500,
    })
    const loop = node({ "Node Type": "Nested Loop", Plans: [outer, inner] })
    const warnings = findWarnings(loop)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].rule).toBe("expensive-nested-loop")
    expect(warnings[0].message).toBe("Inner side executed 1500 times — a hash join may be cheaper")
  })

  it("keys the inner child off Parent Relationship, not Plans[1]", () => {
    const inner = node({
      "Node Type": "Index Scan",
      "Parent Relationship": "Inner",
      "Actual Loops": 2000,
    })
    const outer = node({ "Node Type": "Seq Scan", "Parent Relationship": "Outer" })
    // Inner listed first in Plans[] — rule must not assume position.
    const loop = node({ "Node Type": "Nested Loop", Plans: [inner, outer] })
    const warnings = findWarnings(loop)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].rule).toBe("expensive-nested-loop")
  })

  it("does not fire expensive-nested-loop at or under 1000 inner loops", () => {
    const outer = node({ "Parent Relationship": "Outer" })
    const inner = node({ "Parent Relationship": "Inner", "Actual Loops": 1000 })
    const loop = node({ "Node Type": "Nested Loop", Plans: [outer, inner] })
    expect(findWarnings(loop)).toHaveLength(0)
  })

  it("suppresses expensive-nested-loop when the inner side is Materialize", () => {
    const outer = node({ "Parent Relationship": "Outer" })
    const inner = node({
      "Node Type": "Materialize",
      "Parent Relationship": "Inner",
      "Actual Loops": 5000,
    })
    const loop = node({ "Node Type": "Nested Loop", Plans: [outer, inner] })
    expect(findWarnings(loop)).toHaveLength(0)
  })

  it("suppresses expensive-nested-loop when the inner side is Memoize", () => {
    const outer = node({ "Parent Relationship": "Outer" })
    const inner = node({
      "Node Type": "Memoize",
      "Parent Relationship": "Inner",
      "Actual Loops": 5000,
    })
    const loop = node({ "Node Type": "Nested Loop", Plans: [outer, inner] })
    expect(findWarnings(loop)).toHaveLength(0)
  })

  it("ignores SubPlan/InitPlan children when looking for the inner side", () => {
    const subplan = node({
      "Node Type": "Index Scan",
      "Parent Relationship": "SubPlan",
      "Actual Loops": 5000,
    })
    const loop = node({ "Node Type": "Nested Loop", Plans: [subplan] })
    expect(findWarnings(loop)).toHaveLength(0)
  })

  it("fires sort-spilled-to-disk when Sort Method contains external", () => {
    const sort = node({ "Node Type": "Sort", "Sort Method": "external merge Disk: 4096kB" })
    const warnings = findWarnings(sort)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].rule).toBe("sort-spilled-to-disk")
    expect(warnings[0].message).toBe("Sort spilled to disk — consider raising work_mem")
  })

  it("does not fire sort-spilled-to-disk for an in-memory quicksort", () => {
    const sort = node({ "Node Type": "Sort", "Sort Method": "quicksort" })
    expect(findWarnings(sort)).toHaveLength(0)
  })

  it("collects warnings from every node in the tree, tagged with each node's exclusiveMs", () => {
    const scan = node({
      "Node Type": "Seq Scan",
      "Plan Rows": 20000,
      "Actual Rows": 20000,
      "Actual Loops": 1,
      "Actual Total Time": 5,
    })
    const sort = node({
      "Node Type": "Sort",
      "Plan Rows": 20000,
      "Actual Rows": 20000,
      "Sort Method": "external merge",
      "Actual Total Time": 42,
      "Actual Loops": 1,
      Plans: [scan],
    })
    const warnings = findWarnings(sort)
    expect(warnings).toHaveLength(2)
    const seqScanWarning = warnings.find((w) => w.rule === "seq-scan")
    const sortWarning = warnings.find((w) => w.rule === "sort-spilled-to-disk")
    expect(seqScanWarning?.exclusiveMs).toBeCloseTo(5, 5)
    expect(sortWarning?.exclusiveMs).toBeCloseTo(37, 5)
  })

  it("assigns each warning a nodeId distinct from other nodes' warnings", () => {
    const scanA = node({
      "Node Type": "Seq Scan",
      "Plan Rows": 20000,
      "Actual Rows": 20000,
      "Actual Loops": 1,
    })
    const scanB = node({
      "Node Type": "Seq Scan",
      "Plan Rows": 20000,
      "Actual Rows": 20000,
      "Actual Loops": 1,
    })
    const root = node({ "Node Type": "Append", Plans: [scanA, scanB] })
    const warnings = findWarnings(root)
    expect(warnings).toHaveLength(2)
    expect(warnings[0].nodeId).not.toBe(warnings[1].nodeId)
  })
})
