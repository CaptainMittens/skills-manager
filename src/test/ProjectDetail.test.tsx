import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import {
  createContext,
  useContext,
  useState,
  useCallback,
  StrictMode,
  type ReactNode,
} from 'react'
import { ProjectDetail } from '../views/ProjectDetail'

// ---------------------------------------------------------------------------
// React-router-dom mock
// ---------------------------------------------------------------------------
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'test-project-id' }),
  useNavigate: () => vi.fn(),
}))

// ---------------------------------------------------------------------------
// react-i18next mock
// ---------------------------------------------------------------------------
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && 'count' in opts) return `${key}:${opts.count}`
      return key
    },
  }),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_PROJECT = {
  id: 'test-project-id',
  name: 'Test Project',
  description: null,
  path: '/test',
  workspace_type: 'project' as const,
  linked_agent_name: null,
  supports_skill_toggle: true,
  sort_order: 0,
  skill_count: 1,
  sync_health: {
    in_sync: 1,
    project_newer: 0,
    center_newer: 0,
    diverged: 0,
    project_only: 0,
  },
  created_at: 0,
  updated_at: 0,
}

const MOCK_SKILL = {
  name: 'Test Skill',
  dir_name: 'test-skill',
  relative_path: 'test-skill',
  description: 'A test skill',
  path: '/test/.claude/commands/test-skill',
  files: ['CLAUDE.md'],
  enabled: true,
  agent: 'claude_code',
  agent_display_name: 'Claude Code',
  tags: [],
  in_center: true,
  sync_status: 'in_sync' as const,
  center_skill_id: 'center-skill-id-1',
}

// ---------------------------------------------------------------------------
// Stateful AppContext mock
//
// Using a real React context with real useState so that calling refreshProjects
// actually causes a context-value change that propagates to all consumers —
// matching the production AppContext behaviour.
// ---------------------------------------------------------------------------
interface MockAppState {
  projects: (typeof MOCK_PROJECT)[]
  scenarios: never[]
  managedSkills: never[]
  refreshManagedSkills: () => Promise<void>
  refreshScenarios: () => Promise<void>
  refreshProjects: () => Promise<void>
}

const MockAppContext = createContext<MockAppState | null>(null)

function MockAppProvider({ children }: { children: ReactNode }) {
  // Start with the project present so ProjectDetail doesn't navigate away.
  const [projects, setProjects] = useState([MOCK_PROJECT])

  // refreshProjects replaces the array with a NEW reference — exactly what
  // the real AppContext does — causing all consumers to re-render.
  const refreshProjects = useCallback(async () => {
    // Simulate an async IPC round-trip that returns the same data but a NEW array
    await Promise.resolve()
    setProjects([{ ...MOCK_PROJECT }])
  }, [])

  const value: MockAppState = {
    projects,
    scenarios: [],
    managedSkills: [],
    refreshManagedSkills: vi.fn().mockResolvedValue(undefined),
    refreshScenarios: vi.fn().mockResolvedValue(undefined),
    refreshProjects,
  }

  return (
    <MockAppContext.Provider value={value}>{children}</MockAppContext.Provider>
  )
}

// Replace the real useApp with one that reads from our stateful mock context.
vi.mock('../context/AppContext', () => ({
  useApp: () => {
    const ctx = useContext(MockAppContext)
    if (!ctx)
      throw new Error('MockAppContext not found — wrap with MockAppProvider')
    return ctx
  },
}))

// ---------------------------------------------------------------------------
// Tauri API mocks
// ---------------------------------------------------------------------------
const mockGetProjectSkills = vi.fn()
const mockExportSkillToProject = vi.fn().mockResolvedValue(undefined)
const mockDeleteProjectSkill = vi.fn().mockResolvedValue(undefined)

vi.mock('../lib/tauri', () => ({
  getProjectSkills: (...args: unknown[]) => mockGetProjectSkills(...args),
  getProjectAgentTargets: vi.fn().mockResolvedValue([
    {
      key: 'claude_code',
      display_name: 'Claude Code',
      enabled: true,
      installed: true,
      is_custom: false,
    },
    {
      key: 'cursor',
      display_name: 'Cursor',
      enabled: true,
      installed: true,
      is_custom: false,
    },
  ]),
  getSettings: vi.fn().mockResolvedValue(null),
  slugifySkillNames: vi.fn().mockResolvedValue([]),
  exportSkillToProject: (...args: unknown[]) =>
    mockExportSkillToProject(...args),
  deleteProjectSkill: (...args: unknown[]) => mockDeleteProjectSkill(...args),
  getProjectSkillDocument: vi.fn().mockResolvedValue({
    skill_name: 'Test Skill',
    filename: 'CLAUDE.md',
    content: '# Test',
  }),
  getSkillDocument: vi.fn().mockResolvedValue({
    skill_id: 'center-skill-id-1',
    filename: 'CLAUDE.md',
    content: '# Center',
  }),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ProjectDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Use real async delays to mimic Tauri IPC latency.
    // exportSkillToProject takes longer than getProjectSkills so that
    // refreshProjects can interleave with the loadSkills fetch — the
    // exact timing window where the production bug manifests.
    mockGetProjectSkills.mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve([MOCK_SKILL]), 20)),
    )
    mockExportSkillToProject.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10)),
    )
  })

  it('renders without crashing', async () => {
    render(
      <MockAppProvider>
        <ProjectDetail />
      </MockAppProvider>,
    )
    expect(document.body).toBeTruthy()
  })

  it('does not stay stuck on loading after agent toggle in detail panel', async () => {
    render(
      <MockAppProvider>
        <ProjectDetail />
      </MockAppProvider>,
    )

    // Wait for initial load to complete (loading text disappears, skill grid appears)
    await waitFor(() => {
      expect(screen.queryByText('common.loading')).not.toBeInTheDocument()
    })

    // The skill card should now be visible — click it to open detail panel
    const skillCard = await screen.findByText('Test Skill')
    act(() => {
      fireEvent.click(skillCard)
    })

    // Wait for detail panel to open — it contains the AgentToggleSection
    await waitFor(() => {
      expect(screen.getByText('mySkills.agentTogglesTitle')).toBeInTheDocument()
    })

    // Find the Cursor toggle (not enabled — no variant for cursor exists)
    const cursorButton = await screen.findByText('Cursor')
    const cursorToggleButton = cursorButton.closest('button')
    expect(cursorToggleButton).not.toBeNull()

    // Clicking cursor toggle triggers handleToggleDetailAgent(skill, 'cursor', true)
    // This calls exportSkillToProject → then Promise.all([loadSkills(), refreshProjects()])
    // refreshProjects() now causes a real React state update, propagating a new
    // projects array to all useApp() consumers — matching production behaviour.
    act(() => {
      fireEvent.click(cursorToggleButton!)
    })

    // Confirm exportSkillToProject was called (proves we hit the right code path).
    // Wait for it — the 10ms delay means it may not have fired immediately.
    await waitFor(
      () => {
        expect(mockExportSkillToProject).toHaveBeenCalledWith(
          'center-skill-id-1',
          'test-project-id',
          ['cursor'],
        )
      },
      { timeout: 3000 },
    )

    // Confirm loadSkills was re-called after the toggle.
    // With the 20ms delay this resolves after exportSkillToProject.
    await waitFor(
      () => {
        expect(mockGetProjectSkills).toHaveBeenCalledTimes(2)
      },
      { timeout: 3000 },
    )

    // After the toggle+reload completes, loading must return to false.
    await waitFor(
      () => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  })

  it('resolves loading even when a concurrent loadSkills call hangs (StrictMode regression)', async () => {
    // Root-cause proof for the 06a9635 regression:
    //
    // React 18 StrictMode (used in production) runs every effect TWICE:
    // mount → fake-unmount → remount. Crucially, useRef is PRESERVED across the
    // fake-unmount/remount cycle, so both runs share the same loadInFlightRef.
    //
    // With the loadInFlightRef counter (06a9635):
    //   • Run 1: counter 0 → 1, api call A in-flight
    //   • Run 2: counter 1 → 2, api call B in-flight
    //   • A resolves: counter 2 → 1 (≠ 0) → setLoading NOT called → still true
    //   • B hangs forever → counter never reaches 0 → loading PERMANENTLY stuck
    //
    // With the original simple `finally { setLoading(false) }`:
    //   • A resolves: setLoading(false) immediately → loading = false → FIXED
    //   • B can hang freely; loading is already cleared

    let callCount = 0
    const resolvers: Array<() => void> = []

    mockGetProjectSkills.mockImplementation(() => {
      const n = ++callCount
      return new Promise<(typeof MOCK_SKILL)[]>((resolve) => {
        if (n === 1) {
          // First call resolves after a short delay (simulates a fast IPC response).
          setTimeout(() => resolve([MOCK_SKILL]), 10)
        } else {
          // Second call (StrictMode's remount) hangs forever — simulates a Tauri
          // IPC call that never returns (the exact production failure mode).
          resolvers.push(() => resolve([MOCK_SKILL]))
        }
      })
    })

    render(
      // StrictMode mirrors the production environment (main.tsx wraps the whole app).
      <StrictMode>
        <MockAppProvider>
          <ProjectDetail />
        </MockAppProvider>
      </StrictMode>,
    )

    // Wait for at least 2 getProjectSkills calls (StrictMode fires the effect twice).
    await waitFor(
      () => {
        expect(callCount).toBeGreaterThanOrEqual(2)
      },
      { timeout: 3000 },
    )

    // The first call completes (10ms). Loading should now resolve to false.
    //
    // WITH loadInFlightRef (broken): counter is 2 → 1 after call 1; call 2 hangs
    //   → counter never reaches 0 → "common.loading" stays forever → TEST FAILS.
    //
    // WITHOUT loadInFlightRef (fixed): call 1's finally runs setLoading(false)
    //   unconditionally → loading = false → TEST PASSES.
    await waitFor(
      () => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument()
      },
      { timeout: 3000 },
    )

    // Resolve the hanging call so the test can clean up without dangling promises.
    act(() => {
      resolvers.forEach((r) => r())
    })
  })
})
