/**
 * Recursive, collapsible nested-list renderer for a PlanNode tree.
 * PlanTree recursing on itself is fine (spec §5) — each recursive instance
 * owns its own collapse state, scoped to the node it renders.
 */
import { useState } from "react"
import type { HeatBand, PlanNode as PlanNodeData, Warning } from "../types.ts"
import { childNodeId, ROOT_NODE_ID } from "../lib/nodeId.ts"
import { heatBand } from "../lib/heat.ts"
import { relativeHeat, type HeatMap } from "../lib/metrics.ts"
import PlanNode from "./PlanNode.tsx"

interface PlanTreeProps {
  node: PlanNodeData
  /** All warnings for the whole plan, keyed by the node path `findWarnings` assigned. */
  warningsByNodeId?: Map<string, Warning[]>
  /** This node's path in the tree — `"0"` for the root, `"0.1.2"` for its descendants. */
  path?: string
  /** Per-node heat shares and the plan's maxHeat, for relative color scaling (ADR-0002). */
  heatMap: HeatMap
  /** The legend band currently selected as a filter, or null when no filter is active. */
  activeBand: HeatBand | null
}

function PlanTree({ node, warningsByNodeId, path = ROOT_NODE_ID, heatMap, activeBand }: PlanTreeProps) {
  const [expanded, setExpanded] = useState(true)
  const children = node.Plans ?? []

  const heat = heatMap.heat.get(node) ?? 0
  const relative = relativeHeat(heat, heatMap.maxHeat)
  const band = heatBand(relative)
  const dimmed = activeBand !== null && activeBand !== band

  return (
    <div className="plan-tree-node">
      <PlanNode
        node={node}
        expanded={expanded}
        hasChildren={children.length > 0}
        onToggle={() => setExpanded((prev) => !prev)}
        warnings={warningsByNodeId?.get(path)}
        heat={heat}
        relativeHeat={relative}
        dimmed={dimmed}
      />
      {expanded && children.length > 0 ? (
        <div className="plan-tree-children">
          {children.map((child, i) => (
            <PlanTree
              key={i}
              node={child}
              warningsByNodeId={warningsByNodeId}
              path={childNodeId(path, i)}
              heatMap={heatMap}
              activeBand={activeBand}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default PlanTree
