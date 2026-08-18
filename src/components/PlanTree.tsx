/**
 * Recursive, collapsible nested-list renderer for a PlanNode tree.
 * PlanTree recursing on itself is fine (spec §5) — each recursive instance
 * owns its own collapse state, scoped to the node it renders.
 */
import { useState } from "react"
import type { PlanNode as PlanNodeData } from "../types.ts"
import PlanNode from "./PlanNode.tsx"

interface PlanTreeProps {
  node: PlanNodeData
}

function PlanTree({ node }: PlanTreeProps) {
  const [expanded, setExpanded] = useState(true)
  const children = node.Plans ?? []

  return (
    <div className="plan-tree-node">
      <PlanNode
        node={node}
        expanded={expanded}
        hasChildren={children.length > 0}
        onToggle={() => setExpanded((prev) => !prev)}
      />
      {expanded && children.length > 0 ? (
        <div className="plan-tree-children">
          {children.map((child, i) => (
            <PlanTree key={i} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default PlanTree
