'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TeacherView from '../components/TeacherView'
import {
  initialCourses,
  initialLecturers,
  initialRooms,
  initialSessions,
} from '../components/mock-data'
import type { AppNotification, TimetableEvent } from '../components/RoleViews'
import type { LecturerUnavailabilityByName, Session } from '../components/scheduler-types'
import {
  findSessionConflicts,
  getSectionKey,
  getSessionKey,
  toggleLecturerUnavailabilityBlock,
} from '../components/scheduler-types'
import { getCurrentAcademicSemester } from '../components/calendar-utils'

export default function LecturerPage() {
  const router = useRouter()
  const [lecturerId, setLecturerId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [confirmedCodes, setConfirmedCodes] = useState<string[]>([])
  const [unavailability, setUnavailability] = useState<LecturerUnavailabilityByName>({})
  const [events] = useState<TimetableEvent[]>([])

  useEffect(() => {
    setMounted(true)
    const storedRole = localStorage.getItem('acity_user_role')
    const storedId = localStorage.getItem('acity_user_id')
    if (storedRole !== 'teacher' || !storedId) {
      router.push('/login')
    } else {
      setLecturerId(storedId)
    }
  }, [router])

  if (!mounted || !lecturerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f6]">
        <div className="text-xs text-[#747471] font-medium animate-pulse">
          Loading lecturer portal...
        </div>
      </div>
    )
  }

  const notifications: AppNotification[] = [
    {
      id: 1,
      message: 'Draft schedule generated. Review teaching hours and submit availability.',
      time: 'Today',
      read: false,
      audience: 'lecturer',
      recipientId: lecturerId,
    },
  ]

  return (
    <TeacherView
      lecturers={initialLecturers}
      courses={initialCourses}
      sessions={sessions}
      rooms={initialRooms}
      lecturerId={lecturerId}
      events={events}
      notifications={notifications}
      lecturerUnavailability={unavailability}
      confirmedCodes={confirmedCodes}
      semester={getCurrentAcademicSemester()}
      onToggleUnavailable={(name, day, start, end) =>
        setUnavailability((current) => ({
          ...current,
          [name]: toggleLecturerUnavailabilityBlock(current[name] ?? [], day, start, end),
        }))
      }
      onConfirmCourse={(s) =>
        setConfirmedCodes((c) => {
          const sectionKey = getSectionKey(s)
          return c.includes(sectionKey) ? c : [...c, sectionKey]
        })
      }
      onSessionChange={(s, newDay, newStart, newRoom, isOnline) => {
        const updatedSession = { ...s, day: newDay, start: newStart, room: newRoom, isOnline }
        const conflict = findSessionConflicts(updatedSession, sessions, getSessionKey(s))[0]
        if (conflict) {
          const reason =
            conflict.type === 'room'
              ? `${updatedSession.room} is already booked for ${conflict.other.code}`
              : conflict.type === 'lecturer'
                ? `${updatedSession.lecturer} is already teaching ${conflict.other.code}`
                : `${updatedSession.major} Level ${updatedSession.level} already has ${conflict.other.code}`
          return `${updatedSession.code} was not moved because ${reason} at that time.`
        }
        setSessions((prev) =>
          prev.map((item) => (getSessionKey(item) === getSessionKey(s) ? updatedSession : item)),
        )
        return true
      }}
      onLogout={() => {
        localStorage.removeItem('acity_user_role')
        localStorage.removeItem('acity_user_id')
        router.push('/login')
      }}
    />
  )
}
