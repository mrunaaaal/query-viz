import { describe, expect, it } from "vitest"
import { parsePlan } from "./parse.ts"
import { ParseError } from "../types.ts"

const minimalValid = JSON.stringify([
  {
    Plan: {
      "Node Type": "Nested Loop",
      "Startup Cost": 0.29,
      "Total Cost": 16.36,
      "Plan Rows": 1,
      "Plan Width": 68,
      "Actual Startup Time": 0.034,
      "Actual Total Time": 0.052,
      "Actual Rows": 3,
      "Actual Loops": 1,
      Plans: [
        {
          "Node Type": "Seq Scan",
          "Relation Name": "orders",
          "Startup Cost": 0,
          "Total Cost": 10,
          "Plan Rows": 3,
          "Plan Width": 40,
          "Actual Startup Time": 0.01,
          "Actual Total Time": 0.02,
          "Actual Rows": 3,
          "Actual Loops": 1,
        },
      ],
    },
    "Planning Time": 0.1,
    "Execution Time": 0.09,
  },
])

describe("parsePlan", () => {
  it("returns a nested PlanNode tree", () => {
    const root = parsePlan(minimalValid)
    expect(root["Node Type"]).toBe("Nested Loop")
    expect(root.Plans).toHaveLength(1)
    expect(root.Plans?.[0]["Relation Name"]).toBe("orders")
  })

  it("takes element [0] and silently ignores the rest of a multi-element array", () => {
    const parsed = JSON.parse(minimalValid)
    const multi = JSON.stringify([parsed[0], parsed[0]])
    const root = parsePlan(multi)
    expect(root["Node Type"]).toBe("Nested Loop")
  })

  it("throws invalid-json for text that isn't JSON", () => {
    try {
      parsePlan("not json at all")
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError)
      expect((err as ParseError).kind).toBe("invalid-json")
    }
  })

  it("throws no-plan for valid JSON missing the Plan key", () => {
    try {
      parsePlan(JSON.stringify([{ "Planning Time": 0.1 }]))
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError)
      expect((err as ParseError).kind).toBe("no-plan")
    }
  })

  it("throws no-plan when the JSON is not an array", () => {
    try {
      parsePlan(JSON.stringify({ Plan: { "Node Type": "Seq Scan" } }))
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError)
      expect((err as ParseError).kind).toBe("no-plan")
    }
  })

  it("throws missing-actual-time when Actual Total Time is absent anywhere in the tree", () => {
    const noAnalyze = JSON.stringify([
      {
        Plan: {
          "Node Type": "Seq Scan",
          "Relation Name": "orders",
          "Startup Cost": 0,
          "Total Cost": 10,
          "Plan Rows": 3,
          "Plan Width": 40,
        },
        "Planning Time": 0.1,
      },
    ])
    try {
      parsePlan(noAnalyze)
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError)
      expect((err as ParseError).kind).toBe("missing-actual-time")
    }
  })

  it("does not throw missing-actual-time when a descendant (not the root) has it", () => {
    const deep = JSON.stringify([
      {
        Plan: {
          "Node Type": "Nested Loop",
          "Startup Cost": 0,
          "Total Cost": 10,
          "Plan Rows": 3,
          "Plan Width": 40,
          Plans: [
            {
              "Node Type": "Seq Scan",
              "Startup Cost": 0,
              "Total Cost": 5,
              "Plan Rows": 3,
              "Plan Width": 40,
              "Actual Total Time": 0.02,
              "Actual Loops": 1,
            },
          ],
        },
      },
    ])
    expect(() => parsePlan(deep)).not.toThrow()
  })

  it("parses leaf nodes that omit Plans without crashing", () => {
    const leafOnly = JSON.stringify([
      {
        Plan: {
          "Node Type": "Seq Scan",
          "Startup Cost": 0,
          "Total Cost": 10,
          "Plan Rows": 3,
          "Plan Width": 40,
          "Actual Total Time": 0.02,
          "Actual Loops": 1,
        },
      },
    ])
    const root = parsePlan(leafOnly)
    expect(root.Plans).toBeUndefined()
  })

  it("tolerates absent optional fields without crashing", () => {
    const sparse = JSON.stringify([
      {
        Plan: {
          "Node Type": "Index Scan",
          "Startup Cost": 0,
          "Total Cost": 10,
          "Plan Rows": 3,
          "Plan Width": 40,
          "Actual Total Time": 0.02,
          "Actual Loops": 1,
          Plans: [
            {
              "Node Type": "Seq Scan",
              "Startup Cost": 0,
              "Total Cost": 5,
              "Plan Rows": 3,
              "Plan Width": 40,
              "Actual Total Time": 0.01,
              "Actual Loops": 1,
            },
          ],
        },
      },
    ])
    expect(() => parsePlan(sparse)).not.toThrow()
  })
})
