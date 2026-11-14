import { initialSessions } from '@/app/(frontend)/components/mock-data'
import { initialLecturers } from '@/app/(frontend)/components/sample-lecturers'
import { generateTimetableIcs } from '@/app/(frontend)/components/google-calendar-utils'
import type { Session, Lecturer } from '@/app/(frontend)/components/scheduler-types'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params
  const decodedId = decodeURIComponent(id)

  let filteredSessions: Session[] = initialSessions
  let calendarTitle = 'Academic City Timetable'
  let calendarDesc = 'Academic City University College Timetabling Platform'

  if (type === 'lecturer') {
    const lecturer = initialLecturers.find(
      (l: Lecturer) => String(l.id) === decodedId || l.name.toLowerCase() === decodedId.toLowerCase(),
    )
    if (lecturer) {
      calendarTitle = `${lecturer.name} - Teaching Timetable`
      calendarDesc = `Teaching schedule for ${lecturer.name} (${lecturer.department})`
      filteredSessions = initialSessions.filter((s: Session) => s.lecturer === lecturer.name)
    } else {
      filteredSessions = initialSessions.filter((s: Session) => s.lecturer.toLowerCase().includes(decodedId.toLowerCase()))
    }
  } else if (type === 'student') {
    calendarTitle = `Student Timetable - ${decodedId}`
    calendarDesc = `Academic schedule for student ${decodedId}`
    filteredSessions = initialSessions.filter(
      (s: Session) => s.major === 'Computer Science' && s.level === 300,
    )
    if (filteredSessions.length === 0) {
      filteredSessions = initialSessions
    }
  } else if (type === 'cohort') {
    const [major, levelStr] = decodedId.split('-')
    const level = Number(levelStr)
    calendarTitle = `${major} Level ${level} Timetable`
    filteredSessions = initialSessions.filter(
      (s: Session) => s.major.toLowerCase() === major.toLowerCase() && (isNaN(level) || s.level === level),
    )
  }

  const icsContent = generateTimetableIcs(filteredSessions, {
    calendarName: calendarTitle,
    calendarDescription: calendarDesc,
  })

  return new Response(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="academic-city-${type}-${decodedId}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}
