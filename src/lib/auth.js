import { supabase } from './supabase'

const MASTER_PASSWORD = 'rotaract2627'
const USER_STORAGE_KEY = 'rotaract_current_user'

/**
 * Generate default PIN from member's name:
 * First 3 alphabetical letters (lowercase) + '123'
 * E.g., "Safwaan Shaikh" -> "saf123", "L Mohammed Sajad" -> "lmo123"
 */
export function getDefaultPin(name) {
  if (!name) return '2627'
  const lettersOnly = name.replace(/[^a-zA-Z]/g, '').toLowerCase()
  const prefix = lettersOnly.slice(0, 3)
  return (prefix.length >= 3 ? prefix : name.slice(0, 3).toLowerCase()) + '123'
}

/**
 * Verify member's PIN against Supabase or fallback algorithm
 */
export async function verifyMemberPin(member, inputPin) {
  if (!member || !inputPin) return { success: false, message: 'Please select a member and enter a PIN.' }

  const trimmed = inputPin.trim()
  const defaultPin = getDefaultPin(member.name)

  // Master password override
  if (trimmed === MASTER_PASSWORD) {
    return { success: true, member: { ...member, is_admin: true } }
  }

  try {
    const { data, error } = await supabase
      .from('member_accounts')
      .select('*')
      .eq('member_id', member.id)
      .maybeSingle()

    if (!error && data) {
      // User has an explicit entry in Supabase
      if (data.pin_code === trimmed || data.pin_code.toLowerCase() === trimmed.toLowerCase()) {
        return { success: true, member: { ...member, is_admin: !!data.is_admin } }
      }
      return { success: false, message: 'Incorrect PIN. Try again or ask your President.' }
    }
  } catch (err) {
    console.warn('Could not query member_accounts from Supabase, using fallback verification:', err)
  }

  // Fallback if table does not exist or network failed: check default PIN
  const validPins = [defaultPin.toLowerCase(), '2627']
  if (member.id === 1) validPins.push('saf123', 'moh123')
  if (member.id === 35) validPins.push('udi123', 'aud123')
  if (member.id === 8) validPins.push('lmo123', 'moh123')
  if (member.id === 9) validPins.push('sha123', 'ssh123')

  if (validPins.includes(trimmed.toLowerCase())) {
    return {
      success: true,
      member: { ...member, is_admin: member.id === 1 || member.id === 2 }
    }
  }

  return { success: false, message: 'Incorrect PIN. Default is first 3 letters of your name + 123 (e.g. ' + defaultPin + ')' }
}

/**
 * Update member's PIN in Supabase
 */
export async function updateMemberPin(memberId, oldPin, newPin, memberName) {
  if (!newPin || newPin.trim().length < 4) {
    return { success: false, message: 'New PIN must be at least 4 characters long.' }
  }

  // Verify old pin first
  const { success, message } = await verifyMemberPin({ id: memberId, name: memberName }, oldPin)
  if (!success) {
    return { success: false, message: 'Current PIN is incorrect.' }
  }

  try {
    const { error } = await supabase
      .from('member_accounts')
      .upsert({
        member_id: memberId,
        pin_code: newPin.trim(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'member_id' })

    if (error) {
      return { success: false, message: 'Database error: ' + error.message }
    }

    return { success: true, message: 'PIN updated successfully!' }
  } catch (err) {
    return { success: false, message: 'Failed to update PIN: ' + err.message }
  }
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY) || sessionStorage.getItem(USER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(USER_STORAGE_KEY)
    sessionStorage.removeItem(USER_STORAGE_KEY)
  } else {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    sessionStorage.setItem('rotaract_auth', '1')
  }
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_STORAGE_KEY)
  sessionStorage.removeItem(USER_STORAGE_KEY)
  sessionStorage.removeItem('rotaract_auth')
}
