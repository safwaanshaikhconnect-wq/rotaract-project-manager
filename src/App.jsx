import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase, supabaseConfigError } from './lib/supabase'
import { MEMBERS } from './lib/members'
import {
  clearLegacyAuthArtifacts,
  getSession,
  onAuthStateChange,
  resolveMemberProfile,
  signOut,
} from './lib/auth'
import AuthGate from './components/AuthGate'
import BoardTab from './components/BoardTab'
import ProjectsTab from './components/ProjectsTab'
import AnalyticsTab from './components/AnalyticsTab'
import CodeRedTab from './components/CodeRedTab'
import ReportTab from './components/ReportTab'
import AccountTab from './components/AccountTab'
import SplashIntro from './components/SplashIntro'

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CYCLE = { planning: 'active', active: 'done', done: 'planning' }

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [authError, setAuthError] = useState('')
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)

  const [tab, setTab] = useState('board')
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const loadedAuthUserIdRef = useRef(null)

  // ── Bootstrap Supabase Auth session & listener ────────────────────────────
  useEffect(() => {
    clearLegacyAuthArtifacts()

    if (supabaseConfigError || !supabase) {
      setAuthLoading(false)
      return
    }

    let active = true

    getSession()
      .then(({ session: initialSession }) => {
        if (!active) return
        setSession(initialSession)
        setAuthLoading(false)
      })
      .catch(() => {
        if (!active) return
        setSession(null)
        setAuthLoading(false)
      })

    const { data: authListener } = onAuthStateChange((event, nextSession) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
      } else if (event === 'SIGNED_OUT') {
        setIsRecoveryMode(false)
      }
      setSession(nextSession ?? null)
      setAuthLoading(false)
    })

    return () => {
      active = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  // ── Resolve authorized board member profile whenever authenticated user changes
  useEffect(() => {
    const authUser = session?.user ?? null

    if (!authUser) {
      loadedAuthUserIdRef.current = null
      setCurrentUser(null)
      setAuthError('')
      setProfileLoading(false)
      setProjects([])
      setLoading(true)
      setTab('board')
      return
    }

    if (isRecoveryMode) {
      return
    }

    if (loadedAuthUserIdRef.current === authUser.id) {
      return
    }

    let active = true
    setProfileLoading(true)
    setAuthError('')

    resolveMemberProfile(authUser)
      .then((result) => {
        if (!active) return
        if (result.authorized && result.member) {
          loadedAuthUserIdRef.current = authUser.id
          setCurrentUser(result.member)
          setAuthError('')
        } else {
          loadedAuthUserIdRef.current = null
          setCurrentUser(null)
          setAuthError(result.message || 'Not authorized for board access.')
        }
        setProfileLoading(false)
      })
      .catch(() => {
        if (!active) return
        loadedAuthUserIdRef.current = null
        setCurrentUser(null)
        setAuthError('Unable to verify board membership. Please try again.')
        setProfileLoading(false)
      })

    return () => {
      active = false
    }
  }, [session?.user?.id, session?.user?.email, isRecoveryMode])

  async function handleLogout() {
    await signOut()
    loadedAuthUserIdRef.current = null
    setSession(null)
    setCurrentUser(null)
    setAuthError('')
    setIsRecoveryMode(false)
    setProjects([])
    setLoading(true)
    setTab('board')
  }

  // ── Fetch projects from Supabase ──────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) {
      setProjects(data ?? [])
    } else {
      console.error('Failed to load projects:', error.message)
      setProjects([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase || !currentUser?.authUserId) return

    fetchProjects()

    // Real-time subscription — apply deltas directly, no full re-fetch
    const channel = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, (payload) => {
        setProjects(prev => {
          if (prev.find(p => p.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, (payload) => {
        setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects' }, (payload) => {
        setProjects(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [currentUser?.authUserId, fetchProjects])

  // ── Assignment handlers ───────────────────────────────────────────────────
  async function handleAddSupportiveMember(projectId, memberId) {
    if (!supabase || !currentUser) return
    const project = projects.find(p => p.id === projectId)
    if (!project) return
    const current = project.assigned_ids ?? []
    if (current.includes(memberId)) return

    const updated = [...current, memberId]
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assigned_ids: updated } : p))

    const { error } = await supabase
      .from('projects')
      .update({ assigned_ids: updated })
      .eq('id', projectId)

    if (error) {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assigned_ids: current } : p))
      console.error('Failed to assign member:', error.message)
    }
  }

  async function handleRemoveSupportiveMember(projectId, memberId) {
    if (!supabase || !currentUser) return
    const project = projects.find(p => p.id === projectId)
    if (!project) return
    const current = project.assigned_ids ?? []
    const updated = current.filter(id => id !== memberId)

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assigned_ids: updated } : p))

    const { error } = await supabase
      .from('projects')
      .update({ assigned_ids: updated })
      .eq('id', projectId)

    if (error) {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assigned_ids: current } : p))
      console.error('Failed to remove member:', error.message)
    }
  }

  async function handleSetChair(projectId, memberId) {
    if (!supabase || !currentUser) return
    const project = projects.find(p => p.id === projectId)
    if (!project) return
    const current = project.chair_id

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, chair_id: memberId } : p))

    const { error } = await supabase
      .from('projects')
      .update({ chair_id: memberId })
      .eq('id', projectId)

    if (error) {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, chair_id: current } : p))
      console.error('Failed to set chair:', error.message)
    }
  }

  async function handleRemoveChair(projectId) {
    if (!supabase || !currentUser) return
    const project = projects.find(p => p.id === projectId)
    if (!project) return
    const current = project.chair_id

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, chair_id: null } : p))

    const { error } = await supabase
      .from('projects')
      .update({ chair_id: null })
      .eq('id', projectId)

    if (error) {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, chair_id: current } : p))
      console.error('Failed to remove chair:', error.message)
    }
  }

  async function handleAddProject({ name, status, avenue, project_date, description }) {
    if (!supabase || !currentUser) return
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        name,
        status,
        avenue: avenue || null,
        project_date: project_date || null,
        description: description || null,
        assigned_ids: [],
        chair_id: null,
      }])
      .select()
      .single()

    if (!error && data) {
      setProjects(prev => prev.find(p => p.id === data.id) ? prev : [...prev, data])
    } else {
      console.error('Failed to create project:', error?.message)
    }
  }

  async function handleDeleteProject(projectId) {
    if (!supabase || !currentUser) return
    const snapshot = projects
    setProjects(prev => prev.filter(p => p.id !== projectId))

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      setProjects(snapshot)
      console.error('Failed to delete project:', error.message)
    }
  }

  async function handleToggleStatus(projectId) {
    if (!supabase || !currentUser) return
    const project = projects.find(p => p.id === projectId)
    if (!project) return
    const newStatus = STATUS_CYCLE[project.status] ?? 'planning'
    const snapshot = projects

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p))

    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId)

    if (error) {
      setProjects(snapshot)
      console.error('Failed to update status:', error.message)
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const busyIds = new Set(projects.filter(p => p.status !== 'done').flatMap(p => {
    const ids = p.assigned_ids ? [...p.assigned_ids] : []
    if (p.chair_id) ids.push(p.chair_id)
    return ids
  }))
  const activeProjects = projects.filter(p => p.status !== 'done').length
  const completedProjects = projects.filter(p => p.status === 'done').length

  // ── Render ────────────────────────────────────────────────────────────────
  if (authLoading || profileLoading) {
    return (
      <>
        {showSplash && <SplashIntro onFinish={() => setShowSplash(false)} />}
        <div className="auth-gate">
          <div className="aurora-glow" />
          <div className="auth-card glass" style={{ width: '360px', maxWidth: '92vw', padding: '2.2rem 2rem' }}>
            <div className="auth-badge-icon">🔐</div>
            <h2>Rotaract KAHE</h2>
            <p className="auth-subtitle" style={{ marginBottom: 0 }}>Verifying session…</p>
          </div>
        </div>
      </>
    )
  }

  if (supabaseConfigError || !currentUser || isRecoveryMode) {
    return (
      <>
        {showSplash && <SplashIntro onFinish={() => setShowSplash(false)} />}
        <AuthGate
          configError={supabaseConfigError}
          authUser={session?.user ?? null}
          authError={authError}
          recoveryMode={isRecoveryMode}
          onRecoveryComplete={() => {
            setIsRecoveryMode(false)
            loadedAuthUserIdRef.current = null
          }}
          onSignOut={handleLogout}
        />
      </>
    )
  }

  return (
    <div className="app">
      {showSplash && <SplashIntro onFinish={() => setShowSplash(false)} />}
      {/* Header */}
      <div className="top-bar">
        <h1>Rotaract Club of Karpagam Academy of Higher Education:</h1>
        <p>Parented by Rotary Club of Coimbatore South</p>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="num">{MEMBERS.length}</div>
          <div className="lbl">Total members</div>
        </div>
        <div className="stat-card">
          <div className="num">{completedProjects}</div>
          <div className="lbl">Completed projects</div>
        </div>
        <div className="stat-card">
          <div className="num">{MEMBERS.length - busyIds.size}</div>
          <div className="lbl">Members available</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${tab === 'board' ? 'active' : ''}`} onClick={() => setTab('board')}>
          Board members
        </button>
        <button className={`tab-btn ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>
          Projects {activeProjects > 0 ? `(${activeProjects})` : ''}
        </button>
        <button className={`tab-btn ${tab === 'analytics' ? 'active' : ''}`} onClick={() => setTab('analytics')}>
          Analytics
        </button>
        <button className={`tab-btn cr-tab-btn ${tab === 'codered' ? 'active' : ''}`} onClick={() => setTab('codered')}>
          🩸 Code Red
        </button>
        <button className={`tab-btn ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>
          📄 Report
        </button>
        <button className={`tab-btn ${tab === 'account' ? 'active' : ''}`} onClick={() => setTab('account')}>
          👤 My Account
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <p style={{ color: '#aaa', fontSize: '14px', padding: '2rem 0' }}>Loading projects…</p>
      ) : tab === 'board' ? (
        <BoardTab projects={projects} currentUser={currentUser} />
      ) : tab === 'projects' ? (
        <ProjectsTab
          projects={projects}
          currentUser={currentUser}
          onAddSupportiveMember={handleAddSupportiveMember}
          onRemoveSupportiveMember={handleRemoveSupportiveMember}
          onSetChair={handleSetChair}
          onRemoveChair={handleRemoveChair}
          onAddProject={handleAddProject}
          onDeleteProject={handleDeleteProject}
          onToggleStatus={handleToggleStatus}
        />
      ) : tab === 'analytics' ? (
        <AnalyticsTab projects={projects} />
      ) : tab === 'report' ? (
        <ReportTab projects={projects} />
      ) : tab === 'account' ? (
        <AccountTab
          currentUser={currentUser}
          projects={projects}
          onLogout={handleLogout}
          onNavigateToProjects={() => setTab('projects')}
        />
      ) : (
        <CodeRedTab />
      )}
    </div>
  )
}
