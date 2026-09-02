import { useState, useMemo, useRef, useEffect } from 'react'
import { MEMBERS, colorFor, initials } from '../lib/members'
import { verifyMemberPin, getDefaultPin } from '../lib/auth'

export default function AuthGate({ onAuth }) {
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Custom Dropdown State
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)
  const pinInputRef = useRef(null)

  const selectedMember = useMemo(() => {
    return MEMBERS.find(m => m.id === Number(selectedMemberId)) || null
  }, [selectedMemberId])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Auto-focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Filter members list by search term
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return MEMBERS
    const q = searchQuery.toLowerCase()
    return MEMBERS.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.group.toLowerCase().includes(q)
    )
  }, [searchQuery])

  // Group members for organized display
  const groupedMembers = useMemo(() => {
    const groups = {}
    filteredMembers.forEach(m => {
      if (!groups[m.group]) groups[m.group] = []
      groups[m.group].push(m)
    })
    return groups
  }, [filteredMembers])

  function handleSelect(member) {
    setSelectedMemberId(member.id)
    setDropdownOpen(false)
    setSearchQuery('')
    setError('')
    setPin('')
    // Focus PIN input
    setTimeout(() => pinInputRef.current?.focus(), 100)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!selectedMember) {
      setError('Please select your name from the list.')
      return
    }

    if (!pin.trim()) {
      setError('Please enter your PIN.')
      return
    }

    setLoading(true)
    const result = await verifyMemberPin(selectedMember, pin)
    setLoading(false)

    if (result.success) {
      onAuth(result.member)
    } else {
      setError(result.message || 'Incorrect PIN. Try again.')
      setPin('')
    }
  }

  const defaultHint = selectedMember ? getDefaultPin(selectedMember.name) : 'moh123'

  return (
    <div className="auth-gate">
      <div className="aurora-glow" />
      <div className="auth-card glass auth-card-board" style={{ width: '440px', maxWidth: '92vw', padding: '2.2rem 2rem' }}>
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', border: '0.5px solid rgba(99, 102, 241, 0.3)', marginBottom: '12px', color: '#a5b4fc', fontSize: '22px' }}>
            👥
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#f3f4f6', letterSpacing: '-0.02em', margin: 0 }}>
            Rotaract KAHE
          </h2>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
            RY 2026–27 Board Member Sign In
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {/* Custom Member Dropdown */}
          <div style={{ marginBottom: '18px', position: 'relative' }} ref={dropdownRef}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Your Name
            </label>

            {/* Dropdown Trigger Button */}
            <button
              type="button"
              className={`auth-picker-trigger ${dropdownOpen ? 'open' : ''} ${selectedMember ? 'has-selection' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {selectedMember ? (
                <div className="auth-trigger-content">
                  <div
                    className="auth-trigger-avatar"
                    style={{
                      background: colorFor(selectedMember.id).bg,
                      color: colorFor(selectedMember.id).fg
                    }}
                  >
                    {initials(selectedMember.name)}
                  </div>
                  <div className="auth-trigger-text">
                    <span className="auth-trigger-name">{selectedMember.name}</span>
                    <span className="auth-trigger-role">{selectedMember.role}</span>
                  </div>
                </div>
              ) : (
                <div className="auth-trigger-placeholder">
                  <span>👤 Choose your name from the board…</span>
                </div>
              )}
              <span className={`auth-trigger-chevron ${dropdownOpen ? 'rotated' : ''}`}>▾</span>
            </button>

            {/* Custom Dropdown Popover Menu */}
            {dropdownOpen && (
              <div className="auth-dropdown-menu glass">
                {/* Instant Search Bar */}
                <div className="auth-dropdown-search">
                  <span className="auth-dd-icon">🔍</span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="auth-dd-input"
                    placeholder="Search your name or role…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="auth-dd-clear"
                      onClick={() => setSearchQuery('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Grouped Member Options */}
                <div className="auth-dropdown-list">
                  {Object.keys(groupedMembers).length === 0 ? (
                    <div className="auth-dropdown-empty">
                      No members match "{searchQuery}"
                    </div>
                  ) : (
                    Object.entries(groupedMembers).map(([group, members]) => (
                      <div key={group} className="auth-dropdown-group">
                        <div className="auth-group-label">{group}</div>
                        {members.map(m => {
                          const isSelected = selectedMemberId === m.id
                          const c = colorFor(m.id)
                          return (
                            <div
                              key={m.id}
                              className={`auth-dropdown-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelect(m)}
                            >
                              <div
                                className="auth-item-avatar"
                                style={{ background: c.bg, color: c.fg }}
                              >
                                {initials(m.name)}
                              </div>
                              <div className="auth-item-info">
                                <span className="auth-item-name">{m.name}</span>
                                <span className="auth-item-role">{m.role}</span>
                              </div>
                              {isSelected && <span className="auth-item-check">✓</span>}
                            </div>
                          )
                        })}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PIN Input */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Account PIN / Password
              </label>
              {selectedMember && (
                <span style={{ fontSize: '11px', color: '#818cf8' }}>
                  Default: <strong>{defaultHint}</strong>
                </span>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <input
                ref={pinInputRef}
                type={showPin ? 'text' : 'password'}
                placeholder={selectedMember ? `e.g. ${defaultHint}` : 'Select your name first'}
                value={pin}
                disabled={!selectedMember}
                onChange={e => { setPin(e.target.value); setError('') }}
                className="auth-input"
                style={{ textAlign: 'left', paddingRight: '42px' }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                disabled={!selectedMember}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: selectedMember ? 'pointer' : 'default',
                  fontSize: '15px',
                  padding: '4px'
                }}
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          <p style={{ fontSize: '11.5px', color: '#6b7280', margin: '4px 0 16px', lineHeight: '1.4' }}>
            💡 First time logging in? Your initial PIN is the first 3 letters of your name + 123 (e.g. <strong>{defaultHint}</strong>). You can change it anytime in the dashboard.
          </p>

          {error && <p className="auth-error" style={{ marginBottom: '14px' }}>{error}</p>}

          <button
            type="submit"
            className="btn btn-solid auth-btn"
            disabled={loading || !selectedMemberId}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              fontWeight: '600',
              opacity: (!selectedMemberId || loading) ? 0.6 : 1,
              cursor: (!selectedMemberId || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Verifying…' : 'Enter Dashboard →'}
          </button>
        </form>
      </div>
    </div>
  )
}
