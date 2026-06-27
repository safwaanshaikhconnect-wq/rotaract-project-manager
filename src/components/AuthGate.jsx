import { useState } from 'react'

// Change this password to whatever you want for your team
const TEAM_PASSWORD = 'rotaract2627'

export default function AuthGate({ onAuth }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (pw === TEAM_PASSWORD) {
      sessionStorage.setItem('rotaract_auth', '1')
      onAuth()
    } else {
      setError('Wrong password. Ask your President.')
      setPw('')
    }
  }

  return (
    <div className="auth-gate">
      <div className="aurora-glow" />
      <div className="auth-card glass">
        <h2>Rotaract KAHE</h2>
        <p>RY 2026–27 Team Dashboard</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Team password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError('') }}
            autoFocus
            className="auth-input"
          />
          {error && <p className="auth-error">{error}</p>}
          <button
            type="submit"
            className="btn btn-solid auth-btn"
          >
            Enter Dashboard
          </button>
        </form>
      </div>
    </div>
  )
}
