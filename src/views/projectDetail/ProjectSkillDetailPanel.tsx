import { useState } from 'react'
import { FolderOpen, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  AgentToggleSection,
  type AgentToggleItem,
} from '../../components/AgentToggleSection'
import { DetailSheet } from '../../components/DetailSheet'
import { SkillMarkdown } from '../../components/SkillMarkdown'
import { DocumentDiffViewer } from '../../components/DocumentDiffViewer'
import { ProjectAgentDots } from '../../components/ProjectAgentDots'
import { cn } from '../../utils'
import type { ProjectAgentTarget } from '../../lib/tauri'
import {
  type ProjectSkillGroup,
  getAssignedAgents,
  getAgentDotTargets,
} from './projectSkillUtils'

export function ProjectSkillDetailPanel({
  skill,
  targets,
  togglingAgent,
  onToggleAgent,
  docContent,
  docLoading,
  centerDocContent,
  centerDocLoading,
  onClose,
}: {
  skill: ProjectSkillGroup
  targets: ProjectAgentTarget[]
  togglingAgent: string | null
  onToggleAgent: (agentKey: string, enabled: boolean) => void
  docContent: string | null
  docLoading: boolean
  centerDocContent: string | null
  centerDocLoading: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [contentTab, setContentTab] = useState<'local' | 'diff' | 'center'>(
    'local',
  )
  const supportsCenterDiff = skill.centerSkillIds.length > 0
  const toggleItems: AgentToggleItem[] = targets.map((target) => {
    const variant = skill.variants.find((item) => item.agent === target.key)
    return {
      key: target.key,
      displayName: target.display_name,
      enabled: Boolean(variant),
      isAvailable: target.installed && target.enabled,
      disabled: !variant && (!target.installed || !target.enabled),
      badgeLabel: !target.installed
        ? t('mySkills.agentToggleNotInstalled')
        : !target.enabled
          ? t('mySkills.agentToggleDisabledGlobally')
          : variant && !variant.enabled
            ? t('project.disabled')
            : null,
    }
  })
  const meta = (
    <>
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
        <ProjectAgentDots
          assignedAgents={getAssignedAgents(skill.variants)}
          targets={getAgentDotTargets(skill.variants).map((t) => ({
            key: t.key,
            display_name: t.display_name,
            enabled: true,
            installed: true,
            is_custom: false,
          }))}
        />
        {skill.tags.length > 0 && (
          <>
            <span className="mx-0.5 h-3 w-px bg-border-subtle" />
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-secondary"
              >
                {tag}
              </span>
            ))}
          </>
        )}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[12.5px] text-muted">
        <div className="flex min-w-0 items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="font-mono truncate">
            {skill.primaryVariant.path}
          </span>
        </div>
        {skill.files.length > 0 && (
          <div className="flex shrink-0 items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {skill.files.join(', ')}
          </div>
        )}
      </div>
    </>
  )

  return (
    <DetailSheet
      open={true}
      title={skill.name}
      description={
        skill.description ? (
          <p className="line-clamp-3">{skill.description}</p>
        ) : undefined
      }
      meta={meta}
      onClose={onClose}
    >
      <AgentToggleSection
        items={toggleItems}
        togglingKey={togglingAgent}
        onToggle={onToggleAgent}
        className="mb-4"
      />

      {supportsCenterDiff && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(['local', 'diff', 'center'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setContentTab(tab)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                contentTab === tab
                  ? 'bg-accent text-white'
                  : 'bg-surface-hover text-muted hover:text-secondary',
              )}
              disabled={
                (tab === 'diff' || tab === 'center') && centerDocLoading
              }
            >
              {tab === 'local'
                ? t('mySkills.docTabs.local')
                : tab === 'diff'
                  ? t('mySkills.docTabs.diff')
                  : t('project.docTabs.center')}
            </button>
          ))}
        </div>
      )}

      {docLoading ? (
        <div className="mt-12 text-center text-[13px] text-muted">
          {t('common.loading')}
        </div>
      ) : contentTab === 'diff' ? (
        docContent && centerDocContent ? (
          <DocumentDiffViewer
            original={docContent}
            updated={centerDocContent}
          />
        ) : centerDocLoading ? (
          <div className="mt-12 text-center text-[13px] text-muted">
            {t('common.loading')}
          </div>
        ) : (
          <div className="mt-12 text-center text-[13px] text-muted">
            {t('mySkills.sourceDiffUnavailable')}
          </div>
        )
      ) : contentTab === 'center' ? (
        centerDocLoading ? (
          <div className="mt-12 text-center text-[13px] text-muted">
            {t('common.loading')}
          </div>
        ) : centerDocContent ? (
          <SkillMarkdown content={centerDocContent} />
        ) : (
          <div className="mt-12 text-center text-[13px] text-muted">
            {t('mySkills.sourceDiffUnavailable')}
          </div>
        )
      ) : docContent ? (
        <SkillMarkdown content={docContent} />
      ) : (
        <div className="mt-12 text-center text-[13px] text-muted">
          {t('common.documentMissing')}
        </div>
      )}
    </DetailSheet>
  )
}
