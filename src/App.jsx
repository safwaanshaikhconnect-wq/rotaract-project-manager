import { useState, useCallback, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { MEMBERS } from './lib/members'
import AuthGate from './components/AuthGate'
import BoardTab from './components/BoardTab'
import ProjectsTab from './components/ProjectsTab'
import AnalyticsTab from './components/AnalyticsTab'

// ── Helpers ──────────────────────────────────────────────────────────────────

function isAuthed() {
  return sessionStorage.getItem('rotaract_auth') === '1'
}

const STATUS_CYCLE = { planning: 'active', active: 'done', done: 'planning' }

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [authed, setAuthed] = useState(isAuthed())
  const [tab, setTab] = useState('board')
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Fetch projects from Supabase ──────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setProjects(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authed) return

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
  }, [authed, fetchProjects])

  // ── Assignment handlers ───────────────────────────────────────────────────
  async function handleAssignMember(projectId, memberId) {
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

  async function handleRemoveMember(projectId, memberId) {
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

  async function handleAddProject({ name, status, avenue, project_date, description }) {
    const { data, error } = await supabase
      .from('projects')
      .insert([{ 
        name, 
        status, 
        avenue: avenue || null, 
        project_date: project_date || null, 
        description: description || null,
        assigned_ids: [] 
      }])
      .select()
      .single()

    if (!error && data) {
      setProjects(prev => [...prev, data])
    } else {
      console.error('Failed to create project:', error?.message)
    }
  }

  async function handleDeleteProject(projectId) {
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
  const busyIds = new Set(projects.filter(p => p.status !== 'done').flatMap(p => p.assigned_ids ?? []))
  const activeProjects = projects.filter(p => p.status !== 'done').length

  // ── Render ────────────────────────────────────────────────────────────────
  if (!authed) {
    return <AuthGate onAuth={() => setAuthed(true)} />
  }

  return (
    <div className="app">
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
          <div className="num">{activeProjects}</div>
          <div className="lbl">Active projects</div>
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
      </div>

      {/* Content */}
      {loading ? (
        <p style={{ color: '#aaa', fontSize: '14px', padding: '2rem 0' }}>Loading projects…</p>
      ) : tab === 'board' ? (
        <BoardTab projects={projects} />
      ) : tab === 'projects' ? (
        <ProjectsTab
          projects={projects}
          onAssignMember={handleAssignMember}
          onRemoveMember={handleRemoveMember}
          onAddProject={handleAddProject}
          onDeleteProject={handleDeleteProject}
          onToggleStatus={handleToggleStatus}
        />
      ) : (
        <AnalyticsTab projects={projects} />
      )}
    </div>
  )
}
