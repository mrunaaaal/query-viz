/**
 * Renders the sample plan directly until PlanInput.tsx (separate issue)
 * wires up textarea input and "Load sample".
 */
import PlanTree from "./components/PlanTree.tsx"
import { parsePlan } from "./lib/parse.ts"
import { sampleRawPlan } from "./lib/sample.ts"

function App() {
  const root = parsePlan(sampleRawPlan)
  return <PlanTree node={root} />
}

export default App
