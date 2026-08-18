/**
 * The heat ramp and band thresholds (spec §6, ADR-0002). Bands and color both
 * key off relative position `p = heat / maxHeat` — see `relativeHeat` in
 * metrics.ts — so the legend's swatches and each node's fill always agree.
 */
import type { HeatBand } from "../types.ts"

const WARM_THRESHOLD = 0.33
const HOT_THRESHOLD = 0.66

/** Cool `p < 0.33`, Warm `0.33 <= p < 0.66`, Hot `p >= 0.66` (ADR-0002). */
export function heatBand(relative: number): HeatBand {
  if (relative >= HOT_THRESHOLD) return "hot"
  if (relative >= WARM_THRESHOLD) return "warm"
  return "cool"
}

const RAMP_COOL = [0xee, 0xf2, 0xff] as const
const RAMP_MID = [0x81, 0x8c, 0xf8] as const
const RAMP_HOT = [0x43, 0x38, 0xca] as const

function toHex(n: number): string {
  return Math.round(n).toString(16).padStart(2, "0")
}

function mix(a: readonly [number, number, number], b: readonly [number, number, number], t: number): string {
  const r = a[0] + (b[0] - a[0]) * t
  const g = a[1] + (b[1] - a[1]) * t
  const bl = a[2] + (b[2] - a[2]) * t
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`
}

/** Interpolates the heat ramp (pale -> mid -> hot) over relative position `p` in `[0, 1]`. */
export function heatColor(relative: number): string {
  const p = Math.max(0, Math.min(1, relative))
  if (p <= 0.5) return mix(RAMP_COOL, RAMP_MID, p / 0.5)
  return mix(RAMP_MID, RAMP_HOT, (p - 0.5) / 0.5)
}

/** Text color that stays readable against `heatColor` — dark ramp fills need light text. */
export function heatTextColor(relative: number): string {
  return relative >= 0.5 ? "#fafafa" : "#1a1a1a"
}
