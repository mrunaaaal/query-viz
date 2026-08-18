import { describe, expect, it } from "vitest"
import { heatBand, heatColor, heatTextColor } from "./heat.ts"

describe("heatBand", () => {
  it("classifies relative position into cool/warm/hot per ADR-0002 thresholds", () => {
    expect(heatBand(0)).toBe("cool")
    expect(heatBand(0.32)).toBe("cool")
    expect(heatBand(0.33)).toBe("warm")
    expect(heatBand(0.5)).toBe("warm")
    expect(heatBand(0.65)).toBe("warm")
    expect(heatBand(0.66)).toBe("hot")
    expect(heatBand(1)).toBe("hot")
  })
})

describe("heatColor", () => {
  it("returns the pale end of the ramp at relative 0", () => {
    expect(heatColor(0).toLowerCase()).toBe("#eef2ff")
  })

  it("returns the mid ramp color at relative 0.5", () => {
    expect(heatColor(0.5).toLowerCase()).toBe("#818cf8")
  })

  it("returns the hot end of the ramp at relative 1", () => {
    expect(heatColor(1).toLowerCase()).toBe("#4338ca")
  })

  it("clamps out-of-range input rather than extrapolating past the ramp", () => {
    expect(heatColor(-1).toLowerCase()).toBe("#eef2ff")
    expect(heatColor(2).toLowerCase()).toBe("#4338ca")
  })
})

describe("heatTextColor", () => {
  it("stays dark against the pale half of the ramp", () => {
    expect(heatTextColor(0)).toBe("#1a1a1a")
    expect(heatTextColor(0.49)).toBe("#1a1a1a")
  })

  it("switches to light text against the dark half of the ramp", () => {
    expect(heatTextColor(0.5)).toBe("#fafafa")
    expect(heatTextColor(1)).toBe("#fafafa")
  })
})
