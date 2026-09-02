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

const LOCAL_DONATIONS_KEY = 'rotaract_blood_donations'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDonorStatus(donation_dates) {
  if (!donation_dates || donation_dates.length === 0) {
    return { eligible: true, daysLeft: 0, lastDonated: null }
  }
  const sorted = [...donation_dates].sort()
  const lastDate = sorted[sorted.length - 1]
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
  if (!name) return ''
  const clean = name.replace(/^Rtr\.\s+/i, '').trim()
  return clean.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

// ── Add Donor Modal (Registry) ────────────────────────────────────────────────

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
              placeholder="e.g. Mohammed Safwaan"
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
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="form-group">
            <label>Notes <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span></label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Preferred hospital, remarks"
            />
          </div>
          <div className="cr-modal-actions">
            <button type="button" className="btn cr-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-solid cr-btn-solid">
              Register Donor
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Log Donation Modal for a specific Donor (Part 1) ──────────────────────────

function LogDonorDonationModal({ donor, onConfirm, onClose }) {
  const [donationDate, setDonationDate] = useState(getTodayString())
  const [donationType, setDonationType] = useState('Regular')
  const [hospitalName, setHospitalName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!donationDate) return
    onConfirm({
      donorId: donor.id,
      donorName: donor.name,
      donationDate,
      donationType,
      hospitalName: hospitalName.trim() || 'Local Hospital'
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal cr-modal" style={{ maxWidth: '420px' }}>
        <div className="cr-modal-header">
          <span className="cr-modal-icon">🩸</span>
          <div>
            <h3 style={{ margin: 0 }}>Log Donation for {donor.name}</h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>Blood Group: {donor.blood_group}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Date of Donation <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="date"
              value={donationDate}
              onChange={e => setDonationDate(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Donation Type</label>
            <div className="cr-type-selector">
              <label className={`cr-type-radio ${donationType === 'Emergency' ? 'active emergency' : ''}`}>
                <input
                  type="radio"
                  name="dtype"
                  value="Emergency"
                  checked={donationType === 'Emergency'}
                  onChange={() => setDonationType('Emergency')}
                />
                🚨 Emergency
              </label>
              <label className={`cr-type-radio ${donationType === 'Regular' ? 'active regular' : ''}`}>
                <input
                  type="radio"
                  name="dtype"
                  value="Regular"
                  checked={donationType === 'Regular'}
                  onChange={() => setDonationType('Regular')}
                />
                🩺 Regular
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Hospital / Location</label>
            <input
              type="text"
              value={hospitalName}
              onChange={e => setHospitalName(e.target.value)}
              placeholder="e.g. KMCH Coimbatore, Ganga Hospital"
            />
          </div>

          <p style={{ fontSize: '11.5px', color: '#6b7280', margin: '6px 0 16px', lineHeight: '1.4' }}>
            ℹ️ This will record the donation date, start their 90-day cooldown, and log it under the master donation records.
          </p>

          <div className="cr-modal-actions">
            <button type="button" className="btn cr-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-solid cr-btn-solid">
              Log Donation Date
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Record Any Blood Donation Modal (Part 2) ───────────────────────────────────

function RecordDonationLogModal({ donors, onRecord, onClose }) {
  const [donationDate, setDonationDate] = useState(getTodayString())
  const [donorName, setDonorName]       = useState('')
  const [donationType, setDonationType] = useState('Emergency')
  const [hospitalName, setHospitalName] = useState('')
  const [notes, setNotes]               = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!donorName.trim() || !hospitalName.trim() || !donationDate) return

    onRecord({
      donor_name: donorName.trim(),
      donation_type: donationType,
      hospital_name: hospitalName.trim(),
      donation_date: donationDate,
      notes: notes.trim() || null
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal cr-modal" style={{ maxWidth: '440px' }}>
        <div className="cr-modal-header">
          <span className="cr-modal-icon">📋</span>
          <div>
            <h3 style={{ margin: 0 }}>Record Blood Donation</h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>Log a new blood donation event</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Order fixed logically: Date -> Donor Name -> Donation Type -> Hospital Name */}
          <div className="form-group">
            <label>1. Date of Donation <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="date"
              value={donationDate}
              onChange={e => setDonationDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>2. Donor Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              list="registered-donors-list"
              value={donorName}
              onChange={e => setDonorName(e.target.value)}
              placeholder="e.g. Mohammed Safwaan (or choose from registered)"
              required
              autoFocus
            />
            <datalist id="registered-donors-list">
              {donors.map(d => (
                <option key={d.id} value={d.name}>{d.name} ({d.blood_group})</option>
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>3. Donation Type <span style={{ color: '#ef4444' }}>*</span></label>
            <div className="cr-type-selector">
              <label className={`cr-type-radio ${donationType === 'Emergency' ? 'active emergency' : ''}`}>
                <input
                  type="radio"
                  name="log_dtype"
                  value="Emergency"
                  checked={donationType === 'Emergency'}
                  onChange={() => setDonationType('Emergency')}
                />
                🚨 Emergency
              </label>
              <label className={`cr-type-radio ${donationType === 'Regular' ? 'active regular' : ''}`}>
                <input
                  type="radio"
                  name="log_dtype"
                  value="Regular"
                  checked={donationType === 'Regular'}
                  onChange={() => setDonationType('Regular')}
                />
                🩺 Regular
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>4. Hospital Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              value={hospitalName}
              onChange={e => setHospitalName(e.target.value)}
              placeholder="e.g. KMCH, Ganga Hospital, Coimbatore Medical College"
              required
            />
          </div>

          <div className="form-group">
            <label>Remarks / Units <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span></label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. 1 unit packed cells, patient name"
            />
          </div>

          <div className="cr-modal-actions">
            <button type="button" className="btn cr-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-solid cr-btn-solid">
              Save Donation Record
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Donor Card (Registry view) ────────────────────────────────────────────────

function DonorCard({ donor, onOpenLogModal, onDelete }) {
  const { eligible, daysLeft, lastDonated } = getDonorStatus(donor.donation_dates)
  const colors = BLOOD_GROUP_COLORS[donor.blood_group] || BLOOD_GROUP_COLORS['O+']
  const donationCount = (donor.donation_dates ?? []).length

  return (
    <div className={`donor-card ${!eligible ? 'donor-cooldown' : 'donor-eligible'}`}>
      <div className="donor-card-top">
        <div className="donor-avatar" style={{ background: colors.bg, color: colors.fg, border: `1px solid ${colors.border}` }}>
          {getInitials(donor.name)}
        </div>
        <div className="donor-info">
          <div className="donor-name-row">
            <span className="donor-name">{donor.name}</span>
            <span className="blood-badge" style={{ background: colors.bg, color: colors.fg, border: `1px solid ${colors.border}` }}>
              {donor.blood_group}
            </span>
          </div>
          {donor.notes && <span className="donor-notes">{donor.notes}</span>}
        </div>
        <button
          className="donor-delete-btn"
          onClick={() => { if (confirm(`Remove ${donor.name} from donor registry?`)) onDelete(donor.id) }}
          title="Remove donor"
        >
          ✕
        </button>
      </div>

      <div className="donor-stats-row">
        <div className="donor-stat">
          <span className="donor-stat-val">{donationCount}</span>
          <span className="donor-stat-key">Donations 🩸</span>
        </div>
        <div className="donor-stat">
          <span className="donor-stat-val">{formatDate(lastDonated)}</span>
          <span className="donor-stat-key">Last Donated</span>
        </div>
      </div>

      {donor.phone && (
        <a className="donor-phone" href={`tel:${donor.phone}`}>
          📞 {donor.phone}
        </a>
      )}

      <div className="donor-footer">
        <span className={`eligibility-badge ${eligible ? 'badge-eligible' : 'badge-cooldown'}`}>
          {eligible ? '✅ Eligible' : `⏳ ${daysLeft}d cooldown`}
        </span>
        <button
          className="log-donation-btn"
          onClick={() => onOpenLogModal(donor)}
          title="Mark date of donation"
        >
          🩸 Log Donation
        </button>
      </div>
    </div>
  )
}

// ── Main Code Red Tab ─────────────────────────────────────────────────────────

export default function CodeRedTab() {
  const [subTab, setSubTab]             = useState('donors') // 'donors' | 'logs'
  const [donors, setDonors]             = useState([])
  const [donations, setDonations]       = useState([])
  const [loading, setLoading]           = useState(true)

  // Modals state
  const [showAddDonorModal, setShowAddDonorModal]       = useState(false)
  const [showAddDonationModal, setShowAddDonationModal] = useState(false)
  const [selectedDonorForLog, setSelectedDonorForLog]   = useState(null)

  // Filters for Donors
  const [search, setSearch]             = useState('')
  const [bgFilter, setBgFilter]         = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Filters for Donation Logs
  const [logSearch, setLogSearch]       = useState('')
  const [logTypeFilter, setLogTypeFilter] = useState('')

  // ── Fetch & Realtime for Donors ──────────────────────────────────────────
  const fetchDonors = useCallback(async () => {
    const { data, error } = await supabase
      .from('blood_donors')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setDonors(data ?? [])
    setLoading(false)
  }, [])

  // ── Fetch & Realtime for Donation Logs ───────────────────────────────────
  const fetchDonations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('blood_donations')
        .select('*')
        .order('donation_date', { ascending: false })

      if (!error && data) {
        setDonations(data)
        localStorage.setItem(LOCAL_DONATIONS_KEY, JSON.stringify(data))
      } else {
        // Fallback to localStorage if table doesn't exist yet
        const cached = localStorage.getItem(LOCAL_DONATIONS_KEY)
        if (cached) setDonations(JSON.parse(cached))
      }
    } catch {
      const cached = localStorage.getItem(LOCAL_DONATIONS_KEY)
      if (cached) setDonations(JSON.parse(cached))
    }
  }, [])

  useEffect(() => {
    fetchDonors()
    fetchDonations()

    // Real-time channel for blood_donors
    const donorsChannel = supabase
      .channel('blood-donors-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blood_donors' }, (payload) => {
        setDonors(prev => prev.find(d => d.id === payload.new.id) ? prev : [...prev, payload.new])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'blood_donors' }, (payload) => {
        setDonors(prev => prev.map(d => d.id === payload.new.id ? payload.new : d))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'blood_donors' }, (payload) => {
        setDonors(prev => prev.filter(d => d.id !== payload.old.id))
      })
      .subscribe()

    // Real-time channel for blood_donations
    const donationsChannel = supabase
      .channel('blood-donations-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blood_donations' }, (payload) => {
        setDonations(prev => [payload.new, ...prev.filter(d => d.id !== payload.new.id)])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'blood_donations' }, (payload) => {
        setDonations(prev => prev.filter(d => d.id !== payload.old.id))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(donorsChannel)
      supabase.removeChannel(donationsChannel)
    }
  }, [fetchDonors, fetchDonations])

  // ── Mutations ────────────────────────────────────────────────────────────
  async function handleAddDonor({ name, blood_group, phone, notes }) {
    const { data, error } = await supabase
      .from('blood_donors')
      .insert([{ name, blood_group, phone, notes, donation_dates: [] }])
      .select()
      .single()
    if (!error && data) {
      setDonors(prev => [...prev, data])
    }
  }

  // Called when logging donation for a registered donor with custom date
  async function handleLogDonorDonation({ donorId, donorName, donationDate, donationType, hospitalName }) {
    const donor = donors.find(d => d.id === donorId)
    if (!donor) return

    const updated = [...(donor.donation_dates ?? []), donationDate].sort()
    setDonors(prev => prev.map(d => d.id === donorId ? { ...d, donation_dates: updated } : d))

    // 1. Update donor cooldown
    await supabase
      .from('blood_donors')
      .update({ donation_dates: updated })
      .eq('id', donorId)

    // 2. Also log in master donations log
    await handleRecordDonation({
      donor_name: donorName,
      donation_type: donationType,
      hospital_name: hospitalName,
      donation_date: donationDate,
    }, false)
  }

  // Called when adding an entry to master donation log
  async function handleRecordDonation(donationData, autoUpdateDonor = true) {
    const newRecord = {
      ...donationData,
      id: Date.now(),
      created_at: new Date().toISOString()
    }

    // Local state update first
    setDonations(prev => {
      const updated = [newRecord, ...prev]
      localStorage.setItem(LOCAL_DONATIONS_KEY, JSON.stringify(updated))
      return updated
    })

    // If matches a registered club donor and autoUpdate is requested, update their cooldown!
    if (autoUpdateDonor) {
      const matchedDonor = donors.find(d => d.name.toLowerCase() === donationData.donor_name.toLowerCase())
      if (matchedDonor) {
        const updatedDates = [...(matchedDonor.donation_dates ?? []), donationData.donation_date].sort()
        setDonors(prev => prev.map(d => d.id === matchedDonor.id ? { ...d, donation_dates: updatedDates } : d))
        supabase
          .from('blood_donors')
          .update({ donation_dates: updatedDates })
          .eq('id', matchedDonor.id)
          .then()
      }
    }

    // Persist to Supabase blood_donations
    try {
      const { data, error } = await supabase
        .from('blood_donations')
        .insert([{
          donor_name: donationData.donor_name,
          donation_type: donationData.donation_type,
          hospital_name: donationData.hospital_name,
          donation_date: donationData.donation_date,
          notes: donationData.notes || null
        }])
        .select()
        .single()

      if (!error && data) {
        setDonations(prev => prev.map(d => d.id === newRecord.id ? data : d))
      }
    } catch (err) {
      console.warn('Could not insert to blood_donations in Supabase, using local cache:', err)
    }
  }

  async function handleDeleteDonation(id) {
    setDonations(prev => {
      const updated = prev.filter(d => d.id !== id)
      localStorage.setItem(LOCAL_DONATIONS_KEY, JSON.stringify(updated))
      return updated
    })

    try {
      await supabase.from('blood_donations').delete().eq('id', id)
    } catch {}
  }

  async function handleDeleteDonor(donorId) {
    const snapshot = donors
    setDonors(prev => prev.filter(d => d.id !== donorId))
    const { error } = await supabase.from('blood_donors').delete().eq('id', donorId)
    if (error) setDonors(snapshot)
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const donorStats = useMemo(() => {
    const total          = donors.length
    const eligible       = donors.filter(d => getDonorStatus(d.donation_dates).eligible).length
    const onCooldown     = total - eligible
    const totalDonations = donors.reduce((acc, d) => acc + (d.donation_dates ?? []).length, 0)
    const bgCounts       = {}
    donors.forEach(d => { bgCounts[d.blood_group] = (bgCounts[d.blood_group] || 0) + 1 })
    const topBg = Object.entries(bgCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    return { total, eligible, onCooldown, totalDonations, topBg }
  }, [donors])

  const logStats = useMemo(() => {
    const total = donations.length
    const emergencyCount = donations.filter(d => d.donation_type === 'Emergency').length
    const regularCount = total - emergencyCount
    const hospitals = new Set(donations.map(d => d.hospital_name.trim().toLowerCase()).filter(Boolean)).size
    return { total, emergencyCount, regularCount, hospitals }
  }, [donations])

  // ── Filtered Donors List ─────────────────────────────────────────────────
  const filteredDonors = useMemo(() => {
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

  // ── Filtered Donation Logs List ──────────────────────────────────────────
  const filteredDonations = useMemo(() => {
    let result = [...donations]
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase()
      result = result.filter(d =>
        d.donor_name.toLowerCase().includes(q) ||
        (d.hospital_name && d.hospital_name.toLowerCase().includes(q))
      )
    }
    if (logTypeFilter) {
      result = result.filter(d => d.donation_type === logTypeFilter)
    }
    return result
  }, [donations, logSearch, logTypeFilter])

  return (
    <div className="cr-container">
      {/* Page Header */}
      <div className="cr-page-header">
        <div className="cr-title-row">
          <span className="cr-pulse-dot" />
          <h2 className="cr-title">Code Red</h2>
        </div>
        <p className="cr-subtitle">Blood Donor Registry &amp; Donation Logs — Rotaract KAHE RY 2026–27</p>
      </div>

      {/* Two-Part Sub-Navigation */}
      <div className="cr-subtabs">
        <button
          type="button"
          className={`cr-subtab-btn ${subTab === 'donors' ? 'active' : ''}`}
          onClick={() => setSubTab('donors')}
        >
          🩸 Available Club Donors ({donors.length})
        </button>
        <button
          type="button"
          className={`cr-subtab-btn ${subTab === 'logs' ? 'active' : ''}`}
          onClick={() => setSubTab('logs')}
        >
          📋 All Donations Log ({donations.length})
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          PART 1: AVAILABLE DONORS (REGISTRY)
          ────────────────────────────────────────────────────────────────────── */}
      {subTab === 'donors' && (
        <div>
          {/* Stats Bar */}
          <div className="cr-stats-row">
            <div className="cr-stat-card">
              <div className="cr-stat-num">{donorStats.total}</div>
              <div className="cr-stat-lbl">Registered donors</div>
            </div>
            <div className="cr-stat-card cr-stat-eligible">
              <div className="cr-stat-num">{donorStats.eligible}</div>
              <div className="cr-stat-lbl">Eligible now</div>
            </div>
            <div className="cr-stat-card cr-stat-cooldown">
              <div className="cr-stat-num">{donorStats.onCooldown}</div>
              <div className="cr-stat-lbl">On cooldown</div>
            </div>
            <div className="cr-stat-card">
              <div className="cr-stat-num">{donorStats.totalDonations}</div>
              <div className="cr-stat-lbl">Total donations</div>
            </div>
            <div className="cr-stat-card">
              <div className="cr-stat-num" style={{ fontSize: '20px' }}>{donorStats.topBg}</div>
              <div className="cr-stat-lbl">Most common group</div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="filters-toolbar cr-toolbar">
            <input
              type="text"
              className="filter-search"
              placeholder="Search registered donors…"
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
            <button className="add-project-btn-top cr-add-btn" onClick={() => setShowAddDonorModal(true)}>
              + Register Donor
            </button>
          </div>

          {/* Donor Grid */}
          {loading ? (
            <p style={{ color: '#aaa', fontSize: '14px', padding: '2rem 0' }}>Loading donors…</p>
          ) : filteredDonors.length === 0 ? (
            <div className="cr-empty">
              <div className="cr-empty-icon">🩸</div>
              <p>{donors.length === 0
                ? 'No donors registered yet. Click "+ Register Donor" to get started.'
                : 'No donors match your search filters.'
              }</p>
            </div>
          ) : (
            <div className="donor-grid">
              {filteredDonors.map(d => (
                <DonorCard
                  key={d.id}
                  donor={d}
                  onOpenLogModal={(donor) => setSelectedDonorForLog(donor)}
                  onDelete={handleDeleteDonor}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          PART 2: MASTER DONATIONS LOG
          ────────────────────────────────────────────────────────────────────── */}
      {subTab === 'logs' && (
        <div>
          {/* Stats Bar */}
          <div className="cr-stats-row">
            <div className="cr-stat-card">
              <div className="cr-stat-num">{logStats.total}</div>
              <div className="cr-stat-lbl">Total Donations Logged</div>
            </div>
            <div className="cr-stat-card cr-stat-cooldown">
              <div className="cr-stat-num" style={{ color: '#ef4444' }}>{logStats.emergencyCount}</div>
              <div className="cr-stat-lbl">🚨 Emergency Drives</div>
            </div>
            <div className="cr-stat-card cr-stat-eligible">
              <div className="cr-stat-num" style={{ color: '#60a5fa' }}>{logStats.regularCount}</div>
              <div className="cr-stat-lbl">🩺 Regular Donations</div>
            </div>
            <div className="cr-stat-card">
              <div className="cr-stat-num">{logStats.hospitals}</div>
              <div className="cr-stat-lbl">Hospitals Served</div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="filters-toolbar cr-toolbar">
            <input
              type="text"
              className="filter-search"
              placeholder="Search by donor name or hospital…"
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
            />
            <select
              className="filter-select"
              value={logTypeFilter}
              onChange={e => setLogTypeFilter(e.target.value)}
            >
              <option value="">All Donation Types</option>
              <option value="Emergency">🚨 Emergency</option>
              <option value="Regular">🩺 Regular</option>
            </select>
            <button className="add-project-btn-top cr-add-btn" onClick={() => setShowAddDonationModal(true)}>
              + Record Donation
            </button>
          </div>

          {/* Donations Table / List */}
          {filteredDonations.length === 0 ? (
            <div className="cr-empty">
              <div className="cr-empty-icon">📋</div>
              <p>{donations.length === 0
                ? 'No blood donations recorded yet. Click "+ Record Donation" to log the first one.'
                : 'No donation records match your search.'
              }</p>
            </div>
          ) : (
            <div className="cr-log-table-container glass">
              <table className="cr-log-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Donor Name</th>
                    <th>Donation Type</th>
                    <th>Hospital Name</th>
                    <th>Remarks</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonations.map(entry => {
                    const isEmergency = entry.donation_type === 'Emergency'
                    return (
                      <tr key={entry.id}>
                        <td className="cr-log-date">
                          📅 {formatDate(entry.donation_date)}
                        </td>
                        <td className="cr-log-donor">
                          <strong>{entry.donor_name}</strong>
                        </td>
                        <td>
                          <span className={`cr-badge-type ${isEmergency ? 'emergency' : 'regular'}`}>
                            {isEmergency ? '🚨 Emergency' : '🩺 Regular'}
                          </span>
                        </td>
                        <td className="cr-log-hospital">
                          🏥 {entry.hospital_name}
                        </td>
                        <td className="cr-log-notes">
                          {entry.notes || '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="cr-log-del-btn"
                            onClick={() => {
                              if (confirm(`Delete donation record for ${entry.donor_name}?`)) {
                                handleDeleteDonation(entry.id)
                              }
                            }}
                            title="Delete log"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showAddDonorModal && (
        <AddDonorModal
          onAdd={handleAddDonor}
          onClose={() => setShowAddDonorModal(false)}
        />
      )}

      {selectedDonorForLog && (
        <LogDonorDonationModal
          donor={selectedDonorForLog}
          onConfirm={handleLogDonorDonation}
          onClose={() => setSelectedDonorForLog(null)}
        />
      )}

      {showAddDonationModal && (
        <RecordDonationLogModal
          donors={donors}
          onRecord={handleRecordDonation}
          onClose={() => setShowAddDonationModal(false)}
        />
      )}
    </div>
  )
}
