import { useState } from 'react'

export default function SplashIntro({ onFinish }) {
  const [isExiting, setIsExiting] = useState(false)

  function handleEnter() {
    if (isExiting) return
    setIsExiting(true)
    setTimeout(() => {
      if (onFinish) onFinish()
    }, 550)
  }

  return (
    <div
      className={`splash-backdrop ${isExiting ? 'splash-exit' : ''}`}
      onClick={handleEnter}
      title="Click anywhere to enter"
    >
      {/* Ambient background glow fields */}
      <div className="splash-ambient-glow glow-red" />
      <div className="splash-ambient-glow glow-indigo" />

      <div className="splash-content" onClick={e => e.stopPropagation()}>
        {/* Sleek Minimalist Orbital Ring Emblem */}
        <div className="splash-emblem-wrap">
          <svg className="splash-orbital-svg" viewBox="0 0 120 120">
            {/* Outer dotted orbit */}
            <circle
              className="splash-orbit-outer"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
              strokeDasharray="3 6"
            />
            {/* Inner kinetic arc */}
            <circle
              className="splash-orbit-arc"
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke="url(#splash-arc-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Pulsing focal nucleus */}
            <circle
              className="splash-nucleus"
              cx="60"
              cy="60"
              r="4.5"
              fill="#ef4444"
            />
            <defs>
              <linearGradient id="splash-arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.35" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central Monogram */}
          <div className="splash-monogram">KAHE</div>
        </div>

        {/* Cinematic Kinetic Typography */}
        <div className="splash-text-group">
          <div className="splash-pretitle">
            <span className="splash-district-pill">RID 3206</span>
            <span className="splash-dot-sep">•</span>
            <span>CHARTERED YOUTH IN SERVICE</span>
          </div>

          <h1 className="splash-title">
            <span>ROTARACT</span>
            <span className="splash-title-thin">KAHE</span>
          </h1>

          <div className="splash-beam-line" />

          <div className="splash-footer-row">
            <span className="splash-year-chip">
              <span className="splash-status-dot" />
              ROTARY YEAR 2026 – 2027
            </span>
          </div>
        </div>

        {/* Interactive Enter Call-to-Action */}
        <div className="splash-action-group">
          <button
            type="button"
            className="splash-enter-btn"
            onClick={handleEnter}
          >
            <span>Enter Workspace</span>
            <span className="splash-enter-arrow">→</span>
          </button>
          <div className="splash-skip-hint">or click anywhere to continue</div>
        </div>
      </div>
    </div>
  )
}
