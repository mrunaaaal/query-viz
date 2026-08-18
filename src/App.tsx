/**
 * Renders the sample plan directly until PlanInput.tsx (separate issue)
 * wires up textarea input and "Load sample".
 */
import { useState } from "react"
import Legend from "./components/Legend.tsx"
import PlanTree from "./components/PlanTree.tsx"
import WarningPanel from "./components/WarningPanel.tsx"
import { computeHeat } from "./lib/metrics.ts"
import { parsePlan } from "./lib/parse.ts"
import { sampleRawPlan } from "./lib/sample.ts"
import { findWarnings } from "./lib/warnings.ts"
import type { HeatBand, Warning } from "./types.ts"

function App() {
  const root = parsePlan(sampleRawPlan)
  const warnings = findWarnings(root)
  const heatMap = computeHeat(root)
  const [activeBand, setActiveBand] = useState<HeatBand | null>(null)

  const warningsByNodeId = new Map<string, Warning[]>()
  for (const warning of warnings) {
    const forNode = warningsByNodeId.get(warning.nodeId) ?? []
    forNode.push(warning)
    warningsByNodeId.set(warning.nodeId, forNode)
  }

  function handleSelectBand(band: HeatBand) {
    setActiveBand((prev) => (prev === band ? null : band))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Query Plan Visualizer</h1>
        <Legend activeBand={activeBand} onSelectBand={handleSelectBand} />
      </header>
      <WarningPanel warnings={warnings} />
      <PlanTree node={root} warningsByNodeId={warningsByNodeId} heatMap={heatMap} activeBand={activeBand} />
    </div>
  )
}

export default App
