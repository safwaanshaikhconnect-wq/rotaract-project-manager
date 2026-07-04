import { useMemo } from 'react'
import { MEMBERS, colorFor, initials, shortName } from '../lib/members'

const AVENUES = ['International', 'Professional', 'Community', 'Club', 'DPP']

const AVENUE_COLORS = {
  International:  { bg: '#E6F1FB', fg: '#0C447C', bar: '#3b82f6' },
  Professional:   { bg: '#EEEDFE', fg: '#3C3489', bar: '#8b5cf6' },
  Community:      { bg: '#E1F5EE', fg: '#085041', bar: '#10b981' },
  Club:           { bg: '#FAEEDA', fg: '#633806', bar: '#f59e0b' },
  DPP:            { bg: '#FCEBEB', fg: '#791F1F', bar: '#ef4444' },
}

export default function AnalyticsTab({ projects }) {
  // 1. Projects by Status
  const statusStats = useMemo(() => {
    const total = projects.length
    const planning = projects.filter(p => p.status === 'planning').length
    const active = projects.filter(p => p.status === 'active').length
    const done = projects.filter(p => p.status === 'done').length

    return {
      total,
      planning,
      active,
      done,
      planningPct: total ? Math.round((planning / total) * 100) : 0,
      activePct: total ? Math.round((active / total) * 100) : 0,
      donePct: total ? Math.round((done / total) * 100) : 0,
    }
  }, [projects])

  // 2. Projects by Avenue
  const avenueStats = useMemo(() => {
    const counts = {}
    AVENUES.forEach(a => {
      counts[a] = projects.filter(p => p.avenue === a).length
    })
    const maxVal = Math.max(...Object.values(counts), 1)
    return { counts, maxVal }
  }, [projects])

  // 3. Member Involvement Leaderboard (Active Projects Only)
  const leaderboard = useMemo(() => {
    const counts = MEMBERS.map(m => {
      const activeProjCount = projects.filter(p => p.status !== 'done' && (p.assigned_ids ?? []).includes(m.id)).length
      const totalProjCount = projects.filter(p => (p.assigned_ids ?? []).includes(m.id)).length
      return { member: m, activeCount: activeProjCount, totalCount: totalProjCount }
    })

    // Sort by active projects count desc, then total count desc
    return counts
      .filter(item => item.totalCount > 0)
      .sort((a, b) => b.activeCount - a.activeCount || b.totalCount - a.totalCount)
      .slice(0, 8) // Top 8
  }, [projects])

  // 4. Club Metrics
  const metrics = useMemo(() => {
    const totalMembersCount = MEMBERS.length
    const busyIds = new Set(projects.flatMap(p => p.assigned_ids ?? []))
    const busyActiveIds = new Set(
      projects.filter(p => p.status !== 'done').flatMap(p => p.assigned_ids ?? [])
    )
    const participationRate = totalMembersCount ? Math.round((busyIds.size / totalMembersCount) * 100) : 0
    const activeParticipationRate = totalMembersCount ? Math.round((busyActiveIds.size / totalMembersCount) * 100) : 0

    // Average team size per project
    const totalAssignments = projects.reduce((acc, p) => acc + (p.assigned_ids ?? []).length, 0)
    const avgTeamSize = projects.length ? (totalAssignments / projects.length).toFixed(1) : 0

    return {
      participationRate,
      activeParticipationRate,
      avgTeamSize,
      totalAssignments
    }
  }, [projects])

  if (projects.length === 0) {
    return (
      <div className="analytics-empty">
        <p>No projects found to compile statistics. Add some projects to see dashboard analytics!</p>
      </div>
    )
  }

  return (
    <div className="analytics-container">
      
      {/* Metrics Row */}
      <div className="analytics-metrics-grid">
        <div className="analytics-metric-card">
          <div className="metric-header">
            <span className="metric-title">Participation Rate</span>
            <span className="metric-emoji">👥</span>
          </div>
          <div className="metric-value">{metrics.participationRate}%</div>
          <div className="metric-subtext">Members assigned to at least 1 project</div>
        </div>
        <div className="analytics-metric-card">
          <div className="metric-header">
            <span className="metric-title">Active Workload Rate</span>
            <span className="metric-emoji">⚡</span>
          </div>
          <div className="metric-value">{metrics.activeParticipationRate}%</div>
          <div className="metric-subtext">Members on ongoing/planning projects</div>
        </div>
        <div className="analytics-metric-card">
          <div className="metric-header">
            <span className="metric-title">Avg. Team Size</span>
            <span className="metric-emoji">🛠️</span>
          </div>
          <div className="metric-value">{metrics.avgTeamSize}</div>
          <div className="metric-subtext">Average members assigned per project</div>
        </div>
      </div>

      {/* Grid Charts */}
      <div className="analytics-grid">
        
        {/* Status Breakdown */}
        <div className="analytics-chart-card">
          <h3>Project Status Breakdown</h3>
          <div className="status-chart-totals">
            <div className="total-indicator">
              <span className="large-num">{statusStats.total}</span>
              <span className="label">Total projects</span>
            </div>
            <div className="status-legend">
              <div className="legend-item">
                <span className="legend-dot status-planning-dot"></span>
                <span>Planning: <strong>{statusStats.planning}</strong> ({statusStats.planningPct}%)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot status-active-dot"></span>
                <span>Active: <strong>{statusStats.active}</strong> ({statusStats.activePct}%)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot status-done-dot"></span>
                <span>Done: <strong>{statusStats.done}</strong> ({statusStats.donePct}%)</span>
              </div>
            </div>
          </div>
          
          {/* Segmented Progress Bar */}
          <div className="segmented-progress-bar">
            {statusStats.planningPct > 0 && (
              <div 
                className="progress-segment planning-segment" 
                style={{ width: `${statusStats.planningPct}%` }}
                title={`Planning: ${statusStats.planningPct}%`}
              />
            )}
            {statusStats.activePct > 0 && (
              <div 
                className="progress-segment active-segment" 
                style={{ width: `${statusStats.activePct}%` }}
                title={`Active: ${statusStats.activePct}%`}
              />
            )}
            {statusStats.donePct > 0 && (
              <div 
                className="progress-segment done-segment" 
                style={{ width: `${statusStats.donePct}%` }}
                title={`Done: ${statusStats.donePct}%`}
              />
            )}
          </div>
        </div>

        {/* Projects per Avenue */}
        <div className="analytics-chart-card">
          <h3>Projects by Avenue of Service</h3>
          <div className="avenue-chart-list">
            {AVENUES.map(a => {
              const count = avenueStats.counts[a] || 0
              const percentage = Math.round((count / avenueStats.maxVal) * 100)
              const colorInfo = AVENUE_COLORS[a]
              return (
                <div key={a} className="avenue-chart-row">
                  <div className="avenue-row-label">
                    <span className="avenue-row-title">{a}</span>
                    <span className="avenue-row-count">{count}</span>
                  </div>
                  <div className="avenue-bar-bg">
                    <div 
                      className="avenue-bar-fill" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: colorInfo.bar
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Member Involvement Leaderboard */}
        <div className="analytics-chart-card full-width-card">
          <h3>Active Workload Leaderboard</h3>
          <p className="leaderboard-desc">Top members sorted by active project assignments (completed projects excluded from workload rank).</p>
          <div className="leaderboard-list">
            {leaderboard.length === 0 ? (
              <p className="no-leaderboard">No members assigned to any projects yet.</p>
            ) : (
              leaderboard.map(({ member, activeCount, totalCount }) => {
                const c = colorFor(member.id)
                // Normalize bar fill relative to target of 24 projects
                const maxTotalCount = 24
                const activePercent = Math.round((activeCount / maxTotalCount) * 100)
                const doneCount = totalCount - activeCount
                const donePercent = Math.round((doneCount / maxTotalCount) * 100)
                
                return (
                  <div key={member.id} className="leaderboard-row">
                    <div className="leaderboard-member-info">
                      <div className="mini-avatar" style={{ background: c.bg, color: c.fg }}>
                        {initials(member.name)}
                      </div>
                      <div className="leaderboard-names">
                        <span className="leaderboard-name">{shortName(member.name)}</span>
                        <span className="leaderboard-role">{member.role}</span>
                      </div>
                    </div>
                    
                    <div className="leaderboard-progress-section">
                      <div className="leaderboard-bar-bg" style={{ display: 'flex' }}>
                        {activePercent > 0 && (
                          <div 
                            className="leaderboard-bar-fill active" 
                            style={{ 
                              width: `${activePercent}%`,
                              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                              borderRadius: donePercent > 0 ? '4px 0 0 4px' : '4px',
                              boxShadow: '0 0 10px rgba(99, 102, 241, 0.6)'
                            }}
                            title={`${activeCount} active project(s)`}
                          />
                        )}
                        {donePercent > 0 && (
                          <div 
                            className="leaderboard-bar-fill done" 
                            style={{ 
                              width: `${donePercent}%`,
                              background: 'linear-gradient(90deg, #10b981, #34d399)',
                              borderRadius: activePercent > 0 ? '0 4px 4px 0' : '4px',
                              boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
                            }}
                            title={`${doneCount} completed project(s)`}
                          />
                        )}
                      </div>
                      <span className="leaderboard-count">
                        <strong>{activeCount}</strong> active <span className="total-count-sub">({totalCount} total)</span>
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
