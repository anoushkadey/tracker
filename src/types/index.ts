export type Role = 'student' | 'teacher' | 'cr'

export interface UserProfile {
  uid: string
  name: string
  email: string
  role: Role
  apiKey: string
  enrolledCourseIds?: string[]
  assignedCourseIds?: string[]
  createdAt: number
}

export interface Course {
  id: string
  code: string
  name: string
  teacherId: string
  schedule: string
}

export interface Announcement {
  id: string
  title: string
  content?: string
  message?: string
  category?: 'Academic' | 'Event' | 'Exam' | 'Holiday' | 'Urgent' | string
  authorId: string
  authorName: string
  createdAt: number
  expiresAt?: number
  isActive: boolean
  isUrgent?: boolean
}

export interface AttendanceRecord {
  id: string
  studentId: string
  courseId: string
  date: string
  status: 'present' | 'absent' | 'late'
  source: 'student_self_checkin' | 'teacher_marked'
  timestamp: number
}

export interface TimetableEntry {
  id: string
  studentId: string
  courseId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  room?: string
}

