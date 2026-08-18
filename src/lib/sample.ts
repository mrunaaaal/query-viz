/**
 * One realistic `EXPLAIN (ANALYZE, FORMAT JSON)` plan for the "Load sample" demo.
 * Modeled on `orders JOIN order_items ... JOIN customers` with a stale
 * statistics estimate on `orders` and a hot inner-side rescan on
 * `order_items` — see spec §5 for the two warnings this is built to trigger:
 * cardinality-misestimate and expensive-nested-loop.
 */
import type { ExplainOutput } from "../types.ts"

const sampleExplainOutput: ExplainOutput = [
  {
    Plan: {
      "Node Type": "Limit",
      "Startup Cost": 812.4,
      "Total Cost": 814.65,
      "Plan Rows": 50,
      "Plan Width": 96,
      "Actual Startup Time": 25.61,
      "Actual Total Time": 25.65,
      "Actual Rows": 50,
      "Actual Loops": 1,
      Plans: [
        {
          "Node Type": "Sort",
          "Parent Relationship": "Outer",
          "Sort Method": "quicksort",
          "Startup Cost": 812.4,
          "Total Cost": 816.4,
          "Plan Rows": 1400,
          "Plan Width": 96,
          "Actual Startup Time": 25.6,
          "Actual Total Time": 25.6,
          "Actual Rows": 1500,
          "Actual Loops": 1,
          Plans: [
            {
              "Node Type": "HashAggregate",
              "Parent Relationship": "Outer",
              "Startup Cost": 780.1,
              "Total Cost": 794.1,
              "Plan Rows": 1400,
              "Plan Width": 96,
              "Actual Startup Time": 25.3,
              "Actual Total Time": 25.3,
              "Actual Rows": 1500,
              "Actual Loops": 1,
              Plans: [
                {
                  "Node Type": "Hash Join",
                  "Parent Relationship": "Outer",
                  "Startup Cost": 42.5,
                  "Total Cost": 720.0,
                  "Plan Rows": 1400,
                  "Plan Width": 88,
                  "Actual Startup Time": 0.09,
                  "Actual Total Time": 25.0,
                  "Actual Rows": 1500,
                  "Actual Loops": 1,
                  Plans: [
                    {
                      "Node Type": "Nested Loop",
                      "Parent Relationship": "Outer",
                      "Startup Cost": 0.42,
                      "Total Cost": 660.0,
                      "Plan Rows": 1400,
                      "Plan Width": 60,
                      "Actual Startup Time": 0.06,
                      "Actual Total Time": 24.0,
                      "Actual Rows": 1500,
                      "Actual Loops": 1,
                      Plans: [
                        {
                          "Node Type": "Bitmap Heap Scan",
                          "Parent Relationship": "Outer",
                          "Relation Name": "orders",
                          "Filter": "(status = 'shipped'::text)",
                          "Startup Cost": 4.3,
                          "Total Cost": 55.2,
                          "Plan Rows": 50,
                          "Plan Width": 40,
                          "Actual Startup Time": 0.05,
                          "Actual Total Time": 1.2,
                          "Actual Rows": 1500,
                          "Actual Loops": 1,
                          Plans: [
                            {
                              "Node Type": "Bitmap Index Scan",
                              "Parent Relationship": "Outer",
                              "Index Name": "orders_status_idx",
                              "Startup Cost": 0,
                              "Total Cost": 4.29,
                              "Plan Rows": 1500,
                              "Plan Width": 0,
                              "Actual Startup Time": 0.02,
                              "Actual Total Time": 0.02,
                              "Actual Rows": 1500,
                              "Actual Loops": 1,
                            },
                          ],
                        },
                        {
                          "Node Type": "Index Scan",
                          "Parent Relationship": "Inner",
                          "Relation Name": "order_items",
                          "Index Name": "order_items_order_id_idx",
                          "Startup Cost": 0.29,
                          "Total Cost": 4.02,
                          "Plan Rows": 3,
                          "Plan Width": 20,
                          "Actual Startup Time": 0.01,
                          "Actual Total Time": 0.015,
                          "Actual Rows": 3,
                          "Actual Loops": 1500,
                        },
                      ],
                    },
                    {
                      "Node Type": "Hash",
                      "Parent Relationship": "Inner",
                      "Startup Cost": 35.0,
                      "Total Cost": 35.0,
                      "Plan Rows": 500,
                      "Plan Width": 28,
                      "Actual Startup Time": 0.85,
                      "Actual Total Time": 0.85,
                      "Actual Rows": 500,
                      "Actual Loops": 1,
                      Plans: [
                        {
                          "Node Type": "Seq Scan",
                          "Parent Relationship": "Outer",
                          "Relation Name": "customers",
                          "Startup Cost": 0,
                          "Total Cost": 35.0,
                          "Plan Rows": 500,
                          "Plan Width": 28,
                          "Actual Startup Time": 0.01,
                          "Actual Total Time": 0.8,
                          "Actual Rows": 500,
                          "Actual Loops": 1,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    "Planning Time": 0.31,
    "Execution Time": 25.72,
  },
]

/** The raw text a user would paste after running `EXPLAIN (ANALYZE, FORMAT JSON)`. */
export const sampleRawPlan: string = JSON.stringify(sampleExplainOutput, null, 2)
