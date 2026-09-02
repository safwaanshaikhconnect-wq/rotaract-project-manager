import { useState, useMemo } from 'react'
import { MEMBERS, colorFor, initials } from '../lib/members'
import { verifyMemberPin, getDefaultPin } from '../lib/auth'

export default function AuthGate({ onAuth }) {
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const selectedMember = useMemo(() => {
    return MEMBERS.find(m => m.id === Number(selectedMemberId)) || null
  }, [selectedMemberId])

  // Filter members list by search term
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return MEMBERS
    const q = searchTerm.toLowerCase()
    return MEMBERS.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.group.toLowerCase().includes(q)
    )
  }, [searchTerm])

  // Group members for organized dropdown/selection
  const groupedMembers = useMemo(() => {
    const groups = {}
    filteredMembers.forEach(m => {
      if (!groups[m.group]) groups[m.group] = []
      groups[m.group].push(m)
    })
    return groups
  }, [filteredMembers])

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

  const defaultHint = selectedMember ? getDefaultPin(selectedMember.name) : 'saf123'

  return (
    <div className="auth-gate">
      <div className="aurora-glow" />
      <div className="auth-card glass auth-card-board" style={{ width: '420px', maxWidth: '92vw', padding: '2.2rem 2rem' }}>
        <div style={{ marginBottom: '20px' }}>
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
          {/* Member Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Your Name
            </label>

            <select
              value={selectedMemberId}
              onChange={e => {
                setSelectedMemberId(e.target.value)
                setError('')
                setPin('')
              }}
              className="auth-input auth-select"
              style={{ textAlign: 'left', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
            >
              <option value="" disabled>Choose your name from the board…</option>
              {Object.entries(groupedMembers).map(([group, members]) => (
                <optgroup key={group} label={`── ${group} ──`} style={{ background: '#111827', color: '#a5b4fc', fontWeight: '700' }}>
                  {members.map(m => (
                    <option key={m.id} value={m.id} style={{ background: '#1f2937', color: '#f3f4f6', fontWeight: 'normal' }}>
                      {m.name} — {m.role}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Selected Member Preview Card */}
          {selectedMember && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div
                className="avatar"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: '700',
                  background: colorFor(selectedMember.id).bg,
                  color: colorFor(selectedMember.id).fg,
                  flexShrink: 0
                }}
              >
                {initials(selectedMember.name)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedMember.name}
                </div>
                <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: '500' }}>
                  {selectedMember.role}
                </div>
              </div>
            </div>
          )}

          {/* PIN Input */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Account PIN / Password
              </label>
              {selectedMember && (
                <span style={{ fontSize: '11px', color: '#6366f1' }}>
                  Default: <strong>{defaultHint}</strong>
                </span>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showPin ? 'text' : 'password'}
                placeholder={selectedMember ? `e.g. ${defaultHint}` : 'Enter your PIN'}
                value={pin}
                onChange={e => { setPin(e.target.value); setError('') }}
                className="auth-input"
                style={{ textAlign: 'left', paddingRight: '42px' }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
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
            💡 First time logging in? Your initial PIN is the first 3 letters of your name + 123. You can change it anytime in the dashboard.
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
