import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────

const COOLDOWN_DAYS = 90

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

const BLOOD_GROUP_COLORS = {
  'O+':  { bg: 'rgba(220,38,38,0.12)',  fg: '#fca5a5', border: 'rgba(220,38,38,0.35)' },
  'O-':  { bg: 'rgba(220,38,38,0.12)',  fg: '#fca5a5', border: 'rgba(220,38,38,0.35)' },
  'A+':  { bg: 'rgba(124,58,237,0.12)', fg: '#c4b5fd', border: 'rgba(124,58,237,0.35)' },
  'A-':  { bg: 'rgba(124,58,237,0.12)', fg: '#c4b5fd', border: 'rgba(124,58,237,0.35)' },
  'B+':  { bg: 'rgba(37,99,235,0.12)',  fg: '#93c5fd', border: 'rgba(37,99,235,0.35)' },
  'B-':  { bg: 'rgba(37,99,235,0.12)',  fg: '#93c5fd', border: 'rgba(37,99,235,0.35)' },
  'AB+': { bg: 'rgba(217,119,6,0.12)',  fg: '#fcd34d', border: 'rgba(217,119,6,0.35)' },
  'AB-': { bg: 'rgba(217,119,6,0.12)',  fg: '#fcd34d', border: 'rgba(217,119,6,0.35)' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDonorStatus(donation_dates) {
  if (!donation_dates || donation_dates.length === 0) {
    return { eligible: true, daysLeft: 0, lastDonated: null }
  }
  const sorted = [...donation_dates].sort()
  const lastDate = sorted[sorted.length - 1]
  // Parse as local date to avoid off-by-one from UTC conversion
  const [y, m, d] = lastDate.split('-').map(Number)
  const last = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysSince = Math.floor((today - last) / 86_400_000)
  const daysLeft = COOLDOWN_DAYS - daysSince
  return {
    eligible: daysLeft <= 0,
    daysLeft: Math.max(0, daysLeft),
    lastDonated: lastDate,
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function getInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

// ── Add Donor Modal ────────────────────────────────────────────────────────────

function AddDonorModal({ onAdd, onClose }) {
  const [name, setName]             = useState('')
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [phone, setPhone]           = useState('')
  const [notes, setNotes]           = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ name: name.trim(), blood_group: bloodGroup, phone: phone.trim() || null, notes: notes.trim() || null })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal cr-modal">
        <div className="cr-modal-header">
          <span className="cr-modal-icon">🩸</span>
          <h3>Register Blood Donor</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Safwaan Shaikh"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Blood Group</label>
            <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
              {BLOOD_GROUPS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Phone / Contact <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span></label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </div>
          <div className="form-group">
            <label>Notes <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Contact preference, availability…"
              rows={2}
              className="cr-textarea"
            />
          </div>
          <div className="modal-btns">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn cr-btn-solid">Register Donor</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Donation History Tooltip ───────────────────────────────────────────────────

function DonationHistory({ dates }) {
  const sorted = [...dates].sort().reverse() // newest first
  return (
    <div className="cr-history">
      <div className="cr-history-title">Donation History</div>
      {sorted.length === 0
        ? <span className="cr-history-empty">No donations recorded yet</span>
        : sorted.map((date, i) => (
            <div key={i} className="cr-history-item">
              <span className="cr-history-dot" />
              <span>{formatDate(date)}</span>
            </div>
          ))
      }
    </div>
  )
}

// ── Donor Card ────────────────────────────────────────────────────────────────

function DonorCard({ donor, onLogDonation, onDelete }) {
  const [showHistory, setShowHistory] = useState(false)
  const { eligible, daysLeft, lastDonated } = getDonorStatus(donor.donation_dates)
  const colors        = BLOOD_GROUP_COLORS[donor.blood_group] ?? BLOOD_GROUP_COLORS['O+']
  const totalDonations = (donor.donation_dates ?? []).length

  return (
    <div className={`donor-card ${!eligible ? 'donor-on-cooldown' : 'donor-eligible'}`}>
      {/* Card Top Row */}
      <div className="donor-card-top">
        <div className="donor-avatar" style={{ background: colors.bg, color: colors.fg, borderColor: colors.border }}>
          {getInitials(donor.name)}
        </div>
        <div className="donor-info">
          <div className="donor-name">{donor.name}</div>
          <span className="blood-badge" style={{ background: colors.bg, color: colors.fg, borderColor: colors.border }}>
            {donor.blood_group}
          </span>
        </div>
        <button
          className="delete-project-btn"
          onClick={() => { if (window.confirm(`Remove "${donor.name}" from the donor registry?`)) onDelete(donor.id) }}
          title="Remove donor"
        >🗑</button>
      </div>

      {/* Stats Row */}
      <div className="donor-stats-row">
        <button className="donor-stat donor-stat-btn" onClick={() => setShowHistory(v => !v)} title="Click to view history">
          <span className="donor-stat-num">{totalDonations}</span>
          <span className="donor-stat-lbl">Donations 📋</span>
        </button>
        <div className="donor-stat">
          <span className="donor-stat-num">{lastDonated ? formatDate(lastDonated) : '—'}</span>
          <span className="donor-stat-lbl">Last donated</span>
        </div>
      </div>

      {/* Phone number */}
      {donor.phone && (
        <a href={`tel:${donor.phone}`} className="donor-phone">
          📞 {donor.phone}
        </a>
      )}

      {/* Donation history (expandable) */}
      {showHistory && <DonationHistory dates={donor.donation_dates ?? []} />}

      {/* Notes */}
      {donor.notes && <div className="donor-notes">{donor.notes}</div>}

      {/* Footer */}
      <div className="donor-footer">
        <span className={`eligibility-pill ${eligible ? 'pill-eligible' : 'pill-cooldown'}`}>
          {eligible ? '✅ Eligible' : `⏳ ${daysLeft}d cooldown`}
        </span>
        <button
          className="log-donation-btn"
          onClick={() => onLogDonation(donor.id)}
          disabled={!eligible}
          title={eligible ? 'Log a donation today' : `Eligible again in ${daysLeft} days`}
        >
          🩸 Log Donation
        </button>
      </div>
    </div>
  )
}

// ── Code Red Tab ──────────────────────────────────────────────────────────────

export default function CodeRedTab() {
  const [donors,       setDonors]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [search,       setSearch]       = useState('')
  const [bgFilter,     setBgFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // ── Fetch & real-time ────────────────────────────────────────────────────
  const fetchDonors = useCallback(async () => {
    const { data, error } = await supabase
      .from('blood_donors')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setDonors(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDonors()

    const channel = supabase
      .channel('blood-donors-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blood_donors' }, (payload) => {
        setDonors(prev => {
          if (prev.find(d => d.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'blood_donors' }, (payload) => {
        setDonors(prev => prev.map(d => d.id === payload.new.id ? payload.new : d))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'blood_donors' }, (payload) => {
        setDonors(prev => prev.filter(d => d.id !== payload.old.id))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchDonors])

  // ── Mutations ────────────────────────────────────────────────────────────
  async function handleAddDonor({ name, blood_group, phone, notes }) {
    const { data, error } = await supabase
      .from('blood_donors')
      .insert([{ name, blood_group, phone, notes, donation_dates: [] }])
      .select()
      .single()
    if (!error && data) {
      setDonors(prev => [...prev, data])
    } else {
      console.error('Failed to add donor:', error?.message)
    }
  }

  async function handleLogDonation(donorId) {
    const donor = donors.find(d => d.id === donorId)
    if (!donor) return
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const updated = [...(donor.donation_dates ?? []), today]
    // Optimistic update
    setDonors(prev => prev.map(d => d.id === donorId ? { ...d, donation_dates: updated } : d))
    const { error } = await supabase
      .from('blood_donors')
      .update({ donation_dates: updated })
      .eq('id', donorId)
    if (error) {
      setDonors(prev => prev.map(d => d.id === donorId ? donor : d))
      console.error('Failed to log donation:', error.message)
    }
  }

  async function handleDeleteDonor(donorId) {
    const snapshot = donors
    setDonors(prev => prev.filter(d => d.id !== donorId))
    const { error } = await supabase
      .from('blood_donors')
      .delete()
      .eq('id', donorId)
    if (error) {
      setDonors(snapshot)
      console.error('Failed to delete donor:', error.message)
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total          = donors.length
    const eligible       = donors.filter(d => getDonorStatus(d.donation_dates).eligible).length
    const onCooldown     = total - eligible
    const totalDonations = donors.reduce((acc, d) => acc + (d.donation_dates ?? []).length, 0)
    const bgCounts       = {}
    donors.forEach(d => { bgCounts[d.blood_group] = (bgCounts[d.blood_group] || 0) + 1 })
    const topBg = Object.entries(bgCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    return { total, eligible, onCooldown, totalDonations, topBg }
  }, [donors])

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...donors]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.blood_group.toLowerCase().includes(q)
      )
    }
    if (bgFilter)     result = result.filter(d => d.blood_group === bgFilter)
    if (statusFilter) {
      result = result.filter(d => {
        const { eligible } = getDonorStatus(d.donation_dates)
        return statusFilter === 'eligible' ? eligible : !eligible
      })
    }
    return result
  }, [donors, search, bgFilter, statusFilter])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="cr-container">

      {/* Page Header */}
      <div className="cr-page-header">
        <div className="cr-title-row">
          <span className="cr-pulse-dot" />
          <h2 className="cr-title">Code Red</h2>
        </div>
        <p className="cr-subtitle">Blood Donor Registry — Rotaract KAHE RY 2026–27</p>
      </div>

      {/* Stats Bar */}
      <div className="cr-stats-row">
        <div className="cr-stat-card">
          <div className="cr-stat-num">{stats.total}</div>
          <div className="cr-stat-lbl">Registered donors</div>
        </div>
        <div className="cr-stat-card cr-stat-eligible">
          <div className="cr-stat-num">{stats.eligible}</div>
          <div className="cr-stat-lbl">Eligible now</div>
        </div>
        <div className="cr-stat-card cr-stat-cooldown">
          <div className="cr-stat-num">{stats.onCooldown}</div>
          <div className="cr-stat-lbl">On cooldown</div>
        </div>
        <div className="cr-stat-card">
          <div className="cr-stat-num">{stats.totalDonations}</div>
          <div className="cr-stat-lbl">Total donations</div>
        </div>
        <div className="cr-stat-card">
          <div className="cr-stat-num" style={{ fontSize: '20px' }}>{stats.topBg}</div>
          <div className="cr-stat-lbl">Most common group</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="filters-toolbar cr-toolbar">
        <input
          type="text"
          className="filter-search"
          placeholder="Search donors…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-select" value={bgFilter} onChange={e => setBgFilter(e.target.value)}>
          <option value="">All Blood Groups</option>
          {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="eligible">Eligible</option>
          <option value="cooldown">On Cooldown</option>
        </select>
        <button className="add-project-btn-top cr-add-btn" onClick={() => setShowModal(true)}>
          🩸 Add Donor
        </button>
      </div>

      {/* Donor Grid */}
      {loading ? (
        <p style={{ color: '#aaa', fontSize: '14px', padding: '2rem 0' }}>Loading donors…</p>
      ) : filtered.length === 0 ? (
        <div className="cr-empty">
          <div className="cr-empty-icon">🩸</div>
          <p>{donors.length === 0
            ? 'No donors registered yet. Click "Add Donor" to get started.'
            : 'No donors match your filters.'
          }</p>
        </div>
      ) : (
        <div className="donor-grid">
          {filtered.map(d => (
            <DonorCard
              key={d.id}
              donor={d}
              onLogDonation={handleLogDonation}
              onDelete={handleDeleteDonor}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddDonorModal
          onAdd={handleAddDonor}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
