# Heat value is normalized by total accounted work, not wall-clock

The build spec (§3) defines a node's heat as `exclusiveMs(node) / Execution Time`
clamped to `[0, 1]`. We deliberately do **not** do this. Heat is
`exclusiveMs(node) / Σ exclusiveMs(all nodes)` — each node's share of total
accounted exclusive time.

## Why

`Execution Time` is wall-clock. Under a parallel plan (`Gather` / `Gather Merge`
and parallel-aware scans), a node's `Actual Total Time` is the per-worker average
while `Actual Loops` sums loops across workers, so `Actual Total Time × Actual
Loops` yields *total CPU-time across workers* — with N workers, roughly N× the
wall-clock the node occupied. Dividing that by wall-clock produces heat values
above 1.0 on every parallel branch, which clamp to 1.0 and paint multiple nodes
as "100% hot." That is exactly the "root node is 100%, useless heat map" failure
the tool exists to avoid — the clamp hides the overflow rather than fixing it.

Normalizing by the sum of all nodes' exclusive time reframes heat as *share of
total work done*. It is always in `[0, 1]`, always sums to ~100%, is internally
consistent under parallelism (a scan that burned CPU across four workers genuinely
was a large share of the work), needs no clamp, and removes the `Execution Time`
missing/zero divide-by-zero edge case for free.

## Consequences

- The number on a node reads as "share of the query's work," not "share of the
  wall-clock you waited." This is the intended meaning for a tool used to find
  *where the work went* in a single query.
- `Execution Time` and `Planning Time` are still displayed as headline figures;
  they are just not the heat denominator.

## Considered and rejected

- **Spec as written (`/ Execution Time` + clamp)** — reproduces the parallel-plan
  failure mode above.
- **Divide parallel nodes by `Workers Launched + 1`** — recovers wall-clock share
  and is the most physically faithful, but adds worker-accounting code and
  leader-participation edge cases for a distinction most users of a single-query
  debugger don't need. Reconsider if "share of wall-clock" is ever specifically
  required.
