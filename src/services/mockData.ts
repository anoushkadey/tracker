import type { Course, Announcement } from '../types'

export const mockCourses: (Course & { id: string })[] = [
  {
    id: 'course-001',
    name: 'Electricity & Magnetism',
    code: 'DSC-MAIN-6-1',
    category: 'DSC_MAIN_6',
    maxAttendanceMarks: 6,
  },
  {
    id: 'course-002',
    name: 'Quantum Mechanics',
    code: 'DSC-MAIN-6-2',
    category: 'DSC_MAIN_6',
    maxAttendanceMarks: 6,
  },
  {
    id: 'course-003',
    name: 'Thermodynamics',
    code: 'DSC-MAIN-5-1',
    category: 'DSC_MAIN_5',
    maxAttendanceMarks: 5,
  },
  {
    id: 'course-004',
    name: 'Chemistry Lab',
    code: 'DSC-MAIN-5-2',
    category: 'DSC_MAIN_5',
    maxAttendanceMarks: 5,
  },
  {
    id: 'course-005',
    name: 'Environmental Science',
    code: 'SEC-2-1',
    category: 'SEC_2',
    maxAttendanceMarks: 2,
  },
  {
    id: 'course-006',
    name: 'Communication Skills',
    code: 'GE-5-1',
    category: 'GE_5',
    maxAttendanceMarks: 2,
  },
]

export const mockAnnouncements: (Announcement & { id: string })[] = [
  {
    id: 'ann-001',
    title: 'Semester Exam Schedule Released',
    message: 'The semester exam schedule has been published. Check the notice board for details.',
    category: 'Exam',
    isUrgent: false,
    authorId: 'teacher-001',
    authorName: 'Dr. Sharma',
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    isActive: true,
  },
  {
    id: 'ann-002',
    title: '⚠️ Campus Closed Tomorrow',
    message: 'The campus will be closed tomorrow for annual maintenance. All classes are cancelled.',
    category: 'Holiday',
    isUrgent: true,
    authorId: 'admin-001',
    authorName: 'Administration',
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
    isActive: true,
  },
  {
    id: 'ann-003',
    title: 'Science Fair Registration Open',
    message: 'Register for the annual Science Fair by this Friday. Limited slots available!',
    category: 'Event',
    isUrgent: false,
    authorId: 'cr-001',
    authorName: 'Aarav (CR)',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    isActive: true,
  },
  {
    id: 'ann-004',
    title: 'Updated Attendance Policy',
    message: 'New attendance policy effective from next month. Please review the details on the portal.',
    category: 'Academic',
    isUrgent: false,
    authorId: 'admin-001',
    authorName: 'Administration',
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    isActive: true,
  },
  {
    id: 'ann-005',
    title: '🚨 Emergency: Hazmat Drill Today',
    message: 'Emergency hazmat drill scheduled for 2 PM. All participants report to the assembly ground.',
    category: 'Urgent',
    isUrgent: true,
    authorId: 'admin-001',
    authorName: 'Administration',
    createdAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
    expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    isActive: true,
  },
]
