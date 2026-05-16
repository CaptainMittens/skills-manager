# CODEMAP — SCOPED (Mini) for Sub-A: Drag Skill to Preset in MySkills

> **Scope disclaimer:** This is NOT a full-repo map. It covers only the blast
> radius of Sub-A — dragging a managed skill card onto a preset chip in the
> MySkills view to tag it into that preset (`addSkillToScenario` semantics).
> Reference spec: `docs/superpowers/specs/2026-05-16-drag-skill-to-preset-myskills-design.md`

---

## 1. Module / Dependency Table

| File                                 | Responsibility                                                                             | Key Exports / Symbols                                                                                                                                                                                              | Depended-on-by                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `src/lib/tauri.ts`                   | Tauri IPC bindings + shared types                                                          | `addSkillToScenario` (line 518), `ManagedSkill` interface (lines 16–38, includes `scenario_ids: string[]`), `Scenario` interface (lines 73–82)                                                                     | `AppContext.tsx`, `MySkills.tsx`, `useTagSkillToPreset` (PLANNED)            |
| `src/context/AppContext.tsx`         | Global app state + refresh actions                                                         | `scenarios: Scenario[]` (line 19 interface, line 51 state), `managedSkills: ManagedSkill[]` (line 25/63), `refreshManagedSkills` (lines 34/111–122), `refreshScenarios` (lines 32/76–89), `useApp()` consumer hook | `MySkills.tsx`, `PresetDropChips` (PLANNED), `useTagSkillToPreset` (PLANNED) |
| `src/lib/error.ts`                   | Structured error helpers                                                                   | `getErrorMessage(error, fallback)` (line 39) — extracts a human-readable string from any thrown value                                                                                                              | `MySkills.tsx` (existing), `useTagSkillToPreset` (PLANNED)                   |
| `src/views/MySkills.tsx`             | MySkills view — skill catalog + drag-reorder                                               | `MySkills` component (line 137), `SortableSkillItem` (lines 67–117), `handleDragEnd` (line 325), `sensors` (lines 318–323), `DndContext` mount (line 1624)                                                         | App router (consumer only)                                                   |
| `src/hooks/useTagSkillToPreset.ts`   | **PLANNED** — already-member guard → `addSkillToScenario` → toast → `refreshManagedSkills` | `useTagSkillToPreset(skillId: string, presetId: string): () => Promise<void>`                                                                                                                                      | `MySkills.tsx` (`handleDragEnd`)                                             |
| `src/components/PresetDropChips.tsx` | **PLANNED** — lightweight row of `useDroppable` chips, one per scenario; no install logic  | `PresetDropChips` component                                                                                                                                                                                        | `MySkills.tsx` (rendered inside `DndContext`)                                |
| `src/i18n/en.json`                   | English locale strings                                                                     | new key: `mySkills.alreadyInPreset` (or similar)                                                                                                                                                                   | `useTagSkillToPreset` (PLANNED)                                              |
| `src/i18n/zh.json`                   | Simplified Chinese locale strings                                                          | same key (parity required by repo convention)                                                                                                                                                                      | `useTagSkillToPreset` (PLANNED)                                              |

---

## 2. Key Symbol Details (verified, with citations)

### `ManagedSkill` — `src/lib/tauri.ts:16–38`

```
scenario_ids: string[]   // membership — which presets contain this skill
```

This is the source of truth for the already-member guard in the new hook.

### `Scenario` — `src/lib/tauri.ts:73–82`

```
id: string
name: string
```

The preset drop chips render `scenarios` from `useApp()`; `over.id` is matched
against `s.id` to detect a preset-branch drop.

### `addSkillToScenario` — `src/lib/tauri.ts:518–519`

```ts
export const addSkillToScenario = (skillId: string, scenarioId: string) =>
  invoke<void>('add_skill_to_scenario', { skillId, scenarioId })
```

### `getErrorMessage` — `src/lib/error.ts:39–44`

```ts
export function getErrorMessage(error: unknown, fallback: string): string
```

Returns `error.message` for AppError/Error instances, the string itself for
string throws, or `fallback` otherwise.

### `useApp()` destructure in `MySkills.tsx:139–148` (current)

```ts
const {
  viewedScenario, // Scenario | null — used only in reorder path
  tools,
  managedSkills: skills,
  refreshScenarios,
  refreshManagedSkills,
  detailSkillId,
  openSkillDetailById,
  closeSkillDetail,
} = useApp()
```

`scenarios` is **not** currently destructured here — it must be added for the
preset-branch check in `handleDragEnd` and for `PresetDropChips`.

### `refreshManagedSkills` — `src/context/AppContext.tsx:111–122`

Calls `api.getManagedSkills()` → `setManagedSkills(skills)`, then calls
`refreshProjects()`. No optimistic update; the preset drop path calls this
after a successful `addSkillToScenario` to reconcile `skill.scenario_ids`.

### `handleDragEnd` — `src/views/MySkills.tsx:325–358` (current)

Early return: `if (!over || active.id === over.id || !viewedScenario) return`
Note: the `!viewedScenario` guard is currently baked into the early return.
The preset branch must be inserted BEFORE this guard (or the guard must be
restructured) so that drops onto preset chips work even when
`viewedScenario` is null.

### `DndContext` mount — `src/views/MySkills.tsx:1624–2161`

`sensors={sensors}`, `collisionDetection={closestCenter}`,
`onDragEnd={handleDragEnd}`. `PresetDropChips` must render inside this element.

### `SortableSkillItem` — `src/views/MySkills.tsx:67–117`

Wraps `useSortable({ id })` from `@dnd-kit/sortable`. `id = skill.id`.
Unchanged by this feature.

---

## 3. Drag-End Control Flow (ASCII)

```
drag SortableSkillItem  (active.id = skill.id)
        │
        ▼
handleDragEnd(event)  [MySkills.tsx:325 — MODIFIED]
        │
        ├─ !over OR active.id === over.id
        │       └─► return (existing no-op guard — unchanged)
        │
        ├─ scenarios.some(s => s.id === over.id)?     ◄── NEW branch, checked FIRST
        │   (over.id is a preset / scenario id)            before !viewedScenario guard
        │       └─ yes ──► useTagSkillToPreset(active.id, over.id)  [NEW hook]
        │                         │
        │                         ├─ skill = skills.find(s => s.id === active.id)
        │                         │   └─ not found → silent return
        │                         │
        │                         ├─ skill.scenario_ids.includes(over.id)?
        │                         │   ├─ yes → toast.info(alreadyInPreset) → STOP
        │                         │   └─ no  → continue
        │                         │
        │                         ├─ await addSkillToScenario(skill.id, over.id)
        │                         │   └─ throws → toast.error(getErrorMessage(e)) → STOP
        │                         │
        │                         └─ toast.success → await refreshManagedSkills()
        │
        └─ !viewedScenario → return  (guard moved here — below preset branch)
                │
                └─ existing reorder path (UNCHANGED):
                        enabledSkills filter → oldIndex / newIndex →
                        optimistic setScenarioSkillOrder →
                        api.reorderScenarioSkills(viewedScenario.id, ...) →
                        revert on failure
```

**Key structural change to `handleDragEnd`:** the `!viewedScenario` early-return
is currently combined with the `!over` guard at line 328. It must be split so
the preset branch can fire independently of `viewedScenario`.

---

## 4. Blast Radius for Sub-A

### Files MODIFIED (existing)

| File                     | Change                                                                                                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/views/MySkills.tsx` | (1) Destructure `scenarios` from `useApp()` at line ~139. (2) Restructure `handleDragEnd` early-return to split out `!viewedScenario`. (3) Add preset-id branch calling `useTagSkillToPreset`. (4) Render `<PresetDropChips />` inside `DndContext`. |
| `src/i18n/en.json`       | Add already-in-preset info toast key.                                                                                                                                                                                                                |
| `src/i18n/zh.json`       | Add same key in zh-CN (locale parity).                                                                                                                                                                                                               |

### Files CREATED (new)

| File                                   | Purpose                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `src/hooks/useTagSkillToPreset.ts`     | Hook: already-member guard, `addSkillToScenario`, toast, `refreshManagedSkills`. |
| `src/components/PresetDropChips.tsx`   | Lightweight `useDroppable` chip row for preset targeting.                        |
| `src/test/useTagSkillToPreset.test.ts` | Unit tests: already-member short-circuit, happy path, throw path.                |
| `src/test/PresetDropChips.test.ts`     | Component tests: one chip per scenario, empty → renders nothing.                 |

### Files NOT TOUCHED

| File                           | Reason                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `src/lib/tauri.ts`             | `addSkillToScenario` (line 518) is already correct; no backend command changes. |
| `src/context/AppContext.tsx`   | `scenarios`, `managedSkills`, `refreshManagedSkills` shape unchanged.           |
| `src/lib/error.ts`             | `getErrorMessage` consumed as-is; no signature change.                          |
| `src/components/PresetBar.tsx` | Explicitly excluded — install-oriented props have no meaning in MySkills.       |

---

## 5. Dependency Graph (Sub-A units only)

```
src/lib/tauri.ts
  ├── ManagedSkill (scenario_ids: string[])
  ├── Scenario (id, name)
  └── addSkillToScenario(skillId, scenarioId)
          │
          ▼
src/context/AppContext.tsx
  ├── scenarios: Scenario[]
  ├── managedSkills: ManagedSkill[]  (aliased as `skills` in MySkills)
  └── refreshManagedSkills()
          │
          ├──────────────────────────────────────────────────────────────┐
          ▼                                                              ▼
src/hooks/useTagSkillToPreset.ts (PLANNED)          src/components/PresetDropChips.tsx (PLANNED)
  reads: skills, refreshManagedSkills                reads: scenarios
  calls: addSkillToScenario                          renders: useDroppable chips (one per scenario)
  uses:  getErrorMessage (src/lib/error.ts)
          │
          ▼
src/views/MySkills.tsx  (MODIFIED)
  handleDragEnd: preset branch → useTagSkillToPreset
  DndContext: contains PresetDropChips + SortableSkillItems
```
