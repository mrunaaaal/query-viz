/**
 * Node-type label lookup for spec §5's rendered node list.
 * Every `Node Type` renders as its own raw string — recognized or not — so
 * this only exists to guarantee the "never blank" fallback when the field
 * is missing entirely.
 */

/** The raw `Node Type` string, falling back to a placeholder — never blank. */
export function nodeTypeLabel(nodeType: string | undefined): string {
  return nodeType && nodeType.length > 0 ? nodeType : "Unknown"
}
