/**
 * A single node card: operation, relation/index, estimated vs actual rows,
 * cost, exclusive time, and its heat fill. Heat color is relative to the
 * hottest node in the plan (ADR-0002); the absolute share is always printed
 * alongside it so the honest number is never hidden by relative color.
 * Collapse state lives in PlanTree, which owns the recursion.
 */
import type { PlanNode as PlanNodeData, Warning } from "../types.ts"
import { nodeTypeLabel } from "../lib/nodeType.ts"
import { heatColor, heatTextColor } from "../lib/heat.ts"
import { exclusiveMs } from "../lib/metrics.ts"

interface PlanNodeProps {
  node: PlanNodeData
  expanded: boolean
  hasChildren: boolean
  onToggle: () => void
  warnings?: Warning[]
  /** This node's absolute share of total exclusive time, in [0, 1] — printed as-is. */
  heat: number
  /** This node's heat position relative to the hottest node, in [0, 1] — drives the fill color. */
  relativeHeat: number
  /** True when a legend band filter is active and this node falls outside it. */
  dimmed: boolean
}

function PlanNode({
  node,
  expanded,
  hasChildren,
  onToggle,
  warnings = [],
  heat,
  relativeHeat,
  dimmed,
}: PlanNodeProps) {
  const label = nodeTypeLabel(node["Node Type"])
  const relation = node["Relation Name"]
  const index = node["Index Name"]
  const planRows = node["Plan Rows"]
  const actualRows = node["Actual Rows"]
  const sharePercent = (heat * 100).toFixed(1)

  return (
    <div
      className="plan-node"
      data-dimmed={dimmed}
      style={{ backgroundColor: heatColor(relativeHeat), color: heatTextColor(relativeHeat) }}
    >
      {hasChildren ? (
        <button type="button" className="plan-node-toggle" onClick={onToggle} aria-expanded={expanded}>
          {expanded ? "−" : "+"}
        </button>
      ) : null}
      <span className="plan-node-type">{label}</span>
      {relation ? <span className="plan-node-relation">on {relation}</span> : null}
      {index ? <span className="plan-node-index">using {index}</span> : null}
      {warnings.map((warning) => (
        <span key={warning.rule} className="warning-chip" title={warning.message}>
          {warning.rule}
        </span>
      ))}
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
        <dd>{exclusiveMs(node).toFixed(3)} ms</dd>
        <dt>Share</dt>
        <dd className="plan-node-share">{sharePercent}%</dd>
      </dl>
    </div>
  )
}

export default PlanNode
