'use client'

import { useMemo, useState } from 'react'
import type {
  Course,
  Lecturer,
  LecturerUnavailabilityByName,
  Room,
  Session,
} from './scheduler-types'
import {
  getAcademicPeriodForSemester,
  getSectionKey,
  getSessionKey,
  isSessionInAcademicPeriod,
  TIMETABLE_PERIOD_STARTS,
  toggleLecturerUnavailabilityBlock,
} from './scheduler-types'
import type { AppNotification, TimetableEvent } from './RoleViews'
import { AdminTimetable } from './AdminTimetable'
import { NextClassCountdown } from './NextClassCountdown'
import { GoogleCalendarModal } from './GoogleCalendarModal'
import { exportTimetablePng } from './export-timetable-png'
import { useTabScrollRestoration } from './use-tab-scroll-restoration'
import AppIcon, { type AppIconName } from './AppIcon'
import { formatWeekLabel, getCurrentWeekStart } from './calendar-utils'
import RescheduleModal from './RescheduleModal'
import { findAlternatives } from './reschedule-utils'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const PERIODS = TIMETABLE_PERIOD_STARTS
const WEEK_START = getCurrentWeekStart()

function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function Icon({ name }: { name: AppIconName }) {
  return <AppIcon name={name} />
}

function downloadLecturerPng(title: string) {
  return exportTimetablePng(`${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`)
}

export default function TeacherView({
  lecturers,
  courses,
  sessions,
  rooms,
  lecturerId,
  events,
  notifications,
  lecturerUnavailability,
  confirmedCodes,
  semester,
  onToggleUnavailable,
  onConfirmCourse,
  onSessionChange,
  onLogout,
}: {
  lecturers: Lecturer[]
  courses: Course[]
  sessions: Session[]
  rooms: Room[]
  lecturerId: string
  events: TimetableEvent[]
  notifications: AppNotification[]
  lecturerUnavailability: LecturerUnavailabilityByName
  confirmedCodes: string[]
  semester: string
  onToggleUnavailable: (name: string, day: number, start: number, end: number) => void
  onConfirmCourse: (session: Session) => void
  onSessionChange: (
    session: Session,
    newDay: number,
    newStart: number,
    newRoom: string,
    isOnline: boolean,
  ) => boolean | string | void
  onLogout: () => void
}) {
  const [activeTab, setActiveTab] = useState<'timetable' | 'courses' | 'availability' | 'export'>(
    'timetable',
  )
  const changeTab = useTabScrollRestoration(activeTab, setActiveTab)
  const [selectedSessionForSwap, setSelectedSessionForSwap] = useState<Session | null>(null)
  const [isGcalModalOpen, setIsGcalModalOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const activeNavigationIndex = { timetable: 0, courses: 1, availability: 2, export: 3 }[activeTab]

  const lecturer = lecturers.find((l) => l.id === lecturerId) ?? lecturers[0]
  const myName = lecturer?.name ?? ''
  const activePeriod = getAcademicPeriodForSemester(semester)
  const mySessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.lecturer === myName && isSessionInAcademicPeriod(session, activePeriod),
      ),
    [sessions, myName, activePeriod],
  )
  const myCourses = useMemo(
    () =>
      courses.filter(
        (course) => course.lecturer === myName && isSessionInAcademicPeriod(course, activePeriod),
      ),
    [courses, myName, activePeriod],
  )
  const myBlocks = lecturerUnavailability[myName] ?? []
  const teachingHours = mySessions.reduce((total, s) => total + s.duration / 60, 0)
  const pendingSessions = mySessions.filter(
    (session, index) =>
      !confirmedCodes.includes(getSectionKey(session)) &&
      mySessions.findIndex((other) => getSectionKey(other) === getSectionKey(session)) === index,
  )

  const myNotifications = notifications.filter(
    (n) => n.audience === 'lecturer' && (!n.recipientId || n.recipientId === lecturerId),
  )

  const openSwapDialog = (session: Session) => {
    setSelectedSessionForSwap(session)
  }

  return (
    <div className="app lecturer-app">
      <div className="main-shell no-sidebar bottom-nav-shell lecturer-main-shell">
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
              <span>
                {myName
                  .replace(/^(Dr\.|Prof\.)\s*/, '')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div>
                <b>{myName}</b>
                <small>Lecturer · {lecturer.department}</small>
              </div>
            </div>
          </div>
        </header>

        <main className="lecturer-content">
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

          {/* TAB 1: TIMETABLE */}
          {activeTab === 'timetable' && (
            <div>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">Lecturer Schedule · {formatWeekLabel(WEEK_START)}</p>
                  <h1>Teaching Timetable</h1>
                  <p>Click any assigned class to swap times or convert it to a virtual session.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
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
                      void downloadLecturerPng(`${myName} Timetable`).catch((error) => {
                        console.error('Unable to export lecturer timetable PNG.', error)
                        setNotice('PNG export failed. Please try again.')
                      })
                    }}
                  >
                    <Icon name="download" /> Export PNG
                  </button>
                </div>
              </section>

              {/* Animated Next Class Countdown */}
              <NextClassCountdown
                sessions={mySessions}
                role="lecturer"
                onConnectGoogleCalendar={() => setIsGcalModalOpen(true)}
              />

              <div className="metrics" style={{ margin: '20px 0' }}>
                <div className="stat-card">
                  <div className="stat-icon">
                    <Icon name="book" />
                  </div>
                  <div>
                    <p>Assigned courses</p>
                    <strong>{myCourses.length}</strong>
                    <small>Official faculty load</small>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <Icon name="clock" />
                  </div>
                  <div>
                    <p>Weekly contact hours</p>
                    <strong>{teachingHours} hrs</strong>
                    <small>Max load limit: {lecturer.weeklyLimit} hrs</small>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <Icon name="grid" />
                  </div>
                  <div>
                    <p>Status confirmation</p>
                    <strong style={{ color: pendingSessions.length ? '#cc3634' : '#4b9b70' }}>
                      {pendingSessions.length ? `${pendingSessions.length} Pending` : 'Confirmed'}
                    </strong>
                    <small>
                      {pendingSessions.length ? 'Awaiting lecturer confirmation' : 'Admin notified'}
                    </small>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <div>
                    <h2>Weekly Master Schedule Grid</h2>
                    <p>Academic City Campus · Semester 1</p>
                  </div>
                  {pendingSessions.length > 0 && (
                    <button
                      className="button primary"
                      onClick={() => {
                        pendingSessions.forEach(onConfirmCourse)
                        setNotice(
                          'All teaching sessions confirmed. Administrator has been notified.',
                        )
                      }}
                    >
                      Confirm All Sessions
                    </button>
                  )}
                </div>
                <div className="timetable-scroll" style={{ marginTop: 14 }}>
                  <AdminTimetable
                    sessions={mySessions}
                    onSession={openSwapDialog}
                    lecturerUnavailability={{ [myName]: myBlocks }}
                    weekStart={WEEK_START}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ASSIGNED COURSES */}
          {activeTab === 'courses' && (
            <div>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">Faculty Assignments</p>
                  <h1>My Assigned Courses</h1>
                  <p>
                    Courses assigned by the administration. Confirm teaching slots or initiate
                    swaps.
                  </p>
                </div>
              </section>

              <div className="card" style={{ padding: 20, marginTop: 16 }}>
                <table className="workspace-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Major & Level</th>
                      <th>Enrolled</th>
                      <th>Room & Format</th>
                      <th>Session Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myCourses.map((c) => {
                      const courseSessions = mySessions
                        .filter((session) => getSectionKey(session) === getSectionKey(c))
                        .sort((left, right) => left.day - right.day || left.start - right.start)
                      const session = courseSessions[0]
                      const sectionKey = getSectionKey(c)
                      const isConfirmed = session ? confirmedCodes.includes(sectionKey) : false
                      return (
                        <tr key={sectionKey}>
                          <td>
                            <b>
                              {c.code}
                              {c.group ? ` · Group ${c.group}` : ''}
                            </b>
                            <span>{c.title}</span>
                          </td>
                          <td>
                            {c.major} · Level {c.level}
                          </td>
                          <td>{c.enrollment} students</td>
                          <td>
                            <span>
                              {courseSessions.length
                                ? [...new Set(courseSessions.map((item) => item.room))].join(', ')
                                : 'Unallocated'}
                            </span>
                            <small>{c.sessionType}</small>
                          </td>
                          <td>
                            {courseSessions.length
                              ? courseSessions.map((item) => (
                                  <div key={getSessionKey(item)}>
                                    {WEEKDAYS[item.day]} {formatTime(item.start)}–
                                    {formatTime(item.start + item.duration)}
                                  </div>
                                ))
                              : '—'}
                          </td>
                          <td>
                            <span
                              className={`workspace-status ${isConfirmed ? 'positive' : 'warning'}`}
                            >
                              {isConfirmed ? 'Confirmed' : 'Pending Confirmation'}
                            </span>
                          </td>
                          <td>
                            {courseSessions.map((item, index) => (
                              <button
                                className="button secondary"
                                style={{ fontSize: 11, padding: '4px 10px', marginRight: 4 }}
                                onClick={() => openSwapDialog(item)}
                                key={getSessionKey(item)}
                              >
                                Swap {index + 1}
                              </button>
                            ))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AVAILABILITY GRID */}
          {activeTab === 'availability' && (
            <div>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">Faculty Workload Management</p>
                  <h1>Set Weekly Unavailability</h1>
                  <p>
                    Click open time cells to mark yourself unavailable. Scheduled classes cannot be
                    blocked.
                  </p>
                </div>
              </section>

              <div className="card" style={{ padding: 20, marginTop: 16 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px repeat(5, 1fr)',
                    gap: 4,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ padding: 8, fontSize: 11, fontWeight: 700, color: '#888' }}>
                    Time
                  </div>
                  {WEEKDAYS.map((d) => (
                    <div
                      key={d}
                      style={{
                        padding: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#333',
                        background: '#fafaf9',
                      }}
                    >
                      {d}
                    </div>
                  ))}
                  {PERIODS.map((start) => {
                    const end = start + 60
                    return (
                      <>
                        <div
                          key={`lbl-${start}`}
                          style={{ padding: 8, fontSize: 10, color: '#888', background: '#fafaf9' }}
                        >
                          {formatTime(start)}
                        </div>
                        {WEEKDAYS.map((_, di) => {
                          const hasClass = mySessions.some(
                            (s) => s.day === di && start < s.start + s.duration && end > s.start,
                          )
                          const isBlocked = myBlocks.some(
                            (b) => b.day === di && start < b.end && end > b.start,
                          )
                          return (
                            <button
                              key={`slot-${start}-${di}`}
                              disabled={hasClass}
                              onClick={() => onToggleUnavailable(myName, di, start, end)}
                              style={{
                                height: 42,
                                borderRadius: 4,
                                border: '1px solid #e6e6e3',
                                fontSize: 10,
                                fontWeight: 600,
                                cursor: hasClass ? 'not-allowed' : 'pointer',
                                background: hasClass ? '#f0f0ed' : isBlocked ? '#fae9e8' : '#fff',
                                color: hasClass ? '#888' : isBlocked ? '#cc3634' : 'transparent',
                              }}
                            >
                              {hasClass ? 'Class' : isBlocked ? 'Unavailable' : 'Available'}
                            </button>
                          )
                        })}
                      </>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EXPORT & SYNC */}
          {activeTab === 'export' && (
            <div>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">Export Options</p>
                  <h1>Timetable Downloads & Integrations</h1>
                  <p>
                    Download standardized high-resolution schedule images or sync with third-party
                    calendars.
                  </p>
                </div>
              </section>

              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}
              >
                <div className="card" style={{ padding: 20 }}>
                  <h2 style={{ fontSize: 13, fontWeight: 700 }}>PNG Timetable Export</h2>
                  <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                    High-resolution printable schedule matching Academic City typography.
                  </p>
                  <button
                    className="button primary"
                    style={{ marginTop: 14 }}
                    onClick={() => {
                      void downloadLecturerPng(`${myName} Timetable`).catch((error) => {
                        console.error('Unable to export lecturer timetable PNG.', error)
                        setNotice('PNG export failed. Please try again.')
                      })
                    }}
                  >
                    <Icon name="download" /> Download PNG Timetable
                  </button>
                </div>

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
                    <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
                      Google Calendar Integration
                    </h2>
                  </div>
                  <p style={{ fontSize: 11, color: '#888', marginTop: 6, lineHeight: 1.4 }}>
                    Sync teaching assignments and lecture hours with Google Calendar, Apple Calendar
                    or Notion.
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button
                      className="button primary"
                      style={{ fontSize: 12, padding: '8px 14px' }}
                      onClick={() => setIsGcalModalOpen(true)}
                    >
                      Connect to Google Calendar
                    </button>
                    <button
                      className="button secondary"
                      style={{ fontSize: 12, padding: '8px 14px' }}
                      onClick={() => {
                        const origin =
                          typeof window !== 'undefined'
                            ? window.location.origin
                            : 'https://timetables.acity.edu.gh'
                        navigator?.clipboard?.writeText(
                          `${origin}/api/calendar/lecturer/${lecturer.id}`,
                        )
                        setNotice('Calendar subscription feed URL copied to clipboard.')
                      }}
                    >
                      Copy Feed URL
                    </button>
                  </div>
                </div>
              </div>
              <section className="card" style={{ marginTop: 16 }}>
                <div className="card-head">
                  <div>
                    <h2>PNG timetable template</h2>
                    <p>
                      The downloaded image matches this grid, including its row and column lines.
                    </p>
                  </div>
                </div>
                <div className="timetable-scroll" style={{ marginTop: 14 }}>
                  <AdminTimetable
                    sessions={mySessions}
                    lecturerUnavailability={{ [myName]: myBlocks }}
                    weekStart={WEEK_START}
                  />
                </div>
              </section>
            </div>
          )}
        </main>
        <nav className="bottom-navigation lecturer-bottom-nav" aria-label="Lecturer navigation">
          <div className="bottom-nav-track">
            <span
              className="bottom-nav-indicator"
              aria-hidden="true"
              style={{ transform: `translateX(${activeNavigationIndex * 100}%)` }}
            />
            <button
              className={activeTab === 'timetable' ? 'active' : ''}
              aria-label="My timetable"
              aria-current={activeTab === 'timetable' ? 'page' : undefined}
              title="My timetable"
              onClick={() => changeTab('timetable')}
            >
              <i className="hgi hgi-stroke hgi-calendar-03" aria-hidden="true" />
            </button>
            <button
              className={activeTab === 'courses' ? 'active' : ''}
              aria-label="Assigned courses"
              aria-current={activeTab === 'courses' ? 'page' : undefined}
              title={`Assigned courses${pendingSessions.length ? ` (${pendingSessions.length} pending)` : ''}`}
              onClick={() => changeTab('courses')}
            >
              <i className="hgi hgi-stroke hgi-book-open-01" aria-hidden="true" />
              {pendingSessions.length > 0 && <em>{pendingSessions.length}</em>}
            </button>
            <button
              className={activeTab === 'availability' ? 'active' : ''}
              aria-label="Set availability"
              aria-current={activeTab === 'availability' ? 'page' : undefined}
              title="Set availability"
              onClick={() => changeTab('availability')}
            >
              <i className="hgi hgi-stroke hgi-clock-01" aria-hidden="true" />
            </button>
            <button
              className={activeTab === 'export' ? 'active' : ''}
              aria-label="Export and sync"
              aria-current={activeTab === 'export' ? 'page' : undefined}
              title="Export and sync"
              onClick={() => changeTab('export')}
            >
              <i className="hgi hgi-stroke hgi-download-01" aria-hidden="true" />
            </button>
            <button
              className="lecturer-signout"
              aria-label="Sign out"
              title="Sign out"
              onClick={onLogout}
            >
              <i className="hgi hgi-stroke hgi-logout-01" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </div>

      {selectedSessionForSwap && (
        <RescheduleModal
          session={selectedSessionForSwap}
          getAlternatives={(online) =>
            findAlternatives(
              selectedSessionForSwap,
              sessions,
              rooms,
              0,
              lecturerUnavailability,
              online,
              events,
            )
          }
          onClose={() => setSelectedSessionForSwap(null)}
          onConfirm={(updatedSession) => {
            const accepted = onSessionChange(
              selectedSessionForSwap,
              updatedSession.day,
              updatedSession.start,
              updatedSession.room,
              Boolean(updatedSession.isOnline),
            )
            if (typeof accepted === 'string') {
              setNotice(accepted)
              return false
            }
            if (accepted === false) return false
            setNotice(
              `${updatedSession.code} rescheduled to ${WEEKDAYS[updatedSession.day]} ${formatTime(updatedSession.start)}${updatedSession.isOnline ? ' online; classroom released' : ` in ${updatedSession.room}`}. Admin notified.`,
            )
            return true
          }}
        />
      )}

      <GoogleCalendarModal
        isOpen={isGcalModalOpen}
        onClose={() => setIsGcalModalOpen(false)}
        sessions={mySessions}
        calendarTitle={`${myName} - Teaching Timetable`}
        calendarSubtitle={`Faculty of Computing · ${lecturer?.department || 'Academic City'}`}
        feedId={String(lecturer?.id || myName)}
        feedType="lecturer"
        weekStart={WEEK_START}
      />
    </div>
  )
}
