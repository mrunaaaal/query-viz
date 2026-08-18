import { describe, expect, it } from "vitest"
import { nodeTypeLabel } from "./nodeType.ts"

describe("nodeTypeLabel", () => {
  it("returns a known node type's raw string", () => {
    expect(nodeTypeLabel("Seq Scan")).toBe("Seq Scan")
  })

  it("falls back to the raw string for an unrecognized node type", () => {
    expect(nodeTypeLabel("WindowAgg")).toBe("WindowAgg")
  })

  it("never returns blank when Node Type is missing", () => {
    expect(nodeTypeLabel(undefined)).toBe("Unknown")
  })

  it("never returns blank when Node Type is an empty string", () => {
    expect(nodeTypeLabel("")).toBe("Unknown")
  })
})
