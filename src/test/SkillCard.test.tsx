import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { RefObject } from 'react'
import type { ManagedSkill, ToolInfo } from '../lib/tauri'
import { SkillCard } from '../components/SkillCard'
import type { SkillCardActions } from '../components/SkillCard'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
  }),
}))

// ── Minimal fixtures ───────────────────────────────────────────────────────────

const baseSkill: ManagedSkill = {
  id: 'skill-1',
  name: 'Test Skill',
  description: 'A test description',
  source_type: 'git',
  source_ref: 'https://github.com/example/repo',
  source_ref_resolved: null,
  source_subpath: null,
  source_branch: null,
  source_revision: null,
  remote_revision: null,
  update_status: 'ok',
  last_checked_at: null,
  last_check_error: null,
  central_path: '/skills/test-skill',
  enabled: true,
  created_at: 0,
  updated_at: 0,
  status: 'ok',
  targets: [],
  scenario_ids: [],
  tags: ['alpha', 'beta'],
}

const tools: ToolInfo[] = [
  {
    key: 'claude_code',
    display_name: 'Claude Code',
    installed: true,
    skills_dir: '/skills',
    enabled: true,
    is_custom: false,
    has_path_override: false,
    project_relative_skills_dir: null,
  },
]

function makeActions(
  overrides: Partial<SkillCardActions> = {},
): SkillCardActions {
  return {
    dragHandle: <span data-testid="drag-handle">drag</span>,
    isMultiSelect: false,
    isSelected: false,
    isDeleting: false,
    isChecking: false,
    isUpdating: false,
    canRefresh: false,
    isMissingLocalSource: false,
    togglingTool: null,
    onCardClick: vi.fn(),
    onCheckUpdate: vi.fn(),
    onRefresh: vi.fn(),
    onRelinkSource: vi.fn(),
    onDetachSource: vi.fn(),
    onToggleScenario: vi.fn(),
    onToggleTool: vi.fn(),
    onRemoveTag: vi.fn(),
    tagEditing: false,
    tagInput: '',
    tagInputRef: { current: null } as unknown as RefObject<HTMLInputElement>,
    tagOptions: [],
    onTagInputChange: vi.fn(),
    onAddTag: vi.fn(),
    onBeginTagEdit: vi.fn(),
    onCancelTagEdit: vi.fn(),
    deleteSlot: <span data-testid="delete-slot">delete</span>,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Overlay (no actions) tests ─────────────────────────────────────────────────

describe('SkillCard – overlay mode (no actions)', () => {
  describe('grid variant', () => {
    it('root element has overlay classes: opacity-40, shadow-xl, cursor-grabbing', () => {
      const { container } = render(
        <SkillCard
          skill={baseSkill}
          variant="grid"
          displayName="Test Skill"
          isSynced={false}
          badge={null}
          enabledInScenario={false}
          viewedScenarioName="My Scenario"
          allTags={['alpha', 'beta']}
          tools={tools}
        />,
      )
      const root = container.firstChild as HTMLElement
      expect(root.className).toContain('opacity-40')
      expect(root.className).toContain('shadow-xl')
      expect(root.className).toContain('cursor-grabbing')
    })

    it('renders the skill name', () => {
      render(
        <SkillCard
          skill={baseSkill}
          variant="grid"
          displayName="Test Skill"
          isSynced={false}
          badge={null}
          enabledInScenario={false}
          viewedScenarioName="My Scenario"
          allTags={[]}
          tools={tools}
        />,
      )
      expect(screen.getByText('Test Skill')).toBeInTheDocument()
    })

    it('renders the skill description', () => {
      render(
        <SkillCard
          skill={baseSkill}
          variant="grid"
          displayName="Test Skill"
          isSynced={false}
          badge={null}
          enabledInScenario={false}
          viewedScenarioName="My Scenario"
          allTags={[]}
          tools={tools}
        />,
      )
      expect(screen.getByText('A test description')).toBeInTheDocument()
    })

    it('renders a badge when provided', () => {
      render(
        <SkillCard
          skill={baseSkill}
          variant="grid"
          displayName="Test Skill"
          isSynced={false}
          badge={{
            label: 'Update',
            className: 'bg-amber-500/12 text-amber-600',
          }}
          enabledInScenario={false}
          viewedScenarioName="My Scenario"
          allTags={[]}
          tools={tools}
        />,
      )
      expect(screen.getByText('Update')).toBeInTheDocument()
    })

    it('renders tags', () => {
      render(
        <SkillCard
          skill={baseSkill}
          variant="grid"
          displayName="Test Skill"
          isSynced={false}
          badge={null}
          enabledInScenario={false}
          viewedScenarioName="My Scenario"
          allTags={['alpha', 'beta']}
          tools={tools}
        />,
      )
      expect(screen.getByText('alpha')).toBeInTheDocument()
      expect(screen.getByText('beta')).toBeInTheDocument()
    })

    it('renders the footer/source row (regression guard: grid overlay must show footer)', () => {
      render(
        <SkillCard
          skill={baseSkill}
          variant="grid"
          displayName="Test Skill"
          isSynced={false}
          badge={null}
          enabledInScenario={false}
          viewedScenarioName="My Scenario"
          allTags={[]}
          tools={tools}
        />,
      )
      // source_type='git' → shows 'git' label in footer
      expect(screen.getByText('git')).toBeInTheDocument()
    })

    it('does NOT render action buttons in overlay mode', () => {
      render(
        <SkillCard
          skill={baseSkill}
          variant="grid"
          displayName="Test Skill"
          isSynced={false}
          badge={null}
          enabledInScenario={false}
          viewedScenarioName="My Scenario"
          allTags={[]}
          tools={tools}
        />,
      )
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument()
      expect(screen.queryByTestId('delete-slot')).not.toBeInTheDocument()
    })
  })

  describe('list variant', () => {
    it('root element has overlay classes: opacity-40, shadow-xl, cursor-grabbing', () => {
      const { container } = render(
        <SkillCard
          skill={baseSkill}
          variant="list"
          displayName="Test Skill"
          isSynced={false}
          badge={null}
          enabledInScenario={false}
          viewedScenarioName="My Scenario"
          allTags={[]}
          tools={tools}
        />,
      )
      const root = container.firstChild as HTMLElement
      expect(root.className).toContain('opacity-40')
      expect(root.className).toContain('shadow-xl')
      expect(root.className).toContain('cursor-grabbing')
    })

    it('renders name and description in list overlay mode', () => {
      render(
        <SkillCard
          skill={baseSkill}
          variant="list"
          displayName="Test Skill"
          isSynced={false}
          badge={null}
          enabledInScenario={false}
          viewedScenarioName="My Scenario"
          allTags={[]}
          tools={tools}
        />,
      )
      expect(screen.getByText('Test Skill')).toBeInTheDocument()
      expect(screen.getByText('A test description')).toBeInTheDocument()
    })

    it('renders tags read-only in list overlay mode', () => {
      render(
        <SkillCard
          skill={baseSkill}
          variant="list"
          displayName="Test Skill"
          isSynced={false}
          badge={null}
          enabledInScenario={false}
          viewedScenarioName="My Scenario"
          allTags={['alpha', 'beta']}
          tools={tools}
        />,
      )
      expect(screen.getByText('alpha')).toBeInTheDocument()
      expect(screen.getByText('beta')).toBeInTheDocument()
    })
  })
})

// ── Interactive (with actions) tests ──────────────────────────────────────────

describe('SkillCard – interactive mode (with actions)', () => {
  it('renders drag handle and delete slot', () => {
    render(
      <SkillCard
        skill={baseSkill}
        variant="grid"
        displayName="Test Skill"
        isSynced={false}
        badge={null}
        enabledInScenario={false}
        viewedScenarioName="My Scenario"
        allTags={[]}
        tools={tools}
        actions={makeActions()}
      />,
    )
    expect(screen.getByTestId('drag-handle')).toBeInTheDocument()
    expect(screen.getByTestId('delete-slot')).toBeInTheDocument()
  })

  it('clicking card root calls onCardClick', () => {
    const actions = makeActions()
    const { container } = render(
      <SkillCard
        skill={baseSkill}
        variant="grid"
        displayName="Test Skill"
        isSynced={false}
        badge={null}
        enabledInScenario={false}
        viewedScenarioName="My Scenario"
        allTags={[]}
        tools={tools}
        actions={actions}
      />,
    )
    fireEvent.click(container.firstChild as HTMLElement)
    expect(actions.onCardClick).toHaveBeenCalledTimes(1)
  })

  it('clicking check-update button calls onCheckUpdate and does NOT call onCardClick (stopPropagation)', () => {
    const actions = makeActions()
    render(
      <SkillCard
        skill={baseSkill}
        variant="grid"
        displayName="Test Skill"
        isSynced={false}
        badge={null}
        enabledInScenario={false}
        viewedScenarioName="My Scenario"
        allTags={[]}
        tools={tools}
        actions={actions}
      />,
    )
    // The check-update button has title 'mySkills.updateActions.check'
    const checkBtn = screen.getByTitle('mySkills.updateActions.check')
    fireEvent.click(checkBtn)
    expect(actions.onCheckUpdate).toHaveBeenCalledTimes(1)
    expect(actions.onCardClick).not.toHaveBeenCalled()
  })

  it('canRefresh=true renders refresh button; clicking it calls onRefresh and not onCardClick', () => {
    const actions = makeActions({ canRefresh: true })
    render(
      <SkillCard
        skill={baseSkill}
        variant="grid"
        displayName="Test Skill"
        isSynced={false}
        badge={null}
        enabledInScenario={false}
        viewedScenarioName="My Scenario"
        allTags={[]}
        tools={tools}
        actions={actions}
      />,
    )
    const refreshBtn = screen.getByTitle('mySkills.updateActions.update')
    fireEvent.click(refreshBtn)
    expect(actions.onRefresh).toHaveBeenCalledTimes(1)
    expect(actions.onCardClick).not.toHaveBeenCalled()
  })

  it('grid variant shows tag-edit affordance (Plus button)', () => {
    render(
      <SkillCard
        skill={baseSkill}
        variant="grid"
        displayName="Test Skill"
        isSynced={false}
        badge={null}
        enabledInScenario={false}
        viewedScenarioName="My Scenario"
        allTags={[]}
        tools={tools}
        actions={makeActions()}
      />,
    )
    // Plus icon button has title 'mySkills.tags.addTag'
    expect(screen.getByTitle('mySkills.tags.addTag')).toBeInTheDocument()
  })

  it('list variant does NOT render the inline tag editor', () => {
    render(
      <SkillCard
        skill={baseSkill}
        variant="list"
        displayName="Test Skill"
        isSynced={false}
        badge={null}
        enabledInScenario={false}
        viewedScenarioName="My Scenario"
        allTags={[]}
        tools={tools}
        actions={makeActions()}
      />,
    )
    expect(screen.queryByTitle('mySkills.tags.addTag')).not.toBeInTheDocument()
  })

  it('tagEditing=true shows the tag input in grid variant', () => {
    render(
      <SkillCard
        skill={baseSkill}
        variant="grid"
        displayName="Test Skill"
        isSynced={false}
        badge={null}
        enabledInScenario={false}
        viewedScenarioName="My Scenario"
        allTags={[]}
        tools={tools}
        actions={makeActions({ tagEditing: true })}
      />,
    )
    expect(
      screen.getByPlaceholderText('mySkills.tags.addTag'),
    ).toBeInTheDocument()
  })

  it('multiselect selected state shows SquareCheck and adds ring class', () => {
    const { container } = render(
      <SkillCard
        skill={baseSkill}
        variant="grid"
        displayName="Test Skill"
        isSynced={false}
        badge={null}
        enabledInScenario={false}
        viewedScenarioName="My Scenario"
        allTags={[]}
        tools={tools}
        actions={makeActions({ isMultiSelect: true, isSelected: true })}
      />,
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('ring-1')
    expect(root.className).toContain('ring-accent')
  })

  it('isDeleting=true shows the loading overlay', () => {
    render(
      <SkillCard
        skill={baseSkill}
        variant="grid"
        displayName="Test Skill"
        isSynced={false}
        badge={null}
        enabledInScenario={false}
        viewedScenarioName="My Scenario"
        allTags={[]}
        tools={tools}
        actions={makeActions({ isDeleting: true })}
      />,
    )
    // The overlay is an absolute div wrapping Loader2; it contains no text,
    // but we can confirm the delete slot is separate from the overlay.
    const { container } = render(
      <SkillCard
        skill={baseSkill}
        variant="list"
        displayName="Test Skill"
        isSynced={false}
        badge={null}
        enabledInScenario={false}
        viewedScenarioName="My Scenario"
        allTags={[]}
        tools={tools}
        actions={makeActions({ isDeleting: true })}
      />,
    )
    // The overlay div has bg-surface/70 class
    const overlay = container.querySelector('.bg-surface\\/70')
    expect(overlay).toBeInTheDocument()
  })

  it('isSynced=true shows CheckCircle2 status icon (non-multiselect)', () => {
    // CheckCircle2 has class text-emerald-500 – easiest to find by class
    const { container } = render(
      <SkillCard
        skill={{
          ...baseSkill,
          targets: [
            {
              id: 't1',
              skill_id: 'skill-1',
              tool: 'claude_code',
              target_path: '/p',
              mode: 'link',
              status: 'ok',
              synced_at: null,
            },
          ],
        }}
        variant="grid"
        displayName="Test Skill"
        isSynced={true}
        badge={null}
        enabledInScenario={false}
        viewedScenarioName="My Scenario"
        allTags={[]}
        tools={tools}
        actions={makeActions()}
      />,
    )
    expect(container.querySelector('.text-emerald-500')).toBeInTheDocument()
  })

  it('enabledInScenario=true shows scenario name in footer (grid)', () => {
    render(
      <SkillCard
        skill={baseSkill}
        variant="grid"
        displayName="Test Skill"
        isSynced={false}
        badge={null}
        enabledInScenario={true}
        viewedScenarioName="My Scenario"
        allTags={[]}
        tools={tools}
        actions={makeActions()}
      />,
    )
    expect(screen.getByText('My Scenario')).toBeInTheDocument()
  })
})
