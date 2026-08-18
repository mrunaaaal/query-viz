/**
 * Renders the sample plan directly until PlanInput.tsx (separate issue)
 * wires up textarea input and "Load sample".
 */
import PlanTree from "./components/PlanTree.tsx"
import WarningPanel from "./components/WarningPanel.tsx"
import { parsePlan } from "./lib/parse.ts"
import { sampleRawPlan } from "./lib/sample.ts"
import { findWarnings } from "./lib/warnings.ts"
import type { Warning } from "./types.ts"

function App() {
  const root = parsePlan(sampleRawPlan)
  const warnings = findWarnings(root)
  const warningsByNodeId = new Map<string, Warning[]>()
  for (const warning of warnings) {
    const forNode = warningsByNodeId.get(warning.nodeId) ?? []
    forNode.push(warning)
    warningsByNodeId.set(warning.nodeId, forNode)
  }

  return (
    <>
      <WarningPanel warnings={warnings} />
      <PlanTree node={root} warningsByNodeId={warningsByNodeId} />
    </>
  )
}

export default App
