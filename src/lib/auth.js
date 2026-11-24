import { supabase, supabaseConfigError } from './supabase'
import { MEMBERS } from './members'

const LEGACY_STORAGE_KEYS = [
  'rotaract_current_user',
  'rotaract_auth',
  'rotaract_blood_donations',
]

/**
 * Remove legacy client-side auth flags and sensitive local data caches.
 */
export function clearLegacyAuthArtifacts() {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
}

function formatAuthError(error, fallback = 'Authentication failed. Please try again.') {
  const msg = error?.message || ''
  if (!msg) return fallback
  if (msg.toLowerCase().includes('invalid login credentials')) {
    return 'Invalid email or password.'
  }
  if (msg.toLowerCase().includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.'
  }
  return msg
}

/**
 * Retrieve the active Supabase Auth session.
 */
export async function getSession() {
  if (!supabase) {
    return { session: null, error: new Error(supabaseConfigError || 'Supabase is not configured.') }
  }
  const { data, error } = await supabase.auth.getSession()
  return { session: data?.session ?? null, error }
}

/**
 * Subscribe to Supabase Auth state changes.
 */
export function onAuthStateChange(callback) {
  if (!supabase) {
    return { data: { subscription: { unsubscribe() {} } } }
  }
  return supabase.auth.onAuthStateChange(callback)
}

/**
 * Sign in a board member with email and password via Supabase Auth.
 */
export async function signInWithEmail(email, password) {
  if (!supabase) {
    return { success: false, message: supabaseConfigError || 'Supabase is not configured.' }
  }
  const trimmedEmail = (email || '').trim()
  if (!trimmedEmail || !password) {
    return { success: false, message: 'Please enter both your email address and password.' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  })

  if (error) {
    return { success: false, message: formatAuthError(error) }
  }

  return { success: true, session: data.session, user: data.user }
}

/**
 * Request a Supabase password reset email.
 */
export async function sendPasswordReset(email) {
  if (!supabase) {
    return { success: false, message: supabaseConfigError || 'Supabase is not configured.' }
  }
  const trimmedEmail = (email || '').trim()
  if (!trimmedEmail) {
    return { success: false, message: 'Please enter your email address.' }
  }

  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
  const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo })
  if (error) {
    return { success: false, message: formatAuthError(error, 'Could not send password reset email.') }
  }

  return {
    success: true,
    message: 'If an account matches that email, a password reset link has been sent.',
  }
}

/**
 * Update password after verifying the user's current password.
 */
export async function updateAccountPassword(email, currentPassword, newPassword) {
  if (!supabase) {
    return { success: false, message: supabaseConfigError || 'Supabase is not configured.' }
  }
  if (!email) {
    return { success: false, message: 'No authenticated email found for this session.' }
  }
  if (!currentPassword) {
    return { success: false, message: 'Please enter your current password.' }
  }
  if (!newPassword || newPassword.length < 8) {
    return { success: false, message: 'New password must be at least 8 characters long.' }
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (reauthError) {
    return { success: false, message: 'Current password is incorrect.' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    return { success: false, message: formatAuthError(error, 'Failed to update password.') }
  }

  return { success: true, message: 'Password updated successfully!' }
}

/**
 * Set a new password during a Supabase PASSWORD_RECOVERY session.
 */
export async function completePasswordRecovery(newPassword) {
  if (!supabase) {
    return { success: false, message: supabaseConfigError || 'Supabase is not configured.' }
  }
  if (!newPassword || newPassword.length < 8) {
    return { success: false, message: 'New password must be at least 8 characters long.' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    return { success: false, message: formatAuthError(error, 'Failed to reset password.') }
  }

  return { success: true, message: 'Password updated successfully!' }
}

/**
 * Sign out from Supabase Auth and purge local sensitive caches.
 */
export async function signOut() {
  clearLegacyAuthArtifacts()
  if (!supabase) {
    return { error: null }
  }
  return supabase.auth.signOut()
}

/**
 * Resolve the authenticated Supabase user to an authorized active board member profile.
 * Fails closed if the user is not linked to an active row in public.board_members.
 */
export async function resolveMemberProfile(authUser) {
  if (!supabase || !authUser?.id) {
    return {
      authorized: false,
      member: null,
      reason: 'unauthenticated',
      message: 'Authentication required.',
    }
  }

  const { data, error } = await supabase.rpc('claim_board_member_profile')

  if (error) {
    const isSetupMissing =
      error.code === 'PGRST202' ||
      error.code === '42883' ||
      error.code === '42P01' ||
      error.code === 'PGRST205'

    return {
      authorized: false,
      member: null,
      reason: isSetupMissing ? 'setup_required' : 'error',
      message: isSetupMissing
        ? 'Supabase database authorization is not configured yet. Run supabase-auth-rls-migration.sql in the Supabase SQL Editor.'
        : (error.message || 'Could not verify board membership.'),
    }
  }

  const profile = Array.isArray(data) ? data[0] : data
  if (!profile || !profile.is_active) {
    return {
      authorized: false,
      member: null,
      reason: 'not_board_member',
      message: 'Your account is signed in, but is not linked to an active Rotaract KAHE board member profile. Contact your President or Secretary.',
    }
  }

  const baseMember = MEMBERS.find(m => m.id === profile.member_id)

  return {
    authorized: true,
    member: {
      id: profile.member_id,
      name: profile.full_name || baseMember?.name || authUser.email,
      role: profile.role || baseMember?.role || 'Board Member',
      group: profile.member_group || baseMember?.group || 'Board',
      tier: baseMember?.tier || 'board',
      is_admin: Boolean(profile.is_admin),
      email: authUser.email,
      authUserId: authUser.id,
    },
  }
}
