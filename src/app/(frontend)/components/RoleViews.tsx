'use client'

import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type {
  Course,
  Lecturer,
  LecturerUnavailabilityByName,
  Session,
  Student,
} from './scheduler-types'
import {
  getSectionKey,
  getSessionEnd,
  getSessionKey,
  TIMETABLE_PERIOD_STARTS,
} from './scheduler-types'
import { exportTimetablePng } from './export-timetable-png'
import {
  addCalendarDays,
  formatWeekLabel,
  getCurrentWeekStart,
  getMondayDate,
} from './calendar-utils'
import { examScheduleData, examWeekStart } from './exam-schedule'

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const periods = TIMETABLE_PERIOD_STARTS

export type TimetableEvent = {
  id: string
  title: string
  date: string
  start: number
  duration: number
  room: string
  audience: string
  affectedCourses: string[]
}

export type AppNotification = {
  id: number
  message: string
  time: string
  read: boolean
  audience: 'admin' | 'lecturer' | 'student'
  recipientId?: string
  courseCode?: string
}

export { examWeekStart }

export function getStudentExamSessions(student: Student): Session[] {
  return examScheduleData
    .filter((exam) => exam.major === student.major && exam.level === student.level)
    .map((exam) => ({
      weekStart: examWeekStart,
      day: (new Date(`${exam.date}T00:00:00Z`).getUTCDay() + 6) % 7,
      start: exam.start,
      duration: exam.end - exam.start,
      title: exam.title,
      code: exam.code,
      room: exam.room,
      type: 'Exam',
      tone: 'dark',
      lecturer: 'Exam',
      major: exam.major,
      level: exam.level,
      enrollment: exam.enrollment,
      roomType: 'lecture',
    }))
}

function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function getWeekDate(weekStart: string, day: number) {
  return addCalendarDays(weekStart, day)
}

function downloadTimetablePng(filename: string) {
  return exportTimetablePng(filename)
}

function downloadCalendar(filename: string, sessions: Session[], weekStart: string) {
  const events = sessions
    .map((session) => {
      const date = getWeekDate(weekStart, session.day).replaceAll('-', '')
      const start = `${date}T${String(Math.floor(session.start / 60)).padStart(2, '0')}${String(session.start % 60).padStart(2, '0')}00`
      const endMinute = getSessionEnd(session)
      const end = `${date}T${String(Math.floor(endMinute / 60)).padStart(2, '0')}${String(endMinute % 60).padStart(2, '0')}00`
      const escape = (value: string) =>
        value
          .replaceAll('\\', '\\\\')
          .replaceAll(';', '\\;')
          .replaceAll(',', '\\,')
          .replaceAll('\n', '\\n')
      return [
        'BEGIN:VEVENT',
        `UID:${encodeURIComponent(session.code)}-${date}@academic-city`,
        `DTSTAMP:${new Date()
          .toISOString()
          .replaceAll(/[-:]/g, '')
          .replace(/\.\d{3}/, '')}`,
        `DTSTART;TZID=Africa/Accra:${start}`,
        `DTEND;TZID=Africa/Accra:${end}`,
        `SUMMARY:${escape(`${session.code} · ${session.title}`)}`,
        `LOCATION:${escape(session.room)}`,
        `DESCRIPTION:${escape(`${session.lecturer} · ${session.type}`)}`,
        'END:VEVENT',
      ].join('\r\n')
    })
    .join('\r\n')
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Academic City//Timetable//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE',
    'TZID:Africa/Accra',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0000',
    'TZOFFSETTO:+0000',
    'TZNAME:GMT',
    'END:STANDARD',
    'END:VTIMEZONE',
    events,
    'END:VCALENDAR',
  ].join('\r\n')
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(
    new Blob([calendar], { type: 'text/calendar;charset=utf-8' }),
  )
  link.href = objectUrl
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#a42d2b]">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#202124]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#747471]">{description}</p>
      </div>
      {children}
    </section>
  )
}

function IntegrationNotice({ notice }: { notice: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {notice}
    </div>
  )
}

export function EventsPage({
  rooms,
  sessions,
  events,
  onBookEvent,
}: {
  rooms: Array<{ name: string; capacity: number }>
  sessions: Session[]
  events: TimetableEvent[]
  onBookEvent: (event: Omit<TimetableEvent, 'id' | 'affectedCourses'>) => boolean | void
}) {
  const [notice, setNotice] = useState('')
  const [date, setDate] = useState(getCurrentWeekStart)
  const [start, setStart] = useState(periods[0])
  const [duration, setDuration] = useState(60)
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
  const [room, setRoom] = useState(rooms[0]?.name ?? '')
  const [audience, setAudience] = useState('All campus')
  const [title, setTitle] = useState('')
  const eventEnd = start + duration
  const availableStarts = periods.filter((time) => time + duration <= periods.at(-1)! + 60)
  const impacted = sessions.filter(
    (session) =>
      session.day === weekday &&
      session.room === room &&
      (!session.weekStart || session.weekStart === getMondayDate(date)) &&
      start < getSessionEnd(session) &&
      eventEnd > session.start,
  )

  const bookEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !room) return
    if (weekday > 4) {
      setNotice('Choose a weekday from Monday through Friday.')
      return
    }
    if (impacted.length) {
      setNotice(
        'This room is already assigned to a class at that time. Choose another room or slot.',
      )
      return
    }
    const sameRoomConflict = events.some(
      (item) =>
        item.date === date &&
        item.room === room &&
        start < item.start + item.duration &&
        eventEnd > item.start,
    )
    if (sameRoomConflict) {
      setNotice('This room already has an event booking at that time. Choose another slot.')
      return
    }
    const booked = onBookEvent({
      title: title.trim(),
      date,
      start,
      duration,
      room,
      audience,
    })
    if (booked === false) {
      setNotice(
        'This room is already assigned to a class at that time. Choose another room or slot.',
      )
      return
    }
    setNotice('Event booked in the sample schedule.')
    setTitle('')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Academic operations · demo data"
        title="Event room bookings"
        description="Book a campus event only when its room is free of scheduled classes and other events."
      />
      {notice && <IntegrationNotice notice={notice} />}
      <form className="rounded-2xl border border-[#e6e6e3] bg-white p-5" onSubmit={bookEvent}>
        <h2 className="text-lg font-semibold">Book an event room</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium">
            Event title
            <input
              className="w-full rounded-lg border border-[#dededb] px-3 py-2"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Engineering showcase"
              required
              value={title}
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Date
            <input
              className="w-full rounded-lg border border-[#dededb] px-3 py-2"
              onChange={(event) => setDate(event.target.value)}
              required
              type="date"
              value={date}
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Room
            <select
              className="w-full rounded-lg border border-[#dededb] px-3 py-2"
              onChange={(event) => setRoom(event.target.value)}
              value={room}
            >
              {rooms.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Start time
            <select
              className="w-full rounded-lg border border-[#dededb] px-3 py-2"
              onChange={(event) => setStart(Number(event.target.value))}
              value={start}
            >
              {availableStarts.map((time) => (
                <option value={time} key={time}>
                  {formatTime(time)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Duration
            <select
              className="w-full rounded-lg border border-[#dededb] px-3 py-2"
              onChange={(event) => {
                const nextDuration = Number(event.target.value)
                setDuration(nextDuration)
                const latestAvailableStart = periods.filter(
                  (time) => time + nextDuration <= periods.at(-1)! + 60,
                )
                if (!latestAvailableStart.includes(start)) {
                  setStart(latestAvailableStart.at(-1) ?? periods[0])
                }
              }}
              value={duration}
            >
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Event audience
            <select
              className="w-full rounded-lg border border-[#dededb] px-3 py-2"
              onChange={(event) => setAudience(event.target.value)}
              value={audience}
            >
              <option>All campus</option>
              <option>Students and lecturers</option>
              <option>Staff only</option>
              <option>Computer Science · Level 300</option>
            </select>
          </label>
        </div>
        <div className="mt-4 rounded-lg border px-4 py-3 text-sm">
          {weekday > 4 ? (
            <p className="text-rose-700">Select a weekday to book an event room.</p>
          ) : impacted.length ? (
            <p className="font-semibold text-rose-700">
              {impacted.length} scheduled class{impacted.length === 1 ? '' : 'es'} use {room} at
              this time. Choose another room or slot.
            </p>
          ) : (
            <p className="text-emerald-800">
              No scheduled classes currently use this room and time.
            </p>
          )}
        </div>
        <button
          className="mt-4 rounded-lg bg-[#cc3634] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={weekday > 4 || impacted.length > 0}
          type="submit"
        >
          Book event room
        </button>
        <p className="mt-3 text-xs text-[#8a6c2a]">
          Event bookings are sample data and last only for this browser session.
        </p>
      </form>

      <section className="rounded-2xl border border-[#e6e6e3] bg-white p-5">
        <h2 className="text-lg font-semibold">Upcoming bookings</h2>
        {events.length ? (
          <div className="mt-3 divide-y divide-[#ececea]">
            {events
              .slice()
              .sort(
                (left, right) => left.date.localeCompare(right.date) || left.start - right.start,
              )
              .map((item) => (
                <article className="py-4 first:pt-1" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-[#747471]">
                        {formatDate(item.date)} · {formatTime(item.start)}–
                        {formatTime(item.start + item.duration)} · {item.room}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#f1f1ef] px-3 py-1 text-xs text-[#555]">
                      {item.audience}
                    </span>
                  </div>
                  {item.affectedCourses.length > 0 && (
                    <p className="mt-2 text-xs text-amber-800">
                      Room conflict notices sent for {item.affectedCourses.join(', ')}.
                    </p>
                  )}
                </article>
              ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#747471]">No sample events have been booked.</p>
        )}
      </section>
    </div>
  )
}

export function LecturerView({
  lecturers,
  courses,
  sessions,
  lecturerId,
  onLecturerChange,
  timetable,
  notifications,
  unavailability,
  confirmedCodes,
  onToggleUnavailable,
  onConfirmCourse,
  onReschedule,
}: {
  lecturers: Lecturer[]
  courses: Course[]
  sessions: Session[]
  lecturerId: string
  onLecturerChange: (lecturerId: string) => void
  timetable: ReactNode
  notifications: AppNotification[]
  unavailability: LecturerUnavailabilityByName
  confirmedCodes: string[]
  onToggleUnavailable: (name: string, day: number, start: number, end: number) => void
  onConfirmCourse: (session: Session) => void
  onReschedule: (session: Session) => void
}) {
  const [notice, setNotice] = useState('')
  const lecturer = lecturers.find((item) => item.id === lecturerId)
  const assignedCourses = courses.filter(
    (course) =>
      course.lecturer === lecturer?.name ||
      course.lecturer.toLowerCase() === lecturer?.email.toLowerCase(),
  )
  const teaching = sessions.filter((session) => session.lecturer === lecturer?.name)
  const blocks = lecturer ? (unavailability[lecturer.name] ?? []) : []
  const pending = teaching.filter(
    (session, index) =>
      !confirmedCodes.includes(getSectionKey(session)) &&
      teaching.findIndex((other) => getSectionKey(other) === getSectionKey(session)) === index,
  )
  const teachingHours = teaching.reduce((total, session) => total + session.duration / 60, 0)

  if (!lecturer) {
    return (
      <section className="rounded-2xl border border-[#e6e6e3] bg-white p-8">
        <h1 className="text-xl font-semibold">No lecturer accounts in this demo</h1>
        <p className="mt-2 text-sm text-[#747471]">
          Add a lecturer and assign a course from the administrator view.
        </p>
      </section>
    )
  }

  const isUnavailable = (day: number, start: number, end: number) =>
    blocks.some((block) => block.day === day && start < block.end && end > block.start)

  return (
    <div className="role-view role-printable space-y-5">
      <PageHeader
        eyebrow="Lecturer workspace · demo view"
        title={`Welcome, ${lecturer.name}`}
        description="Review administrator-assigned courses, set weekly unavailable times, and request a safe change for this week."
      >
        <label className="flex items-center gap-2 text-sm font-medium text-[#555656]">
          Lecturer
          <select
            className="rounded-lg border border-[#dededb] bg-white px-3 py-2"
            value={lecturerId}
            onChange={(event) => onLecturerChange(event.target.value)}
          >
            {lecturers.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Assigned courses', String(assignedCourses.length)],
          ['Teaching hours', `${teachingHours} hrs`],
          ['Awaiting confirmation', String(pending.length)],
        ].map(([label, value]) => (
          <div className="rounded-xl border border-[#e6e6e3] bg-white p-4" key={label}>
            <p className="text-sm text-[#747471]">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {notice && <IntegrationNotice notice={notice} />}
      {notifications.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-950">Timetable notifications</h2>
          <div className="mt-2 space-y-3">
            {notifications.map((item) => {
              const affectedSession = teaching.find((session) => session.code === item.courseCode)
              return (
                <article className="text-sm text-amber-950" key={item.id}>
                  <p>{item.message}</p>
                  {affectedSession && (
                    <button
                      className="mt-1 font-semibold underline"
                      onClick={() => onReschedule(affectedSession)}
                    >
                      Change this week
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}
      <section className="rounded-2xl border border-[#e6e6e3] bg-white p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">My weekly timetable</h2>
          <p className="mt-1 text-sm text-[#747471]">
            Click a class to preview available conflict-free changes for this week.
          </p>
        </div>
        <div className="overflow-x-auto">{timetable}</div>
      </section>
      <section className="role-no-print rounded-2xl border border-[#e6e6e3] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">My assigned courses</h2>
            <p className="mt-1 text-sm text-[#747471]">
              Classes and lab requirements are assigned by the administrator.
            </p>
          </div>
          <button
            className="rounded-lg bg-[#cc3634] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending.length === 0}
            onClick={() => {
              pending.forEach(onConfirmCourse)
              setNotice(
                pending.length
                  ? 'Your assigned timetable has been confirmed. The administrator has been notified in this demo.'
                  : 'All assigned courses are already confirmed.',
              )
            }}
          >
            Confirm pending timetable
          </button>
        </div>
        {assignedCourses.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {assignedCourses.map((course) => {
              const courseSessions = teaching
                .filter((item) => getSectionKey(item) === getSectionKey(course))
                .sort((left, right) => left.day - right.day || left.start - right.start)
              const session = courseSessions[0]
              const sectionKey = getSectionKey(course)
              const isConfirmed = session ? confirmedCodes.includes(sectionKey) : false
              return (
                <article className="rounded-xl border border-[#ececea] p-4" key={sectionKey}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[#a42d2b]">
                        {course.code}
                        {course.group ? ` · Group ${course.group}` : ''}
                      </p>
                      <h3 className="mt-1 font-semibold">{course.title}</h3>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${isConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}
                    >
                      {isConfirmed
                        ? 'Confirmed'
                        : session
                          ? 'Pending confirmation'
                          : 'Awaiting timetable slot'}
                    </span>
                  </div>
                  {session ? (
                    <>
                      {courseSessions.map((item) => (
                        <p className="mt-3 text-sm text-[#666663]" key={getSessionKey(item)}>
                          {weekdays[item.day]} · {formatTime(item.start)}–
                          {formatTime(item.start + item.duration)} · {item.room}
                        </p>
                      ))}
                      <p className="mt-1 text-sm text-[#777]">
                        {session.type} · {session.enrollment} students · {session.major}, Level{' '}
                        {session.level}
                        {session.group ? ` · Group ${session.group}` : ''}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {!isConfirmed && (
                          <button
                            className="rounded-lg bg-[#cc3634] px-3 py-2 text-sm font-semibold text-white"
                            onClick={() => {
                              onConfirmCourse(session)
                              setNotice(
                                `${session.code} confirmed. The administrator has been notified in this demo.`,
                              )
                            }}
                          >
                            Confirm
                          </button>
                        )}
                        {courseSessions.map((item, index) => (
                          <button
                            className="rounded-lg border border-[#dededb] px-3 py-2 text-sm font-medium hover:bg-[#f7f7f6]"
                            key={getSessionKey(item)}
                            onClick={() => onReschedule(item)}
                          >
                            Change meeting {index + 1}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-[#747471]">
                      {course.sessionType} · {course.credits} credits · {course.enrollment} students
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <p className="rounded-lg bg-[#f7f7f6] p-4 text-sm text-[#747471]">
            No courses are currently assigned to this lecturer in the sample timetable.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[#e6e6e3] bg-white p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Weekly unavailability</h2>
          <p className="mt-1 text-sm text-[#747471]">
            Select an open hour to mark it unavailable. Scheduled classes cannot be blocked.
          </p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[90px_repeat(5,minmax(100px,1fr))] gap-1">
              <div className="px-2 py-2 text-xs font-semibold text-[#747471]">Time</div>
              {weekdays.map((day) => (
                <div className="px-2 py-2 text-xs font-semibold" key={day}>
                  {day}
                </div>
              ))}
              {periods.flatMap((start, periodIndex) => [
                <div
                  className="flex items-center px-2 text-xs text-[#747471]"
                  key={`time-${start}`}
                >
                  {formatTime(start)}
                </div>,
                ...weekdays.map((day, dayIndex) => {
                  const end = start + 60
                  const unavailable = isUnavailable(dayIndex, start, end)
                  const hasClass = teaching.some(
                    (session) =>
                      session.day === dayIndex &&
                      start < getSessionEnd(session) &&
                      end > session.start,
                  )
                  return (
                    <button
                      aria-label={`${day} ${formatTime(start)} to ${formatTime(end)}${unavailable ? ', clear unavailable time' : ', mark unavailable'}`}
                      aria-pressed={unavailable}
                      className={`min-h-9 rounded-md border text-xs transition ${unavailable ? 'border-[#cc7774] bg-[#fff0ef] text-[#9b3533]' : 'border-[#ececea] bg-[#fafaf9] hover:border-[#c7c7c3]'} ${hasClass ? 'cursor-not-allowed opacity-45' : ''}`}
                      disabled={hasClass}
                      key={`${day}-${start}`}
                      onClick={() => onToggleUnavailable(lecturer.name, dayIndex, start, end)}
                      title={
                        hasClass
                          ? 'A scheduled class already uses this time'
                          : `${day} ${formatTime(start)}–${formatTime(end)}${unavailable ? ' · unavailable' : ''}`
                      }
                    >
                      {unavailable ? 'Unavailable' : hasClass ? 'Class' : ''}
                    </button>
                  )
                }),
              ])}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#747471]">
          <span className="rounded bg-[#fff0ef] px-2 py-1 text-[#9b3533]">Unavailable</span>
          <span className="rounded bg-[#f0f0ee] px-2 py-1">Scheduled class</span>
          <span className="px-1 py-1">Open cells can be selected.</span>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e6e6e3] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Calendar and print</h2>
            <p className="mt-1 text-sm text-[#747471]">
              Download a timetable image or a calendar file for this sample week.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-[#dededb] px-3 py-2 text-sm font-medium"
              onClick={() => {
                void downloadTimetablePng('academic-city-lecturer-timetable.png').catch((error) => {
                  console.error('Unable to export lecturer timetable PNG.', error)
                  setNotice('PNG export failed. Please try again.')
                })
              }}
            >
              Download PNG
            </button>
            <button
              className="rounded-lg border border-[#dededb] px-3 py-2 text-sm font-medium"
              onClick={() =>
                downloadCalendar(
                  'academic-city-lecturer-timetable.ics',
                  teaching,
                  getCurrentWeekStart(),
                )
              }
            >
              Download calendar (.ics)
            </button>
          </div>
        </div>
        <p className="text-xs text-[#8a6c2a]">
          Google Calendar and Notion live sync are not connected in this demo. Import the .ics file
          into a calendar; direct account connections require provider authentication.
        </p>
      </section>
    </div>
  )
}

export function StudentView({
  students,
  sessions,
  studentId,
  onStudentChange,
  timetable,
  examTimetable,
  examWeek,
  notifications,
}: {
  students: Student[]
  sessions: Session[]
  studentId: string
  onStudentChange: (studentId: string) => void
  timetable: ReactNode
  examTimetable: ReactNode
  examWeek: string
  notifications: AppNotification[]
}) {
  const [section, setSection] = useState<'classes' | 'exams'>('classes')
  const [notice, setNotice] = useState('')
  const student = students.find((item) => item.id === studentId)
  const cohortSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.studentVisible !== false &&
          session.major === student?.major &&
          session.level === student.level,
      ),
    [sessions, student],
  )
  const exams = student
    ? examScheduleData.filter(
        (exam) => exam.major === student.major && exam.level === student.level,
      )
    : []
  const examSessions = student ? getStudentExamSessions(student) : []

  if (!student) {
    return (
      <section className="rounded-2xl border border-[#e6e6e3] bg-white p-8">
        <h1 className="text-xl font-semibold">No student accounts in this demo</h1>
        <p className="mt-2 text-sm text-[#747471]">
          The administrator can add a sample student from the admin view.
        </p>
      </section>
    )
  }

  return (
    <div className="role-view role-printable space-y-5">
      <PageHeader
        eyebrow="Student workspace · demo view"
        title={`Your timetable, ${student.name.split(' ')[0]}`}
        description={`${student.major} · Level ${student.level} · ${student.id}`}
      >
        <label className="flex items-center gap-2 text-sm font-medium text-[#555656]">
          Student
          <select
            className="rounded-lg border border-[#dededb] bg-white px-3 py-2"
            value={studentId}
            onChange={(event) => onStudentChange(event.target.value)}
          >
            {students.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name} · {item.id}
              </option>
            ))}
          </select>
        </label>
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e6e6e3] bg-white p-4">
        <div>
          <p className="font-semibold">
            {section === 'classes' ? 'Weekly timetable' : 'Exam timetable'}
          </p>
          <p className="mt-1 text-sm text-[#747471]">
            {section === 'classes'
              ? `Your cohort timetable for ${formatWeekLabel(getCurrentWeekStart()).toLowerCase()}.`
              : 'Exam dates and rooms, with class sizes for capacity planning.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium ${section === 'classes' ? 'bg-[#202124] text-white' : 'border border-[#dededb]'}`}
            onClick={() => setSection('classes')}
          >
            Classes
          </button>
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium ${section === 'exams' ? 'bg-[#202124] text-white' : 'border border-[#dededb]'}`}
            onClick={() => setSection('exams')}
          >
            Exams
          </button>
          <button
            className="rounded-lg border border-[#dededb] px-3 py-2 text-sm font-medium"
            onClick={() => window.print()}
          >
            Print
          </button>
          <button
            className="rounded-lg border border-[#dededb] px-3 py-2 text-sm font-medium"
            onClick={() => {
              void downloadTimetablePng('academic-city-class-timetable.png').catch((error) => {
                console.error('Unable to export class timetable PNG.', error)
                setNotice('PNG export failed. Please try again.')
              })
            }}
          >
            Download class timetable PNG
          </button>
          <button
            className="rounded-lg border border-[#dededb] px-3 py-2 text-sm font-medium"
            onClick={() => {
              void downloadTimetablePng('academic-city-exam-timetable.png').catch((error) => {
                console.error('Unable to export exam timetable PNG.', error)
                setNotice('PNG export failed. Please try again.')
              })
            }}
          >
            Download exam timetable PNG
          </button>
          {section === 'classes' && (
            <button
              className="rounded-lg border border-[#dededb] px-3 py-2 text-sm font-medium"
              onClick={() =>
                downloadCalendar(
                  'academic-city-student-timetable.ics',
                  cohortSessions,
                  getCurrentWeekStart(),
                )
              }
            >
              Export calendar (.ics)
            </button>
          )}
        </div>
      </div>

      {notice && <IntegrationNotice notice={notice} />}
      {notifications.length > 0 && (
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <h2 className="font-semibold text-sky-950">Campus notifications</h2>
          <div className="mt-2 space-y-2 text-sm text-sky-950">
            {notifications.map((item) => (
              <p key={item.id}>{item.message}</p>
            ))}
          </div>
        </section>
      )}
      {section === 'classes' ? (
        <section className="overflow-x-auto rounded-xl border border-[#e6e6e3] bg-white p-4">
          <p className="mb-4 text-sm text-[#747471]">
            {formatWeekLabel(getCurrentWeekStart())} · {cohortSessions.length} classes
          </p>
          {timetable}
        </section>
      ) : exams.length ? (
        <div className="space-y-4">
          <section className="overflow-x-auto rounded-xl border border-[#e6e6e3] bg-white p-4">
            <p className="mb-4 text-sm text-[#747471]">Week of {formatDate(examWeek)}</p>
            {examTimetable}
          </section>
          <div className="role-no-print overflow-x-auto rounded-xl border border-[#e6e6e3] bg-white">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[#f7f7f6] text-xs uppercase tracking-wide text-[#747471]">
                <tr>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Date & time</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Class size</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr className="border-t border-[#ececea]" key={exam.code}>
                    <td className="px-4 py-4">
                      <b>{exam.code}</b>
                      <span className="mt-1 block text-[#747471]">{exam.title}</span>
                    </td>
                    <td className="px-4 py-4">
                      {formatDate(exam.date)}
                      <span className="mt-1 block text-[#747471]">
                        {formatTime(exam.start)}–{formatTime(exam.end)}
                      </span>
                    </td>
                    <td className="px-4 py-4">{exam.room}</td>
                    <td className="px-4 py-4">{exam.enrollment} students</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-[#ececea] px-4 py-3 text-xs text-[#8a6c2a]">
              Examination dates, rooms, and class sizes are illustrative demo records.
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-[#e6e6e3] bg-white p-5 text-sm text-[#747471]">
          No sample exams are listed for this cohort.
        </p>
      )}

      <section className="role-no-print rounded-xl border border-[#e6e6e3] bg-white p-5">
        <h2 className="font-semibold">Calendar connections</h2>
        <p className="mt-1 text-sm text-[#747471]">
          Calendar files can be imported into Google Calendar. Notion and direct Google sync need
          authenticated integrations that are not configured in this demo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-amber-50 px-3 py-1.5 font-medium text-amber-800">
            Google Calendar · Not connected
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 font-medium text-amber-800">
            Notion · Not connected
          </span>
        </div>
        <button
          className="mt-3 rounded-lg border border-[#dededb] px-3 py-2 text-sm font-medium"
          onClick={() =>
            setNotice(
              'Live Google Calendar and Notion sync need authenticated provider integrations. Export calendar (.ics) to import your timetable.',
            )
          }
        >
          Learn about connections
        </button>
      </section>
    </div>
  )
}
