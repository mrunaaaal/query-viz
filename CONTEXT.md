# Query Plan Visualizer

The domain language for reading a PostgreSQL `EXPLAIN (ANALYZE, FORMAT JSON)`
plan and rendering where a query's execution time actually went. This is a
glossary of plan-reading terms, not a spec — see `query-plan-visualizer-spec.md`
for the build.

## Language

### Plan structure

**Node**:
A single operation in the execution tree (a scan, a join, a sort, an aggregate).
Carries the planner's estimates and, when run with `ANALYZE`, the measured
actuals. Renders as one card.

**Child**:
A node listed in a parent's `Plans[]` array. Identified by its
`Parent Relationship` field, never by position.

**Inner side**:
The child of a join whose `Parent Relationship` is `"Inner"` — the relation
re-executed once per row produced by the outer side. In a Nested Loop this is
the side whose loop count blows up.
_Avoid_: right side, `Plans[1]`, inner table

**Outer side**:
The child of a join whose `Parent Relationship` is `"Outer"` — driven once, top
to bottom, feeding rows into the join.
_Avoid_: left side, `Plans[0]`

**Rescan count**:
The Inner side's `Actual Loops` — how many times the inner relation was
re-executed. Read off the Inner node itself, wrapper (`Materialize`, `Memoize`)
included, since that is the true rescan shape.
_Avoid_: iterations, passes

**Subplan / InitPlan**:
Children that are not part of the linear timing tree — correlated subqueries and
one-shot initialisation plans. Their `Parent Relationship` is `"SubPlan"` /
`"InitPlan"`, so the Inner/Outer filter excludes them from join analysis
automatically.

### Timing

**Per-loop**:
The convention that a node's `Actual Total Time` and `Actual Rows` are reported
*per execution*, not summed. Total contribution is the reported value ×
`Actual Loops`. The tool's central subtlety: get this wrong and every derived
number is off.

**Inclusive time**:
A node's `Actual Total Time` — the time for that node *and all its children*.
This is what Postgres reports; it is not what the heat map wants.
_Avoid_: total time, node time

**Exclusive time**:
The time spent in a node *itself*, children removed:
`self × loops − Σ(child × child-loops)`, floored at zero. The honest measure of
where time went, and the value the heat map and the warning ranking both use.
_Avoid_: self time (in prose), own time

**Heat value**:
A node's exclusive time as a share of the total accounted exclusive time across
the whole plan, in `[0, 1]`. *Share of total work*, deliberately not share of
wall-clock — see ADR-0001.
_Avoid_: hotness, weight, cost

**Misestimate ratio**:
The symmetric gap between planned and actual row counts,
`max(actual/estimate, estimate/actual)`, always ≥ 1. Both counts are per-loop
and compared directly — *not* multiplied by loops. A high value means the
planner's statistics disagreed with reality.
_Avoid_: cardinality error, estimate skew

**Heat band**:
One of the three ranges the legend groups nodes into by relative heat position
`p = heat / maxHeat` — Cool (`p < 0.33`), Warm (`0.33 ≤ p < 0.66`), Hot
(`p ≥ 0.66`). Clicking a band dims every node outside it. See ADR-0002 for why
color is relative to the hottest node.
_Avoid_: heat bucket, tier
