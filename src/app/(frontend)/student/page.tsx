'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import StudentViewPage from '../components/StudentViewPage'
import { initialSessions, initialStudents } from '../components/mock-data'
import type { AppNotification } from '../components/RoleViews'
import { getCurrentAcademicSemester } from '../components/calendar-utils'

export default function StudentPage() {
  const router = useRouter()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const storedRole = localStorage.getItem('acity_user_role')
    const storedId = localStorage.getItem('acity_user_id')
    if (
      storedRole !== 'student' ||
      !storedId ||
      !initialStudents.some((student) => student.id === storedId)
    ) {
      router.push('/login')
    } else {
      setStudentId(storedId)
    }
  }, [router])

  if (!mounted || !studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f6]">
        <div className="text-xs text-[#747471] font-medium animate-pulse">
          Loading student timetable...
        </div>
      </div>
    )
  }

  const notifications: AppNotification[] = [
    {
      id: 1,
      message: 'Examination period docket released for the current term.',
      time: 'Today',
      read: false,
      audience: 'student',
      recipientId: studentId,
    },
  ]

  return (
    <StudentViewPage
      students={initialStudents}
      sessions={initialSessions}
      studentId={studentId}
      notifications={notifications}
      semester={getCurrentAcademicSemester()}
      onLogout={() => {
        localStorage.removeItem('acity_user_role')
        localStorage.removeItem('acity_user_id')
        router.push('/login')
      }}
    />
  )
}
