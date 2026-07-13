import { MEMBERS, colorFor, initials, shortName } from '../lib/members'

export default function BoardTab({ projects }) {
  const busyIds = new Set(projects.filter(p => p.status !== 'done').flatMap(p => {
    const ids = p.assigned_ids ? [...p.assigned_ids] : []
    if (p.chair_id) ids.push(p.chair_id)
    return ids
  }))

  const groups = {}
  MEMBERS.forEach(m => {
    if (!groups[m.group]) groups[m.group] = []
    groups[m.group].push(m)
  })

  return (
    <div>
      {Object.entries(groups).map(([group, members]) => (
        <div key={group}>
          <div className="section-label">{group}</div>
          <div className="member-grid">
            {members.map(m => {
              const c = colorFor(m.id)
              const isBusy = busyIds.has(m.id)
              const myProjects = projects.filter(p => 
                p.chair_id === m.id || (p.assigned_ids ?? []).includes(m.id)
              )
              const activeCount = myProjects.filter(p => p.status !== 'done').length

              // Only show project tags for projects where this member is the Chair
              const chairedProjects = myProjects.filter(p => p.chair_id === m.id)

              return (
                <div
                  key={m.id}
                  className={`member-card ${isBusy ? 'busy' : ''}`}
                >
                  <div className="card-top">
                    <div className="avatar" style={{ background: c.bg, color: c.fg }}>
                      {initials(m.name)}
                    </div>
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div className="member-name-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <div className="member-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName(m.name)}</div>
                        {activeCount > 0 && (
                          <span className="workload-pill" title={`${activeCount} active project(s)`}>
                            {activeCount}
                          </span>
                        )}
                      </div>
                      <div className="member-role">{m.role}</div>
                    </div>
                  </div>

                  <div className={`status-dot ${isBusy ? 'dot-busy' : 'dot-free'}`} title={isBusy ? 'On a project' : 'Available'} />

                  {chairedProjects.length > 0 && (
                    <div className="proj-tags">
                      {chairedProjects.map(p => {
                        const isDone = p.status === 'done'
                        return (
                          <span 
                            key={p.id} 
                            className={`proj-tag ${isDone ? 'tag-done' : ''}`} 
                            title={`${p.name} (${p.status})`}
                          >
                            {p.name}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
