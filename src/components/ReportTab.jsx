import { useState, useEffect } from 'react'
import { MEMBERS } from '../lib/members'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMemberName(id) {
  const m = MEMBERS.find(m => m.id === id)
  return m ? m.name : ''
}

function loadImageMeta(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => resolve({ dataUrl: e.target.result, w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const SETTINGS_KEY = 'rotaract_report_settings'

// Fixed club constants — never change
const CLUB_CONST = {
  clubName: 'Rotaract Club of Karpagam Academy of Higher Education',
  parentedBy: 'Rotary Club of Coimbatore South',
  clubId: '8824843',
  group: '4',
  district: '3206',
  zone: '5',
}

const RY_MONTHS = [
  'July', 'August', 'September', 'October', 'November', 'December',
  'January', 'February', 'March', 'April', 'May', 'June'
]

const defaultSettings = {
  avenueTitle: '',
  monthLabel: '',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportTab({ projects }) {
  const [settings, setSettings] = useState(() => {
    try {
      return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }
    } catch {
      return defaultSettings
    }
  })

  const [extras, setExtras] = useState({})
  const [selected, setSelected] = useState({})
  const [expanded, setExpanded] = useState({})
  const [status, setStatus] = useState('')

  // ── Derived filter options from real project data ──────────────────────────
  const availableAvenues = [...new Set(
    projects.map(p => p.avenue).filter(Boolean)
  )].sort()

  // Extract months from project_date fields (format: YYYY-MM-DD)
  const availableMonths = (() => {
    const fromProjects = new Set()
    projects.forEach(p => {
      if (p.project_date) {
        const d = new Date(p.project_date)
        if (!isNaN(d)) {
          fromProjects.add(d.toLocaleString('default', { month: 'long' }))
        }
      }
    })
    // Return RY_MONTHS order, only ones that have projects
    return RY_MONTHS.filter(m => fromProjects.has(m))
  })()

  // ── Filtered projects (based on selected avenue + month) ──────────────────
  const filteredProjects = projects.filter(p => {
    const avenueMatch = !settings.avenueTitle || p.avenue === settings.avenueTitle
    if (!avenueMatch) return false
    if (!settings.monthLabel) return true
    if (!p.project_date) return false
    const d = new Date(p.project_date)
    if (isNaN(d)) return false
    return d.toLocaleString('default', { month: 'long' }) === settings.monthLabel
  })

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    setExtras(prev => {
      const next = { ...prev }
      projects.forEach(p => {
        if (!next[p.id]) {
          next[p.id] = {
            banner: '',
            hostClubs: 'Rotaract Club of Karpagam Academy of Higher Education',
            secretary: '',
            proposedBudget: '',
            actualBudget: '',
            beneficiaries: '0',
            rotaractors: '0',
            rotarians: '0',
            dcMembers: '0',
            otherClubRotaractors: '0',
            otherBeneficiaries: '0',
            about: '',
            description: '',
            impact: '',
            poster: null,
            photos: [],
          }
        }
      })
      return next
    })
  }, [projects])

  function updateSetting(key, val) {
    setSettings(prev => ({ ...prev, [key]: val }))
  }

  function updateExtra(projectId, key, val) {
    setExtras(prev => ({
      ...prev,
      [projectId]: { ...prev[projectId], [key]: val }
    }))
  }

  function toggleSelected(id) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleExpanded(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function selectAll() {
    const all = {}
    projects.forEach(p => { all[p.id] = true })
    setSelected(all)
  }

  function selectNone() {
    setSelected({})
  }



  async function handleGenerate() {
    const reportProjects = projects.filter(p => selected[p.id])
    if (reportProjects.length === 0) {
      alert('Select at least one project to include in the report.')
      return
    }
    if (!window.jspdf) {
      alert('PDF library not loaded. Please refresh the page.')
      return
    }

    setStatus('Generating PDF…')
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    // Merge hardcoded club constants with user-selected avenue + month
    const s = { ...CLUB_CONST, ...settings }

    // ── Design constants ──────────────────────────────────────────────────────
    const NAVY       = [16, 25, 58]
    const NAVY_LIGHT = [28, 43, 92]
    const WHITE      = [255, 255, 255]
    const INK        = [26, 26, 26]
    const MUTED      = [100, 100, 100]
    const ACCENT     = [201, 24, 74]

    const PW = 210   // page width
    const PH = 297   // page height
    const ML = 18    // margin left
    const MR = 192   // margin right (210 - 18)
    const CW = MR - ML  // content width

    function fitImage(w, h, maxW, maxH) {
      const ratio = Math.min(maxW / w, maxH / h)
      return { w: w * ratio, h: h * ratio }
    }

    // ── Header: navy bar (18mm) + club info below it ──────────────────────────
    // Returns the Y position where content should start
    function drawPageHeader(projectTitle) {
      // Navy top bar
      doc.setFillColor(...NAVY)
      doc.rect(0, 0, PW, 18, 'F')

      // Thin accent line under bar
      doc.setFillColor(...ACCENT)
      doc.rect(0, 18, PW, 0.6, 'F')

      // Club name inside the navy bar (white text, centered vertically in 18mm)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...WHITE)
      const clubUpper = (s.clubName || '').toUpperCase()
      doc.text(clubUpper, PW / 2, 9, { align: 'center', maxWidth: 180 })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.text('PARENTED BY ' + (s.parentedBy || '').toUpperCase(), PW / 2, 14, { align: 'center' })

      // Info row just below bar (dark background strip)
      doc.setFillColor(240, 240, 240)
      doc.rect(0, 18.6, PW, 6, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...MUTED)
      doc.text(
        `CLUB ID: ${s.clubId || '—'}   |   GROUP ${s.group || '—'}   |   RI DISTRICT ${s.district || '—'}   |   ZONE ${s.zone || '—'}`,
        PW / 2, 22.5, { align: 'center' }
      )

      let contentY = 32

      // Project title banner (if provided)
      if (projectTitle) {
        doc.setFillColor(...NAVY_LIGHT)
        doc.rect(ML, 27, CW, 9, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...WHITE)
        const titleText = projectTitle.toUpperCase()
        doc.text(titleText, PW / 2, 33, { align: 'center', maxWidth: CW - 6 })
        contentY = 42
      }

      doc.setTextColor(...INK)
      return contentY
    }

    // ── Footer: line + page number ────────────────────────────────────────────
    function drawPageFooter(leftText) {
      doc.setDrawColor(...NAVY)
      doc.setLineWidth(0.5)
      doc.line(ML, 283, MR, 283)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...MUTED)
      if (leftText) {
        doc.text(leftText, ML, 288)
      }
      // Rotaract watermark right side
      doc.text('ROTARACT KAHE — RY 2026–27', MR, 288, { align: 'right' })
    }

    // ── Section heading (bold, underlined) ────────────────────────────────────
    function drawSectionHeading(text, y) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...NAVY)
      doc.text(text.toUpperCase(), ML, y)
      doc.setDrawColor(...ACCENT)
      doc.setLineWidth(0.4)
      doc.line(ML, y + 1, ML + doc.getTextWidth(text.toUpperCase()), y + 1)
      doc.setTextColor(...INK)
      return y + 6
    }

    // ── Key-value row (left-aligned, alternating light bg) ────────────────────
    function drawInfoTable(rows, startY) {
      let y = startY
      rows.forEach(([label, value], idx) => {
        const rowH = 7
        // Alternating row background
        if (idx % 2 === 0) {
          doc.setFillColor(247, 247, 250)
          doc.rect(ML, y - 5, CW, rowH, 'F')
        }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...MUTED)
        doc.text(label, ML + 2, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...INK)
        const valText = doc.splitTextToSize(String(value || '—'), CW - 60)
        doc.text(valText, ML + 58, y)
        y += rowH * valText.length
      })
      return y + 2
    }

    // ── Attendance table (compact grid) ──────────────────────────────────────
    function drawAttendanceTable(ex, startY) {
      const cols = [
        ['Rotaractors', ex.rotaractors || '0'],
        ['Rotarians', ex.rotarians || '0'],
        ['District Council', ex.dcMembers || '0'],
        ['Other Clubs', ex.otherClubRotaractors || '0'],
        ['Other Beneficiaries', ex.otherBeneficiaries || '0'],
      ]
      const colW = CW / cols.length
      let y = startY

      // Header row
      doc.setFillColor(...NAVY)
      doc.rect(ML, y - 5, CW, 7, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...WHITE)
      cols.forEach(([lbl], i) => {
        doc.text(lbl, ML + i * colW + colW / 2, y - 0.5, { align: 'center', maxWidth: colW - 2 })
      })

      // Value row
      y += 7
      doc.setFillColor(240, 242, 250)
      doc.rect(ML, y - 5, CW, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...NAVY)
      cols.forEach(([, val], i) => {
        doc.text(String(val), ML + i * colW + colW / 2, y + 1, { align: 'center' })
      })

      doc.setTextColor(...INK)
      return y + 8
    }

    // ── Narrative block ───────────────────────────────────────────────────────
    function drawNarrativeBlock(heading, body, startY) {
      let y = startY
      y = drawSectionHeading(heading, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(40, 40, 40)
      const lines = doc.splitTextToSize(body || '—', CW)
      doc.text(lines, ML, y)
      y += lines.length * 4.8 + 8
      doc.setTextColor(...INK)
      return y
    }

    // ════════════════════════════════════════════════════════════════════════
    // COVER PAGE
    // ════════════════════════════════════════════════════════════════════════
    // Full navy top block
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, PW, 60, 'F')

    // Accent line
    doc.setFillColor(...ACCENT)
    doc.rect(0, 60, PW, 1.5, 'F')

    // Club name (white, in top block)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...WHITE)
    const clubLines = doc.splitTextToSize((s.clubName || '').toUpperCase(), 160)
    let clubY = 28
    clubLines.forEach(line => {
      doc.text(line, PW / 2, clubY, { align: 'center' })
      clubY += 7
    })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(185, 192, 214)
    doc.text('PARENTED BY ' + (s.parentedBy || '').toUpperCase(), PW / 2, clubY + 2, { align: 'center' })

    doc.setFontSize(7.5)
    doc.setTextColor(140, 155, 185)
    doc.text(
      `CLUB ID: ${s.clubId || '—'}   |   GROUP ${s.group || '—'}   |   RI DISTRICT ${s.district || '—'}   |   ZONE ${s.zone || '—'}`,
      PW / 2, clubY + 9, { align: 'center' }
    )

    // Center content area
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(13)
    doc.text('Monthly Project Report', PW / 2, 100, { align: 'center' })

    // Thin decorative line
    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(0.6)
    doc.line(PW / 2 - 30, 104, PW / 2 + 30, 104)

    // Avenue / service area (big bold)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(26)
    doc.setTextColor(...NAVY)
    const avLines = doc.splitTextToSize((s.avenueTitle || 'SERVICE').toUpperCase(), 170)
    let avY = 130
    avLines.forEach(line => {
      doc.text(line, PW / 2, avY, { align: 'center' })
      avY += 14
    })

    // Decorative divider
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.4)
    doc.line(ML + 20, avY + 6, MR - 20, avY + 6)

    // Month label
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(60, 60, 60)
    doc.text('ACTIVITIES OF ' + (s.monthLabel || '').toUpperCase(), PW / 2, avY + 18, { align: 'center' })

    // Project count badge
    doc.setFillColor(...NAVY)
    doc.roundedRect(PW / 2 - 30, avY + 24, 60, 10, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...WHITE)
    doc.text(
      `${reportProjects.length} PROJECT${reportProjects.length > 1 ? 'S' : ''} COMPLETED`,
      PW / 2, avY + 30.5, { align: 'center' }
    )

    // Bottom navy bar
    doc.setFillColor(...NAVY)
    doc.rect(0, PH - 20, PW, 20, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...WHITE)
    doc.text('ROTARACT KAHE — RY 2026–27', PW / 2, PH - 9, { align: 'center' })

    // ════════════════════════════════════════════════════════════════════════
    // PER-PROJECT PAGES
    // ════════════════════════════════════════════════════════════════════════
    for (const p of reportProjects) {
      const ex = extras[p.id] || {}
      const chairName = getMemberName(p.chair_id)
      const projectTitle = ex.banner || p.name || 'Project'

      // ── PAGE 1: Project Details ──────────────────────────────────────────
      doc.addPage()
      let y = drawPageHeader(projectTitle)

      y = drawSectionHeading('Project Information', y)

      y = drawInfoTable([
        ['Name of Project', p.name],
        ['Date', p.project_date || ''],
        ['Venue', ex.venue || p.venue || ''],
        ['Host Club(s)', ex.hostClubs],
        ['Avenue of Service', p.avenue || ''],
        ['Event Chairperson', chairName || ''],
        ['Event Secretary', ex.secretary || ''],
      ], y)

      y += 2
      y = drawSectionHeading('Budget', y)
      y = drawInfoTable([
        ['Proposed Budget (Rs.)', ex.proposedBudget || ''],
        ['Actual Budget (Rs.)', ex.actualBudget || ''],
        ['Total Beneficiaries', ex.beneficiaries || ''],
      ], y)

      y += 4
      y = drawSectionHeading('Attendance Breakdown', y)
      y = drawAttendanceTable(ex, y + 4)

      drawPageFooter(projectTitle)

      // ── PAGE 2: Narrative ────────────────────────────────────────────────
      doc.addPage()
      y = drawPageHeader(null)

      y = drawNarrativeBlock('About This Event', ex.about, y)
      y = drawNarrativeBlock('Event Description', ex.description || p.description || '', y)
      y = drawNarrativeBlock('Impact of Event', ex.impact, y)

      drawPageFooter(projectTitle)

      // ── PAGE 3: Poster ───────────────────────────────────────────────────
      doc.addPage()
      y = drawPageHeader(null)

      y = drawSectionHeading('Event Poster', y)

      if (ex.poster) {
        const fmt = ex.poster.dataUrl.includes('image/png') ? 'PNG' : 'JPEG'
        const maxH = 280 - y - 16
        const dims = fitImage(ex.poster.w, ex.poster.h, CW, maxH)
        doc.addImage(ex.poster.dataUrl, fmt, ML + (CW - dims.w) / 2, y + 2, dims.w, dims.h)
      } else {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(...MUTED)
        doc.text('(no poster uploaded)', PW / 2, y + 30, { align: 'center' })
        doc.setTextColor(...INK)
      }

      drawPageFooter(projectTitle)

      // ── PAGE 4: Photos ───────────────────────────────────────────────────
      doc.addPage()
      y = drawPageHeader(null)

      y = drawSectionHeading('Event Photos', y)

      if (ex.photos && ex.photos.length) {
        const n = ex.photos.length
        const areaTop = y + 2
        const areaBot = 280
        const areaH = areaBot - areaTop

        if (n === 1) {
          const ph = ex.photos[0]
          const fmt = ph.dataUrl.includes('image/png') ? 'PNG' : 'JPEG'
          const dims = fitImage(ph.w, ph.h, CW, areaH)
          doc.addImage(ph.dataUrl, fmt, ML + (CW - dims.w) / 2, areaTop, dims.w, dims.h)
        } else {
          const cols = 2
          const rows = Math.ceil(n / cols)
          const gap = 4
          const cellW = (CW - gap * (cols - 1)) / cols
          const cellH = (areaH - gap * (rows - 1)) / rows
          ex.photos.slice(0, 4).forEach((ph, i) => {
            const col = i % cols
            const row = Math.floor(i / cols)
            const cx = ML + col * (cellW + gap)
            const cy = areaTop + row * (cellH + gap)
            const fmt = ph.dataUrl.includes('image/png') ? 'PNG' : 'JPEG'
            const dims = fitImage(ph.w, ph.h, cellW, cellH)
            doc.addImage(ph.dataUrl, fmt, cx + (cellW - dims.w) / 2, cy + (cellH - dims.h) / 2, dims.w, dims.h)
          })
        }
      } else {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(...MUTED)
        doc.text('(no photos uploaded)', PW / 2, y + 30, { align: 'center' })
        doc.setTextColor(...INK)
      }

      drawPageFooter(projectTitle)
    }

    doc.save(`Monthly-Project-Report-${s.monthLabel || 'draft'}.pdf`)

    setStatus('PDF generated successfully.')
  }

  const selectedCount = Object.values(selected).filter(Boolean).length

  return (
    <div className="report-tab">
      {/* Filter bar */}
      <div className="report-filter-bar">
        <div className="report-filter-group">
          <label className="report-filter-label">Avenue of Service</label>
          <select
            className="report-filter-select"
            value={settings.avenueTitle}
            onChange={e => {
              updateSetting('avenueTitle', e.target.value)
              setSelected({})
            }}
          >
            <option value="">All Avenues</option>
            {availableAvenues.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="report-filter-group">
          <label className="report-filter-label">Month / Period</label>
          <select
            className="report-filter-select"
            value={settings.monthLabel}
            onChange={e => {
              updateSetting('monthLabel', e.target.value)
              setSelected({})
            }}
          >
            <option value="">All Months</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="report-filter-count">
          {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          {(settings.avenueTitle || settings.monthLabel) && (
            <button
              className="report-filter-clear"
              onClick={() => { updateSetting('avenueTitle', ''); updateSetting('monthLabel', ''); setSelected({}) }}
            >
              ✕ Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="report-section">
        <div className="report-section-header">
          <h2 className="report-section-title" style={{ margin: 0 }}>Projects</h2>
          <div className="report-actions-row">
            <button className="report-btn secondary" onClick={() => {
              const all = {}
              filteredProjects.forEach(p => { all[p.id] = true })
              setSelected(all)
            }}>Select all</button>
            <button className="report-btn secondary" onClick={selectNone}>Clear</button>
          </div>
        </div>
        <p className="report-hint">
          Check the projects to include in the PDF. Fields marked <span className="auto-badge">auto</span> are pulled from the database.
        </p>

        {filteredProjects.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>No projects match the selected filters.</p>
        ) : (
          filteredProjects.map(p => {
            const ex = extras[p.id] || {}
            const chairName = getMemberName(p.chair_id)
            const isOpen = expanded[p.id]
            const isChecked = !!selected[p.id]

            return (
              <div key={p.id} className={`report-project-card ${isChecked ? 'checked' : ''}`}>
                <div className="report-project-head" onClick={() => toggleExpanded(p.id)}>
                  <div className="report-project-head-left">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelected(p.id)}
                      onClick={e => e.stopPropagation()}
                      className="report-checkbox"
                    />
                    <div>
                      <div className="report-project-name">{p.name || 'Untitled Project'}</div>
                      <div className="report-project-meta">
                        {p.avenue && <span className="report-project-avenue">{p.avenue}</span>}
                        {p.project_date && <span>📅 {p.project_date}</span>}
                        {chairName && <span>👤 {chairName}</span>}
                        <span className={`report-status-badge report-status-${p.status}`}>{p.status}</span>
                      </div>
                    </div>
                  </div>
                  <span className="report-chevron">{isOpen ? '▲' : '▾'}</span>
                </div>

                {isOpen && (
                  <div className="report-project-body">
                    {/* Auto-filled read-only info */}
                    <div className="report-auto-row">
                      {[
                        ['Project Name', p.name],
                        ['Date', p.project_date],
                        ['Avenue', p.avenue],
                        ['Event Chairperson', chairName],
                      ].map(([lbl, val]) => (
                        <div key={lbl} className="report-auto-field">
                          <span className="auto-badge">auto</span>
                          <label>{lbl}</label>
                          <div className="report-auto-value">{val || '—'}</div>
                        </div>
                      ))}
                    </div>

                    <div className="report-grid" style={{ marginTop: '16px' }}>
                      <div className="report-field full">
                        <label>Banner label <span className="report-hint-inline">(page header — leave blank to use project name)</span></label>
                        <input type="text" value={ex.banner || ''} onChange={e => updateExtra(p.id, 'banner', e.target.value)} />
                      </div>
                      <div className="report-field full">
                        <label>Venue</label>
                        <input type="text" value={ex.venue !== undefined ? ex.venue : (p.venue || '')} onChange={e => updateExtra(p.id, 'venue', e.target.value)} />
                      </div>
                      <div className="report-field full">
                        <label>Host Club(s)</label>
                        <input type="text" value={ex.hostClubs || ''} onChange={e => updateExtra(p.id, 'hostClubs', e.target.value)} />
                      </div>
                      <div className="report-field">
                        <label>Event Secretary</label>
                        <input type="text" value={ex.secretary || ''} onChange={e => updateExtra(p.id, 'secretary', e.target.value)} />
                      </div>
                      <div className="report-field">
                        <label>Total Beneficiaries</label>
                        <input type="text" value={ex.beneficiaries || ''} onChange={e => updateExtra(p.id, 'beneficiaries', e.target.value)} />
                      </div>
                      <div className="report-field">
                        <label>Proposed Budget (Rs.)</label>
                        <input type="text" value={ex.proposedBudget || ''} onChange={e => updateExtra(p.id, 'proposedBudget', e.target.value)} />
                      </div>
                      <div className="report-field">
                        <label>Actual Budget (Rs.)</label>
                        <input type="text" value={ex.actualBudget || ''} onChange={e => updateExtra(p.id, 'actualBudget', e.target.value)} />
                      </div>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                      <label className="report-section-sublabel">Attendance Breakdown</label>
                      <div className="report-attendance-grid">
                        {[
                          ['rotaractors', 'Rotaractors'],
                          ['rotarians', 'Rotarians'],
                          ['dcMembers', 'District Council'],
                          ['otherClubRotaractors', 'Other Clubs'],
                          ['otherBeneficiaries', 'Other Beneficiaries'],
                        ].map(([key, lbl]) => (
                          <div key={key} className="report-field">
                            <label>{lbl}</label>
                            <input type="number" min="0" value={ex[key] || '0'} onChange={e => updateExtra(p.id, key, e.target.value)} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="report-grid" style={{ marginTop: '16px' }}>
                      <div className="report-field full">
                        <label>About this event</label>
                        <textarea rows={3} value={ex.about || ''} onChange={e => updateExtra(p.id, 'about', e.target.value)} />
                      </div>
                      <div className="report-field full">
                        <label>Event description <span className="auto-badge" style={{ marginLeft: '6px' }}>from notes if blank</span></label>
                        <textarea rows={3} placeholder={p.description || ''} value={ex.description || ''} onChange={e => updateExtra(p.id, 'description', e.target.value)} />
                      </div>
                      <div className="report-field full">
                        <label>Impact of event</label>
                        <textarea rows={3} value={ex.impact || ''} onChange={e => updateExtra(p.id, 'impact', e.target.value)} />
                      </div>
                    </div>

                    <div className="report-grid" style={{ marginTop: '16px' }}>
                      <div className="report-field full">
                        <label>Event Poster (1 image)</label>
                        <input type="file" accept="image/*" className="report-file-input"
                          onChange={async e => {
                            if (e.target.files[0]) {
                              const meta = await loadImageMeta(e.target.files[0])
                              updateExtra(p.id, 'poster', meta)
                            }
                          }}
                        />
                        {ex.poster && (
                          <div className="report-thumbs">
                            <img src={ex.poster.dataUrl} alt="poster" />
                            <button className="report-remove-img" onClick={() => updateExtra(p.id, 'poster', null)}>✕ Remove</button>
                          </div>
                        )}
                      </div>
                      <div className="report-field full">
                        <label>Event Photos (up to 4)</label>
                        <input type="file" accept="image/*" multiple className="report-file-input"
                          onChange={async e => {
                            const files = Array.from(e.target.files).slice(0, 4)
                            const metas = await Promise.all(files.map(loadImageMeta))
                            updateExtra(p.id, 'photos', metas)
                          }}
                        />
                        {ex.photos && ex.photos.length > 0 && (
                          <div className="report-thumbs">
                            {ex.photos.map((ph, i) => <img key={i} src={ph.dataUrl} alt={`photo-${i}`} />)}
                            <button className="report-remove-img" onClick={() => updateExtra(p.id, 'photos', [])}>✕ Clear all</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="report-footer-bar">
        <span className="report-status">{status}</span>
        <span className="report-selected-count">{selectedCount} project{selectedCount !== 1 ? 's' : ''} selected</span>
        <button className="report-btn generate" onClick={handleGenerate} disabled={selectedCount === 0}>
          📄 Generate PDF
        </button>
      </div>
    </div>
  )
}
