/**
 * Textarea + "Load sample" + parse error display (spec §7 step 7, §8).
 * Parses on every change so the tree updates live. The three §8 failure
 * modes are surfaced with their exact messages; empty input shows a
 * neutral prompt instead of an error — no input state may blank the screen.
 */
import { useState } from "react"
import { ParseError, type PlanNode } from "../types.ts"
import { parsePlan } from "../lib/parse.ts"
import { sampleRawPlan } from "../lib/sample.ts"

interface PlanInputProps {
  onPlanParsed: (root: PlanNode | null) => void
  /** Set by App from metrics.ts once a plan has parsed (spec §7 step 7 / metrics "too fast" flag). */
  tooFastToProfile: boolean
}

function PlanInput({ onPlanParsed, tooFastToProfile }: PlanInputProps) {
  const [rawInput, setRawInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  function handleChange(value: string) {
    setRawInput(value)

    if (value.trim() === "") {
      setError(null)
      setLoaded(false)
      onPlanParsed(null)
      return
    }

    try {
      const root = parsePlan(value)
      setError(null)
      setLoaded(true)
      onPlanParsed(root)
    } catch (err) {
      setError(err instanceof ParseError ? err.message : "Something went wrong parsing this plan.")
      setLoaded(false)
      onPlanParsed(null)
    }
  }

  function handleLoadSample() {
    handleChange(sampleRawPlan)
  }

  return (
    <div className="plan-input" data-loaded={loaded}>
      <div className="plan-input-toolbar">
        <button type="button" className="plan-input-sample" onClick={handleLoadSample}>
          Load sample
        </button>
        {rawInput.trim() === "" ? (
          <span className="plan-input-hint">
            Paste the output of <code>EXPLAIN (ANALYZE, FORMAT JSON)</code> to get started.
          </span>
        ) : null}
        {loaded && tooFastToProfile ? (
          <span className="plan-input-hint">Query too fast to profile (&lt; 1ms total) — no heat to show.</span>
        ) : null}
      </div>
      <textarea
        className="plan-input-textarea"
        value={rawInput}
        onChange={(event) => handleChange(event.target.value)}
        placeholder='[{ "Plan": ... }]'
        spellCheck={false}
        aria-label="Query plan JSON"
        aria-invalid={error !== null}
      />
      {error ? (
        <p className="plan-input-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default PlanInput
