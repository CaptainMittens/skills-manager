import { useState, useCallback, useMemo } from 'react'
import { useProjectSkillMutations } from './projectDetail/useProjectSkillMutations'
import {
  FolderOpen,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  FileText,
  Download,
  Upload,
  RotateCcw,
  Layers,
  X,
  Loader2,
  Trash2,
  SquareCheck,
  Square,
  Plus,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { useProjectSkills } from './projectDetail/useProjectSkills'
import { useMultiSelect } from '../hooks/useMultiSelect'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { MultiSelectToolbar } from '../components/MultiSelectToolbar'
import { BatchTagDialog } from '../components/BatchTagDialog'
import { ProjectAgentDots } from '../components/ProjectAgentDots'
import { PresetBar } from '../components/PresetBar'
import { getTagActiveColor, getTagColor } from '../lib/skillTags'
import { cn } from '../utils'
import {
  type ProjectSkillGroup,
  getSyncStatusMeta,
  getAssignedAgents,
} from './projectDetail/projectSkillUtils'
import { AddFromLibraryDialog } from './projectDetail/AddFromLibraryDialog'
import { ProjectSkillDetailPanel } from './projectDetail/ProjectSkillDetailPanel'

export function ProjectDetail() {
  const { t } = useTranslation()
  const { scenarios, managedSkills } = useApp()
  const {
    id,
    loading,
    project,
    selectedExportAgents,
    setSelectedExportAgents,
    groupedSkills,
    exportTargets,
    projectSkillDirNamesByAgent,
    projectCenterSkillIdsByAgent,
    findProjectPresetVariant,
    detailSkill,
    setDetailSkill,
    docContent,
    docLoading,
    centerDocContent,
    centerDocLoading,
    loadSkills,
    handleOpenDetail,
  } = useProjectSkills()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterMode, setFilterMode] = useState<'all' | 'enabled' | 'disabled'>(
    'all',
  )
  const [search, setSearch] = useState('')
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set())
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectSkillGroup | null>(
    null,
  )
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false)
  const [batchTagDialogOpen, setBatchTagDialogOpen] = useState(false)
  const PROJECT_ADD_CALLOUT_KEY = 'skills-manager.projectAddCalloutDismissed'
  const [showAddCallout, setShowAddCallout] = useState(() => {
    try {
      return localStorage.getItem(PROJECT_ADD_CALLOUT_KEY) !== '1'
    } catch {
      return false
    }
  })
  const dismissAddCallout = () => {
    setShowAddCallout(false)
    try {
      localStorage.setItem(PROJECT_ADD_CALLOUT_KEY, '1')
    } catch {
      // ignore
    }
  }

  const getSkillKey = useCallback((skill: Pick<ProjectSkillGroup, 'id'>) => {
    return skill.id
  }, [])

  const filtered = useMemo(() => {
    return groupedSkills.filter((skill) => {
      const matchesSearch =
        skill.name.toLowerCase().includes(search.toLowerCase()) ||
        (skill.description || '').toLowerCase().includes(search.toLowerCase())
      if (!matchesSearch) return false
      if (tagFilters.size > 0 && !skill.tags.some((tag) => tagFilters.has(tag)))
        return false
      if (filterMode === 'enabled') return skill.enabledCount > 0
      if (filterMode === 'disabled') return skill.enabledCount === 0
      return true
    })
  }, [groupedSkills, search, filterMode, tagFilters])

  const {
    isMultiSelect,
    setIsMultiSelect,
    selectedIds,
    toggleSelect,
    isAllSelected,
    anyDisabled,
    handleSelectAll,
    exitMultiSelect,
  } = useMultiSelect({
    items: groupedSkills,
    filtered,
    getKey: getSkillKey,
    isItemActive: (s) => s.enabledCount === s.totalCount,
  })

  const enabledCount = groupedSkills.filter((s) => s.enabledCount > 0).length
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    for (const skill of groupedSkills) {
      for (const tag of skill.tags) {
        if (tag.trim()) tags.add(tag)
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b))
  }, [groupedSkills])
  const selectedSkills = useMemo(
    () => groupedSkills.filter((skill) => selectedIds.has(getSkillKey(skill))),
    [getSkillKey, groupedSkills, selectedIds],
  )
  const selectedTaggableSkills = useMemo(
    () => selectedSkills.filter((skill) => skill.centerSkillIds.length > 0),
    [selectedSkills],
  )
  const anyCanUpdateCenter = useMemo(
    () =>
      selectedSkills.some(
        (skill) =>
          skill.status === 'project_only' ||
          skill.status === 'project_newer' ||
          skill.status === 'diverged',
      ),
    [selectedSkills],
  )
  const anyCanUpdateProject = useMemo(
    () =>
      selectedSkills.some(
        (skill) =>
          skill.status === 'project_newer' ||
          skill.status === 'center_newer' ||
          skill.status === 'diverged',
      ),
    [selectedSkills],
  )

  const {
    updatingCenterSkill,
    updatingProjectSkill,
    batchUpdatingCenter,
    batchUpdatingProject,
    togglingSkill,
    togglingAgentTarget,
    handleUpdateCenter,
    handleUpdateProject,
    handleToggleSkill,
    handleToggleDetailAgent,
    handleExportFromCenter,
    handleBatchExportFromCenter,
    handleDeleteSkill,
    handleBatchDeleteProject,
    handleBatchToggleProject,
    handleBatchUpdateCenter,
    handleBatchUpdateProject,
    handleBatchEditTags,
    presetSkillExistsInProject,
    handleAddPresetSkillToProject,
    handleRemovePresetSkillFromProject,
    handlePresetActionComplete,
  } = useProjectSkillMutations({
    id,
    loadSkills,
    exportTargets,
    findProjectPresetVariant,
    setDetailSkill,
    selectedExportAgents,
    getSkillKey,
    selectedSkills,
    selectedTaggableSkills,
    anyDisabled,
    deleteTarget,
    setShowExportDialog,
    setBatchDeleteConfirm,
    exitMultiSelect,
  })

  if (!project) return null

  return (
    <div className="app-page">
      <div className="app-page-header flex flex-col gap-2.5 pb-3 pr-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-[1_1_260px]">
            <h1 className="app-page-title flex items-center gap-2.5">
              <FolderOpen className="h-5 w-5 text-accent" />
              {project.name}
              <span className="app-badge">{groupedSkills.length}</span>
            </h1>
            <p
              className="mt-1 truncate text-[12px] leading-5 text-muted"
              title={project.path}
            >
              {project.path}
              {groupedSkills.length > 0 &&
                ` \u00B7 ${enabledCount} / ${groupedSkills.length} ${t('project.enabled')}`}
            </p>
          </div>

          <div className="flex min-w-0 flex-[2_1_560px] flex-wrap items-center justify-end gap-2">
            <div className="relative w-full min-w-[220px] max-w-[300px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('project.searchPlaceholder')}
                className="app-input h-9 w-full rounded-md pl-8 font-medium"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <div className="app-segmented shrink-0">
              {(['all', 'enabled', 'disabled'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={cn(
                    'app-segmented-button',
                    filterMode === mode && 'app-segmented-button-active',
                  )}
                >
                  {t(`project.filters.${mode}`)}
                </button>
              ))}
            </div>

            <div className="app-segmented shrink-0">
              <button
                onClick={loadSkills}
                className="rounded-md p-2 text-muted transition-colors outline-none hover:bg-surface-hover hover:text-secondary"
                title={t('common.refresh')}
              >
                <RefreshCw
                  className={cn('h-4 w-4', loading && 'animate-spin')}
                />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded-md p-2 transition-colors outline-none',
                  viewMode === 'grid'
                    ? 'bg-surface-active text-secondary'
                    : 'text-muted hover:text-tertiary',
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded-md p-2 transition-colors outline-none',
                  viewMode === 'list'
                    ? 'bg-surface-active text-secondary'
                    : 'text-muted hover:text-tertiary',
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  isMultiSelect ? exitMultiSelect() : setIsMultiSelect(true)
                }
                className={cn(
                  'rounded-md p-2 transition-colors outline-none',
                  isMultiSelect
                    ? 'bg-surface-active text-secondary'
                    : 'text-muted hover:text-tertiary',
                )}
                title={
                  isMultiSelect
                    ? t('project.cancelSelect')
                    : t('project.selectMode')
                }
              >
                <SquareCheck className="h-4 w-4" />
              </button>
            </div>

            <div className="relative shrink-0">
              <button
                onClick={() => {
                  setShowExportDialog(true)
                  dismissAddCallout()
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('project.addSkill')}
              </button>
              {showAddCallout && groupedSkills.length > 0 && (
                <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-md border border-border bg-surface p-3 text-[12px] leading-snug shadow-lg">
                  <button
                    onClick={dismissAddCallout}
                    className="absolute right-1.5 top-1.5 rounded p-0.5 text-faint hover:text-secondary"
                    aria-label={t('common.close')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="pr-4 text-secondary">
                    {t('project.addCallout')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-muted">
              {t('mySkills.tags.filter')}
            </span>
            <button
              onClick={() => setTagFilters(new Set())}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors',
                tagFilters.size === 0
                  ? 'bg-accent text-white dark:bg-accent dark:text-white'
                  : 'bg-surface-hover text-muted hover:text-secondary',
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
                    'rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors',
                    active
                      ? getTagActiveColor(tag, allTags)
                      : getTagColor(tag, allTags),
                  )}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        )}

        {/* Preset bar */}
        {scenarios.length > 0 && selectedExportAgents.length > 0 && (
          <PresetBar
            presets={scenarios}
            managedSkills={managedSkills}
            agentKeys={selectedExportAgents}
            existsInWorkspace={presetSkillExistsInProject}
            onAddSkill={handleAddPresetSkillToProject}
            onRemoveSkill={handleRemovePresetSkillFromProject}
            onComplete={handlePresetActionComplete}
          />
        )}
      </div>

      {isMultiSelect && (
        <MultiSelectToolbar
          selectedCount={selectedIds.size}
          isAllSelected={isAllSelected}
          anyDisabled={anyDisabled}
          anyCanUpdateCenter={anyCanUpdateCenter}
          anyCanUpdateProject={anyCanUpdateProject}
          showToggle={project.supports_skill_toggle}
          updatingCenter={batchUpdatingCenter}
          updatingProject={batchUpdatingProject}
          labels={{
            hint: t('project.selectHint'),
            selected: t('project.selectedCount', { count: selectedIds.size }),
            updateCenter: t('project.batchUpdateCenter', {
              count: selectedIds.size,
            }),
            updateProject: t('project.batchUpdateProject', {
              count: selectedIds.size,
            }),
            delete: t('project.deleteSelected', { count: selectedIds.size }),
            enable: t('project.batchEnable', { count: selectedIds.size }),
            disable: t('project.batchDisable', { count: selectedIds.size }),
            selectAll: t('project.selectAll'),
            deselectAll: t('project.deselectAll'),
            cancel: t('common.cancel'),
            editTags: t('project.batchEditTags', {
              count: selectedTaggableSkills.length,
            }),
          }}
          onUpdateCenter={handleBatchUpdateCenter}
          onUpdateProject={handleBatchUpdateProject}
          onDelete={() => setBatchDeleteConfirm(true)}
          onToggle={handleBatchToggleProject}
          onSelectAll={handleSelectAll}
          onCancel={exitMultiSelect}
          onEditTags={
            selectedTaggableSkills.length > 0
              ? () => setBatchTagDialogOpen(true)
              : undefined
          }
        />
      )}

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center pb-20 text-center">
          <div className="text-[13px] text-muted">{t('common.loading')}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center pb-20 text-center">
          <Layers className="mb-4 h-12 w-12 text-faint" />
          <h3 className="mb-1.5 text-[14px] font-semibold text-tertiary">
            {groupedSkills.length === 0
              ? t('project.noSkills')
              : t('mySkills.noMatch')}
          </h3>
          <p className="max-w-md text-[13px] text-muted">
            {groupedSkills.length === 0 ? t('project.noSkillsHint') : ''}
          </p>
          {groupedSkills.length === 0 && (
            <button
              onClick={() => {
                setShowExportDialog(true)
                dismissAddCallout()
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('project.addSkillsCta')}
            </button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'pb-8',
            viewMode === 'grid'
              ? 'grid grid-cols-2 gap-3 lg:grid-cols-3'
              : 'flex flex-col gap-0.5',
          )}
        >
          {filtered.map((skill) => {
            const skillKey = getSkillKey(skill)
            const isSelected = selectedIds.has(skillKey)
            const isUpdatingCenter = updatingCenterSkill === skillKey
            const isUpdatingProject = updatingProjectSkill === skillKey
            const isToggling = togglingSkill === skillKey
            const canUpdateCenter =
              skill.status === 'project_only' ||
              skill.status === 'project_newer' ||
              skill.status === 'diverged'
            const canUpdateProject =
              skill.status === 'project_newer' ||
              skill.status === 'center_newer' ||
              skill.status === 'diverged'
            const statusMeta = getSyncStatusMeta(t, skill.status)
            const assignedAgents = getAssignedAgents(skill.variants)

            if (viewMode === 'grid') {
              return (
                <div
                  key={skillKey}
                  className={cn(
                    'app-panel group relative flex h-full cursor-pointer flex-col overflow-hidden transition-all hover:border-border hover:bg-surface-hover',
                    skill.enabledCount > 0 && 'border-l-2 border-l-accent',
                    skill.enabledCount === 0 && 'opacity-60',
                    isMultiSelect &&
                      isSelected &&
                      'ring-1 ring-accent border-accent/40',
                  )}
                  onClick={() =>
                    isMultiSelect
                      ? toggleSelect(skillKey)
                      : handleOpenDetail(skill)
                  }
                >
                  <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-1.5">
                    {isMultiSelect &&
                      (isSelected ? (
                        <SquareCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
                      ) : (
                        <Square className="h-3.5 w-3.5 shrink-0 text-faint" />
                      ))}
                    <h3
                      className="flex-1 truncate text-[14px] font-semibold text-primary"
                      title={skill.name}
                    >
                      {skill.name}
                    </h3>
                    {skill.files.length > 0 && (
                      <span className="flex items-center gap-1 text-[12px] text-faint shrink-0">
                        <FileText className="w-3 h-3" />
                        {skill.files.length}
                      </span>
                    )}
                  </div>

                  <div className="px-3.5 pb-3">
                    <p className="text-[13px] leading-[18px] text-muted truncate">
                      {skill.description || '\u2014'}
                    </p>
                    {skill.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {skill.tags.map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                              getTagColor(tag, allTags),
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[12px] font-medium',
                          statusMeta.className,
                        )}
                      >
                        {statusMeta.label}
                      </span>
                      {skill.enabledCount === 0 && (
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[12px] font-medium text-red-600 dark:text-red-300">
                          {t('project.disabled')}
                        </span>
                      )}
                    </div>
                    {!isMultiSelect && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ProjectAgentDots
                          assignedAgents={assignedAgents}
                          targets={exportTargets}
                          limit={4}
                          size="sm"
                          onToggle={(agentKey, enabled) =>
                            handleToggleDetailAgent(skill, agentKey, enabled)
                          }
                          pendingKey={
                            togglingAgentTarget?.skillKey === skillKey
                              ? togglingAgentTarget.agent
                              : null
                          }
                        />
                        {canUpdateCenter && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateCenter(skill)
                            }}
                            disabled={isUpdatingCenter || isUpdatingProject}
                            className="rounded px-2 py-1 text-[13px] font-medium text-muted transition-colors outline-none hover:bg-surface-hover hover:text-secondary disabled:opacity-50"
                            title={t('project.updateCenter')}
                          >
                            {isUpdatingCenter ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                        {canUpdateProject && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateProject(skill)
                            }}
                            disabled={isUpdatingCenter || isUpdatingProject}
                            className="rounded px-2 py-1 text-[13px] font-medium text-muted transition-colors outline-none hover:bg-surface-hover hover:text-secondary disabled:opacity-50"
                            title={
                              skill.status === 'project_newer'
                                ? t('project.resetFromCenter')
                                : t('project.updateProject')
                            }
                          >
                            {isUpdatingProject ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : skill.status === 'project_newer' ? (
                              <RotateCcw className="h-3.5 w-3.5" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                        {project.supports_skill_toggle ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleSkill(skill)
                            }}
                            disabled={isToggling}
                            className={cn(
                              'rounded px-2 py-1 text-[13px] font-medium transition-colors outline-none',
                              skill.enabledCount > 0
                                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                                : 'text-muted hover:bg-surface-hover hover:text-secondary',
                            )}
                          >
                            {isToggling ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : skill.enabledCount === skill.totalCount ? (
                              t('project.enabled')
                            ) : (
                              t('project.enableSkill')
                            )}
                          </button>
                        ) : null}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(skill)
                          }}
                          className="rounded px-2 py-1 text-muted transition-colors outline-none opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
                          title={t('project.deleteSkill')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            // List view
            return (
              <div
                key={skillKey}
                className={cn(
                  'app-panel group flex cursor-pointer items-center gap-3.5 rounded-xl border-transparent px-3.5 py-3 transition-all hover:border-border hover:bg-surface-hover',
                  skill.enabledCount > 0 && 'border-l-2 border-l-accent',
                  skill.enabledCount === 0 && 'opacity-60',
                  isMultiSelect &&
                    isSelected &&
                    'ring-1 ring-accent border-accent/40',
                )}
                onClick={() =>
                  isMultiSelect
                    ? toggleSelect(skillKey)
                    : handleOpenDetail(skill)
                }
              >
                {isMultiSelect &&
                  (isSelected ? (
                    <SquareCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
                  ) : (
                    <Square className="h-3.5 w-3.5 shrink-0 text-faint" />
                  ))}
                <h3
                  className="w-[180px] shrink-0 truncate text-[14px] font-semibold text-secondary"
                  title={skill.name}
                >
                  {skill.name}
                </h3>

                <p className="min-w-0 flex-1 truncate text-[13px] text-muted">
                  {skill.description || '\u2014'}
                </p>

                {skill.tags.length > 0 && (
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
                )}

                <div className="flex shrink-0 items-center gap-2.5">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[12px] font-medium',
                      statusMeta.className,
                    )}
                  >
                    {statusMeta.label}
                  </span>
                  {skill.enabledCount === 0 && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[12px] font-medium text-red-600 dark:text-red-300">
                      {t('project.disabled')}
                    </span>
                  )}
                  {skill.files.length > 0 && (
                    <span className="flex items-center gap-1 text-[12px] text-faint">
                      <FileText className="w-3 h-3" />
                      {skill.files.length}
                    </span>
                  )}
                  <ProjectAgentDots
                    assignedAgents={assignedAgents}
                    targets={exportTargets}
                    limit={4}
                    size="sm"
                    onToggle={
                      isMultiSelect
                        ? undefined
                        : (agentKey, enabled) =>
                            handleToggleDetailAgent(skill, agentKey, enabled)
                    }
                    pendingKey={
                      togglingAgentTarget?.skillKey === skillKey
                        ? togglingAgentTarget.agent
                        : null
                    }
                  />
                </div>

                {!isMultiSelect && (
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {canUpdateCenter && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUpdateCenter(skill)
                        }}
                        disabled={isUpdatingCenter || isUpdatingProject}
                        className="rounded p-0.5 text-muted transition-colors hover:bg-surface-hover hover:text-secondary disabled:opacity-50"
                        title={t('project.updateCenter')}
                      >
                        {isUpdatingCenter ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    {canUpdateProject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUpdateProject(skill)
                        }}
                        disabled={isUpdatingCenter || isUpdatingProject}
                        className="rounded p-0.5 text-muted transition-colors hover:bg-surface-hover hover:text-secondary disabled:opacity-50"
                        title={
                          skill.status === 'project_newer'
                            ? t('project.resetFromCenter')
                            : t('project.updateProject')
                        }
                      >
                        {isUpdatingProject ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : skill.status === 'project_newer' ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    {project.supports_skill_toggle ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleSkill(skill)
                        }}
                        disabled={isToggling}
                        className={cn(
                          'rounded px-2 py-0.5 text-[13px] font-medium transition-colors outline-none',
                          skill.enabledCount > 0
                            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-muted hover:bg-surface-hover hover:text-secondary',
                        )}
                      >
                        {isToggling ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : skill.enabledCount === skill.totalCount ? (
                          t('project.enabled')
                        ) : (
                          t('project.enableSkill')
                        )}
                      </button>
                    ) : null}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(skill)
                      }}
                      className="rounded p-0.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                      title={t('project.deleteSkill')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Skill Document Detail Panel */}
      {detailSkill && project && (
        <ProjectSkillDetailPanel
          skill={detailSkill}
          targets={exportTargets}
          togglingAgent={
            togglingAgentTarget?.skillKey === getSkillKey(detailSkill)
              ? togglingAgentTarget.agent
              : null
          }
          onToggleAgent={(agentKey, enabled) =>
            handleToggleDetailAgent(detailSkill, agentKey, enabled)
          }
          docContent={docContent}
          docLoading={docLoading}
          centerDocContent={centerDocContent}
          centerDocLoading={centerDocLoading}
          onClose={() => setDetailSkill(null)}
        />
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('project.deleteSkill')}
        message={t('project.deleteSkillConfirm', { name: deleteTarget?.name })}
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteSkill}
      />

      {/* Batch Delete Confirm Dialog */}
      <ConfirmDialog
        open={batchDeleteConfirm}
        title={t('project.deleteSkill')}
        message={t('project.batchDeleteConfirm', { count: selectedIds.size })}
        tone="danger"
        onClose={() => setBatchDeleteConfirm(false)}
        onConfirm={handleBatchDeleteProject}
      />

      <BatchTagDialog
        open={batchTagDialogOpen}
        skills={selectedTaggableSkills}
        allTags={allTags}
        onClose={() => setBatchTagDialogOpen(false)}
        onApply={handleBatchEditTags}
      />

      {/* Export from Center Dialog */}
      {showExportDialog && id && (
        <AddFromLibraryDialog
          exportTargets={exportTargets}
          managedSkills={managedSkills}
          selectedAgents={selectedExportAgents}
          onSelectedAgentsChange={setSelectedExportAgents}
          projectSkillDirNamesByAgent={projectSkillDirNamesByAgent}
          projectCenterSkillIdsByAgent={projectCenterSkillIdsByAgent}
          onExport={handleExportFromCenter}
          onBatchExport={handleBatchExportFromCenter}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  )
}
