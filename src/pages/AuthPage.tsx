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
