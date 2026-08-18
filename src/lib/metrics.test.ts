import { describe, expect, it } from "vitest"
import { computeHeat, exclusiveMs, misestimate, relativeHeat } from "./metrics.ts"
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

describe("exclusiveMs", () => {
  it("returns near-zero for a Nested Loop whose time is dominated by its children", () => {
    const outer = node({ "Node Type": "Seq Scan", "Actual Total Time": 0.01, "Actual Loops": 1 })
    const inner = node({ "Node Type": "Index Scan", "Actual Total Time": 0.02, "Actual Loops": 500 })
    const loop = node({
      "Node Type": "Nested Loop",
      "Actual Total Time": 10.01,
      "Actual Loops": 1,
      Plans: [outer, inner],
    })
    // self = 10.01, children = 0.01 + 0.02*500 = 10.01 -> floors to 0
    expect(exclusiveMs(loop)).toBeCloseTo(0, 5)
  })

  it("floors at zero rather than going negative", () => {
    const child = node({ "Actual Total Time": 100, "Actual Loops": 1 })
    const parent = node({ "Actual Total Time": 1, "Actual Loops": 1, Plans: [child] })
    expect(exclusiveMs(parent)).toBe(0)
  })

  it("attributes a leaf's full inclusive time when it has no children", () => {
    const leaf = node({ "Actual Total Time": 5, "Actual Loops": 3 })
    expect(exclusiveMs(leaf)).toBe(15)
  })

  it("multiplies by loops and subtracts children's loop-scaled time", () => {
    const child = node({ "Actual Total Time": 1, "Actual Loops": 4 }) // 4
    const parent = node({ "Actual Total Time": 3, "Actual Loops": 2, Plans: [child] }) // 6 - 4 = 2
    expect(exclusiveMs(parent)).toBe(2)
  })
})

describe("misestimate", () => {
  it("is symmetric and always >= 1", () => {
    const under = node({ "Plan Rows": 10, "Actual Rows": 1000 })
    const over = node({ "Plan Rows": 1000, "Actual Rows": 10 })
    expect(misestimate(under)).toBe(100)
    expect(misestimate(over)).toBe(100)
  })

  it("does not multiply by loops (per-loop comparison)", () => {
    const n = node({ "Plan Rows": 3, "Actual Rows": 3, "Actual Loops": 500 })
    expect(misestimate(n)).toBe(1)
  })

  it("floors both sides at 1 to avoid divide-by-zero", () => {
    const n = node({ "Plan Rows": 0, "Actual Rows": 0 })
    expect(misestimate(n)).toBe(1)
  })
})

describe("computeHeat", () => {
  it("gives a leaf hot node the dominant heat share", () => {
    const hotLeaf = node({ "Node Type": "Seq Scan", "Actual Total Time": 99, "Actual Loops": 1 })
    const coolLeaf = node({ "Node Type": "Index Scan", "Actual Total Time": 1, "Actual Loops": 1 })
    const root = node({
      "Node Type": "Hash Join",
      "Actual Total Time": 100,
      "Actual Loops": 1,
      Plans: [hotLeaf, coolLeaf],
    })

    const { heat, tooFastToProfile } = computeHeat(root)
    expect(tooFastToProfile).toBe(false)
    expect(heat.get(hotLeaf)).toBeCloseTo(0.99, 5)
    expect(heat.get(coolLeaf)).toBeCloseTo(0.01, 5)
    expect(heat.get(root)).toBeCloseTo(0, 5)
  })

  it("sums to ~1.0 across the tree, with every value in [0, 1]", () => {
    const a = node({ "Actual Total Time": 3, "Actual Loops": 2 })
    const b = node({ "Actual Total Time": 5, "Actual Loops": 1 })
    const root = node({ "Actual Total Time": 20, "Actual Loops": 1, Plans: [a, b] })

    const { heat } = computeHeat(root)
    const total = [...heat.values()].reduce((sum, v) => sum + v, 0)
    expect(total).toBeCloseTo(1, 5)
    for (const v of heat.values()) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it("produces all-zero heat and the too-fast flag when total exclusive time is 0, with no NaN/Infinity", () => {
    const leaf = node({ "Actual Total Time": 0, "Actual Loops": 1 })
    const root = node({ "Actual Total Time": 0, "Actual Loops": 1, Plans: [leaf] })

    const { heat, maxHeat, tooFastToProfile } = computeHeat(root)
    expect(tooFastToProfile).toBe(true)
    expect(maxHeat).toBe(0)
    for (const v of heat.values()) {
      expect(v).toBe(0)
      expect(Number.isNaN(v)).toBe(false)
      expect(Number.isFinite(v)).toBe(true)
    }
  })

  it("exposes maxHeat as the largest heat value in the tree", () => {
    const a = node({ "Actual Total Time": 90, "Actual Loops": 1 })
    const b = node({ "Actual Total Time": 10, "Actual Loops": 1 })
    const root = node({ "Actual Total Time": 100, "Actual Loops": 1, Plans: [a, b] })

    const { heat, maxHeat } = computeHeat(root)
    expect(maxHeat).toBeCloseTo(0.9, 5)
    expect(heat.get(a)).toBe(maxHeat)
  })
})

describe("relativeHeat", () => {
  it("scales a node's heat relative to the hottest node", () => {
    expect(relativeHeat(0.3, 0.6)).toBeCloseTo(0.5, 5)
    expect(relativeHeat(0.6, 0.6)).toBe(1)
  })

  it("returns 0 rather than dividing by zero when maxHeat is 0", () => {
    expect(relativeHeat(0, 0)).toBe(0)
  })
})
