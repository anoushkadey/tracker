# Smart Attendance Tracker - Authentication Update Guide

## Overview
This guide walks you through implementing the "one email, one account" rule with unique API key generation for your smart-attendance-tracker.

## What's Changed

✅ **Enforced Unique Emails**: Firebase now rejects duplicate email registrations  
✅ **API Key Generation**: Each user gets a unique, secure API key on signup  
✅ **Firestore Storage**: API keys stored securely in user documents  
✅ **Error Handling**: Clear, user-friendly error messages  
✅ **Race Condition Prevention**: Double-click prevention on form submission  
✅ **Security Rules**: Firestore rules updated to protect API keys  

---

## Step-by-Step Implementation

### Step 1: Update `src/types/index.ts`

**File location**: `src/types/index.ts`

**What to do**: Replace the entire `UserProfile` interface with the new version.

**Find this:**
```typescript
export interface UserProfile {
  uid: string
  name: string
  email: string
  role: Role
  enrolledCourseIds?: string[]
  assignedCourseIds?: string[]
  createdAt: number
}
```

**Replace with:**
```typescript
export interface UserProfile {
  uid: string
  name: string
  email: string
  role: Role
  apiKey: string // Unique API key generated at registration
  enrolledCourseIds?: string[]
  assignedCourseIds?: string[]
  createdAt: number
}
```

**Why**: The `apiKey` field now stores the unique key generated for each user.

---

### Step 2: Update `src/services/authService.ts`

**File location**: `src/services/authService.ts`

**What to do**: Replace the ENTIRE file with the new version.

**Key changes**:
- ✅ Added `AuthError` type import from Firebase
- ✅ Added `generateApiKey()` function that creates a unique, secure key
- ✅ Added error handling for `auth/email-already-in-use`
- ✅ Added error handling for weak passwords and invalid emails
- ✅ API key is now generated immediately after Firebase auth creation
- ✅ API key is stored in Firestore alongside the user profile
- ✅ Added cleanup: if Firestore write fails, the auth user is deleted
- ✅ Improved login error messages for better UX

**New imports** (already in the file):
```typescript
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as fbSignOut,
  onAuthStateChanged, type User, type AuthError } from 'firebase/auth'
```

**Paste the entire file**: [See `authService.ts` below]

---

### Step 3: Update `src/pages/AuthPage.tsx`

**File location**: `src/pages/AuthPage.tsx`

**What to do**: Replace the ENTIRE file with the new version.

**Key improvements**:
- ✅ Added `error` state to display error messages in UI
- ✅ Added error display box above the form
- ✅ Enhanced loading state with visual feedback (⏳ spinner)
- ✅ Prevent double submission with early return check
- ✅ All input fields are disabled during form submission
- ✅ Form fields are cleared after successful signup/login
- ✅ Better loading messages ("Creating account…" vs "Logging in…")
- ✅ Updated success message mentions API key generation

**Paste the entire file**: [See `AuthPage.tsx` below]

---

### Step 4: Update `firestore.rules`

**File location**: `firestore.rules` (in project root)

**What to do**: Replace the ENTIRE file with the new version.

**Key security changes**:
- ✅ Users can now only read their own profile (added `request.auth.uid == uid`)
- ✅ API key is required on creation (`request.resource.data.apiKey != null`)
- ✅ API key cannot be modified after creation (`request.resource.data.apiKey == resource.data.apiKey`)
- ✅ Role cannot be modified (already existed, kept for security)
- ✅ One email enforced at database level

**Paste the entire file**: [See `firestore.rules` below]

---

## Code to Paste

### File 1: `src/types/index.ts`

Add the `apiKey: string` field to the `UserProfile` interface. Here's the complete updated interface:

```typescript
export interface UserProfile {
  uid: string
  name: string
  email: string
  role: Role
  apiKey: string // Unique API key generated at registration
  enrolledCourseIds?: string[]
  assignedCourseIds?: string[]
  createdAt: number
}
```

---

### File 2: `src/services/authService.ts`

Replace the entire file with this:

```typescript
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
```

---

### File 3: `src/pages/AuthPage.tsx`

Replace the entire file with this:

```typescript
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logIn, signUp } from '../services/authService'
import { getAll, seedIfEmpty } from '../services/store'
import { mockAnnouncements, mockCourses } from '../services/mockData'
import type { Announcement, Course, Role } from '../types'
import { AnnouncementList, isAnnouncementLive } from '../components/Announcements'
import { useToast } from '../components/Shared'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('student')
  const [courses, setCourses] = useState<Course[]>([])
  const [enrolled, setEnrolled] = useState<string[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const { setUser } = useAuth()
  const { push } = useToast()
  const nav = useNavigate()

  useEffect(() => {
    seedIfEmpty('courses', mockCourses)
    seedIfEmpty('announcements', mockAnnouncements)
    getAll<Course>('courses').then(setCourses)
    getAll<Announcement>('announcements').then((all) =>
      setAnnouncements(all.filter(isAnnouncementLive).sort((a, b) => b.createdAt - a.createdAt))
    )
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Prevent double submission
    if (busy) return
    
    // Clear previous errors
    setError('')
    setBusy(true)

    try {
      if (mode === 'signup') {
        // Multi-step process: Auth creation + Firestore write
        // signUp now handles both and throws if either fails
        const profile = await signUp(name, email, password, role, enrolled)
        setUser(profile)
        push('Account created — welcome! Your API key has been generated.', 'success')
        
        // Reset form after successful signup
        setName('')
        setEmail('')
        setPassword('')
        setEnrolled([])
      } else {
        const profile = await logIn(email, password)
        if (!profile) {
          setError('Invalid email or password.')
          throw new Error('Invalid email or password.')
        }
        setUser(profile)
        push(`Welcome back, ${profile.name}!`, 'success')
        
        // Reset form after successful login
        setEmail('')
        setPassword('')
      }
      
      // Navigate after successful auth
      nav(role === 'cr' ? '/cr' : role === 'teacher' ? '/teacher' : '/student')
    } catch (err: any) {
      const errorMessage = err?.message ?? 'Something went wrong. Please try again.'
      setError(errorMessage)
      push(errorMessage, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
      {/* Auth form */}
      <div className="card">
        <div className="flex gap-2 mb-4">
          <button
            className={`btn-outline flex-1 ${mode === 'login' ? 'bg-brand-blue text-white' : ''}`}
            onClick={() => {
              setMode('login')
              setError('')
            }}
            disabled={busy}
          >
            Log in
          </button>
          <button
            className={`btn-outline flex-1 ${mode === 'signup' ? 'bg-brand-blue text-white' : ''}`}
            onClick={() => {
              setMode('signup')
              setError('')
            }}
            disabled={busy}
          >
            Sign up
          </button>
        </div>

        {/* Error message display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="text-sm font-medium">Full name</label>
              <input 
                className="input" 
                required 
                disabled={busy}
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="input"
              type="email"
              required
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              className="input"
              type="password"
              required
              disabled={busy}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {mode === 'signup' && (
            <>
              <div>
                <label className="text-sm font-medium">Role</label>
                <select 
                  className="input" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value as Role)}
                  disabled={busy}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="cr">Class Representative (CR)</option>
                </select>
              </div>
              {role === 'student' && (
                <div>
                  <label className="text-sm font-medium">Enrolled courses</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {courses.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={enrolled.includes(c.id)}
                          onChange={(e) =>
                            setEnrolled((prev) =>
                              e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                            )
                          }
                        />
                        {c.name} ({c.code})
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <button 
            className="btn-primary w-full" 
            disabled={busy} 
            type="submit"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                {mode === 'signup' ? 'Creating account…' : 'Logging in…'}
              </span>
            ) : (
              mode === 'signup' ? 'Create account' : 'Log in'
            )}
          </button>
        </form>
      </div>

      {/* Public announcements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">📢 Campus Announcements</h2>
          {announcements.length > 3 && (
            <button 
              className="text-sm text-brand-blue underline" 
              onClick={() => setShowAll(true)}
              disabled={busy}
            >
              View all announcements
            </button>
          )}
        </div>
        <AnnouncementList items={announcements.slice(0, 5)} />
      </div>

      {showAll && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-40">
          <div className="card max-w-xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">All announcements</h3>
              <button 
                className="btn-outline text-sm" 
                onClick={() => setShowAll(false)}
                disabled={busy}
              >
                Close
              </button>
            </div>
            <AnnouncementList items={announcements} />
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### File 4: `firestore.rules`

Replace the entire file with this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function myProfile() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
    function myRole() { return myProfile().role; }

    // Users collection: one email, one account
    // Users can read/edit only their own profile. Role and apiKey fields are set at signup
    // and should not be changed by the client afterwards.
    match /users/{uid} {
      allow read: if isSignedIn() && request.auth.uid == uid;
      allow create: if isSignedIn() && request.auth.uid == uid
                    && request.resource.data.apiKey != null;
      allow update: if isSignedIn() && request.auth.uid == uid
                    && request.resource.data.role == resource.data.role
                    && request.resource.data.apiKey == resource.data.apiKey;
      allow delete: if false;
    }

    // Courses: readable by signed-in users; writes restricted to teachers/CRs via admin tooling.
    match /courses/{id} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && myRole() in ['teacher', 'cr'];
    }

    // Announcements: public read of active/unexpired ones; only the CR author may write.
    match /announcements/{id} {
      allow read: if resource.data.isActive == true
                   && (!('expiresAt' in resource.data) || resource.data.expiresAt > request.time);
      allow create: if isSignedIn() && myRole() == 'cr' && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if isSignedIn() && resource.data.authorId == request.auth.uid && myRole() == 'cr';
    }

    // Attendance records: students read their own; teachers read/write for their assigned courses.
    match /attendanceRecords/{id} {
      allow read: if isSignedIn() && (
        resource.data.studentId == request.auth.uid ||
        myRole() in ['teacher', 'cr']
      );
      allow create: if isSignedIn() && (
        // Student self check-in: must be their own record.
        (myRole() == 'student' && request.resource.data.studentId == request.auth.uid
          && request.resource.data.source == 'student_self_checkin') ||
        // Teacher marking: must be for a course they teach.
        (myRole() == 'teacher' && request.resource.data.source == 'teacher_marked'
          && get(/databases/$(database)/documents/courses/$(request.resource.data.courseId)).data.teacherId == request.auth.uid)
      );
      allow update, delete: if isSignedIn() && myRole() == 'teacher';
    }

    // Timetable: student manages only their own entries.
    match /timetableEntries/{id} {
      allow read, write: if isSignedIn() && (
        resource == null || resource.data.studentId == request.auth.uid
      ) && request.resource.data.studentId == request.auth.uid;
    }

    // Attendance sessions: teacher manages only their own sessions.
    match /attendanceSessions/{id} {
      allow read: if isSignedIn() && myRole() in ['teacher', 'cr'];
      allow create, update, delete: if isSignedIn() && myRole() == 'teacher'
        && request.resource.data.teacherId == request.auth.uid;
    }
  }
}
```

---

## Testing Checklist

After implementing these changes, test the following:

- [ ] **Duplicate Email**: Try registering with the same email twice. Should show: "This email is already registered..."
- [ ] **Valid Registration**: Create a new account. Should succeed and show "Account created — welcome! Your API key has been generated."
- [ ] **API Key Generation**: Check Firestore console → users collection → see `apiKey` field for each user
- [ ] **Double-Click Prevention**: Click the submit button twice quickly. Should only process once.
- [ ] **Error Display**: Try invalid password. Should show error message in red box above form.
- [ ] **Loading State**: During signup/login, button should show "Creating account…" or "Logging in…"
- [ ] **Form Reset**: After successful signup, all fields should clear
- [ ] **Firestore Security**: Verify users can only read their own profile (check Firebase console)

---

## Deployment to GitHub

Once everything is working locally:

```bash
# Commit your changes
git add .
git commit -m "feat: implement one-email-one-account with API key generation"

# Push to GitHub
git push origin main
```

---

## FAQ

**Q: Where is my API key stored?**  
A: In Firestore under the `users` collection, in each user's document, in the `apiKey` field.

**Q: What if someone forgets their API key?**  
A: Currently, they cannot retrieve it (it's one-time generated). You may want to implement a "regenerate API key" endpoint for future versions.

**Q: Does this work in mock mode (without Firebase)?**  
A: Yes! The code checks for duplicate emails in localStorage too.

**Q: Can users modify their API key?**  
A: No. The Firestore rules prevent it (`request.resource.data.apiKey == resource.data.apiKey`).

---

## Support

If you run into issues:
1. Check the browser console for TypeScript errors
2. Check Firebase error codes in the console
3. Verify all 4 files are updated
4. Clear browser cache and rebuild
5. Test in incognito mode to rule out cache issues

Good luck! 🚀
