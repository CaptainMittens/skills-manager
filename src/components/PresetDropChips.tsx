import { useDroppable } from '@dnd-kit/core'
import { cn } from '../utils'

interface PresetChipScenario {
  id: string
  name: string
}

function PresetChip({ scenario }: { scenario: PresetChipScenario }) {
  const { setNodeRef, isOver } = useDroppable({ id: scenario.id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition-colors',
        isOver
          ? 'border-accent bg-accent/15 text-accent'
          : 'border-border-subtle text-faint',
      )}
    >
      <span className="max-w-[140px] truncate">{scenario.name}</span>
    </div>
  )
}

export function PresetDropChips({
  scenarios,
}: {
  scenarios: PresetChipScenario[]
}) {
  if (scenarios.length === 0) return null
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {scenarios.map((s) => (
        <PresetChip key={s.id} scenario={s} />
      ))}
    </div>
  )
}
