import { useState } from "react"
import Legend from "./components/Legend.tsx"
import PlanInput from "./components/PlanInput.tsx"
import PlanTree from "./components/PlanTree.tsx"
import WarningPanel from "./components/WarningPanel.tsx"
import { computeHeat } from "./lib/metrics.ts"
import { findWarnings } from "./lib/warnings.ts"
import type { HeatBand, PlanNode, Warning } from "./types.ts"

function App() {
  const [root, setRoot] = useState<PlanNode | null>(null)
  const [activeBand, setActiveBand] = useState<HeatBand | null>(null)

  const warnings = root ? findWarnings(root) : []
  const heatMap = root ? computeHeat(root) : null

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
      <PlanInput onPlanParsed={setRoot} tooFastToProfile={heatMap?.tooFastToProfile ?? false} />
      {root && heatMap ? (
        <>
          <WarningPanel warnings={warnings} />
          <PlanTree node={root} warningsByNodeId={warningsByNodeId} heatMap={heatMap} activeBand={activeBand} />
        </>
      ) : null}
    </div>
  )
}

export default App
