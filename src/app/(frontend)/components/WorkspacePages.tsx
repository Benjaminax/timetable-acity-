'use client'

import { Fragment, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import AppIcon, { isAppIconName } from './AppIcon'
import {
  calculateTimetablePeriods,
  getCourseMeetingPatternError,
  getDefaultCourseMeetingPattern,
  findScheduleConflicts,
  getSectionKey,
  getSessionEnd,
  getSessionKey,
  hasLecturerUnavailability,
  isRoomCompatibleWithSession,
  isTechnicalCourse,
  minutesToTimeString,
  timeStringToMinutes,
  TIMETABLE_PERIOD_STARTS,
  type AppSettings,
  type Course,
  type CourseMeetingPattern,
  type Lecturer,
  type LecturerUnavailability,
  type LecturerUnavailabilityByName,
  type Room,
  type Session,
  type Student,
} from './scheduler-types'

function formatAvailabilityTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function getLecturerInitials(name: string) {
  return name
    .replace(/^(Dr\.|Prof\.)\s*/, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const lecturerWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const lecturerPeriodStarts = TIMETABLE_PERIOD_STARTS

function getLecturerTimetableRows(start: number, duration: number) {
  const startIndex = lecturerPeriodStarts.reduce(
    (closestIndex, periodStart, index) =>
      Math.abs(periodStart - start) < Math.abs(lecturerPeriodStarts[closestIndex] - start)
        ? index
        : closestIndex,
    0,
  )
  const periodCount = Math.max(1, Math.ceil(duration / 60))
  return {
    startIndex,
    periodCount: Math.min(lecturerPeriodStarts.length - startIndex, periodCount),
  }
}

function LecturerWeeklyTimetable({
  sessions,
  unavailability,
  onToggleUnavailable,
  onReschedule,
}: {
  sessions: Session[]
  unavailability: LecturerUnavailability[]
  onToggleUnavailable: (day: number, start: number, end: number) => void
  onReschedule: (session: Session) => void
}) {
  return (
    <div className="lecturer-timetable-section">
      <div className="lecturer-timetable-heading">
        <div>
          <h3>Weekly availability</h3>
          <p>Select an open time block to mark it unavailable. Select it again to clear.</p>
        </div>
        <span className="lecturer-timetable-legend">
          <i /> Unavailable
        </span>
      </div>
      <div className="lecturer-timetable-scroll">
        <div className="lecturer-week-grid" aria-label="Lecturer weekly timetable">
          <div className="lecturer-week-head lecturer-time-head">Time</div>
          {lecturerWeekdays.map((day) => (
            <div className="lecturer-week-head" key={day}>
              {day}
            </div>
          ))}
          <div className="lecturer-time-axis">
            {lecturerPeriodStarts.map((start) => (
              <span key={start}>
                {formatAvailabilityTime(start)}–{formatAvailabilityTime(start + 60)}
              </span>
            ))}
          </div>
          {lecturerWeekdays.map((day, dayIndex) => (
            <div className="lecturer-week-column" key={day}>
              {lecturerPeriodStarts.map((start, periodIndex) => {
                const unavailable = hasLecturerUnavailability(
                  unavailability,
                  dayIndex,
                  start,
                  start + 60,
                )
                return (
                  <button
                    className={`lecturer-week-period${unavailable ? ' is-unavailable' : ''}`}
                    key={start}
                    type="button"
                    style={{ gridRow: periodIndex + 1 }}
                    onClick={() => onToggleUnavailable(dayIndex, start, start + 60)}
                    aria-label={`${day} ${formatAvailabilityTime(start)} to ${formatAvailabilityTime(start + 60)}, ${unavailable ? 'clear unavailable time' : 'mark unavailable'}`}
                    aria-pressed={unavailable}
                    title={`${unavailable ? 'Click to clear' : 'Click to mark unavailable'} · ${formatAvailabilityTime(start)}–${formatAvailabilityTime(start + 60)}`}
                  />
                )
              })}
              {unavailability
                .filter((block) => block.day === dayIndex)
                .map((block) => {
                  const { startIndex, periodCount } = getLecturerTimetableRows(
                    block.start,
                    block.end - block.start,
                  )
                  return (
                    <div
                      className="lecturer-week-unavailable"
                      key={`${block.start}-${block.end}`}
                      style={{
                        top: `${(startIndex / lecturerPeriodStarts.length) * 100}%`,
                        height: `${(periodCount / lecturerPeriodStarts.length) * 100}%`,
                      }}
                      title={`Unavailable ${formatAvailabilityTime(block.start)}–${formatAvailabilityTime(block.end)}`}
                    >
                      <b>Unavailable</b>
                      <span>
                        {formatAvailabilityTime(block.start)}–{formatAvailabilityTime(block.end)}
                      </span>
                    </div>
                  )
                })}
              {sessions
                .filter((session) => session.day === dayIndex)
                .map((session) => {
                  const { startIndex, periodCount } = getLecturerTimetableRows(
                    session.start,
                    session.duration,
                  )
                  const unavailable = hasLecturerUnavailability(
                    unavailability,
                    dayIndex,
                    session.start,
                    getSessionEnd(session),
                  )
                  const isBottom = startIndex + periodCount >= lecturerPeriodStarts.length
                  return (
                    <button
                      className={`lecturer-week-session${isBottom ? ' is-bottom' : ''}${unavailable ? ' is-unavailable' : ''}`}
                      key={getSessionKey(session)}
                      style={{
                        top: `${(startIndex / lecturerPeriodStarts.length) * 100}%`,
                        height: `${(periodCount / lecturerPeriodStarts.length) * 100}%`,
                        ...(isBottom ? { borderBottom: 'none' } : {}),
                      }}
                      onClick={() => onReschedule(session)}
                      aria-label={`${session.code} ${session.title}, ${formatAvailabilityTime(session.start)} in ${session.room}${unavailable ? ', lecturer unavailable' : ''}`}
                      title={`${session.code} · ${session.title} · ${session.room}`}
                    >
                      <small>{formatAvailabilityTime(session.start)}</small>
                      <b>
                        {session.code} · {session.title}
                      </b>
                      <span>{session.room}</span>
                      {unavailable && <em>Unavailable</em>}
                    </button>
                  )
                })}
            </div>
          ))}
        </div>
      </div>
      <p className="lecturer-timetable-hint">
        Classes are clickable for rescheduling. Unavailable blocks are recurring each week and
        remain highlighted across the timetable.
      </p>
    </div>
  )
}

function PageIcon({ name }: { name: string }) {
  if (!isAppIconName(name)) throw new Error(`Unknown workspace icon: ${name}`)
  return <AppIcon name={name} size={17} />
}

function Heading({
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
    <section className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </section>
  )
}

function Metric({
  label,
  value,
  note,
  icon,
}: {
  label: string
  value: string
  note: string
  icon: string
}) {
  return (
    <div className="workspace-metric">
      <i>
        <PageIcon name={icon} />
      </i>
      <div>
        <span>{label}</span>
        <b>{value}</b>
        <small>{note}</small>
      </div>
    </div>
  )
}

function downloadCsv(filename: string, rows: string[][]) {
  const contents = rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
    .join('\r\n')
  const blob = new Blob([`\uFEFF${contents}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function CoursesPage({
  courses,
  lecturers,
  sessions,
  onAdd,
  onUpdatePattern,
  onSplit,
  onNavigate,
}: {
  courses: Course[]
  lecturers: Lecturer[]
  sessions: Session[]
  onAdd: (course: Course) => void
  onUpdatePattern: (
    course: Course,
    pattern: CourseMeetingPattern,
    isTechnical: boolean,
  ) => boolean | string
  onSplit: (
    course: Course,
    groupAEnrollment: number,
    groupALecturer: string,
    groupBEnrollment: number,
    groupBLecturer: string,
  ) => boolean
  onNavigate: (page: string) => void
}) {
  const [query, setQuery] = useState('')
  const [major, setMajor] = useState('All majors')
  const [showForm, setShowForm] = useState(false)
  const [splittingCourseKey, setSplittingCourseKey] = useState<string | null>(null)
  const [editingPatternKey, setEditingPatternKey] = useState<string | null>(null)
  const [patternDraft, setPatternDraft] = useState<{
    isTechnical: boolean
    sessionDuration: number
    meetingsPerWeek: number
  } | null>(null)
  const [notice, setNotice] = useState('')
  const [newCourseLevel, setNewCourseLevel] = useState(200)
  const [newSessionType, setNewSessionType] = useState('Lecture')
  const [newIsTechnical, setNewIsTechnical] = useState(false)
  const [newSessionDuration, setNewSessionDuration] = useState(120)
  const [newMeetingsPerWeek, setNewMeetingsPerWeek] = useState(2)
  const isNewTechnical = newIsTechnical || newSessionType === 'Practical'
  const majors = [...new Set(courses.map((course) => course.major))]
  const filtered = courses.filter((course) => {
    const matchesText = `${course.code} ${course.title} ${course.lecturer}`
      .toLowerCase()
      .includes(query.toLowerCase())
    return matchesText && (major === 'All majors' || course.major === major)
  })
  const addCourse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const selectedGroup = String(data.get('group'))
    const level = Number(data.get('level'))
    const sessionDuration = Number(data.get('sessionDuration'))
    const meetingsPerWeek = Number(data.get('meetingsPerWeek'))
    const code = String(data.get('code')).trim().toUpperCase()
    const title = String(data.get('title')).trim()
    const sessionType = String(data.get('sessionType'))
    const isTechnical = data.get('isTechnical') === 'on' || sessionType === 'Practical'
    const patternError = getCourseMeetingPatternError(
      { code, title, level, sessionType, isTechnical },
      sessionDuration,
      meetingsPerWeek,
    )
    if (patternError) {
      setNotice(patternError)
      return
    }
    const course: Course = {
      code,
      title,
      major: String(data.get('major')),
      level,
      enrollment: Number(data.get('enrollment')),
      lecturer: String(data.get('lecturer')).trim() || 'Unassigned',
      sessionType,
      credits: Number(data.get('credits')),
      status: 'Draft',
      isTechnical,
      group: selectedGroup === 'A' || selectedGroup === 'B' ? selectedGroup : undefined,
      sessionDuration,
      meetingsPerWeek,
      weeklyHours: (sessionDuration / 60) * meetingsPerWeek,
    }
    if (courses.some((existing) => getSectionKey(existing) === getSectionKey(course))) {
      setNotice(
        `${course.code} already has a ${course.group ? `Group ${course.group}` : 'whole-cohort'} section for ${course.major}, Level ${course.level}.`,
      )
      return
    }
    onAdd(course)
    setNotice(`${course.code} added as a draft course.`)
    setShowForm(false)
    event.currentTarget.reset()
    setNewCourseLevel(200)
    setNewSessionType('Lecture')
    setNewIsTechnical(false)
    setNewSessionDuration(120)
    setNewMeetingsPerWeek(2)
  }
  const splittingCourse = courses.find((course) => getSectionKey(course) === splittingCourseKey)
  const editingPatternCourse = courses.find((course) => getSectionKey(course) === editingPatternKey)
  const startEditingPattern = (course: Course) => {
    const defaults = getDefaultCourseMeetingPattern(course)
    setEditingPatternKey(getSectionKey(course))
    setPatternDraft({
      isTechnical: isTechnicalCourse(course),
      sessionDuration: course.sessionDuration ?? defaults.sessionDuration,
      meetingsPerWeek: course.meetingsPerWeek ?? defaults.meetingsPerWeek,
    })
    setNotice('')
  }
  const savePattern = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingPatternCourse || !patternDraft) return
    const updatedCourse = { ...editingPatternCourse, isTechnical: patternDraft.isTechnical }
    const patternError = getCourseMeetingPatternError(
      updatedCourse,
      patternDraft.sessionDuration,
      patternDraft.meetingsPerWeek,
    )
    if (patternError) {
      setNotice(patternError)
      return
    }
    const pattern = {
      sessionDuration: patternDraft.sessionDuration,
      meetingsPerWeek: patternDraft.meetingsPerWeek,
      weeklyHours: (patternDraft.sessionDuration / 60) * patternDraft.meetingsPerWeek,
    }
    const result = onUpdatePattern(editingPatternCourse, pattern, patternDraft.isTechnical)
    if (typeof result === 'string') {
      setNotice(result)
      return
    }
    if (!result) {
      setNotice('The meeting pattern was not changed.')
      return
    }
    setNotice(
      `${editingPatternCourse.code} pattern saved: ${pattern.sessionDuration / 60}h × ${pattern.meetingsPerWeek} per week.`,
    )
    setEditingPatternKey(null)
    setPatternDraft(null)
  }
  return (
    <>
      <Heading
        eyebrow="Academic records · Sample data"
        title="Course catalogue"
        description="Courses stay as one whole cohort by default. Split A/B only when enrollment needs separate classes; smaller classes can stay with one lecturer."
      >
        <button className="button primary" onClick={() => setShowForm((open) => !open)}>
          <PageIcon name="plus" /> Add course
        </button>
      </Heading>
      <div className="workspace-metrics">
        <Metric
          label="Course sections"
          value={String(courses.length)}
          note="Sample records"
          icon="book"
        />
        <Metric
          label="Scheduled"
          value={String(courses.filter((course) => course.status === 'Scheduled').length)}
          note="Have a timetable slot"
          icon="calendar"
        />
        <Metric
          label="Needs scheduling"
          value={String(courses.filter((course) => course.status === 'Draft').length)}
          note="Draft / unallocated"
          icon="clock"
        />
        <Metric
          label="Majors represented"
          value={String(majors.length)}
          note="In this sample"
          icon="students"
        />
      </div>
      {notice && (
        <div className="workspace-notice">
          <span>{notice}</span>
          <button onClick={() => setNotice('')}>Dismiss</button>
        </div>
      )}
      {showForm && (
        <form className="card workspace-form" onSubmit={addCourse}>
          <div className="card-head">
            <div>
              <h2>Add a sample course</h2>
              <p>
                Technical courses meet for two hours twice a week. Other courses can use a validated
                weekly pattern; non-technical Level 100 core courses may meet for three hours once.
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Close form"
              onClick={() => setShowForm(false)}
            >
              ×
            </button>
          </div>
          <div className="workspace-form-grid">
            <label>
              Course code
              <input name="code" required placeholder="e.g. CS 410" />
            </label>
            <label>
              Course title
              <input name="title" required placeholder="Course title" />
            </label>
            <label>
              Major
              <select name="major" required>
                {majors.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Class group (optional)
              <select name="group" defaultValue="">
                <option value="">Whole cohort (default)</option>
                <option value="A">Group A</option>
                <option value="B">Group B</option>
              </select>
              <small>
                Use A/B only for a course that is intentionally split into separate classes.
              </small>
            </label>
            <label>
              Level
              <select
                name="level"
                value={newCourseLevel}
                onChange={(event) => {
                  const level = Number(event.target.value)
                  setNewCourseLevel(level)
                  if (!isNewTechnical) {
                    setNewSessionDuration(level === 100 ? 180 : 120)
                    setNewMeetingsPerWeek(level === 100 ? 1 : 2)
                  }
                }}
              >
                {[100, 200, 300, 400].map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </label>
            <label>
              Expected enrollment
              <input name="enrollment" type="number" min="1" defaultValue="30" required />
            </label>
            <label>
              Session type
              <select
                name="sessionType"
                value={newSessionType}
                onChange={(event) => {
                  const sessionType = event.target.value
                  setNewSessionType(sessionType)
                  if (sessionType === 'Practical') {
                    setNewIsTechnical(true)
                    setNewSessionDuration(120)
                    setNewMeetingsPerWeek(2)
                  }
                }}
              >
                <option>Lecture</option>
                <option>Tutorial</option>
                <option>Practical</option>
              </select>
            </label>
            <label>
              Technical course
              <span className="flex items-center gap-2">
                <input
                  checked={isNewTechnical}
                  disabled={newSessionType === 'Practical'}
                  name="isTechnical"
                  onChange={(event) => {
                    const isTechnical = event.target.checked
                    setNewIsTechnical(isTechnical)
                    setNewSessionDuration(isTechnical ? 120 : newCourseLevel === 100 ? 180 : 120)
                    setNewMeetingsPerWeek(isTechnical ? 2 : newCourseLevel === 100 ? 1 : 2)
                  }}
                  type="checkbox"
                />
                Fixed 2-hour meetings twice weekly
              </span>
            </label>
            <label>
              Credits
              <input name="credits" type="number" min="1" max="12" defaultValue="3" required />
            </label>
            <label>
              Meeting length
              <select
                name="sessionDuration"
                value={newSessionDuration}
                onChange={(event) => setNewSessionDuration(Number(event.target.value))}
              >
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                {newCourseLevel === 100 && !isNewTechnical && (
                  <option value={180}>3 hours · Level 100 core</option>
                )}
              </select>
            </label>
            <label>
              Meetings per week
              <select
                name="meetingsPerWeek"
                value={newMeetingsPerWeek}
                onChange={(event) => setNewMeetingsPerWeek(Number(event.target.value))}
              >
                {(isNewTechnical ? [2] : [1, 2]).map((meetings) => (
                  <option key={meetings} value={meetings}>
                    {meetings}
                  </option>
                ))}
              </select>
              <small>
                Total: {(newSessionDuration / 60) * newMeetingsPerWeek} contact hours per week.
              </small>
            </label>
            <label>
              Lecturer
              <select aria-label="Assign lecturer" name="lecturer" defaultValue="">
                <option value="">Unassigned</option>
                {lecturers.map((lecturer) => (
                  <option value={lecturer.name} key={lecturer.id}>
                    {lecturer.name}
                  </option>
                ))}
              </select>
              <small>Assign a lecturer to this major and group section.</small>
            </label>
          </div>
          <div className="workspace-form-actions">
            <button type="button" className="button secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="button primary" type="submit">
              Add draft course
            </button>
          </div>
        </form>
      )}
      {splittingCourse && (
        <form
          className="card workspace-form"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const groupAEnrollment = Number(data.get('groupAEnrollment'))
            const groupBEnrollment = Number(data.get('groupBEnrollment'))
            if (groupAEnrollment + groupBEnrollment !== splittingCourse.enrollment) {
              setNotice(
                `Group A and B counts must add up to ${splittingCourse.enrollment} students.`,
              )
              return
            }
            const hasScheduledMeetings = sessions.some(
              (session) => getSectionKey(session) === getSectionKey(splittingCourse),
            )
            const groupBScheduled = onSplit(
              splittingCourse,
              groupAEnrollment,
              String(data.get('groupALecturer')),
              groupBEnrollment,
              String(data.get('groupBLecturer')),
            )
            if (!groupBScheduled) {
              setNotice(
                `${splittingCourse.code} was not split because no conflict-free slot was available for Group B. The existing course was kept unchanged.`,
              )
              return
            }
            setNotice(
              `${splittingCourse.code} split into Groups A and B for ${splittingCourse.major}.${hasScheduledMeetings ? ' Group B was assigned the first conflict-free slot and room.' : ' Both groups remain drafts until they are scheduled.'}`,
            )
            setSplittingCourseKey(null)
          }}
        >
          <div className="card-head">
            <div>
              <h2>Split {splittingCourse.code} into Groups A and B</h2>
              <p>
                Set the headcount and lecturer for each group. The two counts must total{' '}
                {splittingCourse.enrollment}.
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Close split form"
              onClick={() => setSplittingCourseKey(null)}
            >
              ×
            </button>
          </div>
          <div className="workspace-form-grid">
            {(['A', 'B'] as const).map((group) => (
              <div className="card" key={group} style={{ padding: 14 }}>
                <h3>Group {group}</h3>
                <label>
                  Students
                  <input
                    name={`group${group}Enrollment`}
                    type="number"
                    min="1"
                    defaultValue={
                      group === 'A'
                        ? Math.ceil(splittingCourse.enrollment / 2)
                        : Math.floor(splittingCourse.enrollment / 2)
                    }
                    required
                  />
                </label>
                <label>
                  Lecturer
                  <select name={`group${group}Lecturer`} defaultValue={splittingCourse.lecturer}>
                    <option value="Unassigned">Unassigned</option>
                    {lecturers.map((lecturer) => (
                      <option key={lecturer.id} value={lecturer.name}>
                        {lecturer.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
          <div className="workspace-form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setSplittingCourseKey(null)}
            >
              Cancel
            </button>
            <button className="button primary" type="submit">
              Create Groups A and B
            </button>
          </div>
        </form>
      )}
      {editingPatternCourse && patternDraft && (
        <form className="card workspace-form" onSubmit={savePattern}>
          <div className="card-head">
            <div>
              <h2>Edit {editingPatternCourse.code} weekly pattern</h2>
              <p>
                Scheduled meetings are reassigned only if the complete pattern fits without room,
                lecturer, or cohort conflicts.
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Close pattern editor"
              onClick={() => {
                setEditingPatternKey(null)
                setPatternDraft(null)
              }}
            >
              ×
            </button>
          </div>
          <div className="workspace-form-grid">
            <label>
              Technical course
              <span className="flex items-center gap-2">
                <input
                  checked={patternDraft.isTechnical}
                  disabled={editingPatternCourse.sessionType === 'Practical'}
                  onChange={(event) => {
                    const isTechnical = event.target.checked
                    const defaults = getDefaultCourseMeetingPattern({
                      ...editingPatternCourse,
                      isTechnical,
                    })
                    setPatternDraft({
                      isTechnical,
                      sessionDuration: defaults.sessionDuration,
                      meetingsPerWeek: defaults.meetingsPerWeek,
                    })
                  }}
                  type="checkbox"
                />
                Fixed 2-hour meetings twice weekly
              </span>
            </label>
            <label>
              Meeting length
              <select
                disabled={patternDraft.isTechnical}
                value={patternDraft.sessionDuration}
                onChange={(event) =>
                  setPatternDraft((current) =>
                    current ? { ...current, sessionDuration: Number(event.target.value) } : current,
                  )
                }
              >
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                {editingPatternCourse.level === 100 && !patternDraft.isTechnical && (
                  <option value={180}>3 hours · Level 100 core</option>
                )}
              </select>
            </label>
            <label>
              Meetings per week
              <select
                disabled={patternDraft.isTechnical}
                value={patternDraft.meetingsPerWeek}
                onChange={(event) =>
                  setPatternDraft((current) =>
                    current ? { ...current, meetingsPerWeek: Number(event.target.value) } : current,
                  )
                }
              >
                {(patternDraft.isTechnical ? [2] : [1, 2]).map((meetings) => (
                  <option key={meetings} value={meetings}>
                    {meetings}
                  </option>
                ))}
              </select>
              <small>
                Total: {(patternDraft.sessionDuration / 60) * patternDraft.meetingsPerWeek} hours
                per week.
              </small>
            </label>
          </div>
          <div className="workspace-form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setEditingPatternKey(null)
                setPatternDraft(null)
              }}
            >
              Cancel
            </button>
            <button className="button primary" type="submit">
              Save weekly pattern
            </button>
          </div>
        </form>
      )}
      <section className="card workspace-table-card">
        <div className="workspace-toolbar">
          <label className="field-search">
            <PageIcon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search code, title or lecturer"
            />
          </label>
          <select
            aria-label="Filter by major"
            value={major}
            onChange={(event) => setMajor(event.target.value)}
          >
            <option>All majors</option>
            {majors.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button
            className="button secondary"
            onClick={() =>
              downloadCsv('academic-city-courses.csv', [
                [
                  'Code',
                  'Title',
                  'Major',
                  'Level',
                  'Group',
                  'Section ID',
                  'Enrollment',
                  'Lecturer',
                  'Type',
                  'Technical',
                  'Credits',
                  'Meeting length (minutes)',
                  'Meetings per week',
                  'Weekly hours',
                  'Status',
                ],
                ...filtered.map((course) => [
                  course.code,
                  course.title,
                  course.major,
                  String(course.level),
                  course.group ?? 'Whole cohort',
                  course.sectionId ?? '',
                  String(course.enrollment),
                  course.lecturer,
                  course.sessionType,
                  String(isTechnicalCourse(course)),
                  String(course.credits),
                  String(course.sessionDuration ?? ''),
                  String(course.meetingsPerWeek ?? ''),
                  String(course.weeklyHours ?? ''),
                  course.status,
                ]),
              ])
            }
          >
            <PageIcon name="download" /> Export CSV
          </button>
        </div>
        <div className="workspace-table-scroll">
          <table className="workspace-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Major & level</th>
                <th>Group</th>
                <th>Enrollment</th>
                <th>Lecturer</th>
                <th>Format</th>
                <th>Credits</th>
                <th>Weekly pattern</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => {
                const scheduled = sessions.filter(
                  (session) => getSectionKey(session) === getSectionKey(course),
                )
                const hasGroupSections = courses.some(
                  (other) =>
                    other.code === course.code &&
                    other.major === course.major &&
                    other.level === course.level &&
                    other.group,
                )
                return (
                  <tr key={getSectionKey(course)}>
                    <td>
                      <b>{course.code}</b>
                      <span>{course.title}</span>
                      {course.sectionId && <small>Sample section · {course.sectionId}</small>}
                    </td>
                    <td>
                      {course.major}
                      <small>Level {course.level}</small>
                    </td>
                    <td>{course.group ? `Group ${course.group}` : 'Whole cohort'}</td>
                    <td>{course.enrollment}</td>
                    <td>{course.lecturer}</td>
                    <td>
                      {course.sessionType}
                      {isTechnicalCourse(course) && <small>Technical · fixed 2h × 2 / week</small>}
                    </td>
                    <td>{course.credits}</td>
                    <td>
                      {course.sessionDuration && course.meetingsPerWeek
                        ? `${course.sessionDuration / 60}h × ${course.meetingsPerWeek} / week · ${course.weeklyHours}h total`
                        : 'Not set'}
                    </td>
                    <td>
                      {scheduled.length ? (
                        <div className="grid gap-1">
                          {scheduled.map((session) => (
                            <span key={getSessionKey(session)}>
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][session.day]} ·{' '}
                              {String(Math.floor(session.start / 60)).padStart(2, '0')}:00
                            </span>
                          ))}
                        </div>
                      ) : (
                        <button className="text-button" onClick={() => onNavigate('Scheduling')}>
                          Find a slot <PageIcon name="arrow" />
                        </button>
                      )}
                    </td>
                    <td>
                      <span
                        className={`workspace-status ${course.status === 'Scheduled' ? 'positive' : 'warning'}`}
                      >
                        {course.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <button className="text-button" onClick={() => startEditingPattern(course)}>
                          Edit pattern
                        </button>
                        {!course.group && !hasGroupSections && course.enrollment > 1 && (
                          <button
                            className="text-button"
                            onClick={() => {
                              setSplittingCourseKey(getSectionKey(course))
                              setNotice('')
                            }}
                          >
                            Split A/B
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="workspace-empty">No courses match these filters.</div>
        )}
        <div className="table-note">
          Sample catalogue only. Additions are temporary and do not update university records.
        </div>
      </section>
    </>
  )
}

export function StudentsPage({
  students,
  sessions,
  onReschedule,
}: {
  students: Student[]
  sessions: Session[]
  onReschedule: (session: Session) => void
}) {
  const [query, setQuery] = useState('')
  const [major, setMajor] = useState('All majors')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 25
  const majors = [...new Set(students.map((student) => student.major))]
  const filtered = students.filter(
    (student) =>
      `${student.id} ${student.name}`.toLowerCase().includes(query.toLowerCase()) &&
      (major === 'All majors' || student.major === major),
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleStudents = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  const selected = students.find((student) => student.id === selectedId)
  const cohortSessions = selected
    ? sessions.filter(
        (session) =>
          session.studentVisible !== false &&
          session.major === selected.major &&
          session.level === selected.level,
      )
    : []
  const cohortCourseCount = new Set(
    cohortSessions.filter((session) => !session.isWorkshop).map(getSectionKey),
  ).size
  const cohortWorkshopCount = cohortSessions.filter((session) => session.isWorkshop).length
  return (
    <>
      <Heading
        eyebrow="Academic records · Sample data"
        title="Student directory"
        description="Open any student profile to review academic details, status, and the shared cohort timetable."
      />
      <div className="workspace-metrics">
        <Metric
          label="Roster records"
          value={String(students.length)}
          note="Not the full university register"
          icon="students"
        />
        <Metric
          label="Registered"
          value={String(students.filter((student) => student.status === 'Registered').length)}
          note="Sample status"
          icon="check"
        />
        <Metric
          label="Pending"
          value={String(students.filter((student) => student.status === 'Pending').length)}
          note="Registration review"
          icon="clock"
        />
        <Metric
          label="Cohorts"
          value={String(
            new Set(students.map((student) => `${student.major}-${student.level}`)).size,
          )}
          note="Major and level pairs"
          icon="book"
        />
      </div>
      <section className="card workspace-table-card">
        <div className="workspace-toolbar">
          <label className="field-search">
            <PageIcon name="search" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setCurrentPage(0)
              }}
              placeholder="Search student name or ID"
            />
          </label>
          <select
            aria-label="Filter student major"
            value={major}
            onChange={(event) => {
              setMajor(event.target.value)
              setCurrentPage(0)
            }}
          >
            <option>All majors</option>
            {majors.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button
            className="button secondary"
            onClick={() =>
              downloadCsv('academic-city-student-sample.csv', [
                ['Student ID', 'Name', 'Major', 'Level', 'Courses', 'Registration', 'Progression'],
                ...filtered.map((student) => [
                  student.id,
                  student.name,
                  student.major,
                  String(student.level),
                  String(student.courses),
                  student.status,
                  student.progressionStatus,
                ]),
              ])
            }
          >
            <PageIcon name="download" /> Export CSV
          </button>
        </div>
        <div className="workspace-table-scroll">
          <table className="workspace-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Programme</th>
                <th>Level</th>
                <th>Courses</th>
                <th>Registration</th>
                <th>Progression</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <b>{student.name}</b>
                    <span>{student.id}</span>
                  </td>
                  <td>{student.major}</td>
                  <td>{student.level}</td>
                  <td>{student.courses}</td>
                  <td>
                    <span
                      className={`workspace-status ${student.status === 'Registered' ? 'positive' : 'warning'}`}
                    >
                      {student.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`workspace-status ${student.progressionStatus === 'Approved' ? 'positive' : 'warning'}`}
                    >
                      {student.progressionStatus}
                    </span>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => setSelectedId(selectedId === student.id ? null : student.id)}
                    >
                      {selectedId === student.id ? 'Close profile' : 'View profile'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee] px-4 py-3">
            <p className="text-[11px] text-[#7d7d79]">
              Showing {currentPage * pageSize + 1}–
              {Math.min((currentPage + 1) * pageSize, filtered.length)} of {filtered.length}{' '}
              students
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="button secondary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                Previous
              </button>
              <span className="min-w-16 text-center text-[11px] text-[#686863]">
                Page {currentPage + 1} of {pageCount}
              </span>
              <button
                type="button"
                className="button secondary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage + 1 >= pageCount}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="workspace-empty">No students match these filters.</div>
        )}
        <div className="table-note">
          Sample students only. Profile details are illustrative; cohort timetables show shared
          scheduled courses, not an individual transcript.
        </div>
      </section>
      {selected && (
        <section className="card workspace-detail">
          <div className="card-head flex-wrap">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f1f1ef] text-sm font-semibold text-[#a22d2b]">
                  {selected.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()}
                </span>
                <div>
                  <p className="eyebrow">Student profile · {selected.id}</p>
                  <h2>{selected.name}</h2>
                  <p>
                    {selected.major} · Level {selected.level}
                  </p>
                </div>
              </div>
            </div>
            <button type="button" className="text-button" onClick={() => setSelectedId(null)}>
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[#ecece9] bg-[#fcfcfb] px-3 py-2.5">
              <p className="text-[10px] text-[#858580]">Enrolled courses</p>
              <p className="mt-1 text-sm font-semibold text-[#30302f]">{selected.courses}</p>
            </div>
            <div className="rounded-lg border border-[#ecece9] bg-[#fcfcfb] px-3 py-2.5">
              <p className="text-[10px] text-[#858580]">Registration</p>
              <span
                className={`mt-1 inline-flex workspace-status ${selected.status === 'Registered' ? 'positive' : 'warning'}`}
              >
                {selected.status}
              </span>
            </div>
            <div className="rounded-lg border border-[#ecece9] bg-[#fcfcfb] px-3 py-2.5">
              <p className="text-[10px] text-[#858580]">Progression</p>
              <span
                className={`mt-1 inline-flex workspace-status ${selected.progressionStatus === 'Approved' ? 'positive' : 'warning'}`}
              >
                {selected.progressionStatus}
              </span>
            </div>
            <div className="rounded-lg border border-[#ecece9] bg-[#fcfcfb] px-3 py-2.5">
              <p className="text-[10px] text-[#858580]">Cohort timetable</p>
              <p className="mt-1 text-sm font-semibold text-[#30302f]">
                {cohortCourseCount} courses · {cohortWorkshopCount} career workshop
              </p>
            </div>
          </div>
          <div className="mb-3 mt-5">
            <p className="eyebrow">Shared cohort timetable</p>
            <p className="mt-1 text-xs text-[#777772]">
              Courses scheduled for {selected.major}, Level {selected.level}.
            </p>
          </div>
          {cohortSessions.length ? (
            <div className="workspace-session-list">
              {cohortSessions.map((session) => (
                <div key={getSessionKey(session)}>
                  <span className="session-day">
                    {['MON', 'TUE', 'WED', 'THU', 'FRI'][session.day]}
                  </span>
                  <div>
                    <b>
                      {session.title} · {session.code}
                    </b>
                    <small>
                      {String(Math.floor(session.start / 60)).padStart(2, '0')}:00–
                      {formatAvailabilityTime(getSessionEnd(session))} · {session.room} ·{' '}
                      {session.lecturer}
                    </small>
                  </div>
                  <button className="text-button" onClick={() => onReschedule(session)}>
                    Reschedule
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="workspace-empty">
              No classes are currently scheduled for this sample cohort.
            </div>
          )}
        </section>
      )}
    </>
  )
}

export function LecturersPage({
  lecturers,
  courses,
  sessions,
  lecturerUnavailability,
  onAdd,
  onToggleLecturerUnavailability,
  onReschedule,
}: {
  lecturers: Lecturer[]
  courses: Course[]
  sessions: Session[]
  lecturerUnavailability: LecturerUnavailabilityByName
  onAdd: (lecturer: Lecturer) => void
  onToggleLecturerUnavailability: (
    lecturerName: string,
    day: number,
    start: number,
    end: number,
  ) => void
  onReschedule: (session: Session) => void
}) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(lecturers[0]?.id ?? '')
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const filtered = lecturers.filter((lecturer) =>
    `${lecturer.name} ${lecturer.department}`.toLowerCase().includes(query.toLowerCase()),
  )
  const addLecturer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name')).trim()
    const email = String(data.get('email')).trim().toLowerCase()
    const department = String(data.get('department')).trim()
    const office = String(data.get('office')).trim()
    const weeklyLimit = Number(data.get('weeklyLimit'))

    if (
      !name ||
      !department ||
      !office ||
      !Number.isInteger(weeklyLimit) ||
      weeklyLimit < 1 ||
      weeklyLimit > 40
    ) {
      setNotice('Enter a name, department, office, and a weekly limit from 1 to 40 hours.')
      return
    }
    if (!/^[^\s@]+@acity\.edu\.gh$/i.test(email)) {
      setNotice('Use the teacher’s @acity.edu.gh email address.')
      return
    }
    if (
      lecturers.some(
        (lecturer) =>
          lecturer.name.toLowerCase() === name.toLowerCase() ||
          lecturer.email.toLowerCase() === email,
      )
    ) {
      setNotice('A teacher with this name or email is already in the roster.')
      return
    }

    const nextEmployeeNumber =
      lecturers.reduce((largest, lecturer) => {
        const match = /^EMP-(\d+)$/i.exec(lecturer.id)
        return Math.max(largest, Number(match?.[1] ?? 0))
      }, 0) + 1
    const lecturer: Lecturer = {
      id: `EMP-${String(nextEmployeeNumber).padStart(3, '0')}`,
      name,
      email,
      department,
      office,
      weeklyLimit,
    }

    onAdd(lecturer)
    setSelectedId(lecturer.id)
    setNotice(`${name} added to this demo roster. Assign courses from the Course catalogue.`)
    setShowForm(false)
    event.currentTarget.reset()
  }
  const selected = lecturers.find((lecturer) => lecturer.id === selectedId)
  const assignedCourses = courses.filter((course) => course.lecturer === selected?.name)
  const teaching = sessions.filter((session) => session.lecturer === selected?.name)
  const selectedUnavailability = selected ? (lecturerUnavailability[selected.name] ?? []) : []
  return (
    <>
      <Heading
        eyebrow="Academic records · Sample data"
        title="Lecturer assignments"
        description="Add demo teachers, assign courses, and review their weekly timetable."
      >
        <div className="lecturer-heading-actions">
          <button className="button primary" onClick={() => setShowForm((open) => !open)}>
            <PageIcon name="plus" /> Add teacher
          </button>
          <a
            className="button secondary"
            href="https://acity.edu.gh/faculty/"
            target="_blank"
            rel="noreferrer"
          >
            Official faculty directory
          </a>
        </div>
      </Heading>
      <div className="workspace-metrics">
        <Metric
          label="Lecturers"
          value={String(lecturers.length)}
          note="Sample staff records"
          icon="lecturer"
        />
        <Metric
          label="Scheduled sessions"
          value={String(sessions.length)}
          note="Across all sample staff"
          icon="calendar"
        />
        <Metric
          label="Teaching hours"
          value={`${sessions.reduce((sum, session) => sum + session.duration / 60, 0)} hrs`}
          note="Sample week total"
          icon="clock"
        />
        <Metric
          label="Unassigned courses"
          value={String(
            sessions.filter(
              (session) => !lecturers.some((lecturer) => lecturer.name === session.lecturer),
            ).length,
          )}
          note="Check course assignments"
          icon="alert"
        />
      </div>
      {notice && (
        <div className="workspace-notice">
          <span>{notice}</span>
          <button onClick={() => setNotice('')}>Dismiss</button>
        </div>
      )}
      {showForm && (
        <form className="card workspace-form" onSubmit={addLecturer}>
          <div className="card-head">
            <div>
              <h2>Add a demo teacher</h2>
              <p>
                Add a roster profile, then assign this teacher when creating a course in the Course
                catalogue.
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Close form"
              onClick={() => setShowForm(false)}
            >
              ×
            </button>
          </div>
          <div className="workspace-form-grid">
            <label>
              Teacher name
              <input name="name" required maxLength={100} placeholder="e.g. Ama Mensah" />
            </label>
            <label>
              Institution email
              <input
                name="email"
                type="email"
                required
                maxLength={160}
                placeholder="name@acity.edu.gh"
              />
            </label>
            <label>
              Department
              <input
                name="department"
                required
                maxLength={100}
                placeholder="e.g. Computer Science"
              />
            </label>
            <label>
              Office
              <input name="office" required maxLength={100} placeholder="e.g. Tech 2.14" />
            </label>
            <label>
              Weekly teaching limit (hours)
              <input name="weeklyLimit" type="number" min="1" max="40" defaultValue="12" required />
            </label>
          </div>
          <div className="workspace-form-actions">
            <button type="button" className="button secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="button primary" type="submit">
              Add teacher
            </button>
          </div>
        </form>
      )}
      <div className="workspace-split lecturer-workspace-layout">
        <section className="card lecturer-roster-card">
          <div className="workspace-toolbar lecturer-roster-toolbar">
            <div>
              <h2>Lecturer directory</h2>
              <p>
                {filtered.length} sample staff records · Select a lecturer to view their profile and
                week
              </p>
            </div>
            <label className="field-search">
              <PageIcon name="search" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search lecturer or department"
              />
            </label>
          </div>
          <div className="lecturer-roster-grid">
            {filtered.map((lecturer) => {
              const assigned = sessions.filter((session) => session.lecturer === lecturer.name)
              const hours = assigned.reduce((sum, session) => sum + session.duration / 60, 0)
              return (
                <button
                  type="button"
                  key={lecturer.id}
                  className={`lecturer-roster-card-item${selectedId === lecturer.id ? ' is-selected' : ''}`}
                  onClick={() => setSelectedId(lecturer.id)}
                  aria-pressed={selectedId === lecturer.id}
                >
                  <span className="lecturer-roster-avatar" aria-hidden="true">
                    {getLecturerInitials(lecturer.name)}
                  </span>
                  <span className="lecturer-roster-info">
                    <b>{lecturer.name}</b>
                    <small>{lecturer.department}</small>
                    <small>
                      {lecturer.id} · {lecturer.email} · {lecturer.office}
                    </small>
                  </span>
                  <span className="lecturer-roster-load">
                    <b>{assigned.length}</b>
                    <small>sessions</small>
                    <small>
                      {hours} / {lecturer.weeklyLimit} hrs
                    </small>
                  </span>
                </button>
              )
            })}
          </div>
          {filtered.length === 0 && (
            <div className="workspace-empty">No lecturers match your search.</div>
          )}
          <div className="table-note">
            Teaching assignments shown here are sample records. Academic City’s public faculty
            directory does not publish course-by-course timetables.
          </div>
        </section>
        {selected && (
          <section className="card workspace-detail lecturer-detail lecturer-profile-card">
            <div className="lecturer-profile-header">
              <span className="lecturer-profile-avatar" aria-hidden="true">
                {getLecturerInitials(selected.name)}
              </span>
              <div>
                <p className="eyebrow">Lecturer profile · {selected.id}</p>
                <h2>{selected.name}</h2>
                <p>
                  {selected.department} · {selected.office}
                </p>
                <p>{selected.email}</p>
              </div>
              <span className="workspace-status positive">Sample record</span>
            </div>
            <div className="lecturer-profile-stats">
              <div>
                <span>Scheduled sessions</span>
                <b>{teaching.length}</b>
              </div>
              <div>
                <span>Weekly teaching load</span>
                <b>
                  {teaching.reduce((sum, session) => sum + session.duration / 60, 0)} /{' '}
                  {selected.weeklyLimit} hrs
                </b>
              </div>
              <div>
                <span>Unavailable hours</span>
                <b>
                  {selectedUnavailability.reduce(
                    (total, block) => total + (block.end - block.start) / 60,
                    0,
                  )}
                </b>
              </div>
            </div>
            <section className="lecturer-assignment-summary">
              <div className="lecturer-assignment-summary-heading">
                <h3>Courses handled</h3>
                <span>{assignedCourses.length} assigned courses</span>
              </div>
              {assignedCourses.length > 0 ? (
                <ul className="lecturer-assignment-list">
                  {assignedCourses.map((course) => (
                    <li key={getSectionKey(course)}>
                      <span>
                        <b>{course.code}</b>
                        <small>{course.title}</small>
                      </span>
                      <span>
                        <b>{course.major}</b>
                        <small>
                          Level {course.level}
                          {course.group ? ` · Group ${course.group}` : ''}
                        </small>
                      </span>
                      <span>
                        <b>{course.status}</b>
                        <small>{course.enrollment} students</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lecturer-assignment-empty">
                  No courses are assigned yet. Add a course and select this teacher in the Course
                  catalogue.
                </p>
              )}
            </section>
            <div className="load-meter lecturer-profile-load">
              <span>Teaching load</span>
              <b>
                {teaching.reduce((sum, session) => sum + session.duration / 60, 0)} of{' '}
                {selected.weeklyLimit} hrs
              </b>
              <div className="bar">
                <i
                  style={{
                    width: `${Math.min(100, (teaching.reduce((sum, session) => sum + session.duration / 60, 0) / selected.weeklyLimit) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <LecturerWeeklyTimetable
              sessions={teaching}
              unavailability={selectedUnavailability}
              onToggleUnavailable={(day, start, end) =>
                onToggleLecturerUnavailability(selected.name, day, start, end)
              }
              onReschedule={onReschedule}
            />
            <p className="table-note">
              Teaching assignments and availability are sample data and last only for this browser
              session.
            </p>
          </section>
        )}
      </div>
    </>
  )
}

type ScheduleAuditCategory = 'Room' | 'Lecturer' | 'Cohort' | 'Other'

type ScheduleAuditFinding = {
  id: string
  category: ScheduleAuditCategory
  code: string
  title: string
  detail: string
  severity: 'High' | 'Medium'
}

function ScheduleAuditPanel({
  findings,
  description,
}: {
  findings: ScheduleAuditFinding[]
  description: string
}) {
  const [filter, setFilter] = useState<'All' | ScheduleAuditCategory>('All')
  const [expanded, setExpanded] = useState(false)
  const categories: ScheduleAuditCategory[] = ['Room', 'Lecturer', 'Cohort', 'Other']
  const counts = categories.map((category) => ({
    category,
    count: findings.filter((finding) => finding.category === category).length,
  }))
  const filtered =
    filter === 'All' ? findings : findings.filter((finding) => finding.category === filter)
  const visible = expanded ? filtered : filtered.slice(0, 5)

  return (
    <section className="card workspace-audit schedule-audit">
      <div className="schedule-audit-heading">
        <div>
          <h2>Schedule audit</h2>
          <p>
            {description} Alternative elective options may share a slot; each student is checked
            against their selected option.
          </p>
        </div>
        <span
          className={`workspace-status ${findings.length ? 'warning' : 'positive'}`}
          aria-live="polite"
        >
          {findings.length ? `${findings.length} findings` : 'No conflicts'}
        </span>
      </div>
      {findings.length ? (
        <>
          <div className="schedule-audit-summary">
            {counts
              .filter(({ count }) => count > 0)
              .map(({ category, count }) => (
                <div key={category}>
                  <span>
                    {category === 'Other'
                      ? 'Other checks'
                      : category === 'Room'
                        ? 'Room checks'
                        : `${category} conflicts`}
                  </span>
                  <b>{count}</b>
                </div>
              ))}
          </div>
          <div className="schedule-audit-filters" aria-label="Filter audit findings">
            <button
              className={filter === 'All' ? 'active' : ''}
              aria-pressed={filter === 'All'}
              onClick={() => {
                setFilter('All')
                setExpanded(false)
              }}
            >
              All <span>{findings.length}</span>
            </button>
            {counts
              .filter(({ count }) => count > 0)
              .map(({ category, count }) => (
                <button
                  className={filter === category ? 'active' : ''}
                  aria-pressed={filter === category}
                  key={category}
                  onClick={() => {
                    setFilter(category)
                    setExpanded(false)
                  }}
                >
                  {category} <span>{count}</span>
                </button>
              ))}
          </div>
          <ul className={`schedule-audit-findings ${expanded ? 'expanded' : ''}`}>
            {visible.map((finding) => (
              <li key={finding.id}>
                <span className={`audit-category audit-category-${finding.category.toLowerCase()}`}>
                  {finding.category}
                </span>
                <div>
                  <b>{finding.title}</b>
                  <p>{finding.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          {filtered.length > 5 && (
            <button
              className="audit-expand-button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Show fewer findings' : `Show all ${filtered.length} findings`}
            </button>
          )}
        </>
      ) : (
        <p className="audit-clear">
          <PageIcon name="check" /> No room, lecturer or cohort overlaps were found in the scheduled
          classes.
        </p>
      )}
    </section>
  )
}

export function SchedulingPage({
  sessions,
  courses,
  rooms,
  settings,
  lecturerUnavailability,
  onNavigate,
}: {
  sessions: Session[]
  courses: Course[]
  rooms: Room[]
  settings: AppSettings
  lecturerUnavailability: LecturerUnavailabilityByName
  onNavigate: (page: string) => void
}) {
  const [generated, setGenerated] = useState(false)
  const [priorities, setPriorities] = useState([84, 72, 58, 46])
  const [showAllDraftCourses, setShowAllDraftCourses] = useState(false)
  const issues = useMemo<ScheduleAuditFinding[]>(() => {
    const results: ScheduleAuditFinding[] = []
    sessions.forEach((session) => {
      if (
        hasLecturerUnavailability(
          lecturerUnavailability[session.lecturer],
          session.day,
          session.start,
          getSessionEnd(session),
        )
      )
        results.push({
          id: `availability-${getSessionKey(session)}`,
          category: 'Other',
          code: session.code,
          title: `${session.code} · Lecturer availability`,
          detail: `${session.lecturer} is marked unavailable during this class.`,
          severity: 'High',
        })
      const room = rooms.find((item) => item.name === session.room)
      if (!room || room.capacity < session.enrollment + settings.roomCapacityBuffer)
        results.push({
          id: `capacity-${getSessionKey(session)}`,
          category: 'Room',
          code: session.code,
          title: `${session.code} · Room capacity`,
          detail: `No room meets enrollment plus the ${settings.roomCapacityBuffer}-seat buffer.`,
          severity: 'High',
        })
      if (room && !isRoomCompatibleWithSession(session, room))
        results.push({
          id: `room-type-${getSessionKey(session)}`,
          category: 'Room',
          code: session.code,
          title: `${session.code} · Room type`,
          detail: `Assigned room ${session.room} does not match the session type.`,
          severity: 'High',
        })
    })
    findScheduleConflicts(sessions).forEach(({ type, session, other }) => {
      const category = type === 'room' ? 'Room' : type === 'lecturer' ? 'Lecturer' : 'Cohort'
      const detail =
        type === 'room'
          ? `Room ${session.room} is also booked for ${other.code}.`
          : type === 'lecturer'
            ? `${session.lecturer} is assigned to ${other.code} at the same time.`
            : `${session.major} Level ${session.level} also has ${other.code} at this time.`
      results.push({
        id: `conflict-${getSessionKey(session)}-${getSessionKey(other)}`,
        category,
        code: session.code,
        title: `${session.code} and ${other.code}`,
        detail,
        severity: 'High',
      })
    })
    return results
  }, [sessions, rooms, settings.roomCapacityBuffer, lecturerUnavailability])
  const draftCourses = courses.filter(
    (course) => !sessions.some((session) => getSectionKey(session) === getSectionKey(course)),
  )
  const score = Math.max(
    0,
    Math.round(((courses.length - draftCourses.length) / Math.max(1, courses.length)) * 100) -
      issues.length * 8,
  )
  const visibleDraftCourses = showAllDraftCourses ? draftCourses : draftCourses.slice(0, 5)
  return (
    <>
      <Heading
        eyebrow="Academic operations · Sample data"
        title="Generate timetable"
        description="Audit current placements and preview coverage before planning another schedule run."
      >
        <button className="button primary" onClick={() => setGenerated(true)}>
          <PageIcon name="chart" /> Run schedule check
        </button>
      </Heading>
      <div className="stepper">
        {['Source data', 'Semester setup', 'Constraints', 'Generate & review'].map(
          (step, index) => (
            <div className={index < (generated ? 4 : 3) ? 'done' : 'active'} key={step}>
              <i>{index < (generated ? 4 : 3) ? <PageIcon name="check" /> : index + 1}</i>
              <span>{step}</span>
            </div>
          ),
        )}
      </div>
      <div className="scheduling-grid">
        <section className="card constraint-card">
          <div className="card-head">
            <div>
              <h2>Hard scheduling rules</h2>
              <p>These checks are always applied to any proposed move.</p>
            </div>
            <span className="required-label">Required</span>
          </div>
          {[
            ['Avoid same-room overlaps', 'No two classes can use a room at the same time.'],
            ['Avoid lecturer conflicts', 'A lecturer can only teach one class at a time.'],
            [
              'Protect major and level cohorts',
              'Required classes cannot overlap; each student is checked against their selected elective.',
            ],
            [
              'Respect room capacity and type',
              `Allow ${settings.roomCapacityBuffer} spare seats above expected enrollment.`,
            ],
          ].map(([title, detail]) => (
            <div className="constraint" key={title}>
              <span>
                <b>{title}</b>
                <small>{detail}</small>
              </span>
              <i className="constraint-enabled">
                <PageIcon name="check" />
              </i>
            </div>
          ))}
        </section>
        <section className="card constraint-card">
          <div className="card-head">
            <div>
              <h2>Optimisation preferences</h2>
              <p>Preferences rank candidate schedules after hard checks pass.</p>
            </div>
            <button className="text-button" onClick={() => setPriorities([84, 72, 58, 46])}>
              Reset
            </button>
          </div>
          {[
            'Reduce cohort timetable gaps',
            'Use the smallest suitable room',
            'Balance lecturer workloads',
            'Keep classes on fewer days',
          ].map((label, index) => (
            <label className="priority" key={label}>
              <span>
                <b>{label}</b>
                <small>{priorities[index]} / 100 priority</small>
              </span>
              <input
                aria-label={label}
                type="range"
                min="0"
                max="100"
                value={priorities[index]}
                onChange={(event) =>
                  setPriorities((current) =>
                    current.map((value, position) =>
                      position === index ? Number(event.target.value) : value,
                    ),
                  )
                }
              />
            </label>
          ))}
        </section>
        <section className={`card results-card ${generated ? 'ready' : ''}`}>
          <div className="results-icon">
            <PageIcon name={generated ? 'check' : 'chart'} />
          </div>
          <h2>
            {generated ? 'Sample schedule audit complete' : 'Ready to check the sample schedule'}
          </h2>
          <p>
            {generated
              ? 'The counts below are calculated from the sample catalogue and timetable. This preview does not generate or publish a full institutional timetable.'
              : `Evaluate ${courses.length} sample courses, ${sessions.length} scheduled sessions, ${rooms.length} sample rooms and all available lecturer and cohort assignments.`}
          </p>
          {generated && (
            <div className="result-metrics">
              <span>
                <b>{sessions.length}</b>Placed
              </span>
              <span>
                <b>{draftCourses.length}</b>Unplaced
              </span>
              <span>
                <b>{issues.length}</b>Rule conflicts
              </span>
              <span>
                <b>{score}</b>Coverage
              </span>
            </div>
          )}
          <button
            className="button secondary"
            onClick={() => (generated ? onNavigate('Timetables') : setGenerated(true))}
          >
            {generated ? 'Review sample timetable' : 'Run sample checks'}
          </button>
        </section>
        <ScheduleAuditPanel
          findings={issues}
          description="Conflicts are grouped by room, lecturer and student cohort. Only five findings are shown at a time."
        />
        <section className="card workspace-audit">
          <div className="card-head">
            <div>
              <h2>Courses awaiting a slot</h2>
              <p>Unallocated courses are listed separately from schedule conflicts.</p>
            </div>
            <span className={`workspace-status ${draftCourses.length ? 'warning' : 'positive'}`}>
              {draftCourses.length ? `${draftCourses.length} unallocated` : 'All placed'}
            </span>
          </div>
          {draftCourses.length ? (
            <div className={`draft-course-list ${showAllDraftCourses ? 'expanded' : ''}`}>
              {visibleDraftCourses.map((course) => (
                <div key={getSectionKey(course)}>
                  <b>
                    {course.code}
                    {course.group ? ` · Group ${course.group}` : ''}
                  </b>
                  <span>
                    {course.title} · {course.major}, Level {course.level} · {course.enrollment}{' '}
                    students
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>Every catalogue course is scheduled.</p>
          )}
          {draftCourses.length > 5 && (
            <button
              className="audit-expand-button"
              aria-expanded={showAllDraftCourses}
              onClick={() => setShowAllDraftCourses((expanded) => !expanded)}
            >
              {showAllDraftCourses
                ? 'Show fewer courses'
                : `Show all ${draftCourses.length} unallocated courses`}
            </button>
          )}
        </section>
      </div>
    </>
  )
}

export function OptimisationPage({
  courses,
  sessions,
  rooms,
  lecturerUnavailability,
  onReschedule,
  onNavigate,
}: {
  courses: Course[]
  sessions: Session[]
  rooms: Room[]
  lecturerUnavailability: LecturerUnavailabilityByName
  onReschedule: (session: Session) => void
  onNavigate: (page: string) => void
}) {
  const [filter, setFilter] = useState<'All' | 'High' | 'Unscheduled'>('All')
  const [showAllFindings, setShowAllFindings] = useState(false)
  const issues = useMemo(() => {
    const results: {
      id: string
      code: string
      title: string
      detail: string
      session?: Session
      severity: 'High' | 'Medium'
      kind: 'check' | 'overlap' | 'unallocated'
    }[] = []
    sessions.forEach((session) => {
      if (
        hasLecturerUnavailability(
          lecturerUnavailability[session.lecturer],
          session.day,
          session.start,
          getSessionEnd(session),
        )
      )
        results.push({
          id: `availability-${getSessionKey(session)}`,
          code: session.code,
          title: session.title,
          detail: `${session.lecturer} is marked unavailable during this class.`,
          session,
          severity: 'High',
          kind: 'check',
        })
      const room = rooms.find((item) => item.name === session.room)
      if (!room || room.capacity < session.enrollment)
        results.push({
          id: `capacity-${getSessionKey(session)}`,
          code: session.code,
          title: session.title,
          detail: `Room capacity does not cover ${session.enrollment} students.`,
          session,
          severity: 'High',
          kind: 'check',
        })
      if (room && !isRoomCompatibleWithSession(session, room))
        results.push({
          id: `room-type-${getSessionKey(session)}`,
          code: session.code,
          title: session.title,
          detail: `Assigned room ${session.room} does not meet the requested room type.`,
          session,
          severity: 'High',
          kind: 'check',
        })
    })
    findScheduleConflicts(sessions).forEach(({ type, session, other }) => {
      const detail =
        type === 'room'
          ? `Room ${session.room} is also assigned to ${other.code} at this time.`
          : type === 'lecturer'
            ? `${session.lecturer} is also assigned to ${other.code} at this time.`
            : `${session.major} Level ${session.level} also has ${other.code} at this time.`
      results.push({
        id: `conflict-${getSessionKey(session)}-${getSessionKey(other)}`,
        code: session.code,
        title: session.title,
        detail,
        session,
        severity: 'High',
        kind: 'overlap',
      })
    })
    courses
      .filter(
        (course) => !sessions.some((session) => getSectionKey(session) === getSectionKey(course)),
      )
      .forEach((course) =>
        results.push({
          id: `unallocated-${getSectionKey(course)}`,
          code: course.code,
          title: course.title,
          detail: `${course.major}, Level ${course.level}${course.group ? ` · Group ${course.group}` : ''} · ${course.enrollment} students · no timetable allocation yet.`,
          severity: 'Medium',
          kind: 'unallocated',
        }),
      )
    return results
  }, [courses, sessions, rooms, lecturerUnavailability])
  const filtered = issues.filter(
    (issue) => filter === 'All' || (filter === 'High' ? issue.severity === 'High' : !issue.session),
  )
  const visible = showAllFindings ? filtered : filtered.slice(0, 10)
  const scheduled = courses.filter((course) =>
    sessions.some((session) => getSectionKey(session) === getSectionKey(course)),
  ).length
  const conflictCount = issues.filter((issue) => issue.kind === 'overlap').length
  return (
    <>
      <Heading
        eyebrow="Quality assurance · Sample data"
        title="Schedule optimisation"
        description="Inspect placement conflicts and unallocated courses, then jump to a safe rescheduling flow."
      >
        <button className="button secondary" onClick={() => onNavigate('Scheduling')}>
          <PageIcon name="chart" /> Configure schedule check
        </button>
      </Heading>
      <div className="workspace-metrics">
        <Metric
          label="Scheduled coverage"
          value={`${courses.length ? Math.round((scheduled / courses.length) * 100) : 0}%`}
          note={`${scheduled} of ${courses.length} sample courses`}
          icon="calendar"
        />
        <Metric
          label="Placement conflicts"
          value={String(conflictCount)}
          note="Room, lecturer and cohort checks"
          icon="alert"
        />
        <Metric
          label="Unallocated courses"
          value={String(courses.length - scheduled)}
          note="Need a room and time"
          icon="clock"
        />
        <Metric
          label="Sample rooms"
          value={String(rooms.length)}
          note="Capacity and type checked"
          icon="building"
        />
      </div>
      <section className="card workspace-table-card">
        <div className="workspace-toolbar">
          <div>
            <h2>Items to review</h2>
            <p>Findings are recalculated from the current sample schedule.</p>
          </div>
          <div className="segmented">
            {(['All', 'High', 'Unscheduled'] as const).map((value) => (
              <button
                className={filter === value ? 'active' : ''}
                key={value}
                onClick={() => {
                  setFilter(value)
                  setShowAllFindings(false)
                }}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        {visible.length ? (
          <div className="workspace-table-scroll">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Finding</th>
                  <th>Severity</th>
                  <th>Current allocation</th>
                  <th>Next step</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <b>{issue.code}</b>
                      <span>{issue.title}</span>
                    </td>
                    <td>{issue.detail}</td>
                    <td>
                      <span
                        className={`workspace-status ${issue.severity === 'High' ? 'warning' : ''}`}
                      >
                        {issue.severity}
                      </span>
                    </td>
                    <td>
                      {issue.session
                        ? `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][issue.session.day]} · ${String(Math.floor(issue.session.start / 60)).padStart(2, '0')}:00 · ${issue.session.room}`
                        : 'Unallocated'}
                    </td>
                    <td>
                      {issue.session ? (
                        <button
                          className="text-button"
                          onClick={() => onReschedule(issue.session!)}
                        >
                          Find a safe slot <PageIcon name="arrow" />
                        </button>
                      ) : (
                        <button className="text-button" onClick={() => onNavigate('Scheduling')}>
                          Plan placement <PageIcon name="arrow" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="workspace-empty">
            <PageIcon name="check" /> No items match this filter. The current sample schedule has no
            detected placement conflicts.
          </div>
        )}
        {filtered.length > 10 && (
          <button
            className="audit-expand-button"
            aria-expanded={showAllFindings}
            onClick={() => setShowAllFindings((value) => !value)}
          >
            {showAllFindings ? 'Show fewer findings' : `Show all ${filtered.length} findings`}
          </button>
        )}
      </section>
      <div className="workspace-callout">
        <PageIcon name="alert" />
        <div>
          <b>Sample-data limitation</b>
          <span>
            Student course registrations, declared lecturer unavailability, equipment inventories
            and production records are not connected in this demo.
          </span>
        </div>
      </div>
    </>
  )
}

export function ReportsPage({
  courses,
  students,
  lecturers,
  sessions,
  rooms,
}: {
  courses: Course[]
  students: Student[]
  lecturers: Lecturer[]
  sessions: Session[]
  rooms: Room[]
}) {
  const [period, setPeriod] = useState('Current sample week')
  const hours = sessions.reduce((sum, session) => sum + session.duration / 60, 0)
  const assignedRooms = rooms.filter((room) =>
    sessions.some((session) => session.room === room.name),
  )
  const averageCapacity = sessions.length
    ? Math.round(
        sessions.reduce(
          (sum, session) => sum + (rooms.find((room) => room.name === session.room)?.capacity ?? 0),
          0,
        ) / sessions.length,
      )
    : 0
  const byMajor = [...new Set(courses.map((course) => course.major))].map((major) => ({
    major,
    count: sessions.filter((session) => session.major === major).length,
  }))
  const byRoomType = [...new Set(rooms.map((room) => room.type))].map((type) => ({
    type,
    rooms: rooms.filter((room) => room.type === type).length,
    sessions: sessions.filter(
      (session) => rooms.find((room) => room.name === session.room)?.type === type,
    ).length,
  }))
  const exportReport = () =>
    downloadCsv('academic-city-scheduling-report.csv', [
      ['Metric', 'Value'],
      ['Period', period],
      ['Course sections', String(courses.length)],
      ['Scheduled sessions', String(sessions.length)],
      [
        'Unallocated courses',
        String(
          courses.filter(
            (course) =>
              !sessions.some((session) => getSectionKey(session) === getSectionKey(course)),
          ).length,
        ),
      ],
      ['Sample students', String(students.length)],
      ['Sample lecturers', String(lecturers.length)],
      ['Rooms in sample', String(rooms.length)],
      ['Teaching hours per sample week', String(hours)],
      ['Average capacity of assigned rooms', String(averageCapacity)],
      [],
      ['Course', 'Major', 'Level', 'Group', 'Lecturer', 'Day', 'Start', 'Room', 'Enrollment'],
      ...sessions.map((session) => [
        session.code,
        session.major,
        String(session.level),
        session.group ?? 'Whole cohort',
        session.lecturer,
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][session.day],
        `${String(Math.floor(session.start / 60)).padStart(2, '0')}:00`,
        session.room,
        String(session.enrollment),
      ]),
    ])
  return (
    <>
      <Heading
        eyebrow="Insights · Sample data"
        title="Reports & analytics"
        description="Explore resource allocation, cohort coverage and teaching load in the sample timetable."
      >
        <button className="button secondary" onClick={exportReport}>
          <PageIcon name="download" /> Export report CSV
        </button>
      </Heading>
      <div className="workspace-report-controls">
        <span>Report period</span>
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option>Current sample week</option>
          <option>Full sample catalogue</option>
        </select>
        <small>These figures describe the included demo records, not university-wide totals.</small>
      </div>
      <div className="workspace-metrics">
        <Metric
          label="Scheduled sessions"
          value={String(sessions.length)}
          note={`Across ${period.toLowerCase()}`}
          icon="calendar"
        />
        <Metric
          label="Unallocated courses"
          value={String(
            courses.filter(
              (course) =>
                !sessions.some((session) => getSectionKey(session) === getSectionKey(course)),
            ).length,
          )}
          note="Require timetable planning"
          icon="clock"
        />
        <Metric
          label="Teaching hours"
          value={`${hours} hrs`}
          note="Per sample week"
          icon="lecturer"
        />
        <Metric
          label="Rooms used"
          value={`${assignedRooms.length} / ${rooms.length}`}
          note={`Mean allocated capacity ${averageCapacity}`}
          icon="building"
        />
      </div>
      <div className="report-grid">
        <section className="card report-chart">
          <div className="card-head">
            <div>
              <h2>Scheduled sessions by major</h2>
              <p>Current sample timetable allocations</p>
            </div>
          </div>
          <div className="bar-chart">
            {byMajor.map(({ major, count }) => (
              <div key={major}>
                <span>{major}</span>
                <i>
                  <b
                    style={{
                      width: `${sessions.length ? Math.max(8, (count / sessions.length) * 100) : 0}%`,
                    }}
                  />
                </i>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="card workload">
          <div className="card-head">
            <div>
              <h2>Teaching load by lecturer</h2>
              <p>Contact hours in the sample week</p>
            </div>
          </div>
          {lecturers.map((lecturer) => {
            const assigned = sessions.filter((session) => session.lecturer === lecturer.name)
            const lecturerHours = assigned.reduce((sum, session) => sum + session.duration / 60, 0)
            return (
              <div key={lecturer.id}>
                <span>{lecturer.name}</span>
                <b>{lecturerHours} hrs</b>
                <em>{assigned.length} sessions</em>
              </div>
            )
          })}
        </section>
        <section className="card report-wide">
          <div className="card-head">
            <div>
              <h2>Room type utilisation</h2>
              <p>Booked sessions compared with rooms in the demo data</p>
            </div>
          </div>
          <div className="workspace-room-report">
            {byRoomType.map(({ type, rooms: roomCount, sessions: sessionCount }) => (
              <div key={type}>
                <div>
                  <b>{type}</b>
                  <span>
                    {sessionCount} bookings · {roomCount} sample rooms
                  </span>
                </div>
                <div className="bar">
                  <i
                    style={{
                      width: `${Math.min(100, roomCount ? (sessionCount / roomCount / 5) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="workspace-callout">
        <PageIcon name="alert" />
        <div>
          <b>How to read this report</b>
          <span>
            The sample roster contains {students.length} student records and {lecturers.length}{' '}
            lecturer records. It is not representative of the full institution.
          </span>
        </div>
      </div>
    </>
  )
}

export function SettingsPage({
  settings,
  onSave,
}: {
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}) {
  const [draft, setDraft] = useState(settings)
  const [saved, setSaved] = useState(false)
  const activeYear = Number(/^(\d{4})\/\d{2}/.exec(draft.semester)?.[1] ?? new Date().getFullYear())
  const firstYear = activeYear - 3
  const lastYear = activeYear + 3
  const semesterOptions = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => {
    const year = firstYear + index
    const yearEnd = String((year + 1) % 100).padStart(2, '0')
    return [1, 2].map((semester) => `${year}/${yearEnd} · Semester ${semester}`)
  }).flat()
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  const calculatedPeriods = useMemo(() => {
    return calculateTimetablePeriods(
      draft.dayStartTime || '08:00',
      draft.periodDuration || 60,
      draft.breakDuration !== undefined ? draft.breakDuration : 10,
      draft.dayEndTime || '18:20',
    )
  }, [draft.dayStartTime, draft.periodDuration, draft.breakDuration, draft.dayEndTime])
  const periodDuration = draft.periodDuration || 60
  const calculatedDayEnd = minutesToTimeString(
    (calculatedPeriods[calculatedPeriods.length - 1] ?? 480) + periodDuration,
  )
  return (
    <>
      <Heading
        eyebrow="Workspace preferences · Sample data"
        title="System settings"
        description="Configure how this local scheduling prototype presents and checks timetable data."
      />
      <div className="workspace-settings-grid">
        <section className="card workspace-setting-card">
          <div className="card-head">
            <div>
              <h2>Academic term</h2>
              <p>Move between semesters or choose a term directly.</p>
            </div>
            <PageIcon name="calendar" />
          </div>
          <label>
            Active academic semester
            <select
              value={draft.semester}
              onChange={(event) => update('semester', event.target.value)}
            >
              {semesterOptions.map((semester) => (
                <option key={semester}>{semester}</option>
              ))}
            </select>
            <small>
              Changing the term updates the active context; sample schedules remain shared.
            </small>
          </label>
          <label>
            Campus
            <input
              value={draft.campus}
              onChange={(event) => update('campus', event.target.value)}
            />
          </label>
          <label>
            Time zone
            <select
              value={draft.timezone}
              onChange={(event) => update('timezone', event.target.value)}
            >
              <option>Africa/Accra (GMT)</option>
              <option>UTC</option>
            </select>
          </label>
          <label>
            Default class duration
            <select
              value={draft.defaultSessionLength}
              onChange={(event) => update('defaultSessionLength', Number(event.target.value))}
            >
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </label>
        </section>
        <section className="card workspace-setting-card">
          <div className="card-head">
            <div>
              <h2>Scheduling safeguards</h2>
              <p>Applied to the sample slot-suggestion flow.</p>
            </div>
            <PageIcon name="check" />
          </div>
          <label>
            Minimum spare room capacity
            <input
              type="number"
              min="0"
              max="30"
              value={draft.roomCapacityBuffer}
              onChange={(event) =>
                update('roomCapacityBuffer', Math.max(0, Number(event.target.value)))
              }
            />
            <small>A room must fit the enrollment plus this buffer.</small>
          </label>
          <label className="setting-toggle">
            <span>
              <b>Show conflict warnings</b>
              <small>Display room, lecturer and cohort overlap findings.</small>
            </span>
            <input
              type="checkbox"
              checked={draft.conflictWarnings}
              onChange={(event) => update('conflictWarnings', event.target.checked)}
            />
          </label>
          <label className="setting-toggle">
            <span>
              <b>Scheduling notifications</b>
              <small>Show local confirmation notices after sample actions.</small>
            </span>
            <input
              type="checkbox"
              checked={draft.notifications}
              onChange={(event) => update('notifications', event.target.checked)}
            />
          </label>
        </section>

        <section className="card workspace-setting-card timing-config-card col-span-full">
          <div className="flex flex-col gap-4 border-b border-[#eee9e6] bg-[#fff9f8] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#ffedeb] text-[#ad3532]">
                <PageIcon name="clock" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a34c49]">
                  Scheduling setup
                </p>
                <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-[#252525] sm:text-[20px]">
                  Timetable timing &amp; structure
                </h2>
                <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[#72716e]">
                  Set the daily teaching window and period spacing. The schedule preview updates as
                  you make changes.
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#e9e2df] bg-white px-3 py-2 text-[11px] font-semibold text-[#5f5a57] shadow-sm">
              <span className="size-2 rounded-full bg-[#4b9b69]" />
              Live preview
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
            <label className="timing-setting-field">
              <span>Day start time</span>
              <input
                className="timing-setting-control"
                type="time"
                value={draft.dayStartTime || '08:00'}
                onChange={(event) => update('dayStartTime', event.target.value)}
              />
              <small>When the first class begins.</small>
            </label>

            <label className="timing-setting-field">
              <span>Class period duration</span>
              <select
                className="timing-setting-control"
                value={periodDuration}
                onChange={(event) => {
                  const val = Number(event.target.value)
                  update('periodDuration', val)
                  update('defaultSessionLength', val)
                }}
              >
                <option value={45}>45 minutes</option>
                <option value={50}>50 minutes</option>
                <option value={60}>60 minutes (1 hour)</option>
                <option value={75}>75 minutes (1h 15m)</option>
                <option value={90}>90 minutes (1.5 hours)</option>
                <option value={120}>120 minutes (2 hours)</option>
              </select>
              <small>Length of one timetable period.</small>
            </label>

            <label className="timing-setting-field">
              <span>Break between periods</span>
              <select
                className="timing-setting-control"
                value={draft.breakDuration !== undefined ? draft.breakDuration : 10}
                onChange={(event) => update('breakDuration', Number(event.target.value))}
              >
                <option value={0}>No break (0 min)</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
              <small>Transition time between classes.</small>
            </label>

            <label className="timing-setting-field">
              <span>Day end time limit</span>
              <input
                className="timing-setting-control"
                type="time"
                value={draft.dayEndTime || '18:20'}
                onChange={(event) => update('dayEndTime', event.target.value)}
              />
              <small>Latest allowable class finish time.</small>
            </label>
          </div>

          <div className="mx-5 mb-5 rounded-2xl border border-[#ece8e5] bg-[#faf9f7] p-4 sm:mx-6 sm:mb-6 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#9c4a47] shadow-sm ring-1 ring-[#e9e3df]">
                  <PageIcon name="calendar" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#85807c]">
                    Daily timetable
                  </p>
                  <h3 className="mt-0.5 text-[14px] font-semibold text-[#292827]">
                    {calculatedPeriods.length} periods per day
                  </h3>
                </div>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#eae5e1] bg-white px-3 py-2 text-[11px] text-[#706b67]">
                <span className="font-medium">Teaching window</span>
                <strong className="font-semibold text-[#363331]">
                  {draft.dayStartTime || '08:00'} – {calculatedDayEnd}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-9">
              {calculatedPeriods.map((startMin, idx) => {
                const endMin = startMin + periodDuration
                return (
                  <div
                    key={startMin}
                    className="min-w-0 rounded-xl border border-[#e8e4e1] bg-white px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d8aaa7] hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="grid size-6 place-items-center rounded-lg bg-[#fff1f0] text-[10px] font-bold text-[#a83b38]">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#96918d]">
                        Period
                      </span>
                    </div>
                    <p className="mt-2 text-center text-[11px] font-semibold tracking-tight text-[#302e2c]">
                      {minutesToTimeString(startMin)} – {minutesToTimeString(endMin)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>
      <section className="card workspace-setting-card settings-disclaimer">
        <h2>Data and privacy</h2>
        <p>
          All content in this workspace is illustrative. Settings and edits exist only in the
          current browser session. No student, lecturer or timetable information is sent to or saved
          in a university system.
        </p>
        <div className="workspace-form-actions">
          <span>
            {saved ? 'Preferences updated for this session.' : 'Unsaved session preferences'}
          </span>
          <button
            className="button primary"
            onClick={() => {
              onSave(draft)
              setSaved(true)
            }}
          >
            Save preferences
          </button>
        </div>
      </section>
    </>
  )
}
