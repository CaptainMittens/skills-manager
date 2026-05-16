/**
 * __DndProbe — temporary diagnostic overlay for @dnd-kit drag state.
 * Reads from module-level state published by MySkills.tsx (getDndProbeSnapshot /
 * subscribeDndProbe). Renders a fixed green-on-black monospace panel in the
 * top-right corner (pointer-events:none, z-index 99999).
 *
 * Committed alongside the snapCenterToCursor fix so screenshots can confirm
 * whether DRIFT is resolved. Remove after verification is complete.
 */
import { useEffect, useRef, useState } from 'react'
import {
  getDndProbeSnapshot,
  subscribeDndProbe,
  type DndProbeSnapshot,
} from '../lib/dndProbeState'

// Track live pointer independently of dnd-kit so we can compute drift.
let _livePointerX: number | null = null
let _livePointerY: number | null = null

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      _livePointerX = e.clientX
      _livePointerY = e.clientY
    },
    { passive: true, capture: true },
  )
}

function fmt(n: number | null, decimals = 1): string {
  if (n === null) return '—'
  return n.toFixed(decimals)
}

function fmtDrift(
  initial: number | null,
  delta: number | null,
  live: number | null,
  label: string,
): string {
  if (initial === null || delta === null || live === null) return `${label}: —`
  const projected = initial + delta
  const drift = projected - live
  return `${label}: proj=${fmt(projected)} live=${fmt(live)} DRIFT=${fmt(drift)}`
}

export function DndProbe() {
  const [snap, setSnap] = useState<DndProbeSnapshot>(getDndProbeSnapshot)
  const [px, setPx] = useState<number | null>(null)
  const [py, setPy] = useState<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    // Re-render when dnd-kit probe updates
    const unsub = subscribeDndProbe(() => {
      setSnap(getDndProbeSnapshot())
    })
    return () => {
      unsub()
    }
  }, [])

  // Poll live pointer at ~30fps so drift numbers stay current while dragging
  useEffect(() => {
    let alive = true
    function tick() {
      if (!alive) return
      setPx(_livePointerX)
      setPy(_livePointerY)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      alive = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const isDragging = snap.activeId !== null

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 99999,
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.88)',
        color: '#00ff88',
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.45,
        padding: '6px 10px',
        borderRadius: 6,
        maxWidth: 420,
        whiteSpace: 'pre',
        userSelect: 'none',
        opacity: isDragging ? 1 : 0.5,
      }}
    >
      {[
        `── @dnd-kit probe ──`,
        `active: ${snap.activeId ?? '—'}`,
        `activator: (${fmt(snap.activatorClientX)}, ${fmt(snap.activatorClientY)})`,
        `initial rect: L=${fmt(snap.initialLeft)} T=${fmt(snap.initialTop)} W=${fmt(snap.initialWidth)} H=${fmt(snap.initialHeight)}`,
        `translated:   L=${fmt(snap.translatedLeft)} T=${fmt(snap.translatedTop)}`,
        `delta: dx=${fmt(snap.deltaX)} dy=${fmt(snap.deltaY)}`,
        `over: ${snap.overId ?? '—'}  L=${fmt(snap.overLeft)} T=${fmt(snap.overTop)} W=${fmt(snap.overWidth)} H=${fmt(snap.overHeight)}`,
        `live ptr: (${fmt(px)}, ${fmt(py)})`,
        fmtDrift(snap.initialLeft, snap.deltaX, px, 'DRIFT x'),
        fmtDrift(snap.initialTop, snap.deltaY, py, 'DRIFT y'),
      ].join('\n')}
    </div>
  )
}
