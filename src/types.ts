/**
 * Shared domain types for the Query Plan Visualizer.
 * See CONTEXT.md for the glossary (Node, Inner/Outer side, exclusive time, heat value, ...).
 */

/** A single node in a Postgres `EXPLAIN (ANALYZE, FORMAT JSON)` plan tree. */
export interface PlanNode {
  "Node Type"?: string
  "Parent Relationship"?: string
  "Relation Name"?: string
  "Index Name"?: string
  "Startup Cost": number
  "Total Cost": number
  "Plan Rows": number
  "Plan Width": number
  "Actual Startup Time"?: number
  "Actual Total Time"?: number
  "Actual Rows"?: number
  "Actual Loops"?: number
  "Filter"?: string
  "Rows Removed by Filter"?: number
  "Sort Method"?: string
  "Plans"?: PlanNode[]
  [key: string]: unknown
}

/** The `{ Plan, Planning Time, Execution Time }` wrapper Postgres emits per statement. */
export interface ExplainRoot {
  Plan: PlanNode
  "Planning Time"?: number
  "Execution Time"?: number
}

/** Top-level shape of `EXPLAIN (ANALYZE, FORMAT JSON)` output — always a one-element array. */
export type ExplainOutput = ExplainRoot[]

/** The four warning rules from spec §4. */
export type WarningRule =
  | "seq-scan"
  | "cardinality-misestimate"
  | "expensive-nested-loop"
  | "sort-spilled-to-disk"

/** A single flagged issue, ranked in the warnings panel by exclusive time. */
export interface Warning {
  nodeId: string
  rule: WarningRule
  message: string
  exclusiveMs: number
}

/** The three §8 failure modes a pasted plan can hit. */
export type ParseErrorKind = "invalid-json" | "no-plan" | "missing-actual-time"

export class ParseError extends Error {
  readonly kind: ParseErrorKind

  constructor(kind: ParseErrorKind, message: string) {
    super(message)
    this.name = "ParseError"
    this.kind = kind
  }
}
