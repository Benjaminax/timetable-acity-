import type { Session } from './scheduler-types'
import { getSessionEnd } from './scheduler-types'
import { getMondayDate, getDateKey } from './calendar-utils'

/**
 * Format date string YYYY-MM-DD + day offset to Date
 */
export function getSessionDate(weekStart: string, dayIndex: number): string {
  const [year, month, day] = weekStart.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + dayIndex))
  return date.toISOString().slice(0, 10)
}

/**
 * Convert Date or date string + minutes into iCalendar/Google UTC timestamp
 * (Africa/Accra is GMT / UTC+0 with no daylight saving)
 */
export function formatUtcDateTime(dateStr: string, minutes: number): string {
  const cleanDate = dateStr.replaceAll('-', '')
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${cleanDate}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00Z`
}

/**
 * Convert Date or date string + minutes into Local DateTime string for iCal TZID
 */
export function formatLocalDateTime(dateStr: string, minutes: number): string {
  const cleanDate = dateStr.replaceAll('-', '')
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${cleanDate}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`
}

/**
 * Escape text for iCalendar RFC-5545 format
 */
export function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
}

/**
 * Calculate the end date of the current semester for weekly recurrence
 */
export function getSemesterEndRecurrenceDate(fromDate?: string): string {
  const now = fromDate ? new Date(fromDate) : new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12

  // Semester 1 ends around late December (Dec 31)
  // Semester 2 ends around late May (May 31)
  if (month >= 8 || month <= 1) {
    const endYear = month <= 1 ? year : year
    return `${endYear}1231T235959Z`
  } else {
    return `${year}0531T235959Z`
  }
}

/**
 * Generates a 1-click Google Calendar Event Template URL
 * Clicking this URL opens Google Calendar directly with event details, room, lecturer,
 * and weekly recurrence pre-filled!
 */
export function buildGoogleCalendarEventUrl(
  session: Session,
  options: {
    weekStart?: string
    recurring?: boolean
    semesterEndUtc?: string
  } = {},
): string {
  const weekStart = options.weekStart || getMondayDate(getDateKey())
  const sessionDate = getSessionDate(weekStart, session.day)
  const endMinutes = getSessionEnd(session)

  const startUtc = formatUtcDateTime(sessionDate, session.start)
  const endUtc = formatUtcDateTime(sessionDate, endMinutes)

  const title = `${session.code} · ${session.title}`
  const location = session.room
    ? `${session.room}, Academic City Campus, Haatso-Agbaaja, Accra`
    : 'Academic City Campus, Accra'

  const details = [
    `Course: ${session.title} (${session.code})`,
    `Lecturer: ${session.lecturer || 'Faculty'}`,
    `Session Type: ${session.type || 'Lecture'}`,
    `Location / Hall: ${session.room || 'TBA'}`,
    session.major ? `Major / Programme: ${session.major}` : '',
    session.level ? `Level: ${session.level}` : '',
    '',
    'Scheduled via Academic City Timetabling Platform',
    'https://acity.edu.gh',
  ]
    .filter(Boolean)
    .join('\n')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startUtc}/${endUtc}`,
    details: details,
    location: location,
    ctz: 'Africa/Accra',
  })

  // Add weekly recurrence across the semester
  if (options.recurring !== false) {
    const semesterEnd = options.semesterEndUtc || getSemesterEndRecurrenceDate(sessionDate)
    params.set('recur', `RRULE:FREQ=WEEKLY;UNTIL=${semesterEnd}`)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generates RFC-5545 compliant iCalendar (.ics) string for complete timetable
 * import into Google Calendar, Apple Calendar, or Outlook.
 */
export function generateTimetableIcs(
  sessions: Session[],
  options: {
    calendarName?: string
    calendarDescription?: string
    weekStart?: string
    semesterEndUtc?: string
  } = {},
): string {
  const weekStart = options.weekStart || getMondayDate(getDateKey())
  const calendarName = options.calendarName || 'Academic City University Timetable'
  const calendarDesc = options.calendarDescription || 'Class schedule from Academic City Timetabling Platform'
  const semesterEnd = options.semesterEndUtc || getSemesterEndRecurrenceDate(weekStart)
  const dtstamp = new Date().toISOString().replaceAll(/[-:]/g, '').replace(/\.\d{3}/, '')

  const events = sessions.map((session, index) => {
    const sessionDate = getSessionDate(weekStart, session.day)
    const endMinutes = getSessionEnd(session)
    const startLocal = formatLocalDateTime(sessionDate, session.start)
    const endLocal = formatLocalDateTime(sessionDate, endMinutes)
    const uid = `session-${session.code.replace(/[^a-zA-Z0-9]/g, '')}-${session.day}-${session.start}-${index}@academic-city.edu.gh`

    const summary = escapeIcsText(`${session.code}: ${session.title}`)
    const location = escapeIcsText(
      session.room
        ? `${session.room}, Academic City Campus`
        : 'Academic City Campus, Accra',
    )
    const description = escapeIcsText(
      [
        `Course: ${session.title} (${session.code})`,
        `Lecturer: ${session.lecturer || 'Faculty'}`,
        `Type: ${session.type || 'Lecture'}`,
        `Room: ${session.room || 'TBA'}`,
        session.major ? `Major: ${session.major}` : '',
        session.level ? `Level: ${session.level}` : '',
        'Academic City Timetabling Platform',
      ]
        .filter(Boolean)
        .join('\n'),
    )

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Africa/Accra:${startLocal}`,
      `DTEND;TZID=Africa/Accra:${endLocal}`,
      `RRULE:FREQ=WEEKLY;UNTIL=${semesterEnd}`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Class reminder: ${summary} starting in 15 minutes`,
      'TRIGGER:-PT15M',
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n')
  })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Academic City University College//Timetable Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    `X-WR-CALDESC:${escapeIcsText(calendarDesc)}`,
    'X-WR-TIMEZONE:Africa/Accra',
    'BEGIN:VTIMEZONE',
    'TZID:Africa/Accra',
    'X-LIC-LOCATION:Africa/Accra',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0000',
    'TZOFFSETTO:+0000',
    'TZNAME:GMT',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

/**
 * Triggers browser download of the generated .ics file
 */
export function downloadTimetableIcs(
  filename: string,
  sessions: Session[],
  options?: {
    calendarName?: string
    calendarDescription?: string
    weekStart?: string
    semesterEndUtc?: string
  },
): void {
  const icsContent = generateTimetableIcs(sessions, options)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Google Calendar direct import settings URL
 */
export const GOOGLE_CALENDAR_IMPORT_URL = 'https://calendar.google.com/calendar/u/0/r/settings/export'

/**
 * Google Calendar 1-click webcal subscription URL
 */
export function getGoogleCalendarSubscribeUrl(feedUrl: string): string {
  // Google Calendar takes cid=https%3A%2F%2F... or cid=webcal%3A%2F%2F...
  const normalized = feedUrl.replace(/^http:\/\//, 'https://')
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(normalized)}`
}

