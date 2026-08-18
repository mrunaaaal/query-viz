/**
 * A single node card: operation, relation/index, estimated vs actual rows,
 * cost, and an exclusive-time placeholder (wired in the metrics issue).
 * Collapse state lives in PlanTree, which owns the recursion.
 */
import type { PlanNode as PlanNodeData } from "../types.ts"
import { nodeTypeLabel } from "../lib/nodeType.ts"

interface PlanNodeProps {
  node: PlanNodeData
  expanded: boolean
  hasChildren: boolean
  onToggle: () => void
}

function PlanNode({ node, expanded, hasChildren, onToggle }: PlanNodeProps) {
  const label = nodeTypeLabel(node["Node Type"])
  const relation = node["Relation Name"]
  const index = node["Index Name"]
  const planRows = node["Plan Rows"]
  const actualRows = node["Actual Rows"]

  return (
    <div className="plan-node">
      {hasChildren ? (
        <button type="button" onClick={onToggle} aria-expanded={expanded}>
          {expanded ? "−" : "+"}
        </button>
      ) : null}
      <span className="plan-node-type">{label}</span>
      {relation ? <span className="plan-node-relation">on {relation}</span> : null}
      {index ? <span className="plan-node-index">using {index}</span> : null}
      <dl className="plan-node-fields">
        <dt>Plan Rows</dt>
        <dd>{planRows}</dd>
        <dt>Actual Rows</dt>
        <dd>{actualRows ?? "—"}</dd>
        <dt>Cost</dt>
        <dd>
          {node["Startup Cost"]}..{node["Total Cost"]}
        </dd>
        <dt>Exclusive Time</dt>
        <dd>—</dd>
      </dl>
    </div>
  )
}

export default PlanNode
