'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  getAcademicPeriodForSemester,
  getSectionKey,
  getSessionEnd,
  isSessionInAcademicPeriod,
} from './scheduler-types'
import type { Session, Student } from './scheduler-types'
import type { AppNotification } from './RoleViews'
import { AdminTimetable } from './AdminTimetable'
import { NextClassCountdown } from './NextClassCountdown'
import { GoogleCalendarModal } from './GoogleCalendarModal'
import { exportTimetablePng } from './export-timetable-png'
import { useTabScrollRestoration } from './use-tab-scroll-restoration'
import AppIcon, { type AppIconName } from './AppIcon'
import {
  formatWeekLabel,
  getCurrentWeekStart,
  getMondayDate,
  getUpcomingGhanaHolidays,
} from './calendar-utils'
import {
  examScheduleData,
  examScheduleStorageKey,
  examWeekStart,
  loadSavedExamSchedule,
  type ExamScheduleItem,
} from './exam-schedule'
import { programmeElectiveGroups } from './programme-curricula'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const CLASS_WEEK_START = getCurrentWeekStart()

function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))
}

function formatExamDateRange(exams: ExamScheduleItem[]) {
  const dates = exams.map((exam) => exam.date).sort()
  const firstDate = dates[0]
  const lastDate = dates[dates.length - 1]
  if (!firstDate || !lastDate) return formatWeekLabel(examWeekStart).replace('Week of ', '')
  return firstDate === lastDate
    ? formatDate(firstDate)
    : `${formatDate(firstDate)} – ${formatDate(lastDate)}`
}

function Icon({ name }: { name: AppIconName }) {
  return <AppIcon name={name} />
}

function downloadStudentPng(title: string) {
  return exportTimetablePng(`${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`)
}

export default function StudentViewPage({
  students,
  sessions,
  studentId,
  notifications,
  semester,
  onLogout,
}: {
  students: Student[]
  sessions: Session[]
  studentId: string
  notifications: AppNotification[]
  semester: string
  onLogout: () => void
}) {
  const [activeTab, setActiveTab] = useState<'home' | 'class' | 'exam' | 'sync'>('home')
  const changeTab = useTabScrollRestoration(activeTab, setActiveTab)
  const [notice, setNotice] = useState('')
  const [pendingElectiveTitle, setPendingElectiveTitle] = useState('')
  const [savedElectiveSelection, setSavedElectiveSelection] = useState<{
    key: string
    title: string | null
  } | null>(null)
  const [examSchedule, setExamSchedule] = useState<ExamScheduleItem[]>(examScheduleData)
  const [isGcalModalOpen, setIsGcalModalOpen] = useState(false)
  const activeNavigationIndex = { home: 0, class: 1, exam: 2, sync: 3 }[activeTab]
  const upcomingHolidays = useMemo(() => getUpcomingGhanaHolidays(5), [])

  const student = students.find((s) => s.id === studentId)
  const studentSemester = /semester\s*2/i.test(semester) ? 2 : 1
  const electiveGroup =
    student?.level === 400 && student.progressionStatus === 'Approved'
      ? programmeElectiveGroups.find(
          (group) =>
            group.major === student.major &&
            group.level === student.level &&
            group.semester === studentSemester,
        )
      : undefined
  const electiveStorageKey =
    student && electiveGroup ? `academic-city-elective:${student.id}:${electiveGroup.id}` : null
  const selectedElectiveTitle =
    savedElectiveSelection?.key === electiveStorageKey ? savedElectiveSelection.title : null
  const electiveSelectionLoaded =
    !electiveStorageKey || savedElectiveSelection?.key === electiveStorageKey

  useEffect(() => {
    const syncExamSchedule = () => {
      try {
        setExamSchedule(loadSavedExamSchedule() ?? examScheduleData)
      } catch (error) {
        console.error('Unable to load saved exam schedule.', error)
        setNotice('The saved exam schedule could not be loaded. Showing sample exams instead.')
      }
    }

    syncExamSchedule()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === examScheduleStorageKey || event.key === null) syncExamSchedule()
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    if (!electiveStorageKey || !electiveGroup) return

    try {
      const savedTitle = window.localStorage.getItem(electiveStorageKey)
      const isAvailable = electiveGroup.choices.some((choice) => choice.title === savedTitle)
      if (savedTitle && !isAvailable) {
        console.error('The saved elective selection is not part of this programme.')
        setNotice('Your saved elective is no longer available. Please choose an elective again.')
      }
      const title = isAvailable ? savedTitle : null
      setSavedElectiveSelection({ key: electiveStorageKey, title })
      setPendingElectiveTitle(title ?? '')
    } catch (error) {
      console.error('Unable to load the saved elective selection.', error)
      setNotice('The saved elective selection could not be loaded. Please choose an elective.')
      setSavedElectiveSelection({ key: electiveStorageKey, title: null })
      setPendingElectiveTitle('')
    }
  }, [electiveGroup, electiveStorageKey])

  const allCohortSessions = useMemo(() => {
    if (!student) return []
    const academicPeriod =
      student.level === 100
        ? semester.includes('Semester 2')
          ? student.intake === 'January'
            ? 'Summer'
            : 'January'
          : student.intake === 'January'
            ? 'January'
            : 'September'
        : getAcademicPeriodForSemester(semester)
    return sessions.filter(
      (session) =>
        session.studentVisible !== false &&
        (session.programmes?.includes(student.major) || session.major === student.major) &&
        session.level === student.level &&
        isSessionInAcademicPeriod(session, academicPeriod) &&
        (!session.intake || session.intake === 'Merged' || session.intake === student.intake),
    )
  }, [sessions, semester, student])
  const cohortSessions = useMemo(
    () =>
      allCohortSessions.filter(
        (session) =>
          !electiveGroup ||
          session.electiveGroup !== electiveGroup.id ||
          session.title === selectedElectiveTitle,
      ),
    [allCohortSessions, electiveGroup, selectedElectiveTitle],
  )
  const enrolledCourseCount = useMemo(
    () => new Set(cohortSessions.filter((session) => !session.isWorkshop).map(getSectionKey)).size,
    [cohortSessions],
  )
  const careerWorkshopCount = cohortSessions.filter((session) => session.isWorkshop).length

  const myExams = useMemo(() => {
    if (!student) return []
    return examSchedule.filter(
      (exam) => exam.major === student.major && exam.level === student.level,
    )
  }, [examSchedule, student])

  // Map exams into sessions for AdminTimetable template
  const examTimetableSessions: Session[] = useMemo(() => {
    if (!student) return []
    return myExams.map((e) => {
      const day = (new Date(`${e.date}T00:00:00Z`).getUTCDay() + 6) % 7
      return {
        day,
        weekStart: getMondayDate(e.date),
        start: e.start,
        duration: e.end - e.start,
        title: e.title,
        code: e.code,
        room: e.room,
        type: 'Exam',
        tone: 'red',
        lecturer: 'Examination Directorate',
        major: e.major,
        level: e.level,
        enrollment: e.enrollment,
        roomType: 'lecture',
      }
    })
  }, [myExams, student])

  const examTimetableWeeks = useMemo(() => {
    const weeks = new Map<string, Session[]>()
    for (const session of examTimetableSessions) {
      const weekStart = session.weekStart ?? getCurrentWeekStart()
      const weekSessions = weeks.get(weekStart) ?? []
      weekSessions.push(session)
      weeks.set(weekStart, weekSessions)
    }
    return [...weeks.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([weekStart, weekSessions]) => ({ weekStart, sessions: weekSessions }))
  }, [examTimetableSessions])

  const nextClass = useMemo(() => {
    if (!cohortSessions.length) return null
    return [...cohortSessions].sort((a, b) => a.day - b.day || a.start - b.start)[0]
  }, [cohortSessions])

  const myNotifications = notifications.filter(
    (n) => n.audience === 'student' && (!n.recipientId || n.recipientId === student?.id),
  )
  const isElectiveSelectionRequired = Boolean(
    electiveGroup && (!electiveSelectionLoaded || !selectedElectiveTitle),
  )

  function saveElectiveSelection() {
    if (
      !electiveStorageKey ||
      !electiveGroup?.choices.some((choice) => choice.title === pendingElectiveTitle)
    ) {
      setNotice('Choose one of the listed electives before continuing.')
      return
    }

    try {
      window.localStorage.setItem(electiveStorageKey, pendingElectiveTitle)
      setSavedElectiveSelection({ key: electiveStorageKey, title: pendingElectiveTitle })
      setNotice('')
    } catch (error) {
      console.error('Unable to save the elective selection.', error)
      setNotice('Your elective selection could not be saved. Please try again.')
    }
  }

  function changeElectiveSelection() {
    if (!electiveStorageKey) return

    try {
      window.localStorage.removeItem(electiveStorageKey)
      setSavedElectiveSelection({ key: electiveStorageKey, title: null })
      setPendingElectiveTitle('')
      setNotice('')
    } catch (error) {
      console.error('Unable to clear the saved elective selection.', error)
      setNotice('Your saved elective could not be cleared. Please try again.')
    }
  }

  if (!student) return null

  return (
    <div className="app student-app">
      <div className="main-shell student-main-shell">
        <header className="topbar">
          <img
            className="topbar-brand"
            src="/academic-city-landscape-cropped.png"
            alt="Academic City"
          />
          <div className="semester-chip">
            <span>Current semester</span>
            <b>{semester}</b>
          </div>
          <div className="topbar-actions">
            <div className="top-profile">
              <span>{student.name.slice(0, 2).toUpperCase()}</span>
              <div>
                <b>{student.name}</b>
                <small>Student · {student.major}</small>
              </div>
            </div>
          </div>
        </header>

        <main className="student-content">
          {isElectiveSelectionRequired ? (
            <section className="card mx-auto my-6 max-w-3xl p-6">
              {notice && (
                <div className="alert-box" role="alert">
                  {notice}
                </div>
              )}
              {electiveSelectionLoaded ? (
                <>
                  <p className="eyebrow">
                    {student.major} · Level {student.level} · Semester {studentSemester}
                  </p>
                  <h1>Choose your elective</h1>
                  <p>
                    Select one elective before opening your timetable. Some elective classes run
                    concurrently, so only your selected course will be included.
                  </p>
                  <fieldset className="mt-5 grid gap-3">
                    <legend className="mb-3 text-sm font-semibold">Available electives</legend>
                    {electiveGroup?.choices.map((choice) => (
                      <label
                        key={choice.code}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-4"
                      >
                        <input
                          type="radio"
                          name="level-400-elective"
                          value={choice.title}
                          checked={pendingElectiveTitle === choice.title}
                          onChange={() => setPendingElectiveTitle(choice.title)}
                          className="mt-1 accent-red-600"
                        />
                        <span className="grid gap-1">
                          <b>{choice.code}</b>
                          <span>{choice.title}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <p className="mt-4 text-xs text-neutral-500">
                    Your choice is saved on this device for this demo.
                  </p>
                  <button
                    type="button"
                    className="button primary mt-5"
                    disabled={!pendingElectiveTitle}
                    onClick={saveElectiveSelection}
                  >
                    Continue to timetable
                  </button>
                </>
              ) : (
                <p role="status">Loading your saved elective selection…</p>
              )}
            </section>
          ) : (
            <>
              {notice && (
                <div
                  className="alert-box"
                  style={{
                    background: '#fdf1f1',
                    border: '1px solid #f2cecd',
                    color: '#9b3533',
                    padding: '10px 14px',
                    borderRadius: 6,
                    marginBottom: 16,
                    fontSize: 12,
                  }}
                >
                  {notice}
                </div>
              )}

              {myNotifications.length > 0 && (
                <div
                  style={{
                    background: '#fff9e6',
                    border: '1px solid #ffe8a3',
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 20,
                  }}
                >
                  <b style={{ fontSize: 12, color: '#7a5200' }}>Timetable Notifications:</b>
                  {myNotifications.map((n) => (
                    <p key={n.id} style={{ fontSize: 12, color: '#7a5200', marginTop: 4 }}>
                      • {n.message}
                    </p>
                  ))}
                </div>
              )}

              {student.progressionStatus !== 'Approved' ? (
                <section className="card mx-auto my-6 max-w-3xl p-6" role="status">
                  <p className="eyebrow">Progression review</p>
                  <h1>Timetable not yet available</h1>
                  <p>
                    This demo roster shows your progression as pending. Your timetable will appear
                    here after your progression is approved.
                  </p>
                  <p className="mt-4">
                    Current status: <strong>{student.progressionStatus}</strong>
                  </p>
                </section>
              ) : (
                <>
                  {/* TAB 1: HOME & DASHBOARD */}
                  {activeTab === 'home' && (
                    <div>
                      <section className="page-heading">
                        <div>
                          <p className="eyebrow">
                            {student.major} · Level {student.level}
                          </p>
                          <h1>Welcome, {student.name.split(' ')[0]}</h1>
                          <p>
                            Current academic schedule overview and upcoming university calendar.
                          </p>
                        </div>
                      </section>

                      {/* Animated Next Class Countdown */}
                      <NextClassCountdown
                        sessions={cohortSessions}
                        role="student"
                        onViewTimetable={() => changeTab('class')}
                        onConnectGoogleCalendar={() => setIsGcalModalOpen(true)}
                      />

                      {/* Metrics */}
                      <div className="metrics" style={{ margin: '20px 0' }}>
                        <div className="stat-card">
                          <div className="stat-icon">
                            <Icon name="book" />
                          </div>
                          <div>
                            <p>Enrolled courses</p>
                            <strong>{enrolledCourseCount}</strong>
                            <small>
                              Official registration · {careerWorkshopCount} career workshop
                            </small>
                          </div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-icon">
                            <Icon name="calendar" />
                          </div>
                          <div>
                            <p>Upcoming exams</p>
                            <strong>{myExams.length}</strong>
                            <small>{formatExamDateRange(myExams)}</small>
                          </div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-icon">
                            <Icon name="clock" />
                          </div>
                          <div>
                            <p>Next class timing</p>
                            <strong>
                              {nextClass
                                ? `${WEEKDAYS[nextClass.day].slice(0, 3)} ${formatTime(nextClass.start)}`
                                : 'None'}
                            </strong>
                            <small>{nextClass ? nextClass.room : 'No upcoming classes'}</small>
                          </div>
                        </div>
                      </div>

                      {/* Next Class Banner & Holiday Panel Grid */}
                      <div className="dashboard-grid">
                        <section className="card schedule-overview">
                          <div className="card-head">
                            <div>
                              <h2>Next Scheduled Class</h2>
                              <p>Weekly cohort sequence</p>
                            </div>
                          </div>

                          {nextClass ? (
                            <div className="dashboard-next-class" style={{ marginTop: 12 }}>
                              <span className="dashboard-next-class-label">Upcoming Class</span>
                              <b>
                                {nextClass.code} · {nextClass.title}
                              </b>
                              <span>
                                {WEEKDAYS[nextClass.day]} · {formatTime(nextClass.start)}–
                                {formatTime(getSessionEnd(nextClass))} · {nextClass.room} ·{' '}
                                {nextClass.lecturer}
                              </span>
                            </div>
                          ) : (
                            <p style={{ fontSize: 12, color: '#777', padding: 12 }}>
                              No upcoming classes this week.
                            </p>
                          )}

                          <div style={{ marginTop: 18 }}>
                            <div className="card-head">
                              <div>
                                <h2>Weekly Timetable at a Glance</h2>
                                <p>Academic City Campus · {semester}</p>
                              </div>
                              <button className="text-button" onClick={() => changeTab('class')}>
                                Open full timetable →
                              </button>
                            </div>
                            <div className="timetable-scroll" style={{ marginTop: 12 }}>
                              <AdminTimetable
                                sessions={cohortSessions}
                                weekStart={CLASS_WEEK_START}
                                showDates={false}
                              />
                            </div>
                          </div>
                        </section>

                        {/* Right Stack: Pending Holidays */}
                        <aside className="right-stack">
                          <section className="card" style={{ padding: 18 }}>
                            <div className="card-head">
                              <div>
                                <h2>Upcoming Campus Holidays</h2>
                                <p>Ghana national & institutional observances</p>
                              </div>
                            </div>
                            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                              {upcomingHolidays.map((h) => (
                                <div
                                  key={h.date}
                                  style={{
                                    padding: '8px 10px',
                                    background: '#fafaf9',
                                    border: '1px solid #f0f0ed',
                                    borderRadius: 6,
                                    fontSize: 11,
                                  }}
                                >
                                  <b style={{ color: '#202124', display: 'block' }}>{h.name}</b>
                                  <span style={{ color: '#888', fontSize: 10 }}>
                                    {formatDate(h.date)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </section>
                        </aside>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CLASS TIMETABLE */}
                  {activeTab === 'class' && (
                    <div>
                      <section className="page-heading">
                        <div>
                          <p className="eyebrow">
                            {student.major} · Level {student.level}
                          </p>
                          <h1>Weekly Class Timetable</h1>
                          <p>
                            Standardized cohort schedule matching university lecture hall
                            allocations.
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          {electiveGroup && (
                            <button className="button secondary" onClick={changeElectiveSelection}>
                              Change elective
                            </button>
                          )}
                          <button
                            className="button secondary"
                            onClick={() => setIsGcalModalOpen(true)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              borderColor: '#4285F4',
                              color: '#1a73e8',
                              fontWeight: 600,
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <rect width="24" height="24" rx="5" fill="#4285F4" />
                              <path
                                d="M5 9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V9Z"
                                fill="#FFFFFF"
                              />
                              <path
                                d="M5 6C5 5.44772 5.44772 5 6 5H18C18.5523 5 19 5.44772 19 6V9H5V6Z"
                                fill="#1967D2"
                              />
                              <text
                                x="12"
                                y="16.5"
                                fill="#1967D2"
                                fontSize="8.5"
                                fontWeight="800"
                                textAnchor="middle"
                              >
                                31
                              </text>
                            </svg>
                            Google Calendar
                          </button>
                          <button
                            className="button secondary"
                            onClick={() => {
                              void downloadStudentPng(`${student.name} Class Timetable`).catch(
                                (error) => {
                                  console.error('Unable to export class timetable PNG.', error)
                                  setNotice('PNG export failed. Please try again.')
                                },
                              )
                            }}
                          >
                            <Icon name="download" /> Export PNG
                          </button>
                        </div>
                      </section>

                      <div className="card" style={{ marginTop: 16 }}>
                        <div className="card-head">
                          <div>
                            <h2>Academic City Master Class Schedule</h2>
                            <p>Repeats weekly during the semester</p>
                          </div>
                        </div>
                        <div className="timetable-scroll" style={{ marginTop: 14 }}>
                          <AdminTimetable
                            sessions={cohortSessions}
                            weekStart={CLASS_WEEK_START}
                            showDates={false}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: EXAM TIMETABLE */}
                  {activeTab === 'exam' && (
                    <div>
                      <section className="page-heading">
                        <div>
                          <p className="eyebrow">Academic City Examination Directorate</p>
                          <h1>Final Examination Schedule</h1>
                          <p>
                            Morning (09:00 - 11:30) and Afternoon (13:00 - 15:30) examination
                            windows and seat allocations.
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            className="button secondary"
                            onClick={() => {
                              void downloadStudentPng(`${student.name} Exam Docket`).catch(
                                (error) => {
                                  console.error('Unable to export exam timetable PNG.', error)
                                  setNotice('PNG export failed. Please try again.')
                                },
                              )
                            }}
                          >
                            <Icon name="download" /> Export Exam Docket PNG
                          </button>
                        </div>
                      </section>

                      {examTimetableWeeks.map((week) => (
                        <div className="card" style={{ marginTop: 16 }} key={week.weekStart}>
                          <div className="card-head">
                            <div>
                              <h2>Examination Week Grid</h2>
                              <p>
                                {formatWeekLabel(week.weekStart)} · Shift Windows: Morning (09:00 -
                                11:30) & Afternoon (13:00 - 15:30)
                              </p>
                            </div>
                          </div>
                          <div className="timetable-scroll" style={{ marginTop: 14 }}>
                            <AdminTimetable
                              sessions={week.sessions}
                              weekStart={week.weekStart}
                              customSubtitle={(session) => session.room}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Table docket */}
                      <div className="card" style={{ padding: 20, marginTop: 18 }}>
                        <div className="card-head">
                          <div>
                            <h2>Examination schedule</h2>
                            <p>Class size is used when checking room capacity.</p>
                          </div>
                        </div>
                        <table className="workspace-table" style={{ marginTop: 12 }}>
                          <thead>
                            <tr>
                              <th>Course</th>
                              <th>Date</th>
                              <th>Time</th>
                              <th>Examination hall</th>
                              <th>Class size</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myExams.map((e) => (
                              <tr key={e.code}>
                                <td>
                                  <b>{e.code}</b>
                                  <span>{e.title}</span>
                                </td>
                                <td>{formatDate(e.date)}</td>
                                <td>
                                  {formatTime(e.start)} – {formatTime(e.end)}
                                </td>
                                <td>{e.room}</td>
                                <td>{e.enrollment} students</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: NOTION & GOOGLE SYNC */}
                  {activeTab === 'sync' && (
                    <div>
                      <section className="page-heading">
                        <div>
                          <p className="eyebrow">Integrations</p>
                          <h1>Calendar & Workspace Sync</h1>
                          <p>
                            Synchronize your schedule with Google Calendar and Notion databases.
                          </p>
                        </div>
                      </section>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 16,
                          marginTop: 16,
                        }}
                      >
                        <div className="card" style={{ padding: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                              <rect width="24" height="24" rx="5" fill="#4285F4" />
                              <path
                                d="M5 9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V9Z"
                                fill="#FFFFFF"
                              />
                              <path
                                d="M5 6C5 5.44772 5.44772 5 6 5H18C18.5523 5 19 5.44772 19 6V9H5V6Z"
                                fill="#1967D2"
                              />
                              <text
                                x="12"
                                y="16.5"
                                fill="#1967D2"
                                fontSize="8.5"
                                fontWeight="800"
                                textAnchor="middle"
                              >
                                31
                              </text>
                            </svg>
                            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                              Google Calendar Integration
                            </h2>
                          </div>
                          <p style={{ fontSize: 11, color: '#666', marginTop: 6, lineHeight: 1.4 }}>
                            Connect your complete Academic City schedule to Google Calendar. Export
                            full semester (.ics) or subscribe to live auto-sync.
                          </p>
                          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                            <button
                              className="button primary"
                              onClick={() => setIsGcalModalOpen(true)}
                              style={{ fontSize: 12, padding: '8px 14px' }}
                            >
                              Connect to Google Calendar
                            </button>
                            <button
                              className="button secondary"
                              onClick={() => {
                                const origin =
                                  typeof window !== 'undefined'
                                    ? window.location.origin
                                    : 'https://timetables.acity.edu.gh'
                                navigator?.clipboard?.writeText(
                                  `${origin}/api/calendar/student/${student.id}`,
                                )
                                setNotice(
                                  'Google Calendar subscription feed URL copied to clipboard.',
                                )
                              }}
                              style={{ fontSize: 12, padding: '8px 14px' }}
                            >
                              Copy Live Feed URL
                            </button>
                          </div>
                        </div>

                        <div className="card" style={{ padding: 20 }}>
                          <h2 style={{ fontSize: 13, fontWeight: 700 }}>
                            Notion Workspace Database
                          </h2>
                          <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                            Pre-structured timetable schema for embedding into student workspaces.
                          </p>
                          <button
                            className="button secondary"
                            style={{ marginTop: 14 }}
                            onClick={() => {
                              navigator?.clipboard?.writeText(
                                `https://notion.so/templates/acity-timetable-sync?id=${student.id}`,
                              )
                              setNotice('Notion database template link copied to clipboard.')
                            }}
                          >
                            Copy Notion Integration Link
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
        {!isElectiveSelectionRequired && (
          <nav className="bottom-navigation student-bottom-nav" aria-label="Student navigation">
            <div className="bottom-nav-track">
              {student.progressionStatus === 'Approved' && (
                <span
                  className="bottom-nav-indicator"
                  aria-hidden="true"
                  style={{ transform: `translateX(${activeNavigationIndex * 100}%)` }}
                />
              )}
              {student.progressionStatus === 'Approved' && (
                <>
                  <button
                    className={activeTab === 'home' ? 'active' : ''}
                    aria-label="Dashboard"
                    aria-current={activeTab === 'home' ? 'page' : undefined}
                    title="Dashboard"
                    onClick={() => changeTab('home')}
                  >
                    <i className="hgi hgi-stroke hgi-home-01" aria-hidden="true" />
                  </button>
                  <button
                    className={activeTab === 'class' ? 'active' : ''}
                    aria-label="Class timetable"
                    aria-current={activeTab === 'class' ? 'page' : undefined}
                    title={`Class timetable${cohortSessions.length ? ` (${cohortSessions.length})` : ''}`}
                    onClick={() => changeTab('class')}
                  >
                    <i className="hgi hgi-stroke hgi-calendar-03" aria-hidden="true" />
                    {cohortSessions.length > 0 && <em>{cohortSessions.length}</em>}
                  </button>
                  <button
                    className={activeTab === 'exam' ? 'active' : ''}
                    aria-label="Exam timetable"
                    aria-current={activeTab === 'exam' ? 'page' : undefined}
                    title={`Exam timetable${myExams.length ? ` (${myExams.length})` : ''}`}
                    onClick={() => changeTab('exam')}
                  >
                    <i className="hgi hgi-stroke hgi-calendar-check-01" aria-hidden="true" />
                    {myExams.length > 0 && <em>{myExams.length}</em>}
                  </button>
                  <button
                    className={activeTab === 'sync' ? 'active' : ''}
                    aria-label="Calendar and workspace sync"
                    aria-current={activeTab === 'sync' ? 'page' : undefined}
                    title="Calendar and workspace sync"
                    onClick={() => changeTab('sync')}
                  >
                    <i className="hgi hgi-stroke hgi-calendar-sync" aria-hidden="true" />
                  </button>
                </>
              )}
              <button
                className="student-signout"
                aria-label="Sign out"
                title="Sign out"
                onClick={onLogout}
              >
                <i className="hgi hgi-stroke hgi-logout-01" aria-hidden="true" />
              </button>
            </div>
          </nav>
        )}
      </div>

      <GoogleCalendarModal
        isOpen={isGcalModalOpen}
        onClose={() => setIsGcalModalOpen(false)}
        sessions={cohortSessions}
        calendarTitle={`${student?.name || 'Student'} - Class Timetable`}
        calendarSubtitle={`${student?.major || 'Cohort'} · Level ${student?.level || '300'}`}
        feedId={student?.id || 'cs300'}
        feedType="student"
        weekStart={CLASS_WEEK_START}
      />
    </div>
  )
}
