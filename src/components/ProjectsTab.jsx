import { useState, useEffect, useRef, useMemo } from 'react'
import { MEMBERS, colorFor, initials, shortName } from '../lib/members'

const AVENUES = ['International', 'Professional', 'Community', 'Club', 'DPP']

const AVENUE_COLORS = {
  International:  { bg: '#E6F1FB', fg: '#0C447C' },
  Professional:   { bg: '#EEEDFE', fg: '#3C3489' },
  Community:      { bg: '#E1F5EE', fg: '#085041' },
  Club:           { bg: '#FAEEDA', fg: '#633806' },
  DPP:            { bg: '#FCEBEB', fg: '#791F1F' },
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return new Date(+y, +m - 1, +d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

// ── Member picker dropdown ────────────────────────────────────────────────────

function MemberDropdown({ project, projects, onAssignMember, onClose }) {
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const available = MEMBERS.filter(m =>
    !(project.assigned_ids ?? []).includes(m.id) &&
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  // Calculate workloads
  const memberWorkloads = useMemo(() => {
    const workloads = {}
    MEMBERS.forEach(m => {
      workloads[m.id] = projects.filter(p => p.status !== 'done' && (p.assigned_ids ?? []).includes(m.id)).length
    })
    return workloads;
  }, [projects])

  return (
    <div className="member-dropdown" ref={ref}>
      <input
        className="member-dropdown-search"
        placeholder="Search members…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />
      <div className="member-dropdown-list">
        {available.length === 0
          ? <div className="member-dropdown-empty">
              {search ? 'No match' : 'All members already assigned'}
            </div>
          : available.map(m => {
              const c = colorFor(m.id)
              const activeCount = memberWorkloads[m.id] || 0
              return (
                <button
                  key={m.id}
                  className="member-dropdown-item"
                  onClick={() => { onAssignMember(project.id, m.id); onClose() }}
                >
                  <div className="mini-avatar" style={{ background: c.bg, color: c.fg }}>
                    {initials(m.name)}
                  </div>
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                      <div className="dropdown-member-name">{m.name}</div>
                      {activeCount > 0 && (
                        <span className="dropdown-workload-tag">
                          {activeCount} active
                        </span>
                      )}
                    </div>
                    <div className="dropdown-member-role">{m.role}</div>
                  </div>
                </button>
              )
            })
        }
      </div>
    </div>
  )
}

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, projects, onAssignMember, onRemoveMember, onDeleteProject, onToggleStatus }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const assigned = MEMBERS.filter(m => (project.assigned_ids ?? []).includes(m.id))

  const statusClass = {
    active: 'badge-active',
    planning: 'badge-planning',
    done: 'badge-done',
  }[project.status] ?? 'badge-planning'

  const avenueColor = AVENUE_COLORS[project.avenue]

  return (
    <div className="project-card">
      <div className="project-header">
        <div className="project-name">{project.name}</div>
        <div className="project-header-actions">
          <button
            className={`badge ${statusClass} badge-clickable`}
            onClick={() => onToggleStatus(project.id)}
            title="Click to cycle: planning → active → done"
          >
            {project.status}
          </button>
          <button
            className="delete-project-btn"
            onClick={() => {
              if (window.confirm(`Delete "${project.name}"?`)) onDeleteProject(project.id)
            }}
            title="Delete project"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Avenue + Date meta row */}
      {(project.avenue || project.project_date) && (
        <div className="project-meta">
          {project.avenue && avenueColor && (
            <span className="avenue-tag" style={{ background: avenueColor.bg, color: avenueColor.fg }}>
              {project.avenue}
            </span>
          )}
          {project.project_date && (
            <span className="project-date">📅 {formatDate(project.project_date)}</span>
          )}
        </div>
      )}

      {/* Description */}
      {project.description && (
        <p className="project-desc">{project.description}</p>
      )}

      <div className="assigned-list">
        {assigned.length === 0
          ? <span className="empty-assign">No one assigned yet</span>
          : assigned.map(m => {
              const c = colorFor(m.id)
              return (
                <div key={m.id} className="assigned-row">
                  <div className="mini-avatar" style={{ background: c.bg, color: c.fg }}>
                    {initials(m.name)}
                  </div>
                  <span>{shortName(m.name)}</span>
                  <button
                    className="remove-btn"
                    onClick={() => onRemoveMember(project.id, m.id)}
                    title="Remove from project"
                  >✕</button>
                </div>
              )
            })
        }
      </div>

      <div className="add-member-wrap">
        <button
          className="add-member-btn"
          onClick={() => setShowDropdown(v => !v)}
        >
          + Add member
        </button>
        {showDropdown && (
          <MemberDropdown
            project={project}
            projects={projects}
            onAssignMember={onAssignMember}
            onClose={() => setShowDropdown(false)}
          />
        )}
      </div>
    </div>
  )
}

// ── Add project modal ─────────────────────────────────────────────────────────

function AddProjectModal({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [status, setStatus] = useState('planning')
  const [avenue, setAvenue] = useState('')
  const [projectDate, setProjectDate] = useState('')
  const [description, setDescription] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ 
      name: name.trim(), 
      status, 
      avenue, 
      project_date: projectDate, 
      description: description.trim() 
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <h3>New project</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Blood Donor Camp"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Description / Notes</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Venue details, goals, timelines..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '0.5px solid #e0e0dc',
                background: '#fafafa',
                color: '#1a1a18',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div className="form-group">
            <label>Avenue of Service</label>
            <select value={avenue} onChange={e => setAvenue(e.target.value)}>
              <option value="">— Select avenue —</option>
              {AVENUES.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Date of Project</label>
            <input
              type="date"
              value={projectDate}
              onChange={e => setProjectDate(e.target.value)}
            />
          </div>
          <div className="modal-btns">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-solid">Create project</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Projects tab ──────────────────────────────────────────────────────────────

export default function ProjectsTab({ projects, onAssignMember, onRemoveMember, onAddProject, onDeleteProject, onToggleStatus }) {
  const [showModal, setShowModal] = useState(false)
  
  // Filters & Sorting state
  const [search, setSearch] = useState('')
  const [avenueFilter, setAvenueFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')

  // Filtered & Sorted projects
  const processedProjects = useMemo(() => {
    let result = [...projects]

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      )
    }

    // Avenue filter
    if (avenueFilter) {
      result = result.filter(p => p.avenue === avenueFilter)
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(p => p.status === statusFilter)
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }
      if (sortBy === 'date-asc') {
        if (!a.project_date) return 1
        if (!b.project_date) return -1
        return a.project_date.localeCompare(b.project_date)
      }
      if (sortBy === 'date-desc') {
        if (!a.project_date) return 1
        if (!b.project_date) return -1
        return b.project_date.localeCompare(a.project_date)
      }
      return 0
    })

    return result
  }, [projects, search, avenueFilter, statusFilter, sortBy])

  return (
    <div>
      {/* Filters Toolbar */}
      <div className="filters-toolbar">
        <input
          type="text"
          className="filter-search"
          placeholder="Search projects…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={avenueFilter}
          onChange={e => setAvenueFilter(e.target.value)}
        >
          <option value="">All Avenues</option>
          {AVENUES.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="done">Done</option>
        </select>
        <select
          className="filter-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="newest">Newest Created</option>
          <option value="name">Name (A-Z)</option>
          <option value="date-asc">Date (Ascending)</option>
          <option value="date-desc">Date (Descending)</option>
        </select>
        <button className="add-project-btn-top" onClick={() => setShowModal(true)}>
          + Add project
        </button>
      </div>

      <div className="project-grid">
        {processedProjects.map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            projects={projects}
            onAssignMember={onAssignMember}
            onRemoveMember={onRemoveMember}
            onDeleteProject={onDeleteProject}
            onToggleStatus={onToggleStatus}
          />
        ))}
      </div>
      {showModal && (
        <AddProjectModal
          onAdd={onAddProject}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
