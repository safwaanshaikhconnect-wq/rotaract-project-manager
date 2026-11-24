import { useState } from 'react'
import {
  signInWithEmail,
  sendPasswordReset,
  completePasswordRecovery,
} from '../lib/auth'

export default function AuthGate({
  configError = null,
  authUser = null,
  authError = '',
  recoveryMode = false,
  onRecoveryComplete,
  onSignOut,
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState('signin') // 'signin' | 'reset'
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignInSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!email.trim() || !password) {
      setError('Please enter your email address and password.')
      return
    }

    setLoading(true)
    const result = await signInWithEmail(email, password)
    setLoading(false)

    if (!result.success) {
      setError(result.message || 'Invalid email or password.')
      setPassword('')
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!email.trim()) {
      setError('Please enter your registered board email address.')
      return
    }

    setLoading(true)
    const result = await sendPasswordReset(email)
    setLoading(false)

    if (result.success) {
      setInfo(result.message)
    } else {
      setError(result.message)
    }
  }

  async function handleRecoverySubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setLoading(true)
    const result = await completePasswordRecovery(newPassword)
    setLoading(false)

    if (result.success) {
      setNewPassword('')
      setConfirmPassword('')
      if (onRecoveryComplete) onRecoveryComplete()
    } else {
      setError(result.message)
    }
  }

  // ── 1. Missing or invalid environment configuration ───────────────────────
  if (configError) {
    return (
      <div className="auth-gate">
        <div className="aurora-glow" />
        <div className="auth-card glass auth-card-board" style={{ width: '440px', maxWidth: '92vw', padding: '2.2rem 2rem' }}>
          <div className="auth-badge-icon">⚠️</div>
          <h2>Configuration Required</h2>
          <p className="auth-subtitle">Rotaract KAHE — RY 2026–27</p>
          <p className="auth-error" style={{ marginBottom: 0 }}>{configError}</p>
        </div>
      </div>
    )
  }

  // ── 2. Password recovery flow (from Supabase reset email link) ────────────
  if (recoveryMode) {
    return (
      <div className="auth-gate">
        <div className="aurora-glow" />
        <div className="auth-card glass auth-card-board" style={{ width: '440px', maxWidth: '92vw', padding: '2.2rem 2rem' }}>
          <div style={{ marginBottom: '22px' }}>
            <div className="auth-badge-icon">🔐</div>
            <h2>Set New Password</h2>
            <p className="auth-subtitle">Choose a strong password for your board account</p>
          </div>

          <form onSubmit={handleRecoverySubmit} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '14px' }}>
              <label className="auth-field-label" htmlFor="recovery-new-password">
                New Password
              </label>
              <input
                id="recovery-new-password"
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError('') }}
                className="auth-input"
                style={{ textAlign: 'left' }}
                autoComplete="new-password"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="auth-field-label" htmlFor="recovery-confirm-password">
                Confirm New Password
              </label>
              <input
                id="recovery-confirm-password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                className="auth-input"
                style={{ textAlign: 'left' }}
                autoComplete="new-password"
                required
              />
            </div>

            {error && <p className="auth-error" style={{ marginBottom: '14px' }}>{error}</p>}

            <button
              type="submit"
              className="btn btn-solid auth-btn"
              disabled={loading}
            >
              {loading ? 'Updating Password…' : 'Update Password →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── 3. Authenticated in Supabase, but not an authorized active board member
  if (authUser) {
    return (
      <div className="auth-gate">
        <div className="aurora-glow" />
        <div className="auth-card glass auth-card-board" style={{ width: '440px', maxWidth: '92vw', padding: '2.2rem 2rem' }}>
          <div style={{ marginBottom: '18px' }}>
            <div className="auth-badge-icon">🛡️</div>
            <h2>Access Restricted</h2>
            <p className="auth-subtitle">
              Signed in as <strong style={{ color: '#e5e7eb' }}>{authUser.email}</strong>
            </p>
          </div>

          <p className="auth-error" style={{ marginBottom: '18px', lineHeight: '1.5' }}>
            {authError || 'Your account does not have active Rotaract KAHE board permissions.'}
          </p>

          <button
            type="button"
            className="btn btn-solid auth-btn"
            onClick={onSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // ── 4. Standard Email / Password Sign-In (and Password Reset request) ──────
  return (
    <div className="auth-gate">
      <div className="aurora-glow" />
      <div className="auth-card glass auth-card-board" style={{ width: '440px', maxWidth: '92vw', padding: '2.2rem 2rem' }}>
        <div style={{ marginBottom: '22px' }}>
          <div className="auth-badge-icon">👥</div>
          <h2>Rotaract KAHE</h2>
          <p className="auth-subtitle">
            {mode === 'signin'
              ? 'RY 2026–27 Board Member Sign In'
              : 'Reset Board Account Password'}
          </p>
        </div>

        {mode === 'signin' ? (
          <form onSubmit={handleSignInSubmit} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '16px' }}>
              <label className="auth-field-label" htmlFor="auth-email">
                Board Email
              </label>
              <input
                id="auth-email"
                type="email"
                placeholder="member@rotaractkahe.org"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); setInfo('') }}
                className="auth-input"
                style={{ textAlign: 'left' }}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="auth-field-label" htmlFor="auth-password" style={{ marginBottom: 0 }}>
                  Password
                </label>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => { setMode('reset'); setError(''); setInfo('') }}
                >
                  Forgot password?
                </button>
              </div>

              <div className="auth-password-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  className="auth-input"
                  style={{ textAlign: 'left', paddingRight: '42px' }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '🔒'}
                </button>
              </div>
            </div>

            {error && <p className="auth-error" style={{ marginBottom: '12px' }}>{error}</p>}
            {info && <p className="auth-success" style={{ marginBottom: '12px' }}>{info}</p>}

            <button
              type="submit"
              className="btn btn-solid auth-btn"
              disabled={loading || !email.trim() || !password}
              style={{
                padding: '12px',
                fontSize: '14px',
                fontWeight: '600',
                opacity: (!email.trim() || !password || loading) ? 0.6 : 1,
                cursor: (!email.trim() || !password || loading) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Signing in…' : 'Enter Dashboard →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '14px' }}>
              <label className="auth-field-label" htmlFor="reset-email">
                Board Email
              </label>
              <input
                id="reset-email"
                type="email"
                placeholder="member@rotaractkahe.org"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); setInfo('') }}
                className="auth-input"
                style={{ textAlign: 'left' }}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            {error && <p className="auth-error" style={{ marginBottom: '12px' }}>{error}</p>}
            {info && <p className="auth-success" style={{ marginBottom: '12px' }}>{info}</p>}

            <button
              type="submit"
              className="btn btn-solid auth-btn"
              disabled={loading || !email.trim()}
              style={{
                padding: '12px',
                fontSize: '14px',
                fontWeight: '600',
                opacity: (!email.trim() || loading) ? 0.6 : 1,
                cursor: (!email.trim() || loading) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending link…' : 'Send Password Reset Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => { setMode('signin'); setError(''); setInfo('') }}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
