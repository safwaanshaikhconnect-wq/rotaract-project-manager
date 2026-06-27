// All 33 members — Rotaract KAHE RY 2026-27
// tier: 'board' = named board member | 'committee' = advisory/executive committee

export const MEMBERS = [
  // ── Secretariat ────────────────────────────────────────────────────────────
  { id: 1,  name: 'Safwaan Shaikh',       role: 'President',              group: 'Secretariat',             tier: 'board' },
  { id: 2,  name: 'Bharani Krishna',      role: 'Secretary',              group: 'Secretariat',             tier: 'board' },
  { id: 3,  name: 'Rineesha A',           role: 'Joint Secretary',        group: 'Secretariat',             tier: 'board' },
  { id: 4,  name: 'Giri S',              role: 'Vice President',         group: 'Secretariat',             tier: 'board' },
  { id: 5,  name: 'Karthick Chandrasekar',role: 'Immediate Past President', group: 'Secretariat',          tier: 'board' },
  { id: 6,  name: 'Vishnu Prasath',       role: "President's Special",    group: 'Secretariat',             tier: 'board' },

  // ── Special Portfolios ─────────────────────────────────────────────────────
  { id: 7,  name: 'Roshitha B',           role: 'Treasurer',              group: 'Special Portfolios',      tier: 'board' },
  { id: 8,  name: 'Mohammed Sajad L',     role: 'Sergeant-at-Arms',       group: 'Special Portfolios',      tier: 'board' },
  { id: 9,  name: 'Shahinthaneem S',      role: 'Chair – All Avenues',    group: 'Special Portfolios',      tier: 'board' },
  { id: 10, name: 'Vishal',              role: 'Chair – DPP and Branding and Media', group: 'Special Portfolios', tier: 'board' },

  // ── Club Service ───────────────────────────────────────────────────────────
  { id: 11, name: 'Sudeep K',             role: 'Chair',                  group: 'Club Service',            tier: 'board' },
  { id: 12, name: 'Akshita',             role: 'Director',               group: 'Club Service',            tier: 'board' },
  { id: 13, name: 'Selvamani P',          role: 'Advisory Committee',     group: 'Club Service',            tier: 'committee' },
  { id: 14, name: 'Assmitha B',           role: 'Executive Committee',    group: 'Club Service',            tier: 'committee' },
  { id: 15, name: 'Sangeetha M',          role: 'Executive Committee',    group: 'Club Service',            tier: 'committee' },

  // ── Community Service ──────────────────────────────────────────────────────
  { id: 16, name: 'Akhash Ram N',         role: 'Chair',                  group: 'Community Service',       tier: 'board' },
  { id: 25, name: 'Niranjana K',          role: 'Director',               group: 'Community Service',       tier: 'board' },
  { id: 18, name: 'Rupavathy P',          role: 'Advisory Committee',     group: 'Community Service',       tier: 'committee' },
  { id: 19, name: 'Kavikuyil',           role: 'Executive Committee',    group: 'Community Service',       tier: 'committee' },

  // ── International Service ──────────────────────────────────────────────────
  { id: 20, name: 'Mohamed Jamsheeth',    role: 'Chair',                  group: 'International Service',   tier: 'board' },
  { id: 21, name: 'Ann Thomas',           role: 'Director',               group: 'International Service',   tier: 'board' },
  { id: 22, name: 'Preethi K',            role: 'Advisory Committee',     group: 'International Service',   tier: 'committee' },
  { id: 23, name: 'Dharani D',            role: 'Executive Committee',    group: 'International Service',   tier: 'committee' },

  // ── Professional Development ───────────────────────────────────────────────
  { id: 24, name: 'Anu Lakshmi S',        role: 'Chair',                  group: 'Professional Development', tier: 'board' },
  { id: 17, name: 'Meenakshi K',          role: 'Director',               group: 'Professional Development', tier: 'board' },
  { id: 26, name: 'Dharshini S',          role: 'Advisory Committee',     group: 'Professional Development', tier: 'committee' },
  { id: 27, name: 'V Aakash',             role: 'Executive Committee',    group: 'Professional Development', tier: 'committee' },

  // ── District Priority Projects ─────────────────────────────────────────────
  { id: 28, name: 'Kiruthik M N',         role: 'Director',               group: 'District Priority Projects', tier: 'board' },
  { id: 29, name: 'Deepak',              role: 'Director',               group: 'District Priority Projects', tier: 'board' },
  { id: 30, name: 'Yokesh B R',           role: 'Director',               group: 'District Priority Projects', tier: 'board' },
  { id: 31, name: 'Nishanth P',           role: 'Advisory Committee',     group: 'District Priority Projects', tier: 'committee' },
  { id: 32, name: 'Sreesha A',            role: 'Executive Committee',    group: 'District Priority Projects', tier: 'committee' },

  // ── Blood Donor Wing ───────────────────────────────────────────────────────
  { id: 33, name: 'Gowtham',             role: 'Advisory Committee',     group: 'Blood Donor Wing',        tier: 'committee' },
  // Note: Giri S (id:4) is also VP & In-charge of Blood Donor Wing
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
