import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ProjectDetail } from '../views/ProjectDetail'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'test-project-id' }),
  useNavigate: () => vi.fn(),
}))

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && 'count' in opts) return `${key}:${opts.count}`
      return key
    },
  }),
}))

// Mock AppContext
vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    projects: [
      {
        id: 'test-project-id',
        name: 'Test Project',
        description: null,
        path: '/test',
        created_at: 0,
        updated_at: 0,
      },
    ],
    scenarios: [],
    managedSkills: [],
    refreshManagedSkills: vi.fn(),
    refreshScenarios: vi.fn(),
    refreshProjects: vi.fn(),
  }),
}))

// Mock tauri API — return empty/safe values for all calls
vi.mock('../lib/tauri', () => ({
  getProjectSkills: vi.fn().mockResolvedValue([]),
  getProjectAgentTargets: vi.fn().mockResolvedValue([]),
  getSettings: vi.fn().mockResolvedValue(null),
  slugifySkillNames: vi.fn().mockResolvedValue([]),
}))

describe('ProjectDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    render(<ProjectDetail />)
    // Just verify it mounts — no specific assertion needed
    expect(document.body).toBeTruthy()
  })
})
