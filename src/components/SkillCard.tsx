import {
  CheckCircle2,
  Circle,
  Github,
  Globe,
  HardDrive,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Square,
  SquareCheck,
  X,
} from 'lucide-react'
import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ManagedSkill, ToolInfo } from '../lib/tauri'
import { getTagColor } from '../lib/skillTags'
import { cn } from '../utils'
import { SyncDots } from './SyncDots'

// ── Exported types ─────────────────────────────────────────────────────────────

export type SkillCardVariant = 'grid' | 'list'

export interface SkillCardActions {
  dragHandle: React.ReactNode
  isMultiSelect: boolean
  isSelected: boolean
  isDeleting: boolean
  isChecking: boolean
  isUpdating: boolean
  canRefresh: boolean
  isMissingLocalSource: boolean
  togglingTool: string | null
  onCardClick: () => void
  onCheckUpdate: () => void
  onRefresh: () => void
  onRelinkSource: () => void
  onDetachSource: () => void
  onToggleScenario: () => void
  onToggleTool: (tool: string, enabled: boolean) => void
  onRemoveTag: (tag: string) => void
  tagEditing: boolean
  tagInput: string
  tagInputRef: React.RefObject<HTMLInputElement | null>
  tagOptions: string[]
  onTagInputChange: (v: string) => void
  onAddTag: (value?: string) => void
  onBeginTagEdit: () => void
  onCancelTagEdit: () => void
  deleteSlot: React.ReactNode
}

export interface SkillCardProps {
  skill: ManagedSkill
  variant: SkillCardVariant
  displayName: string
  isSynced: boolean
  badge: { label: string; className: string } | null
  enabledInScenario: boolean
  viewedScenarioName: string
  allTags: string[]
  tools: ToolInfo[]
  actions?: SkillCardActions
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function sourceIcon(type: string) {
  switch (type) {
    case 'git':
    case 'skillssh':
      return <Github className="h-3 w-3" />
    case 'local':
    case 'import':
      return <HardDrive className="h-3 w-3" />
    default:
      return <Globe className="h-3 w-3" />
  }
}

function sourceTypeLabel(skill: ManagedSkill) {
  return skill.source_type === 'skillssh' ? 'skills.sh' : skill.source_type
}

// ── Memo comparator ───────────────────────────────────────────────────────────
//
// Callback props (onCardClick, onCheckUpdate, on*, onAddTag, etc.) are
// intentionally EXCLUDED from comparison. They are inline arrow closures
// recreated each render of MySkills, but their behaviour is stable — they
// close over `skill` and stable handler functions and never change semantics
// between renders. Including them would defeat the entire purpose of memo
// because they always have a new identity. Excluding them is safe because
// the PRIMITIVE state flags they depend on (isSelected, isDeleting, …) ARE
// in the compared set and will trigger a re-render whenever the callback
// output would actually differ.
//
// ReactNode props (dragHandle, deleteSlot) ARE compared by identity because
// they may carry meaningful structural changes (e.g. different button state).
// In practice they are stable across unrelated state changes.

function areEqual(prev: SkillCardProps, next: SkillCardProps): boolean {
  // Top-level scalar / identity props
  if (
    prev.skill !== next.skill ||
    prev.variant !== next.variant ||
    prev.displayName !== next.displayName ||
    prev.isSynced !== next.isSynced ||
    prev.enabledInScenario !== next.enabledInScenario ||
    prev.viewedScenarioName !== next.viewedScenarioName ||
    prev.allTags !== next.allTags ||
    prev.tools !== next.tools
  ) {
    return false
  }

  // badge: structural comparison (plain object or null)
  const pb = prev.badge
  const nb = next.badge
  if (pb !== nb) {
    if (pb === null || nb === null) return false
    if (pb.label !== nb.label || pb.className !== nb.className) return false
  }

  // actions presence change
  const pa = prev.actions
  const na = next.actions
  if ((pa === undefined) !== (na === undefined)) return false
  if (pa === undefined) return true // both undefined → equal

  // Primitive state flags that affect rendered output
  if (
    pa.isMultiSelect !== na!.isMultiSelect ||
    pa.isSelected !== na!.isSelected ||
    pa.isDeleting !== na!.isDeleting ||
    pa.isChecking !== na!.isChecking ||
    pa.isUpdating !== na!.isUpdating ||
    pa.canRefresh !== na!.canRefresh ||
    pa.isMissingLocalSource !== na!.isMissingLocalSource ||
    pa.togglingTool !== na!.togglingTool ||
    pa.tagEditing !== na!.tagEditing ||
    pa.tagInput !== na!.tagInput
  ) {
    return false
  }

  // tagOptions: compare by identity first, then by content
  if (pa.tagOptions !== na!.tagOptions) {
    const po = pa.tagOptions
    const no = na!.tagOptions
    if (po.length !== no.length || po.join('\0') !== no.join('\0')) return false
  }

  // ReactNode slots — compare by identity
  if (pa.dragHandle !== na!.dragHandle || pa.deleteSlot !== na!.deleteSlot) {
    return false
  }

  // All render-affecting fields are equal; callbacks excluded by design
  return true
}

// ── Component ─────────────────────────────────────────────────────────────────

function SkillCardInner({
  skill,
  variant,
  displayName,
  isSynced,
  badge,
  enabledInScenario,
  viewedScenarioName,
  allTags,
  tools,
  actions,
}: SkillCardProps) {
  const { t } = useTranslation()

  // Overlay (drag clone) mode: no actions prop
  const isOverlay = actions === undefined

  if (variant === 'grid') {
    return (
      <GridCard
        skill={skill}
        displayName={displayName}
        isSynced={isSynced}
        badge={badge}
        enabledInScenario={enabledInScenario}
        viewedScenarioName={viewedScenarioName}
        allTags={allTags}
        tools={tools}
        actions={actions}
        isOverlay={isOverlay}
        t={t}
      />
    )
  }

  return (
    <ListCard
      skill={skill}
      displayName={displayName}
      isSynced={isSynced}
      badge={badge}
      enabledInScenario={enabledInScenario}
      viewedScenarioName={viewedScenarioName}
      allTags={allTags}
      tools={tools}
      actions={actions}
      isOverlay={isOverlay}
      t={t}
    />
  )
}

export const SkillCard = memo(SkillCardInner, areEqual)

// ── Grid layout ───────────────────────────────────────────────────────────────

interface InternalProps {
  skill: ManagedSkill
  displayName: string
  isSynced: boolean
  badge: { label: string; className: string } | null
  enabledInScenario: boolean
  viewedScenarioName: string
  allTags: string[]
  tools: ToolInfo[]
  actions?: SkillCardActions
  isOverlay: boolean
  t: (key: string) => string
}

function GridCard({
  skill,
  displayName,
  isSynced,
  badge,
  enabledInScenario,
  viewedScenarioName,
  allTags,
  tools,
  actions,
  isOverlay,
  t,
}: InternalProps) {
  // Destructure to plain locals so ESLint's react-hooks/refs heuristic does not
  // flag unrelated property accesses on the `actions` object (the rule fires on
  // any member expression whose object contains a *Ref property).
  const dragHandle = actions?.dragHandle
  const isMultiSelect = actions?.isMultiSelect
  const isSelected = actions?.isSelected
  const isDeleting = actions?.isDeleting
  const isChecking = actions?.isChecking
  const isUpdating = actions?.isUpdating
  const canRefresh = actions?.canRefresh
  const isMissingLocalSource = actions?.isMissingLocalSource
  const togglingTool = actions?.togglingTool ?? null
  const onCardClick = actions?.onCardClick
  const onCheckUpdate = actions?.onCheckUpdate
  const onRefresh = actions?.onRefresh
  const onRelinkSource = actions?.onRelinkSource
  const onDetachSource = actions?.onDetachSource
  const onToggleScenario = actions?.onToggleScenario
  const onToggleTool = actions?.onToggleTool
  const onRemoveTag = actions?.onRemoveTag
  const tagEditing = actions?.tagEditing
  const tagInput = actions?.tagInput
  const tagInputRef = actions?.tagInputRef
  const tagOptions = actions?.tagOptions
  const onTagInputChange = actions?.onTagInputChange
  const onAddTag = actions?.onAddTag
  const onBeginTagEdit = actions?.onBeginTagEdit
  const onCancelTagEdit = actions?.onCancelTagEdit
  const deleteSlot = actions?.deleteSlot

  return (
    <div
      className={cn(
        'app-panel group relative flex h-full cursor-pointer flex-col transition-all hover:border-border hover:bg-surface-hover',
        enabledInScenario && 'border-l-2 border-l-accent',
        !isOverlay &&
          isMultiSelect &&
          isSelected &&
          'ring-1 ring-accent border-accent/40',
        isOverlay && 'shadow-xl opacity-40 cursor-grabbing',
      )}
      onClick={isOverlay ? undefined : onCardClick}
    >
      {/* Action button cluster – interactive mode only */}
      {!isOverlay && actions && (
        <div
          className={cn(
            'absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-lg border border-border-subtle bg-surface px-1 py-0.5 opacity-0 shadow-sm transition-all',
            !isMultiSelect && 'group-hover:opacity-100',
          )}
        >
          {dragHandle}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCheckUpdate!()
            }}
            disabled={isChecking}
            className="rounded p-1 text-muted transition-colors hover:bg-surface-hover hover:text-secondary disabled:opacity-50"
            title={t('mySkills.updateActions.check')}
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', isChecking && 'animate-spin')}
            />
          </button>
          {canRefresh && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRefresh!()
              }}
              disabled={isUpdating}
              className="rounded p-1 text-accent-light transition-colors hover:bg-accent-bg disabled:opacity-50"
              title={t('mySkills.updateActions.update')}
            >
              <RotateCcw
                className={cn('h-3.5 w-3.5', isUpdating && 'animate-spin')}
              />
            </button>
          )}
          {deleteSlot}
        </div>
      )}

      {/* Delete overlay */}
      {!isOverlay && isDeleting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-surface/70 backdrop-blur-[1px]">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      )}

      {/* Header row: status icon + name */}
      <div className="flex items-center gap-2.5 px-3.5 pr-20 pt-3 pb-1.5">
        {!isOverlay && isMultiSelect ? (
          isSelected ? (
            <SquareCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
          ) : (
            <Square className="h-3.5 w-3.5 shrink-0 text-faint" />
          )
        ) : isSynced ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        ) : (
          <Circle className="h-3.5 w-3.5 shrink-0 text-faint" />
        )}
        <h3
          className="flex-1 truncate text-[14px] font-semibold text-primary group-hover:text-accent-light"
          title={displayName}
        >
          {displayName}
        </h3>
      </div>

      {/* Body: description, badge, tags */}
      <div className="px-3.5 pb-3">
        <p className="text-[13px] leading-[18px] text-muted truncate">
          {skill.description || '—'}
        </p>
        {badge && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[13px] font-medium',
                badge.className,
              )}
            >
              {badge.label}
            </span>
            {!isOverlay && isMissingLocalSource && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRelinkSource!()
                  }}
                  disabled={isUpdating}
                  className="rounded-full border border-border-subtle px-2 py-0.5 text-[12px] font-medium text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
                >
                  {t('mySkills.updateActions.relink')}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDetachSource!()
                  }}
                  disabled={isUpdating}
                  className="rounded-full border border-border-subtle px-2 py-0.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-secondary disabled:opacity-50"
                >
                  {t('mySkills.updateActions.detachSource')}
                </button>
              </>
            )}
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'group/tag inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
                getTagColor(tag, allTags),
              )}
            >
              {tag}
              {!isOverlay && actions && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveTag!(tag)
                  }}
                  className="hidden group-hover/tag:inline-flex rounded-full p-0 opacity-60 hover:opacity-100"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          ))}

          {/* Tag editor – grid interactive mode only */}
          {!isOverlay && actions && (
            <>
              {tagEditing ? (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={(e) => onTagInputChange!(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onAddTag!()
                      if (e.key === 'Escape') onCancelTagEdit!()
                    }}
                    onBlur={() => {
                      if (tagInput!.trim()) onAddTag!()
                      else onCancelTagEdit!()
                    }}
                    placeholder={t('mySkills.tags.addTag')}
                    className="h-5 w-28 rounded-full border border-border-subtle bg-transparent px-1.5 text-[11px] text-secondary outline-none focus:border-accent"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus
                  />
                  {tagOptions!.length > 0 && (
                    <div className="absolute left-0 top-6 z-50 max-h-56 min-w-[112px] max-w-[180px] overflow-y-auto rounded-md border border-border-subtle bg-surface p-1 shadow-lg">
                      {tagOptions!.map((tagOption) => (
                        <button
                          key={tagOption}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddTag!(tagOption)
                          }}
                          className="w-full truncate rounded px-1.5 py-1 text-left text-[11px] text-secondary hover:bg-surface-hover"
                          title={tagOption}
                        >
                          {tagOption}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onBeginTagEdit!()
                  }}
                  className="inline-flex items-center rounded-full p-0.5 text-faint transition-colors hover:text-muted opacity-0 group-hover:opacity-100"
                  title={t('mySkills.tags.addTag')}
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer: source / scenario / sync dots / scenario toggle */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="inline-flex shrink-0 items-center gap-1 text-[13px] text-muted">
            {sourceIcon(skill.source_type)}
            {sourceTypeLabel(skill)}
          </span>
          {enabledInScenario && (
            <>
              <span className="text-faint">·</span>
              <span className="truncate text-[13px] font-medium text-amber-600 dark:text-amber-400/80">
                {viewedScenarioName}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SyncDots
            skill={skill}
            tools={tools}
            limit={6}
            onToggle={
              !isOverlay && actions && !isMultiSelect
                ? (tool, enabled) => onToggleTool!(tool, enabled)
                : undefined
            }
            pendingKey={!isOverlay && actions ? togglingTool : null}
          />
          {!isOverlay && actions && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleScenario!()
              }}
              className={cn(
                'rounded px-2 py-1 text-[13px] font-medium transition-colors outline-none',
                enabledInScenario
                  ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                  : 'text-muted hover:bg-surface-hover hover:text-secondary',
              )}
            >
              {enabledInScenario
                ? t('mySkills.enabledButton')
                : t('mySkills.enable')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── List layout ───────────────────────────────────────────────────────────────

function ListCard({
  skill,
  displayName,
  isSynced,
  badge,
  enabledInScenario,
  viewedScenarioName,
  allTags,
  tools,
  actions,
  isOverlay,
  t,
}: InternalProps) {
  // Destructure to plain locals so ESLint's react-hooks/refs heuristic does not
  // flag unrelated property accesses on the `actions` object.
  const dragHandle = actions?.dragHandle
  const isMultiSelect = actions?.isMultiSelect
  const isSelected = actions?.isSelected
  const isDeleting = actions?.isDeleting
  const isChecking = actions?.isChecking
  const isUpdating = actions?.isUpdating
  const canRefresh = actions?.canRefresh
  const isMissingLocalSource = actions?.isMissingLocalSource
  const togglingTool = actions?.togglingTool ?? null
  const onCardClick = actions?.onCardClick
  const onCheckUpdate = actions?.onCheckUpdate
  const onRefresh = actions?.onRefresh
  const onRelinkSource = actions?.onRelinkSource
  const onDetachSource = actions?.onDetachSource
  const onToggleScenario = actions?.onToggleScenario
  const onToggleTool = actions?.onToggleTool
  const deleteSlot = actions?.deleteSlot

  return (
    <div
      className={cn(
        'app-panel group relative flex cursor-pointer items-center gap-3.5 rounded-xl border-transparent px-3.5 py-3 transition-all hover:border-border hover:bg-surface-hover',
        enabledInScenario && 'border-l-2 border-l-accent',
        !isOverlay &&
          isMultiSelect &&
          isSelected &&
          'ring-1 ring-accent border-accent/40',
        isOverlay && 'shadow-xl opacity-40 cursor-grabbing',
      )}
      onClick={isOverlay ? undefined : onCardClick}
    >
      {/* Delete overlay */}
      {!isOverlay && isDeleting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-surface/70 backdrop-blur-[1px]">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      )}

      {/* Drag handle – interactive mode only */}
      {!isOverlay && dragHandle}

      {/* Status icon */}
      {!isOverlay && isMultiSelect ? (
        isSelected ? (
          <SquareCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
        ) : (
          <Square className="h-3.5 w-3.5 shrink-0 text-faint" />
        )
      ) : isSynced ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <Circle className="h-3.5 w-3.5 shrink-0 text-faint" />
      )}

      {/* Name */}
      <h3
        className="w-[180px] shrink-0 truncate text-[14px] font-semibold text-secondary group-hover:text-primary"
        title={displayName}
      >
        {displayName}
      </h3>

      {/* Description */}
      <p className="min-w-0 flex-1 truncate text-[13px] text-muted">
        {skill.description || '—'}
      </p>

      {/* Tags (read-only in list; no inline editor even when interactive) */}
      <div className="flex shrink-0 items-center gap-1.5">
        {skill.tags.map((tag) => (
          <span
            key={tag}
            className={cn(
              'inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium',
              getTagColor(tag, allTags),
            )}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Right cluster: badge, sync dots, source label, scenario name */}
      <div className="flex shrink-0 items-center gap-2.5">
        {badge && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[12px] font-medium',
              badge.className,
            )}
          >
            {badge.label}
          </span>
        )}
        <SyncDots
          skill={skill}
          tools={tools}
          limit={6}
          size="sm"
          onToggle={
            !isOverlay && actions && !isMultiSelect
              ? (tool, enabled) => onToggleTool!(tool, enabled)
              : undefined
          }
          pendingKey={!isOverlay && actions ? togglingTool : null}
        />
        <span className="inline-flex items-center gap-1 text-[13px] text-muted">
          {sourceIcon(skill.source_type)}
          {sourceTypeLabel(skill)}
        </span>
        {enabledInScenario && (
          <span className="text-[13px] font-medium text-amber-600 dark:text-amber-400/80">
            {viewedScenarioName}
          </span>
        )}
      </div>

      {/* Action buttons – interactive mode only */}
      {!isOverlay && actions && (
        <div
          className={cn(
            'flex shrink-0 items-center gap-1 opacity-0 transition-opacity',
            !isMultiSelect && 'group-hover:opacity-100',
          )}
        >
          {isMissingLocalSource && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRelinkSource!()
                }}
                disabled={isUpdating}
                className="rounded px-2 py-0.5 text-[13px] font-medium text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
              >
                {t('mySkills.updateActions.relink')}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDetachSource!()
                }}
                disabled={isUpdating}
                className="rounded px-2 py-0.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-secondary disabled:opacity-50"
              >
                {t('mySkills.updateActions.detachSource')}
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleScenario!()
            }}
            className={cn(
              'rounded px-2 py-0.5 text-[13px] font-medium transition-colors outline-none',
              enabledInScenario
                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                : 'text-muted hover:bg-surface-hover hover:text-secondary',
            )}
          >
            {enabledInScenario
              ? t('mySkills.enabledButton')
              : t('mySkills.enable')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCheckUpdate!()
            }}
            disabled={isChecking}
            className="rounded p-0.5 text-muted transition-colors hover:bg-surface-hover hover:text-secondary disabled:opacity-50"
            title={t('mySkills.updateActions.check')}
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', isChecking && 'animate-spin')}
            />
          </button>
          {canRefresh && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRefresh!()
              }}
              disabled={isUpdating}
              className="rounded p-0.5 text-accent-light transition-colors hover:bg-accent-bg disabled:opacity-50"
              title={t('mySkills.updateActions.update')}
            >
              <RotateCcw
                className={cn('h-3.5 w-3.5', isUpdating && 'animate-spin')}
              />
            </button>
          )}
          {deleteSlot}
        </div>
      )}
    </div>
  )
}
