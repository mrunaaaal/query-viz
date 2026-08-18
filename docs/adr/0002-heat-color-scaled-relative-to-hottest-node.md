# Heat color is scaled relative to the hottest node, with the absolute share printed

A node's fill color interpolates the heat ramp over `[0, maxHeat]` — where
`maxHeat` is the largest heat value in *this* plan — not over `[0, 1]`. The
hottest node is always fully saturated; every other node scales beneath it. The
absolute share (`heat`, e.g. "6%") is printed as text on the node so the honest
number is never hidden by the relative color.

## Why

Heat is share of total work (ADR-0001). In a plan whose time is spread across
many nodes, the hottest might be only a few percent; mapping color over `[0, 1]`
would render the entire page pale, bottleneck included, defeating the core design
thesis that the bottleneck is visible before you read a word. Relative scaling
guarantees a visible hottest node.

The standard objection — you can't compare colors across two plans — costs
nothing here, because multi-plan diffing is out of scope. The residual risk (a
relatively-hot node that is absolutely minor) is covered by printing the absolute
share as a monospace number on every node.

The legend's click-to-filter bands are defined on relative position
`p = heat / maxHeat` so the swatches match node colors exactly: Cool `p < 0.33`,
Warm `0.33 ≤ p < 0.66`, Hot `p ≥ 0.66`.
