/**
 * Ranked summary of every fired warning (spec §4), sorted by exclusive time
 * descending so the top entry is the actual bottleneck.
 */
import type { Warning } from "../types.ts"

interface WarningPanelProps {
  warnings: Warning[]
}

function WarningPanel({ warnings }: WarningPanelProps) {
  if (warnings.length === 0) return null

  const ranked = [...warnings].sort((a, b) => b.exclusiveMs - a.exclusiveMs)

  return (
    <ul className="warning-panel">
      {ranked.map((warning) => (
        <li key={`${warning.nodeId}-${warning.rule}`} className="warning-panel-entry">
          {warning.message}
        </li>
      ))}
    </ul>
  )
}

export default WarningPanel
