import { useState, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  X,
  ChevronDown,
  ChevronRight,
  SquareCheck,
  Square,
  Loader2,
  Search,
} from 'lucide-react'
import { useMultiSelect } from '../../hooks/useMultiSelect'
import { cn } from '../../utils'
import * as api from '../../lib/tauri'
import type { ManagedSkill, ProjectAgentTarget } from '../../lib/tauri'
import { AgentIcon } from '../../components/AgentIcon'
import { PROJECT_DEFAULT_EXPORT_AGENTS_KEY } from './projectSkillUtils'

export function AddFromLibraryDialog({
  exportTargets,
  managedSkills,
  selectedAgents,
  onSelectedAgentsChange,
  projectSkillDirNamesByAgent,
  projectCenterSkillIdsByAgent,
  onExport,
  onBatchExport,
  onClose,
}: {
  exportTargets: ProjectAgentTarget[]
  managedSkills: ManagedSkill[]
  selectedAgents: string[]
  onSelectedAgentsChange: (agents: string[]) => void
  projectSkillDirNamesByAgent: Record<string, string[]>
  projectCenterSkillIdsByAgent: Record<string, string[]>
  onExport: (skill: ManagedSkill) => Promise<void>
  onBatchExport: (skills: ManagedSkill[]) => Promise<void>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set())
  const [sourceFilters, setSourceFilters] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState<string | null>(null)
  const [batchExporting, setBatchExporting] = useState(false)
  const [dirNameMap, setDirNameMap] = useState<Record<string, string>>({})
  const [dirNameMapError, setDirNameMapError] = useState(false)
  const [agentPickerOpen, setAgentPickerOpen] = useState(false)
  const [showInactiveAgents, setShowInactiveAgents] = useState(false)

  const toggleAgent = useCallback(
    (agentKey: string) => {
      onSelectedAgentsChange(
        selectedAgents.includes(agentKey)
          ? selectedAgents.filter((key) => key !== agentKey)
          : [...selectedAgents, agentKey],
      )
    },
    [onSelectedAgentsChange, selectedAgents],
  )

  const handleSaveDefaults = useCallback(async () => {
    await api.setSettings(
      PROJECT_DEFAULT_EXPORT_AGENTS_KEY,
      JSON.stringify(selectedAgents),
    )
    toast.success(t('project.defaultAgentsSaved'))
  }, [selectedAgents, t])

  useEffect(() => {
    let cancelled = false
    const loadDirNames = async () => {
      const names = managedSkills.map((s) => s.name)
      if (names.length === 0) {
        if (!cancelled) {
          setDirNameMap({})
          setDirNameMapError(false)
        }
        return
      }
      try {
        const slugified = await api.slugifySkillNames(names)
        if (cancelled) return
        const map: Record<string, string> = {}
        managedSkills.forEach((s, i) => {
          map[s.id] = slugified[i]
        })
        setDirNameMap(map)
        setDirNameMapError(false)
      } catch {
        if (cancelled) return
        setDirNameMap({})
        setDirNameMapError(true)
      }
    }
    loadDirNames()
    return () => {
      cancelled = true
    }
  }, [managedSkills])

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    for (const skill of managedSkills) {
      for (const tag of skill.tags) {
        if (tag.trim()) tags.add(tag)
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b))
  }, [managedSkills])

  const sourceTypes = useMemo(() => {
    const preferred = ['local', 'import', 'git', 'skillssh']
    const present = new Set(
      managedSkills.map((skill) => skill.source_type).filter(Boolean),
    )
    return [
      ...preferred.filter((source) => present.has(source)),
      ...Array.from(present)
        .filter((source) => !preferred.includes(source))
        .sort(),
    ]
  }, [managedSkills])

  const toggleSourceFilter = useCallback((source: string) => {
    setSourceFilters((prev) => {
      const next = new Set(prev)
      if (next.has(source)) next.delete(source)
      else next.add(source)
      return next
    })
  }, [])

  const sourceLabel = useCallback(
    (source: string) => {
      if (['local', 'import', 'git', 'skillssh'].includes(source)) {
        return t(`mySkills.sourceFilter.${source}`)
      }
      return source
    },
    [t],
  )

  const activeTargets = useMemo(
    () => exportTargets.filter((target) => target.installed && target.enabled),
    [exportTargets],
  )

  const inactiveTargets = useMemo(
    () =>
      exportTargets.filter((target) => !target.installed || !target.enabled),
    [exportTargets],
  )

  const selectedTargetLabels = useMemo(
    () =>
      exportTargets
        .filter((target) => selectedAgents.includes(target.key))
        .map((target) => target.display_name),
    [exportTargets, selectedAgents],
  )

  const filtered = useMemo(
    () =>
      managedSkills.filter((skill) => {
        const matchesSearch =
          skill.name.toLowerCase().includes(search.toLowerCase()) ||
          (skill.description || '').toLowerCase().includes(search.toLowerCase())
        if (!matchesSearch) return false
        if (sourceFilters.size > 0 && !sourceFilters.has(skill.source_type))
          return false
        if (tagFilters.size === 0) return true
        return skill.tags.some((tag) => tagFilters.has(tag))
      }),
    [managedSkills, search, sourceFilters, tagFilters],
  )

  const isAlreadyExists = useCallback(
    (skill: ManagedSkill) => {
      const exportDirName = dirNameMap[skill.id]
      if (selectedAgents.length === 0) return true
      if (
        selectedAgents.some((agent) =>
          (projectCenterSkillIdsByAgent[agent] ?? []).includes(skill.id),
        )
      ) {
        return true
      }
      if (dirNameMapError) return true
      if (!exportDirName) return false
      return selectedAgents.some((agent) =>
        (projectSkillDirNamesByAgent[agent] ?? []).includes(
          exportDirName.toLowerCase(),
        ),
      )
    },
    [
      dirNameMap,
      dirNameMapError,
      projectCenterSkillIdsByAgent,
      projectSkillDirNamesByAgent,
      selectedAgents,
    ],
  )

  const selectableFiltered = useMemo(
    () => filtered.filter((s) => !isAlreadyExists(s)),
    [filtered, isAlreadyExists],
  )

  const {
    isMultiSelect,
    setIsMultiSelect,
    selectedIds,
    toggleSelect,
    isAllSelected,
    handleSelectAll,
    exitMultiSelect,
  } = useMultiSelect({
    items: managedSkills,
    filtered: selectableFiltered,
    getKey: (s) => s.id,
    isItemActive: () => true,
  })

  const selectedSelectable = useMemo(
    () => selectableFiltered.filter((s) => selectedIds.has(s.id)),
    [selectableFiltered, selectedIds],
  )

  const handleExport = async (skill: ManagedSkill) => {
    setExporting(skill.id)
    try {
      await onExport(skill)
    } finally {
      setExporting(null)
    }
  }

  const handleBatchExport = async () => {
    if (selectedSelectable.length === 0) return
    setBatchExporting(true)
    try {
      await onBatchExport(selectedSelectable)
    } finally {
      setBatchExporting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="text-[14px] font-semibold text-primary">
            {t('project.addSkillsToProject')}
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-secondary p-1.5 rounded-[4px] hover:bg-surface-hover transition-colors outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="shrink-0 overflow-y-auto border-b border-border-subtle px-5 py-3 scrollbar-hide">
          <div className="mb-3 flex items-center gap-2">
            <label className="shrink-0 text-[12px] font-medium text-muted">
              {t('project.targetAgents')}
            </label>
            <button
              onClick={handleSaveDefaults}
              disabled={selectedAgents.length === 0}
              className="ml-auto rounded-md border border-border-subtle px-2.5 py-1 text-[12px] font-medium text-muted transition-colors hover:border-border hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('project.saveDefaultAgents')}
            </button>
          </div>
          <div className="mb-3">
            <button
              onClick={() => setAgentPickerOpen((prev) => !prev)}
              className="flex w-full items-center gap-3 rounded-lg border border-border-subtle bg-background px-3 py-2.5 text-left transition-colors hover:border-border"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-secondary">
                  {selectedAgents.length > 0
                    ? t('project.selectedAgentCount', {
                        count: selectedAgents.length,
                      })
                    : t('project.selectTargetAgents')}
                </div>
                <div className="truncate text-[12px] text-muted">
                  {selectedTargetLabels.length > 0
                    ? selectedTargetLabels.join(', ')
                    : t('project.agentPickerHint')}
                </div>
              </div>
              {agentPickerOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              )}
            </button>

            {agentPickerOpen && (
              <div className="mt-2 rounded-lg border border-border-subtle bg-background">
                <div className="max-h-[220px] overflow-y-auto px-3 py-3 scrollbar-hide">
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                    {t('project.enabledAgents')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeTargets.map((target) => {
                      const active = selectedAgents.includes(target.key)
                      return (
                        <button
                          key={target.key}
                          onClick={() => toggleAgent(target.key)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
                            active
                              ? 'border-accent-border bg-accent-bg text-accent-light'
                              : 'border-border-subtle text-muted hover:border-border hover:text-secondary',
                          )}
                        >
                          {active ? (
                            <SquareCheck className="h-3.5 w-3.5" />
                          ) : (
                            <Square className="h-3.5 w-3.5" />
                          )}
                          <AgentIcon
                            agentKey={target.key}
                            displayName={target.display_name}
                            className="h-5 w-5 rounded-[5px]"
                          />
                          {target.display_name}
                        </button>
                      )
                    })}
                  </div>

                  {inactiveTargets.length > 0 && (
                    <div className="mt-3 border-t border-border-subtle pt-3">
                      <button
                        onClick={() => setShowInactiveAgents((prev) => !prev)}
                        className="flex w-full items-center justify-between text-left text-[12px] font-medium text-muted transition-colors hover:text-secondary"
                      >
                        <span>
                          {t('project.moreAgents', {
                            count: inactiveTargets.length,
                          })}
                        </span>
                        {showInactiveAgents ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      {showInactiveAgents && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {inactiveTargets.map((target) => {
                            const active = selectedAgents.includes(target.key)
                            return (
                              <button
                                key={target.key}
                                onClick={() => toggleAgent(target.key)}
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
                                  active
                                    ? 'border-accent-border bg-accent-bg text-accent-light'
                                    : 'border-border-subtle text-muted hover:border-border hover:text-secondary',
                                )}
                              >
                                {active ? (
                                  <SquareCheck className="h-3.5 w-3.5" />
                                ) : (
                                  <Square className="h-3.5 w-3.5" />
                                )}
                                <AgentIcon
                                  agentKey={target.key}
                                  displayName={target.display_name}
                                  className="h-5 w-5 rounded-[5px]"
                                />
                                {target.display_name}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('project.searchCenterSkills')}
                className="app-input w-full pl-9 font-medium"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
              />
            </div>
            <button
              onClick={() =>
                isMultiSelect ? exitMultiSelect() : setIsMultiSelect(true)
              }
              className={cn(
                'shrink-0 inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors outline-none',
                isMultiSelect
                  ? 'border-accent-border bg-accent-bg text-accent-light'
                  : 'border-border-subtle bg-background text-muted hover:border-border hover:text-secondary',
              )}
              title={
                isMultiSelect
                  ? t('project.cancelSelect')
                  : t('project.selectMode')
              }
            >
              <SquareCheck className="h-4 w-4" />
              <span>
                {isMultiSelect
                  ? t('project.cancelBatchSelect')
                  : t('project.batchSelectMode')}
              </span>
            </button>
          </div>
          {allTags.length > 0 && (
            <div className="mt-2">
              <p className="mb-1.5 text-[11px] text-muted">
                {t('project.exportTagFilterHint')}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] font-medium text-muted">
                  {t('project.exportTagFilterLabel')}
                </span>
                <button
                  onClick={() => setTagFilters(new Set())}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[12px] transition-colors',
                    tagFilters.size === 0
                      ? 'border-accent-border bg-accent-bg text-accent-light'
                      : 'border-border-subtle text-muted hover:border-border hover:text-secondary',
                  )}
                >
                  {t('mySkills.tags.allTags')}
                </button>
                {allTags.map((tag) => {
                  const active = tagFilters.has(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        setTagFilters((prev) => {
                          const next = new Set(prev)
                          if (next.has(tag)) next.delete(tag)
                          else next.add(tag)
                          return next
                        })
                      }}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[12px] transition-colors',
                        active
                          ? 'border-accent-border bg-accent-bg text-accent-light'
                          : 'border-border-subtle text-muted hover:border-border hover:text-secondary',
                      )}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {sourceTypes.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] font-medium text-muted">
                {t('mySkills.sourceType')}
              </span>
              <button
                onClick={() => setSourceFilters(new Set())}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[12px] transition-colors',
                  sourceFilters.size === 0
                    ? 'border-accent-border bg-accent-bg text-accent-light'
                    : 'border-border-subtle text-muted hover:border-border hover:text-secondary',
                )}
              >
                {t('mySkills.sourceFilter.all')}
              </button>
              {sourceTypes.map((source) => {
                const active = sourceFilters.has(source)
                return (
                  <button
                    key={source}
                    onClick={() => toggleSourceFilter(source)}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[12px] transition-colors',
                      active
                        ? 'border-accent-border bg-accent-bg text-accent-light'
                        : 'border-border-subtle text-muted hover:border-border hover:text-secondary',
                    )}
                  >
                    {sourceLabel(source)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-muted">
              {t('project.noSkillsToExport')}
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {filtered.map((skill) => {
                const alreadyExists = isAlreadyExists(skill)
                const isSelected = selectedIds.has(skill.id)
                const selectable = isMultiSelect && !alreadyExists
                return (
                  <div
                    key={skill.id}
                    className={cn(
                      'flex items-center gap-3 px-5 py-2.5 transition-colors',
                      selectable
                        ? 'cursor-pointer hover:bg-surface-hover'
                        : 'hover:bg-surface-hover',
                      selectable && isSelected && 'bg-accent/5',
                    )}
                    onClick={
                      selectable ? () => toggleSelect(skill.id) : undefined
                    }
                  >
                    {isMultiSelect &&
                      !alreadyExists &&
                      (isSelected ? (
                        <SquareCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
                      ) : (
                        <Square className="h-3.5 w-3.5 shrink-0 text-faint" />
                      ))}
                    <div className="flex-1 min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="truncate text-[13px] font-medium text-primary">
                          {skill.name}
                        </div>
                        <span className="shrink-0 rounded-full bg-surface-hover px-1.5 py-0.5 text-[11px] font-medium text-muted">
                          {sourceLabel(skill.source_type)}
                        </span>
                      </div>
                      {skill.description && (
                        <div className="text-[12px] text-muted truncate mt-0.5">
                          {skill.description}
                        </div>
                      )}
                    </div>
                    {alreadyExists ? (
                      <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[12px] font-medium text-muted shrink-0">
                        {t('project.alreadyExists')}
                      </span>
                    ) : (
                      !isMultiSelect && (
                        <button
                          onClick={() => handleExport(skill)}
                          disabled={exporting === skill.id}
                          className="shrink-0 rounded px-3 py-1 text-[13px] font-medium text-accent-light transition-colors hover:bg-accent-bg disabled:opacity-50 outline-none"
                        >
                          {exporting === skill.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            t('project.import')
                          )}
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {isMultiSelect && (
          <div className="shrink-0 border-t border-border-subtle bg-bg-secondary px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-primary">
                  {t('project.selectedCount', {
                    count: selectedSelectable.length,
                  })}
                </div>
                <button
                  onClick={handleSelectAll}
                  disabled={selectableFiltered.length === 0}
                  className="mt-0.5 text-[12px] font-medium text-accent hover:underline disabled:cursor-not-allowed disabled:text-faint disabled:no-underline"
                >
                  {isAllSelected
                    ? t('project.deselectAll')
                    : t('project.selectAll')}
                </button>
              </div>
              <button
                onClick={exitMultiSelect}
                className="rounded-md border border-border-subtle px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:border-border hover:text-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleBatchExport}
                disabled={selectedSelectable.length === 0 || batchExporting}
                className="inline-flex min-w-[128px] items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {batchExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SquareCheck className="h-3.5 w-3.5" />
                )}
                {t('project.addSelectedSkills', {
                  count: selectedSelectable.length,
                })}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
