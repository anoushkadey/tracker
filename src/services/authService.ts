import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as fbSignOut,
  onAuthStateChanged, type User, type AuthError,
} from 'firebase/auth'
import { auth, isFirebaseConfigured, db } from './firebase'
import { getById, put, getWhere } from './store'
import type { Role, UserProfile } from '../types'

const LS_USER = 'sat_current_user'

function generateApiKey(): string {
  // Generate a secure random API key using crypto.randomUUID() and additional randomness
  // Format: `sat_` prefix + UUID-like string for easy identification
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `sat_${crypto.randomUUID().replace(/-/g, '')}_${Math.random().toString(36).substr(2, 9)}`
  }
  // Fallback for environments without crypto.randomUUID
  return `sat_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 16)}`
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  role: Role,
  enrolledCourseIds: string[]
): Promise<UserProfile> {
  let uid: string
  let apiKey: string = ''

  if (isFirebaseConfigured && auth) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      uid = cred.user.uid
      apiKey = generateApiKey()
    } catch (error) {
      const authError = error as AuthError
      // Handle specific Firebase error for duplicate email
      if (authError.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please log in or use a different email.')
      }
      if (authError.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.')
      }
      if (authError.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters long.')
      }
      // Re-throw other Firebase errors with their message
      throw new Error(authError.message || 'Registration failed. Please try again.')
    }
  } else {
    // Mock mode: check for duplicate email
    uid = `local_${Date.now()}`
    apiKey = generateApiKey()
    
    // Check if email already exists in mock mode
    const existing = await getWhere<UserProfile>('users', 'email', email)
    if (existing.length > 0) {
      throw new Error('This email is already registered. Please log in or use a different email.')
    }
    
    localStorage.setItem(LS_USER, JSON.stringify({ uid, email }))
  }

  const profile: UserProfile = {
    uid,
    name,
    email,
    role,
    apiKey,
    enrolledCourseIds: role === 'student' ? enrolledCourseIds : undefined,
    assignedCourseIds: role === 'teacher' ? [] : undefined,
    createdAt: Date.now(),
  }

  try {
    await put<UserProfile & { id: string }>('users', { ...profile, id: uid })
  } catch (error) {
    // If Firestore write fails, we should clean up the auth user
    if (isFirebaseConfigured && auth) {
      try {
        await auth.currentUser?.delete()
      } catch (deleteError) {
        console.error('Failed to clean up auth user after Firestore error:', deleteError)
      }
    }
    throw new Error('Failed to create user profile. Please try again.')
  }

  return profile
}

export async function logIn(email: string, password: string): Promise<UserProfile | null> {
  if (isFirebaseConfigured && auth) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      return getById<UserProfile>('users', cred.user.uid)
    } catch (error) {
      const authError = error as AuthError
      if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found') {
        throw new Error('Invalid email or password.')
      }
      if (authError.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled.')
      }
      throw new Error(authError.message || 'Login failed. Please try again.')
    }
  }

  // Mock mode: find by email in local "users" store.
  const raw = localStorage.getItem('sat_users')
  const all: (UserProfile & { id: string })[] = raw ? JSON.parse(raw) : []
  const found = all.find((u) => u.email === email)
  if (found) localStorage.setItem(LS_USER, JSON.stringify({ uid: found.uid, email }))
  return found ?? null
}

export async function logOut(): Promise<void> {
  if (isFirebaseConfigured && auth) await fbSignOut(auth)
  localStorage.removeItem(LS_USER)
}

export function watchAuthState(cb: (uid: string | null) => void): () => void {
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, (u: User | null) => cb(u ? u.uid : null))
  }
  const raw = localStorage.getItem(LS_USER)
  const uid = raw ? JSON.parse(raw).uid : null
  // fire once, async, to mimic Firebase behavior
  setTimeout(() => cb(uid), 0)
  return () => {}
}
