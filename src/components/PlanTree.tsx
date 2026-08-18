/**
 * Recursive, collapsible nested-list renderer for a PlanNode tree.
 * PlanTree recursing on itself is fine (spec §5) — each recursive instance
 * owns its own collapse state, scoped to the node it renders.
 */
import { useState } from "react"
import type { PlanNode as PlanNodeData, Warning } from "../types.ts"
import { childNodeId, ROOT_NODE_ID } from "../lib/nodeId.ts"
import PlanNode from "./PlanNode.tsx"

interface PlanTreeProps {
  node: PlanNodeData
  /** All warnings for the whole plan, keyed by the node path `findWarnings` assigned. */
  warningsByNodeId?: Map<string, Warning[]>
  /** This node's path in the tree — `"0"` for the root, `"0.1.2"` for its descendants. */
  path?: string
}

function PlanTree({ node, warningsByNodeId, path = ROOT_NODE_ID }: PlanTreeProps) {
  const [expanded, setExpanded] = useState(true)
  const children = node.Plans ?? []

  return (
    <div className="plan-tree-node">
      <PlanNode
        node={node}
        expanded={expanded}
        hasChildren={children.length > 0}
        onToggle={() => setExpanded((prev) => !prev)}
        warnings={warningsByNodeId?.get(path)}
      />
      {expanded && children.length > 0 ? (
        <div className="plan-tree-children">
          {children.map((child, i) => (
            <PlanTree
              key={i}
              node={child}
              warningsByNodeId={warningsByNodeId}
              path={childNodeId(path, i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default PlanTree
