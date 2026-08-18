/**
 * The heat scale key that doubles as a filter (spec §6 signature, ADR-0002).
 * Clicking a band selects it; clicking the selected band again clears the
 * filter. Selection state is lifted to App so it can dim nodes across the
 * whole tree, not just within one Legend instance.
 */
import type { HeatBand } from "../types.ts"
import { heatColor } from "../lib/heat.ts"

interface LegendProps {
  activeBand: HeatBand | null
  onSelectBand: (band: HeatBand) => void
}

const BANDS: Array<{ band: HeatBand; label: string; swatchRelative: number }> = [
  { band: "cool", label: "Cool", swatchRelative: 0.15 },
  { band: "warm", label: "Warm", swatchRelative: 0.5 },
  { band: "hot", label: "Hot", swatchRelative: 0.85 },
]

function Legend({ activeBand, onSelectBand }: LegendProps) {
  return (
    <ul className="legend" role="group" aria-label="Heat band filter">
      {BANDS.map(({ band, label, swatchRelative }) => (
        <li key={band}>
          <button
            type="button"
            className="legend-band"
            aria-pressed={activeBand === band}
            data-active={activeBand === band}
            onClick={() => onSelectBand(band)}
          >
            <span className="legend-swatch" style={{ backgroundColor: heatColor(swatchRelative) }} />
            <span className="legend-label">{label}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default Legend
