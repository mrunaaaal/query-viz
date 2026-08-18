# Query Plan Visualizer — Build Spec

**One line:** Paste PostgreSQL `EXPLAIN (ANALYZE, FORMAT JSON)` output, get an interactive execution tree that shows where the time actually went.

**Stack:** React + TypeScript + Vite, deployed on Vercel. No backend, no database, no network calls.

**Budget:** 2–3 hours. Hour 1 = parse + tree render. Hour 2 = timing math + heat map. Hour 3 = warnings + polish.

**Why this project:** you spent 2.7 years reading execution plans by hand at a bank. This is the tool you wanted. That answer is worth more in an interview than the code is.

---

## 1. Scope

**In:**
- Textarea input → parse JSON → render collapsible execution tree
- Per-node: operation, relation/index name, estimated vs actual rows, cost, exclusive time
- Heat-color every node by its share of total execution time
- Warning flags: sequential scans, cardinality misestimates, expensive nested loops, disk-spilling sorts
- One preloaded sample plan so it demos in a single click

**Out (say so in the README, it reads as scope discipline rather than omission):**
- Text-format `EXPLAIN` parsing — JSON is already structured, text is an hour of regex for zero extra signal
- Plan sharing / persistence / URLs
- Multi-plan diffing
- Oracle or MySQL plan formats

---

## 2. The input format

`EXPLAIN (ANALYZE, FORMAT JSON) SELECT ...` returns an array with one element:

```json
[
  {
    "Plan": {
      "Node Type": "Nested Loop",
      "Startup Cost": 0.29,
      "Total Cost": 16.36,
      "Plan Rows": 1,
      "Plan Width": 68,
      "Actual Startup Time": 0.034,
      "Actual Total Time": 0.052,
      "Actual Rows": 3,
      "Actual Loops": 1,
      "Plans": [ { "Node Type": "Seq Scan", "Relation Name": "orders", ... } ]
    },
    "Planning Time": 0.123,
    "Execution Time": 0.089
  }
]
```

Children live in `Plans[]`. Recurse on that. Leaf nodes omit the key entirely.

Fields that may be absent and must not crash the parser: `Relation Name`, `Index Name`, `Plans`, `Rows Removed by Filter`, `Sort Method`, `Filter`, and every `Actual *` field (missing when the user ran `EXPLAIN` without `ANALYZE` — detect this and show a message telling them to add `ANALYZE`).

---

## 3. The timing math — this is the part that matters

**`Actual Total Time` is inclusive of children, and it is reported per loop.** Almost every naive version of this tool gets this wrong and produces a heat map that says the root node is 100% of the time, which is useless.

Correct exclusive time for a node:

```ts
function exclusiveMs(node: PlanNode): number {
  const self = node["Actual Total Time"] * node["Actual Loops"];
  const children = (node.Plans ?? []).reduce(
    (sum, c) => sum + c["Actual Total Time"] * c["Actual Loops"],
    0
  );
  return Math.max(0, self - children);
}
```

Heat value = `exclusiveMs(node) / Execution Time`, clamped to `[0, 1]`.

Same per-loop rule applies to rows. `Plan Rows` and `Actual Rows` are both per-loop, so the misestimate ratio compares them directly — do **not** multiply by loops here:

```ts
const est = Math.max(node["Plan Rows"], 1);
const act = Math.max(node["Actual Rows"], 1);
const misestimate = Math.max(act / est, est / act); // symmetric, always >= 1
```

**Interview note:** the inclusive-vs-exclusive and per-loop distinctions are the two things to be ready to explain. They're the difference between having read the Postgres docs and having used the tool.

---

## 4. Warnings

Four rules. Each renders as a small chip on the node plus an entry in a summary panel above the tree.

| Rule | Condition | Message |
|---|---|---|
| Sequential scan | `Node Type === "Seq Scan"` and `Actual Rows * Actual Loops > 10000` | Sequential scan over N rows — check for a usable index |
| Cardinality misestimate | `misestimate > 10` | Planner expected N rows, got M — statistics may be stale |
| Expensive nested loop | `Node Type === "Nested Loop"` and inner child `Actual Loops > 1000` | Inner side executed N times — a hash join may be cheaper |
| Sort spilled to disk | `Sort Method` contains `"external"` | Sort spilled to disk — consider raising `work_mem` |

Sort the summary panel by exclusive time descending, so the top entry is the actual bottleneck.

The misestimate rule is the one worth having. Sequential-scan warnings are table stakes; estimate-vs-actual drift is what a DBA actually looks at first, and including it is the detail that signals you've done this for real.

---

## 5. Component structure

```
src/
  App.tsx                 # layout, input/result state
  lib/
    parse.ts              # raw string -> PlanNode tree, throws typed errors
    metrics.ts            # exclusiveMs, misestimate, heat scale
    warnings.ts           # the four rules -> Warning[]
    sample.ts             # one realistic plan, ~10 nodes, 2 warnings firing
  components/
    PlanInput.tsx         # textarea + "Load sample" + parse errors
    PlanTree.tsx          # recursive renderer
    PlanNode.tsx          # single node card, collapsible
    WarningPanel.tsx      # ranked issues
    Legend.tsx            # heat scale key
  types.ts
```

`PlanTree` recursing on itself is fine. Skip D3 — it's a nested list with indent guides, not a force graph. Dropping the dependency is faster and one less thing to explain.

Node types to render labels for: `Seq Scan`, `Index Scan`, `Index Only Scan`, `Bitmap Heap Scan`, `Bitmap Index Scan`, `Nested Loop`, `Hash Join`, `Merge Join`, `Hash`, `Sort`, `Aggregate`, `HashAggregate`, `GroupAggregate`, `Limit`, `Gather`, `Gather Merge`, `Materialize`, `CTE Scan`, `Subquery Scan`, `Append`. Anything unrecognized falls back to the raw `Node Type` string — never blank.

---

## 6. Design direction

The functional core is "where did the time go," so make that the **only** thing with color. Everything else — text, borders, indent guides, chrome — stays neutral gray. A node's heat is the sole saturated element on the page, which means the bottleneck is visible before you've read a single word.

- **Palette:** neutral grays (`#1a1a1a` text, `#6b7280` secondary, `#e5e7eb` rules, `#fafafa` surface) plus a single heat ramp from pale (`#eef2ff`) through mid (`#818cf8`) to hot (`#4338ca`). Warning chips are the one exception: a muted amber, used sparingly.
- **Type:** monospace for everything structural — node types, table names, numbers. This is psql output; it should feel like it. A single sans face for prose and warnings so the two registers stay distinct.
- **Layout:** full-bleed tree, indent guides as hairlines, node cards with generous vertical rhythm. Input collapses to a thin bar once a plan is loaded.
- **Signature:** the heat ramp as the page's only color, with a legend that doubles as a filter — click a heat band, dim every node outside it.

Skip animation beyond a collapse transition. Respect `prefers-reduced-motion`. Keyboard focus must be visible — this is a developer tool and people will tab through it.

---

## 7. Build order

1. **Vite scaffold + types** (15 min) — `npm create vite@latest -- --template react-ts`
2. **`parse.ts` + sample plan** (30 min) — get a tree in `console.log` before rendering anything
3. **`PlanTree` / `PlanNode`, unstyled** (30 min) — nesting correct, all fields visible
4. **`metrics.ts` + heat map** (30 min) — the exclusive-time math from §3
5. **`warnings.ts` + panel** (30 min)
6. **Design pass** (30 min) — §6
7. **Error states** (15 min) — invalid JSON, missing `ANALYZE`, empty input
8. **Deploy + README** (20 min)

---

## 8. Error handling

Three failure modes, three distinct messages. Never a blank screen.

- **Invalid JSON** → "This doesn't parse as JSON. Run `EXPLAIN (ANALYZE, FORMAT JSON)` and paste the full result."
- **Valid JSON, no `Plan` key** → "No execution plan found. The output should start with `[{ \"Plan\": ... }]`."
- **Plan present, no `Actual Total Time`** → "This plan has estimates but no measurements. Re-run with `ANALYZE` to see actual timings."

That third one will be the most common real-world mistake. Handling it specifically is a small thing that makes the tool feel finished.

---

## 9. Deploy

```bash
npm run build
npx vercel --prod
```

Static SPA, no env vars, no config. Put the live URL in the repo description and at the top of the README.

**README needs:** one-sentence description, a screenshot of the tree with heat colors visible, a "paste this to try it" sample block, and a short "Why" paragraph — you tuned Oracle plans for three years and wanted to see them. That paragraph is what makes the project read as yours instead of as portfolio filler.

---

## 10. Resume line

**Query Plan Visualizer** | React, TypeScript, Vite, Vercel — *[live link]*
- Interactive tool that parses PostgreSQL `EXPLAIN ANALYZE` output into a heat-mapped execution tree, computing per-node exclusive time from inclusive per-loop measurements and flagging sequential scans, cardinality misestimates, and disk-spilling sorts to surface query bottlenecks at a glance.

**Be ready to explain:** why exclusive time ≠ `Actual Total Time`; why `Actual Loops` matters for timing but not for the row-estimate ratio; why a symmetric misestimate ratio beats a one-directional one; why you skipped text-format parsing.
