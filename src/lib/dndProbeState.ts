/**
 * Module-level pub/sub store for @dnd-kit drag diagnostics.
 * Exported from a plain TS module so MySkills.tsx (which exports React
 * components) can write it and __DndProbe.tsx can read it without triggering
 * the react-refresh/only-export-components lint rule.
 *
 * Temporary — remove together with __DndProbe.tsx after drag-offset is confirmed fixed.
 */

export type DndProbeSnapshot = {
  activeId: string | null
  activatorClientX: number | null
  activatorClientY: number | null
  initialLeft: number | null
  initialTop: number | null
  initialWidth: number | null
  initialHeight: number | null
  translatedLeft: number | null
  translatedTop: number | null
  deltaX: number | null
  deltaY: number | null
  overId: string | null
  overLeft: number | null
  overTop: number | null
  overWidth: number | null
  overHeight: number | null
}

let _snapshot: DndProbeSnapshot = {
  activeId: null,
  activatorClientX: null,
  activatorClientY: null,
  initialLeft: null,
  initialTop: null,
  initialWidth: null,
  initialHeight: null,
  translatedLeft: null,
  translatedTop: null,
  deltaX: null,
  deltaY: null,
  overId: null,
  overLeft: null,
  overTop: null,
  overWidth: null,
  overHeight: null,
}

const _listeners: Set<() => void> = new Set()

export function subscribeDndProbe(cb: () => void): () => void {
  _listeners.add(cb)
  return () => {
    _listeners.delete(cb)
  }
}

export function getDndProbeSnapshot(): DndProbeSnapshot {
  return _snapshot
}

export function setDndProbe(patch: Partial<DndProbeSnapshot>): void {
  _snapshot = { ..._snapshot, ...patch }
  _listeners.forEach((cb) => cb())
}
