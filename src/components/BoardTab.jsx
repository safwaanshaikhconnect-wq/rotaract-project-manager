import { useState, useMemo } from 'react'
import { MEMBERS, colorFor, initials } from '../lib/members'

export default function BoardTab({ projects, currentUser }) {
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')

  const busyIds = useMemo(() => {
    return new Set(projects.filter(p => p.status !== 'done').flatMap(p => {
      const ids = p.assigned_ids ? [...p.assigned_ids] : []
      if (p.chair_id) ids.push(p.chair_id)
      return ids
    }))
  }, [projects])

  // Filter members by search and group
  const filteredMembers = useMemo(() => {
    return MEMBERS.filter(m => {
      const matchSearch = !search.trim() ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.role.toLowerCase().includes(search.toLowerCase())
      const matchGroup = !filterGroup || m.group === filterGroup
      return matchSearch && matchGroup
    })
  }, [search, filterGroup])

  const groups = useMemo(() => {
    const map = {}
    filteredMembers.forEach(m => {
      if (!map[m.group]) map[m.group] = []
      map[m.group].push(m)
    })
    return map
  }, [filteredMembers])

  const allGroups = useMemo(() => {
    return [...new Set(MEMBERS.map(m => m.group))]
  }, [])

  return (
    <div className="board-tab-wrapper">
      {/* Board Filter / Search Bar */}
      <div className="board-toolbar glass">
        <div className="board-search-wrap">
          <span className="board-search-icon">🔍</span>
          <input
            type="text"
            className="board-search-input"
            placeholder="Search board member by name or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="board-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="board-group-pills">
          <button
            type="button"
            className={`board-pill-btn ${!filterGroup ? 'active' : ''}`}
            onClick={() => setFilterGroup('')}
          >
            All ({filteredMembers.length})
          </button>
          {allGroups.map(g => (
            <button
              key={g}
              type="button"
              className={`board-pill-btn ${filterGroup === g ? 'active' : ''}`}
              onClick={() => setFilterGroup(filterGroup === g ? '' : g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Group Sections */}
      {Object.keys(groups).length === 0 ? (
        <div className="board-empty glass">
          <p>No board members match "{search}"</p>
          <button className="btn btn-solid" style={{ marginTop: '10px' }} onClick={() => { setSearch(''); setFilterGroup('') }}>
            Reset Filters
          </button>
        </div>
      ) : (
        Object.entries(groups).map(([group, members]) => (
          <div key={group} className="board-group-section">
            <div className="board-group-header">
              <div className="board-group-title-row">
                <span className="board-group-title">{group}</span>
                <span className="board-group-badge">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
              </div>
              <div className="board-group-divider" />
            </div>

            <div className="board-cards-grid">
              {members.map(m => {
                const c = colorFor(m.id)
                const isBusy = busyIds.has(m.id)
                const isMe = currentUser && currentUser.id === m.id
                const myProjects = projects.filter(p => 
                  p.chair_id === m.id || (p.assigned_ids ?? []).includes(m.id)
                )
                const activeCount = myProjects.filter(p => p.status !== 'done').length
                const chairedProjects = myProjects.filter(p => p.chair_id === m.id)

                return (
                  <div
                    key={m.id}
                    className={`board-member-card glass ${isMe ? 'is-me' : ''} ${isBusy ? 'is-busy' : 'is-available'}`}
                  >
                    {/* Top row: Avatar, Name, Role, Status */}
                    <div className="bmc-top">
                      <div
                        className="bmc-avatar"
                        style={{ background: c.bg, color: c.fg }}
                      >
                        {initials(m.name)}
                      </div>

                      <div className="bmc-details">
                        <div className="bmc-name-row">
                          <span className="bmc-name">{m.name}</span>
                          {isMe && <span className="bmc-you-tag">YOU</span>}
                        </div>
                        <div className="bmc-role">{m.role}</div>
                      </div>

                      {/* Workload / Availability badge */}
                      <div className="bmc-status-wrap">
                        {activeCount > 0 ? (
                          <span className="bmc-status-chip busy" title={`${activeCount} active project(s)`}>
                            <span className="bmc-status-dot busy" />
                            {activeCount} {activeCount === 1 ? 'project' : 'projects'}
                          </span>
                        ) : (
                          <span className="bmc-status-chip free" title="Currently available">
                            <span className="bmc-status-dot free" />
                            Available
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chaired Projects List */}
                    {chairedProjects.length > 0 && (
                      <div className="bmc-projects-section">
                        <div className="bmc-projects-label">
                          <span>Chaired Projects</span>
                          <span className="bmc-projects-count">{chairedProjects.length}</span>
                        </div>
                        <div className="bmc-tags-list">
                          {chairedProjects.map(p => {
                            const isDone = p.status === 'done'
                            return (
                              <span
                                key={p.id}
                                className={`bmc-proj-tag ${isDone ? 'done' : 'active'}`}
                                title={`${p.name} • ${p.status.toUpperCase()}`}
                              >
                                {isDone ? '✓ ' : '⚡ '}{p.name}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
