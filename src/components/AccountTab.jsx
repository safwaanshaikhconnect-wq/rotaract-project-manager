import { useState } from 'react'
import { colorFor, initials } from '../lib/members'
import { updateAccountPassword } from '../lib/auth'

export default function AccountTab({ currentUser, projects, onLogout, onNavigateToProjects }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!currentUser) return null

  const userColor = colorFor(currentUser.id)

  // Calculate user-specific project stats
  const chairedProjects = projects.filter(p => p.chair_id === currentUser.id)
  const supportiveProjects = projects.filter(p => (p.assigned_ids ?? []).includes(currentUser.id))
  const allMyProjects = projects.filter(p => p.chair_id === currentUser.id || (p.assigned_ids ?? []).includes(currentUser.id))
  const activeCount = allMyProjects.filter(p => p.status !== 'done').length

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!currentPassword) {
      setError('Please enter your current password.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setLoading(true)
    const res = await updateAccountPassword(currentUser.email, currentPassword, newPassword)
    setLoading(false)

    if (res.success) {
      setSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(''), 4000)
    } else {
      setError(res.message || 'Failed to update password.')
    }
  }

  return (
    <div className="account-tab-container">
      {/* Profile Card */}
      <div className="account-card glass">
        <div className="account-card-header">
          <div
            className="avatar account-avatar-large"
            style={{ background: userColor.bg, color: userColor.fg }}
          >
            {initials(currentUser.name)}
          </div>
          <div className="account-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 className="account-name">{currentUser.name}</h2>
              {currentUser.is_admin && <span className="admin-chip">Admin</span>}
            </div>
            <div className="account-role-row">
              <span className="account-role-badge">{currentUser.role}</span>
              <span className="account-group-tag">📁 {currentUser.group}</span>
              {currentUser.email && <span className="account-group-tag">✉️ {currentUser.email}</span>}
            </div>
          </div>

          <div className="account-signout-wrap">
            <button
              type="button"
              className="btn account-signout-btn"
              onClick={onLogout}
              title="Sign out of this device"
            >
              Sign out ⎋
            </button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="account-stats-grid">
          <div className="account-stat-box">
            <span className="account-stat-num">{chairedProjects.length}</span>
            <span className="account-stat-lbl">Projects Chaired</span>
          </div>
          <div className="account-stat-box">
            <span className="account-stat-num">{supportiveProjects.length}</span>
            <span className="account-stat-lbl">Supportive Roles</span>
          </div>
          <div className="account-stat-box">
            <span className="account-stat-num" style={{ color: activeCount > 0 ? '#f59e0b' : '#34d399' }}>
              {activeCount > 0 ? `${activeCount} Active` : 'Available'}
            </span>
            <span className="account-stat-lbl">Workload Status</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Assigned Projects & Password Settings */}
      <div className="account-grid-columns">
        {/* Left: My Projects List */}
        <div className="account-section glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 className="account-section-title" style={{ margin: 0 }}>My Active Projects</h3>
            {onNavigateToProjects && (
              <button
                type="button"
                className="account-link-btn"
                onClick={onNavigateToProjects}
              >
                Go to Projects tab →
              </button>
            )}
          </div>

          {allMyProjects.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13.5px', padding: '12px 0' }}>
              You are not assigned to any projects yet.
            </p>
          ) : (
            <div className="account-project-list">
              {allMyProjects.map(p => {
                const isChair = p.chair_id === currentUser.id
                return (
                  <div key={p.id} className="account-project-item">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="account-project-name">{p.name}</div>
                      <div className="account-project-sub">
                        {p.avenue && <span>{p.avenue}</span>}
                        {p.project_date && <span>📅 {p.project_date}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={isChair ? 'badge-chair-role' : 'badge-supportive-role'}>
                        {isChair ? 'Chair' : 'Support'}
                      </span>
                      <span className={`status-pill status-${p.status}`} style={{ fontSize: '10.5px' }}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Change Password Form */}
        <div className="account-section glass">
          <h3 className="account-section-title">Change Account Password</h3>
          <p style={{ fontSize: '12.5px', color: '#9ca3af', marginBottom: '16px', lineHeight: '1.4' }}>
            Update your personal login password (minimum 8 characters).
          </p>

          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#9ca3af', marginBottom: '5px', textTransform: 'uppercase' }}>
                Current Password
              </label>
              <input
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="auth-input"
                autoComplete="current-password"
                style={{ textAlign: 'left', padding: '9px 12px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#9ca3af', marginBottom: '5px', textTransform: 'uppercase' }}>
                New Password
              </label>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="auth-input"
                autoComplete="new-password"
                style={{ textAlign: 'left', padding: '9px 12px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#9ca3af', marginBottom: '5px', textTransform: 'uppercase' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="auth-input"
                autoComplete="new-password"
                style={{ textAlign: 'left', padding: '9px 12px' }}
              />
            </div>

            {error && <p className="auth-error" style={{ margin: '2px 0 0' }}>{error}</p>}
            {success && <p style={{ fontSize: '13px', color: '#34d399', margin: '2px 0 0', fontWeight: '500' }}>✓ {success}</p>}

            <button
              type="submit"
              className="btn btn-solid"
              disabled={loading}
              style={{ marginTop: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: '600' }}
            >
              {loading ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
