// All 29 members — Rotaract KAHE RY 2026-27
// tier: 'board' = named board member | 'committee' = advisory/executive committee

export const MEMBERS = [
  // ── Secretariat ────────────────────────────────────────────────────────────
  { id: 1,  name: 'Safwaan Shaikh',       role: 'President',              group: 'Secretariat',             tier: 'board' },
  { id: 2,  name: 'Bharani Krishna',      role: 'Secretary',              group: 'Secretariat',             tier: 'board' },
  { id: 5,  name: 'Karthick Chandrasekar',role: 'Immediate Past President', group: 'Secretariat',          tier: 'board' },
  { id: 3,  name: 'Rineesha A',           role: 'Joint Secretary',        group: 'Secretariat',             tier: 'board' },
  { id: 4,  name: 'Giri S',               role: 'Vice President',         group: 'Secretariat',             tier: 'board' },
  { id: 6,  name: 'Vishnu Prasath',       role: "President's Special Aide & Membership Chair", group: 'Secretariat', tier: 'board' },

  // ── Special Portfolios ─────────────────────────────────────────────────────
  { id: 7,  name: 'Roshitha B',           role: 'Treasurer',              group: 'Special Portfolios',      tier: 'board' },
  { id: 8,  name: 'L Mohammed Sajad',     role: 'Sergeant-at-Arms',       group: 'Special Portfolios',      tier: 'board' },
  { id: 9,  name: 'S. Shahinthaneem',     role: 'Chair – All Avenues',    group: 'Special Portfolios',      tier: 'board' },

  // ── Club Service ───────────────────────────────────────────────────────────
  { id: 11, name: 'Sudeep K',             role: 'Chair – Club Service',   group: 'Club Service',            tier: 'board' },
  { id: 12, name: 'Akshita',              role: 'Director – Club Service',group: 'Club Service',            tier: 'board' },

  // ── Community Service ──────────────────────────────────────────────────────
  { id: 16, name: 'Akhash Ram N',         role: 'Chair – Community Service', group: 'Community Service',       tier: 'board' },
  { id: 14, name: 'Assmitha B',           role: 'Director – Community Service', group: 'Community Service',    tier: 'board' },

  // ── International Service ──────────────────────────────────────────────────
  { id: 20, name: 'Mohamed Jamseeth',     role: 'Chair – International Service', group: 'International Service',   tier: 'board' },
  { id: 21, name: 'Ann Thomas',           role: 'Director – International Service', group: 'International Service', tier: 'board' },

  // ── Professional Development ───────────────────────────────────────────────
  { id: 24, name: 'Anu Lakshmi S',        role: 'Chair – Professional Development', group: 'Professional Development', tier: 'board' },
  { id: 17, name: 'Meenakshi K',          role: 'Director – Professional Service', group: 'Professional Development', tier: 'board' },

  // ── District Priority Projects & Media ─────────────────────────────────────
  { id: 10, name: 'Vishal',               role: 'Chair – District Priority Project', group: 'District Priority Projects', tier: 'board' },
  { id: 28, name: 'Kiruthik M N',         role: 'Director – District Priority Projects', group: 'District Priority Projects', tier: 'board' },
  { id: 27, name: 'V Aakash',             role: 'Chair – Social Media & Editor', group: 'Media & PR', tier: 'board' },
  { id: 29, name: 'Deepak',               role: 'Chair – Web Service', group: 'Media & PR', tier: 'board' },
  { id: 30, name: 'Yokesh B R',           role: 'Chair – Public Relations', group: 'Media & PR', tier: 'board' },

  // ── Blood Donor Wing ───────────────────────────────────────────────────────
  { id: 34, name: 'Vikash',               role: 'Chair – Blood Donar Wing & RLF', group: 'Blood Donor Wing', tier: 'board' },

  // ── Committee Members ──────────────────────────────────────────────────────
  { id: 22, name: 'Preethi K',            role: 'Advisory Committee',     group: 'Committee', tier: 'committee' },
  { id: 26, name: 'Dharshini S',          role: 'Advisory Committee',     group: 'Committee', tier: 'committee' },
  { id: 31, name: 'Nishanth P',           role: 'Advisory Committee',     group: 'Committee', tier: 'committee' },
  { id: 33, name: 'Gowtham',              role: 'Advisory Committee',     group: 'Committee', tier: 'committee' },
  { id: 25, name: 'K. Niranjana',         role: 'Executive Committee',    group: 'Committee', tier: 'committee' },
  { id: 35, name: 'Udit',                 role: 'Executive Committee',    group: 'Committee', tier: 'committee' },
]

export const COLOR_PALETTE = [
  { bg: '#E6F1FB', fg: '#0C447C' }, // blue
  { bg: '#E1F5EE', fg: '#085041' }, // teal
  { bg: '#FAECE7', fg: '#712B13' }, // coral
  { bg: '#FBEAF0', fg: '#72243E' }, // pink
  { bg: '#EAF3DE', fg: '#27500A' }, // green
  { bg: '#FAEEDA', fg: '#633806' }, // amber
  { bg: '#EEEDFE', fg: '#3C3489' }, // purple
  { bg: '#FCEBEB', fg: '#791F1F' }, // red
  { bg: '#F1EFE8', fg: '#444441' }, // gray
]

export function colorFor(id) {
  return COLOR_PALETTE[id % COLOR_PALETTE.length]
}

export function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

export function shortName(name) {
  return name.split(' ').slice(0, 2).join(' ')
}
