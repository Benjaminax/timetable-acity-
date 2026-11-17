'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type {
  AppSettings,
  Course,
  CourseMeetingPattern,
  Lecturer,
  LecturerUnavailabilityByName,
  Room,
  RoomType,
  Session,
  Student,
} from './scheduler-types'
import {
  calculateTimetablePeriods,
  getCourseMeetingPatternError,
  findScheduleConflicts,
  findSessionConflicts,
  findRoomConflict,
  getAcademicPeriodForSemester,
  getSessionElapsedDuration,
  isSessionInAcademicPeriod,
  getSectionKey,
  getSessionEnd,
  getSessionKey,
  hasLecturerUnavailability,
  isRoomCompatibleWithSession,
  isRoomTypeCompatibleWithSession,
  sessionsShareStudentGroup,
  TIMETABLE_PERIOD_DURATION,
  TIMETABLE_PERIOD_COUNT,
  TIMETABLE_PERIOD_STARTS,
  toggleLecturerUnavailabilityBlock,
} from './scheduler-types'
import { downloadElementPng } from './capture-element-png'
import AppIcon, { type AppIconName } from './AppIcon'
import {
  CoursesPage,
  LecturersPage,
  OptimisationPage,
  ReportsPage,
  SchedulingPage,
  SettingsPage,
  StudentsPage,
} from './WorkspacePages'
import { EventsPage, LecturerView, type AppNotification, type TimetableEvent } from './RoleViews'
import LoginPage, { type AppRole } from './LoginPage'
import TeacherView from './TeacherView'
import StudentViewPage from './StudentViewPage'
import ExamSchedulingPage from './ExamSchedulingPage'
import RescheduleModal from './RescheduleModal'
import { findAlternatives as getRescheduleAlternatives } from './reschedule-utils'
import {
  examScheduleData,
  examScheduleStorageKey,
  loadSavedExamSchedule,
  saveExamSchedule,
  type ExamScheduleItem,
} from './exam-schedule'
import { useTabScrollRestoration } from './use-tab-scroll-restoration'
import { getCurrentAcademicSemester, getCurrentWeekStart, getGhanaHoliday } from './calendar-utils'
import { initialLecturers } from './sample-lecturers'
import { buildInitialTeachingAssignments } from './sample-timetable'
import { undergraduateProgrammes } from './programme-curricula'

type IconName = AppIconName

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <AppIcon name={name} size={size} />
}

const nav = [
  ['Dashboard', 'dashboard-square-01'],
  ['Timetables', 'calendar-03'],
  ['Courses', 'book-open-01'],
  ['Classrooms', 'building-01'],
  ['Examinations', 'calendar-03'],
  ['Settings', 'settings-01'],
] as const

const metrics = [
  {
    label: 'Registered students',
    value: '2,847',
    delta: '+126 this semester',
    icon: 'students' as IconName,
  },
  {
    label: 'Active lecturers',
    value: '186',
    delta: '12 departments',
    icon: 'lecturer' as IconName,
  },
  { label: 'Active courses', value: '342', delta: '48 electives', icon: 'book' as IconName },
  {
    label: 'Available classrooms',
    value: '24',
    delta: '5 specialised labs',
    icon: 'building' as IconName,
  },
]

const initialSessions: Session[] = [
  {
    day: 0,
    start: 480,
    duration: 120,
    title: 'Software Engineering',
    code: 'CS 302',
    room: 'Computer Lab 1',
    type: 'Practical',
    tone: 'red',
    lecturer: 'Dr. K. Mensah',
    major: 'Computer Science',
    level: 300,
    enrollment: 45,
    roomType: 'computer',
  },
  {
    day: 1,
    start: 620,
    duration: 120,
    title: 'Software Engineering',
    code: 'CS 302',
    room: 'Computer Lab 2',
    type: 'Practical',
    tone: 'red',
    lecturer: 'Ama Boateng',
    major: 'Information Technology',
    level: 300,
    enrollment: 36,
    roomType: 'computer',
  },
  {
    day: 0,
    start: 830,
    duration: 120,
    title: 'Circuit Analysis',
    code: 'EE 204',
    room: 'Electrical Lab',
    type: 'Tutorial',
    tone: 'grey',
    lecturer: 'Dr. E. Adu',
    major: 'Electrical Engineering',
    level: 200,
    enrollment: 32,
    roomType: 'electrical',
  },
  {
    day: 1,
    start: 480,
    duration: 120,
    title: 'Linear Algebra',
    code: 'MATH 201',
    room: 'U2',
    type: 'Lecture',
    tone: 'dark',
    lecturer: 'Prof. J. Owusu',
    major: 'Computer Engineering',
    level: 200,
    enrollment: 42,
    roomType: 'lecture',
  },
  {
    day: 1,
    start: 830,
    duration: 120,
    title: 'Embedded Systems',
    code: 'CE 304',
    room: 'Robotics & Embedded Systems Lab',
    type: 'Practical',
    tone: 'red',
    lecturer: 'Dr. K. Mensah',
    major: 'Computer Engineering',
    level: 300,
    enrollment: 28,
    roomType: 'robotics',
  },
  {
    day: 2,
    start: 620,
    duration: 120,
    title: 'Database Systems',
    code: 'CS 315',
    room: 'L2',
    type: 'Lecture',
    tone: 'red',
    lecturer: 'Dr. K. Mensah',
    major: 'Computer Science',
    level: 300,
    enrollment: 30,
    roomType: 'lecture',
  },
  {
    day: 3,
    start: 480,
    duration: 120,
    title: 'Engineering Ethics',
    code: 'GEN 202',
    room: 'A1',
    type: 'Lecture',
    tone: 'grey',
    lecturer: 'Prof. J. Owusu',
    major: 'Electrical Engineering',
    level: 200,
    enrollment: 55,
    roomType: 'lecture',
  },
  {
    day: 3,
    start: 830,
    duration: 120,
    title: 'Data Structures',
    code: 'CS 208',
    room: 'Computer Lab 1',
    type: 'Practical',
    tone: 'dark',
    lecturer: 'Ama Boateng',
    major: 'Computer Science',
    level: 200,
    enrollment: 45,
    roomType: 'computer',
  },
  {
    day: 4,
    start: 690,
    duration: 120,
    title: 'Digital Electronics',
    code: 'EE 218',
    room: 'Electrical Lab',
    type: 'Practical',
    tone: 'grey',
    lecturer: 'Dr. E. Adu',
    major: 'Electrical Engineering',
    level: 200,
    enrollment: 25,
    roomType: 'electrical',
  },
]

const initialRooms: Room[] = [
  {
    name: 'A1',
    location: 'Main Building · Ground Floor',
    capacity: 58,
    type: 'Lecture room',
    roomType: 'lecture',
    status: 'In use',
    utilization: 86,
  },
  {
    name: 'A2',
    location: 'Main Building · Ground Floor',
    capacity: 56,
    type: 'Lecture room',
    roomType: 'lecture',
    status: 'Available',
    utilization: 73,
  },
  {
    name: 'L2',
    location: 'Learning Commons · Level 1',
    capacity: 30,
    type: 'Lecture room',
    roomType: 'lecture',
    status: 'In use',
    utilization: 92,
  },
  {
    name: 'L6',
    location: 'Learning Commons · Level 2',
    capacity: 52,
    type: 'Lecture room',
    roomType: 'lecture',
    status: 'Available',
    utilization: 68,
  },
  {
    name: 'U2',
    location: 'Learning Commons · Level 1',
    capacity: 44,
    type: 'Lecture room',
    roomType: 'lecture',
    status: 'Available',
    utilization: 61,
  },
  ...(
    [
      ['U3', 44],
      ['L1', 30],
      ['L3', 30],
      ['L4', 30],
      ['L5', 30],
      ['L7', 30],
      ['L8', 30],
      ['L9', 30],
      ['L10', 30],
      ['L11', 30],
      ['L12', 52],
    ] as const
  ).map(([name, capacity]): Room => ({
    name,
    location: 'Academic City campus',
    capacity,
    type: 'Lecture room',
    roomType: 'lecture',
    status: 'Available',
    utilization: 0,
  })),
  {
    name: 'Computer Lab 1',
    location: 'Technology Block · Level 1',
    capacity: 45,
    type: 'Computer lab',
    roomType: 'computer',
    status: 'In use',
    utilization: 81,
  },
  {
    name: 'Computer Lab 2',
    location: 'Technology Block · Level 1',
    capacity: 45,
    type: 'Computer lab',
    roomType: 'computer',
    status: 'Available',
    utilization: 0,
  },
  {
    name: 'Robotics & Embedded Systems Lab',
    location: 'Engineering Block · Level 1',
    capacity: 30,
    type: 'Specialised lab',
    roomType: 'robotics',
    status: 'Available',
    utilization: 77,
  },
  {
    name: 'Electrical Lab',
    location: 'Engineering Block · Level 2',
    capacity: 36,
    type: 'Specialised lab',
    roomType: 'electrical',
    status: 'Available',
    utilization: 66,
  },
  {
    name: 'Biomedical Lab',
    location: 'Science Block · Level 2',
    capacity: 28,
    type: 'Specialised lab',
    roomType: 'biomedical',
    status: 'Restricted',
    utilization: 64,
  },
  {
    name: 'Biomedical Lab 2',
    location: 'Science Block · Level 2',
    capacity: 30,
    type: 'Specialised lab',
    roomType: 'biomedical',
    status: 'Available',
    utilization: 0,
  },
]

const initialCourses: Course[] = [
  {
    code: 'CS 302',
    title: 'Software Engineering',
    major: 'Computer Science',
    level: 300,
    enrollment: 45,
    lecturer: 'Dr. K. Mensah',
    sessionType: 'Practical',
    credits: 3,
    status: 'Scheduled',
  },
  {
    code: 'CS 302',
    title: 'Software Engineering',
    major: 'Information Technology',
    level: 300,
    enrollment: 36,
    lecturer: 'Ama Boateng',
    sessionType: 'Practical',
    credits: 3,
    status: 'Scheduled',
  },
  {
    code: 'EE 204',
    title: 'Circuit Analysis',
    major: 'Electrical Engineering',
    level: 200,
    enrollment: 32,
    lecturer: 'Dr. E. Adu',
    sessionType: 'Tutorial',
    credits: 3,
    status: 'Scheduled',
  },
  {
    code: 'MATH 201',
    title: 'Linear Algebra',
    major: 'Computer Engineering',
    level: 200,
    enrollment: 42,
    lecturer: 'Prof. J. Owusu',
    sessionType: 'Lecture',
    credits: 3,
    status: 'Scheduled',
  },
  {
    code: 'CE 304',
    title: 'Embedded Systems',
    major: 'Computer Engineering',
    level: 300,
    enrollment: 28,
    lecturer: 'Dr. K. Mensah',
    sessionType: 'Practical',
    credits: 4,
    status: 'Scheduled',
  },
  {
    code: 'CS 315',
    title: 'Database Systems',
    major: 'Computer Science',
    level: 300,
    enrollment: 30,
    lecturer: 'Dr. K. Mensah',
    sessionType: 'Lecture',
    credits: 3,
    status: 'Scheduled',
  },
  {
    code: 'GEN 202',
    title: 'Engineering Ethics',
    major: 'Electrical Engineering',
    level: 200,
    enrollment: 55,
    lecturer: 'Prof. J. Owusu',
    sessionType: 'Lecture',
    credits: 2,
    status: 'Scheduled',
  },
  {
    code: 'CS 208',
    title: 'Data Structures',
    major: 'Computer Science',
    level: 200,
    enrollment: 45,
    lecturer: 'Ama Boateng',
    sessionType: 'Practical',
    credits: 4,
    status: 'Scheduled',
  },
  {
    code: 'EE 218',
    title: 'Digital Electronics',
    major: 'Electrical Engineering',
    level: 200,
    enrollment: 25,
    lecturer: 'Dr. E. Adu',
    sessionType: 'Practical',
    credits: 3,
    status: 'Scheduled',
  },
  {
    code: 'BIO 314',
    title: 'Clinical Instrumentation',
    major: 'Biomedical Engineering',
    level: 300,
    enrollment: 26,
    lecturer: 'Dr. S. Osei',
    sessionType: 'Practical',
    credits: 4,
    status: 'Scheduled',
  },
  {
    code: 'CS 418',
    title: 'Advanced Networks',
    major: 'Computer Science',
    level: 400,
    enrollment: 24,
    lecturer: 'Ama Boateng',
    sessionType: 'Lecture',
    credits: 3,
    status: 'Draft',
  },
  {
    code: 'EE 322',
    title: 'Power Systems Lab',
    major: 'Electrical Engineering',
    level: 300,
    enrollment: 22,
    lecturer: 'Dr. E. Adu',
    sessionType: 'Practical',
    credits: 4,
    status: 'Draft',
  },
]

const namedStudents: Student[] = [
  {
    id: 'ACU-24-0182',
    name: 'Ama Serwaa',
    major: 'Computer Science',
    level: 300,
    courses: 5,
    status: 'Registered',
    progressionStatus: 'Approved',
  },
  {
    id: 'ACU-24-0211',
    name: 'Kojo Antwi',
    major: 'Computer Science',
    level: 300,
    courses: 5,
    status: 'Registered',
    progressionStatus: 'Pending',
  },
  {
    id: 'ACU-24-0305',
    name: 'Nana Yeboah',
    major: 'Computer Engineering',
    level: 300,
    courses: 5,
    status: 'Registered',
    progressionStatus: 'Approved',
  },
  {
    id: 'ACU-24-0441',
    name: 'Efua Sarpong',
    major: 'Electrical Engineering',
    level: 200,
    courses: 5,
    status: 'Registered',
    progressionStatus: 'Pending',
  },
  {
    id: 'ACU-24-0468',
    name: 'Yaw Boateng',
    major: 'Electrical Engineering',
    level: 200,
    courses: 5,
    status: 'Pending',
    progressionStatus: 'Pending',
  },
  {
    id: 'ACU-24-0502',
    name: 'Abena Ofori',
    major: 'Computer Engineering',
    level: 200,
    courses: 5,
    status: 'Registered',
    progressionStatus: 'Approved',
  },
  {
    id: 'ACU-24-0674',
    name: 'Kweku Asare',
    major: 'Computer Science',
    level: 200,
    courses: 5,
    status: 'Registered',
    progressionStatus: 'Approved',
  },
  {
    id: 'ACU-24-0801',
    name: 'Esi Mensima',
    major: 'Biomedical Engineering',
    level: 300,
    courses: 5,
    status: 'Pending',
    progressionStatus: 'Pending',
  },
  {
    id: 'ACU-24-0910',
    name: 'Kwame Owusu',
    major: 'Computer Science',
    level: 400,
    courses: 5,
    status: 'Registered',
    progressionStatus: 'Approved',
  },
  {
    id: 'ACU-24-1033',
    name: 'Adwoa Acheampong',
    major: 'Electrical Engineering',
    level: 300,
    courses: 5,
    status: 'Registered',
    progressionStatus: 'Approved',
  },
]

const sampleLevels = [100, 200, 300, 400] as const
let nextSampleStudentNumber = 11
const generatedStudents: Student[] = undergraduateProgrammes.flatMap((programme) =>
  sampleLevels.flatMap((level) => {
    const level100Cohorts =
      level === 100
        ? [
            { intake: 'September' as const, size: 38 },
            { intake: 'January' as const, size: 26 },
          ]
        : [{ intake: 'Merged' as const, size: 64 }]
    return level100Cohorts.flatMap(({ intake, size }) =>
      Array.from({ length: size }, () => {
        const recordNumber = nextSampleStudentNumber++
        return {
          id: `ACU-25-${String(recordNumber).padStart(4, '0')}`,
          name: `Sample Student ${String(recordNumber).padStart(4, '0')}`,
          major: programme.major,
          level,
          courses: 5,
          status: recordNumber % 20 === 0 ? ('Pending' as const) : ('Registered' as const),
          progressionStatus: recordNumber % 5 === 0 ? ('Pending' as const) : ('Approved' as const),
          intake,
        }
      }),
    )
  }),
)
const initialStudents: Student[] = [...namedStudents, ...generatedStudents]

const initialTeachingAssignments = buildInitialTeachingAssignments({
  courses: initialCourses,
  sessions: initialSessions,
  rooms: initialRooms,
  lecturers: initialLecturers,
})

const initialSettings: AppSettings = {
  semester: getCurrentAcademicSemester(),
  campus: 'Academic City, Accra',
  timezone: 'Africa/Accra (GMT)',
  notifications: true,
  conflictWarnings: true,
  roomCapacityBuffer: 0,
  defaultSessionLength: 120,
  dayStartTime: '08:00',
  dayEndTime: '18:20',
  periodDuration: 60,
  breakDuration: 10,
  periodCount: 9,
  includeSaturday: false,
}
const adminNotificationReadKey = 'acity_admin_notification_read'

function shiftAcademicSemester(value: string, direction: -1 | 1) {
  const match = /^(\d{4})\/\d{2} · Semester ([12])$/.exec(value)
  if (!match) return null

  let year = Number(match[1])
  let semester = Number(match[2]) + direction
  if (semester > 2) {
    year += 1
    semester = 1
  } else if (semester < 1) {
    year -= 1
    semester = 2
  }

  return `${year}/${String((year + 1) % 100).padStart(2, '0')} · Semester ${semester}`
}

const defaultWeekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const saturdayWeekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const weekdayNames = defaultWeekdayNames
const timetablePeriodCount = TIMETABLE_PERIOD_COUNT
const timetablePeriodStarts = TIMETABLE_PERIOD_STARTS
const initialWeekStart = getCurrentWeekStart()

function parseCalendarDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function addCalendarDays(date: string, days: number) {
  const result = parseCalendarDate(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

function getMondayDate(date: string) {
  const parsed = parseCalendarDate(date)
  parsed.setUTCDate(parsed.getUTCDate() - ((parsed.getUTCDay() + 6) % 7))
  return parsed.toISOString().slice(0, 10)
}

function getWeekDates(weekStart: string, includeSaturday = false) {
  const days = includeSaturday ? saturdayWeekdayNames : defaultWeekdayNames
  return days.map((_, index) => addCalendarDays(weekStart, index))
}

function getWeekLabel(weekStart: string, includeSaturday = false) {
  const start = parseCalendarDate(weekStart)
  const end = parseCalendarDate(addCalendarDays(weekStart, includeSaturday ? 5 : 4))
  const month = new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' })
  const startMonth = month.format(start)
  const endMonth = month.format(end)
  const range =
    start.getUTCMonth() === end.getUTCMonth()
      ? `${startMonth} ${start.getUTCDate()}–${end.getUTCDate()}`
      : `${startMonth} ${start.getUTCDate()} – ${endMonth} ${end.getUTCDate()}`
  return `${range}, ${end.getUTCFullYear()}`
}

function getNextClass(sessions: Session[], now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value
      return result
    }, {})
  const today = `${parts.year}-${parts.month}-${parts.day}`
  const currentMinute = Number(parts.hour) * 60 + Number(parts.minute)

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addCalendarDays(today, offset)
    if (getGhanaHoliday(date)) continue
    const weekday = (parseCalendarDate(date).getUTCDay() + 6) % 7
    if (weekday >= weekdayNames.length) continue

    const session = sessions
      .filter(
        (item) =>
          item.day === weekday && (offset > 0 || item.start + item.duration > currentMinute),
      )
      .sort((a, b) => a.start - b.start)[0]
    if (session) {
      return {
        session,
        date,
        inProgress: offset === 0 && session.start <= currentMinute,
      }
    }
  }
  return null
}

function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function getTimetableSessionRows(start: number, duration: number) {
  const startIndex = timetablePeriodStarts.reduce(
    (closestIndex, periodStart, index) =>
      Math.abs(periodStart - start) < Math.abs(timetablePeriodStarts[closestIndex] - start)
        ? index
        : closestIndex,
    0,
  )
  const periodCount = Math.max(1, Math.ceil(duration / TIMETABLE_PERIOD_DURATION))
  const endIndex = Math.min(timetablePeriodCount, startIndex + periodCount)
  const visiblePeriodCount = endIndex - startIndex
  const slotDuration =
    timetablePeriodStarts.length > 1
      ? timetablePeriodStarts[1] - timetablePeriodStarts[0]
      : TIMETABLE_PERIOD_DURATION
  const heightPercent = Math.min(
    (getSessionElapsedDuration(duration) / (slotDuration * timetablePeriodCount)) * 100,
    (visiblePeriodCount / timetablePeriodCount) * 100,
  )
  return { startIndex, periodCount: visiblePeriodCount, endIndex, heightPercent }
}

function formatDate(day: number, weekStart = initialWeekStart) {
  const date = parseCalendarDate(addCalendarDays(weekStart, day))
  const formattedDate = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date)
  return `${weekdayNames[day]}, ${formattedDate}`
}

type ScheduleIssue = {
  code: string
  message: string
  severity: 'High' | 'Medium'
  session: Session
}

function analyzeSchedule(
  schedule: Session[],
  availableRooms: Room[],
  lecturerUnavailability: LecturerUnavailabilityByName = {},
): ScheduleIssue[] {
  const issues: ScheduleIssue[] = []
  schedule.forEach((session) => {
    if (
      hasLecturerUnavailability(
        lecturerUnavailability[session.lecturer],
        session.day,
        session.start,
        getSessionEnd(session),
      )
    ) {
      issues.push({
        code: session.code,
        message: `${session.lecturer} is marked unavailable during this class.`,
        severity: 'High',
        session,
      })
    }
    if (session.room !== 'Online') {
      const assignedRoom = availableRooms.find((room) => room.name === session.room)
      if (!assignedRoom) {
        issues.push({
          code: session.code,
          message: `Assigned room ${session.room} is not in the room list.`,
          severity: 'High',
          session,
        })
      } else {
        if (assignedRoom.capacity < session.enrollment) {
          issues.push({
            code: session.code,
            message: `${session.enrollment} students exceed ${session.room}'s ${assignedRoom.capacity}-seat capacity.`,
            severity: 'High',
            session,
          })
        }
        if (!isRoomCompatibleWithSession(session, assignedRoom)) {
          issues.push({
            code: session.code,
            message: `${session.room} does not meet the ${session.type.toLowerCase()} room requirement.`,
            severity: 'High',
            session,
          })
        }
      }
    }
  })
  findScheduleConflicts(schedule).forEach(({ type, session, other }) => {
    const reason =
      type === 'room'
        ? `Room ${session.room} is double-booked.`
        : type === 'lecturer'
          ? `${session.lecturer} is assigned to overlapping classes.`
          : `${session.major} Level ${session.level} has overlapping classes.`
    issues.push({
      code: session.code,
      message: `${reason} Conflicts with ${other.code}.`,
      severity: 'High',
      session,
    })
  })
  return issues
}

function Button({
  children,
  kind = 'primary',
  onClick,
  disabled = false,
}: {
  children: ReactNode
  kind?: 'primary' | 'secondary' | 'ghost'
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button className={`button ${kind}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function StatCard({ item }: { item: (typeof metrics)[number] }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon name={item.icon} />
      </div>
      <div>
        <p>{item.label}</p>
        <strong>{item.value}</strong>
        <small>{item.delta}</small>
      </div>
    </div>
  )
}

function Timetable({
  sessions,
  onSession,
  lecturerUnavailability,
  roomFilter,
  dayFilter,
  weekStart = initialWeekStart,
  printTargetId,
  periodStarts = TIMETABLE_PERIOD_STARTS,
  periodDuration = 60,
  includeSaturday = false,
}: {
  sessions: Session[]
  onSession: (session: Session) => void
  lecturerUnavailability: LecturerUnavailabilityByName
  roomFilter?: string
  dayFilter?: number | null
  weekStart?: string
  printTargetId?: string
  periodStarts?: number[]
  periodDuration?: number
  includeSaturday?: boolean
}) {
  const timetablePeriodStarts = periodStarts
  const timetablePeriodCount = periodStarts.length
  const daysList = includeSaturday ? saturdayWeekdayNames : defaultWeekdayNames
  const dates = getWeekDates(weekStart, includeSaturday)
  const visibleDays =
    dayFilter === null || dayFilter === undefined ? daysList.map((_, day) => day) : [dayFilter]
  return (
    <div
      className="timetable reference-timetable"
      id={printTargetId}
      style={{ gridTemplateColumns: `6% repeat(${visibleDays.length}, minmax(0, 1fr))` }}
    >
      <div className="day-head time-head">Time</div>
      {visibleDays.map((i) => {
        const date = parseCalendarDate(dates[i])
        const holiday = getGhanaHoliday(dates[i])
        return (
          <div className={`day-head ${holiday ? 'holiday' : ''}`} key={dates[i]}>
            <span>{daysList[i].slice(0, 3)}</span>
            {holiday && <small>Holiday</small>}
          </div>
        )
      })}
      <div className="time-axis">
        {timetablePeriodStarts.map((time) => (
          <span key={time}>
            <b>{formatTime(time)} –</b>
            <b>{formatTime(time + periodDuration)}</b>
          </span>
        ))}
      </div>
      {visibleDays.map((day) => (
        <div className="day-col" key={day}>
          {timetablePeriodStarts.map((_, n) => (
            <i key={n} />
          ))}
          {getGhanaHoliday(dates[day]) ? (
            <div className="day-holiday">
              <b>No classes</b>
              <span>{getGhanaHoliday(dates[day])}</span>
            </div>
          ) : (
            <>
              {Object.entries(lecturerUnavailability)
                .filter(([lecturer]) =>
                  sessions.some(
                    (session) =>
                      session.lecturer === lecturer && (!roomFilter || session.room === roomFilter),
                  ),
                )
                .flatMap(([lecturer, blocks]) =>
                  blocks.filter((block) => block.day === day).map((block) => ({ lecturer, block })),
                )
                .map(({ lecturer, block }, index) => {
                  const { startIndex, periodCount } = getTimetableSessionRows(
                    block.start,
                    block.end - block.start,
                  )
                  return (
                    <div
                      className="lecturer-unavailable-block"
                      style={{
                        top: `${(startIndex / timetablePeriodCount) * 100}%`,
                        height: `${(periodCount / timetablePeriodCount) * 100}%`,
                      }}
                      key={`${lecturer}-${block.start}-${block.end}-${index}`}
                      aria-label={`${lecturer} unavailable ${formatTime(block.start)} to ${formatTime(block.end)}`}
                      title={`${lecturer} unavailable · ${formatTime(block.start)}–${formatTime(block.end)}`}
                    >
                      <b>Unavailable</b>
                      <span>{lecturer}</span>
                      <small>
                        {formatTime(block.start)}–{formatTime(block.end)}
                      </small>
                    </div>
                  )
                })}
              {sessions
                .filter(
                  (session) =>
                    session.day === day &&
                    (!session.weekStart || session.weekStart === weekStart) &&
                    (!roomFilter || session.room === roomFilter),
                )
                .map((s) => {
                  const { startIndex, periodCount, heightPercent } = getTimetableSessionRows(
                    s.start,
                    s.duration,
                  )
                  const isBottom = startIndex + periodCount >= timetablePeriodCount
                  const unavailable = hasLecturerUnavailability(
                    lecturerUnavailability[s.lecturer],
                    s.day,
                    s.start,
                    getSessionEnd(s),
                  )
                  return (
                    <button
                      type="button"
                      className={`session ${s.tone}${periodCount === 1 ? ' is-single-period' : ''}${isBottom ? ' is-bottom' : ''}${unavailable ? ' has-unavailable-period' : ''}`}
                      style={{
                        top: `${(startIndex / timetablePeriodCount) * 100}%`,
                        height: `${heightPercent}%`,
                        ...(isBottom ? { borderBottom: 'none' } : {}),
                      }}
                      data-start={s.start}
                      data-duration={s.duration}
                      key={getSessionKey(s)}
                      onClick={() => onSession({ ...s, weekStart })}
                      aria-label={`Reschedule ${s.title}, ${s.code}, ${formatTime(s.start)} in ${s.room}${unavailable ? ', lecturer is marked unavailable during this class' : ''}`}
                    >
                      <b>{`${s.code} - ${s.title}${s.group ? ` - Group ${s.group}` : ''}`}</b>
                      <span>{s.lecturer}</span>
                      {unavailable && (
                        <small className="session-unavailable-warning">Unavailable</small>
                      )}
                      <em>{s.room}</em>
                    </button>
                  )
                })}
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function Dashboard({
  onNavigate,
  onReschedule,
  sessions,
  courses,
  students,
  lecturers,
  rooms,
  settings,
  lecturerUnavailability,
  confirmedSectionKeys = [],
  onToggleConfirmLecturer,
  onNavigateLecturerTimetable,
}: {
  onNavigate: (v: string) => void
  onReschedule: (session: Session) => void
  sessions: Session[]
  courses: Course[]
  students: Student[]
  lecturers: Lecturer[]
  rooms: Room[]
  settings: AppSettings
  lecturerUnavailability: LecturerUnavailabilityByName
  confirmedSectionKeys?: string[]
  onToggleConfirmLecturer?: (lecturerName: string) => void
  onNavigateLecturerTimetable?: (name: string) => void
}) {
  const [confirmationFilter, setConfirmationFilter] = useState<'all' | 'confirmed' | 'pending'>('all')
  const [confirmSearch, setConfirmSearch] = useState('')
  const issues = analyzeSchedule(sessions, rooms, lecturerUnavailability)
  const score = Math.max(0, 100 - issues.length * 12)
  const sessionsWithFindings = new Set(issues.map((issue) => getSessionKey(issue.session))).size
  const conflictFreeSessions = Math.max(0, sessions.length - sessionsWithFindings)
  const conflictFreeShare = sessions.length
    ? Math.round((conflictFreeSessions / sessions.length) * 100)
    : 0
  const activePeriod = getAcademicPeriodForSemester(settings.semester)
  const activePeriodSessions = sessions.filter((session) =>
    isSessionInAcademicPeriod(session, activePeriod),
  )
  const nextClass = getNextClass(activePeriodSessions)
  const dashboardTimetableSessions = activePeriodSessions.filter(
    (session) =>
      session.studentVisible !== false &&
      session.major === 'Computer Science' &&
      session.level === 100 &&
      session.intake !== 'January',
  )
  const courseEnrollmentSummaries = Array.from(
    courses
      .reduce((summaries, course) => {
        const key = `${course.code}::${course.title}::${course.level}`
        const summary = summaries.get(key) ?? {
          code: course.code,
          title: course.title,
          level: course.level,
          total: 0,
          sections: [] as Course[],
        }
        summary.total += course.enrollment
        summary.sections.push(course)
        summaries.set(key, summary)
        return summaries
      }, new Map<string, { code: string; title: string; level: number; total: number; sections: Course[] }>())
      .values(),
  )

  const lecturerConfirmationStatus = useMemo(() => {
    return lecturers.map((lecturer) => {
      const assignedSections = courses.filter((c) => c.lecturer === lecturer.name)
      const sectionKeys = assignedSections.map((c) => getSectionKey(c))
      const isConfirmed =
        sectionKeys.length > 0 && sectionKeys.every((key) => confirmedSectionKeys.includes(key))
      return {
        lecturer,
        assignedSections,
        isConfirmed,
        totalSections: sectionKeys.length,
      }
    })
  }, [lecturers, courses, confirmedSectionKeys])

  const assignedLecturersList = lecturerConfirmationStatus.filter((item) => item.totalSections > 0)
  const confirmedLecturersCount = assignedLecturersList.filter((item) => item.isConfirmed).length
  const totalAssignedLecturers = assignedLecturersList.length
  const displayedLecturers = assignedLecturersList.filter((item) => {
    if (confirmationFilter === 'confirmed') return item.isConfirmed
    if (confirmationFilter === 'pending') return !item.isConfirmed
    return true
  })
  const dashboardMetrics = [
    {
      label: 'Enrolled students',
      value: students.length.toLocaleString(),
      delta: 'Active cohort roster',
      icon: 'students' as IconName,
    },
    {
      label: 'Faculty lecturers',
      value: String(lecturers.length),
      delta: 'Teaching assignments',
      icon: 'lecturer' as IconName,
    },
    {
      label: 'Course sections',
      value: String(courses.length),
      delta: `${courses.filter((course) => !sessions.some((session) => getSectionKey(session) === getSectionKey(course))).length} unallocated`,
      icon: 'book' as IconName,
    },
    {
      label: 'Campus classrooms',
      value: String(rooms.length),
      delta: `${rooms.filter((room) => room.status !== 'Restricted').length} active lecture spaces`,
      icon: 'building' as IconName,
    },
  ]
  const roomUtilisation = rooms.slice(0, 4)
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{formatDate(0)} · Academic City University</p>
          <h1>Academic Operations Portal</h1>
          <p>Central management for faculty teaching confirmations, cohort timetables, and lecture hall allocations.</p>
        </div>
        <Button onClick={() => onNavigate('Scheduling')}>
          <Icon name="sparkles" size={16} /> Generate timetable
        </Button>
      </section>
      <div className="metrics">
        {dashboardMetrics.map((m) => (
          <StatCard item={m} key={m.label} />
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="card schedule-overview">
          <div className="card-head">
            <div>
              <h2>Cohort weekly timetable</h2>
              <p>
                Computer Science · Level 100 · September cohort · {activePeriod} term ·{' '}
                {getWeekLabel(initialWeekStart)}
              </p>
            </div>
            <button className="text-button" onClick={() => onNavigate('Timetables')}>
              View programme timetables <Icon name="arrow" size={15} />
            </button>
          </div>
          <div className="timetable-scroll">
            <Timetable
              sessions={dashboardTimetableSessions}
              onSession={onReschedule}
              lecturerUnavailability={lecturerUnavailability}
              weekStart={initialWeekStart}
            />
          </div>
          <div className="dashboard-next-class">
            <span className="dashboard-next-class-label">
              {nextClass?.inProgress ? 'In progress now' : 'Next class'}
            </span>
            {nextClass ? (
              <>
                <b>
                  {nextClass.session.code} · {nextClass.session.title}
                </b>
                <span>
                  {new Intl.DateTimeFormat('en', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  }).format(parseCalendarDate(nextClass.date))}
                  {' · '}
                  {formatTime(nextClass.session.start)}
                  {' · '}
                  {nextClass.session.lecturer}
                  {' · '}
                  {nextClass.session.room}
                </span>
              </>
            ) : (
              <b>No upcoming classes this week</b>
            )}
          </div>
        </section>
        <aside className="right-stack">
          <section className="card health">
            <div className="card-head">
              <div>
                <h2>Scheduling health</h2>
                <p>Based on current allocations</p>
              </div>
              <span className="sample-pill bg-[#eef8f2] text-[#2e7d4d] border border-[#c6ebd4]">Active Term</span>
            </div>
            <div className="health-chart">
              <div
                className="health-donut"
                role="img"
                aria-label={`${score} out of 100 schedule health. ${conflictFreeSessions} conflict-free classes and ${sessionsWithFindings} classes with findings.`}
                style={{
                  background: `conic-gradient(#4b9b70 ${conflictFreeShare}%, #cc3634 0)`,
                }}
              >
                <div>
                  <strong>{score}</strong>
                  <span>/100</span>
                </div>
              </div>
              <div className="health-chart-list">
                <div>
                  <span>
                    <i className="health-legend-clear" />
                    Conflict-free classes
                  </span>
                  <b>
                    {conflictFreeSessions}
                    <small>{conflictFreeShare}%</small>
                  </b>
                </div>
                <div>
                  <span>
                    <i className="health-legend-flagged" />
                    Classes with findings
                  </span>
                  <b>
                    {sessionsWithFindings}
                    <small>
                      {sessions.length
                        ? Math.round((sessionsWithFindings / sessions.length) * 100)
                        : 0}
                      %
                    </small>
                  </b>
                </div>
              </div>
            </div>
            <div className="health-summary">
              <div>
                <b>{issues.length ? 'Review schedule findings' : 'No sample conflicts found'}</b>
                <p>
                  {sessions.length} scheduled classes are checked against rooms, lecturers and
                  cohorts.
                </p>
              </div>
            </div>
            <div className="health-row">
              <span>
                <i>
                  <Icon name="clock" size={14} />
                </i>
                Unallocated sessions
              </span>
              <b>
                {
                  courses.filter(
                    (course) =>
                      !sessions.some((session) => getSectionKey(session) === getSectionKey(course)),
                  ).length
                }
              </b>
            </div>
            <div className="health-row">
              <span>
                <i>
                  <Icon name="activity" size={14} />
                </i>
                Classroom utilisation
              </span>
              <b>
                {rooms.length
                  ? `${Math.round(rooms.reduce((sum, room) => sum + room.utilization, 0) / rooms.length)}%`
                  : '—'}
              </b>
            </div>
            <button className="wide-link" onClick={() => onNavigate('Optimisation')}>
              Review schedule health <Icon name="arrow" size={15} />
            </button>
          </section>
          <section className="card utilisation">
            <div className="card-head">
              <div>
                <h2>Room utilisation</h2>
                <p>Illustrative room utilisation</p>
              </div>
              <button>
                <Icon name="more" />
              </button>
            </div>
            {roomUtilisation.map((room) => (
              <div className="util-row" key={room.name}>
                <div>
                  <b>{room.name}</b>
                  <span>
                    {room.utilization > 80
                      ? 'High use'
                      : room.utilization > 60
                        ? 'Optimal'
                        : 'Available'}
                  </span>
                </div>
                <div className="bar">
                  <i style={{ width: `${room.utilization}%` }} />
                </div>
                <strong>{room.utilization}%</strong>
              </div>
            ))}
          </section>
        </aside>
      </div>
      <section className="card activity-card">
        <div className="card-head">
          <div>
            <div className="flex items-center gap-2">
              <h2>Lecturer Timetable Confirmations</h2>
              <span className="rounded-full bg-[#f0f9f3] px-2.5 py-0.5 text-xs font-semibold text-[#2b7a4b] border border-[#c3e6cb]">
                {confirmedLecturersCount} / {totalAssignedLecturers} Confirmed
              </span>
            </div>
            <p>Track which lecturers have confirmed the system-generated timetable.</p>
          </div>
          <button className="text-button" onClick={() => onNavigate('Timetables')}>
            Inspect full timetables <Icon name="arrow" size={15} />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs font-medium text-[#656461] mb-1">
            <span>Overall lecturer confirmation progress</span>
            <span>{totalAssignedLecturers ? Math.round((confirmedLecturersCount / totalAssignedLecturers) * 100) : 0}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#e9e8e5]">
            <div
              className="h-full bg-[#4b9b70] transition-all duration-300"
              style={{
                width: `${totalAssignedLecturers ? (confirmedLecturersCount / totalAssignedLecturers) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <input
          className="confirmation-search"
          placeholder="Search lecturers..."
          value={confirmSearch}
          onChange={(e) => setConfirmSearch(e.target.value)}
        />

        <div className="flex gap-2 mb-3">
          {(['all', 'confirmed', 'pending'] as const).map((filter) => (
            <button
              key={filter}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                confirmationFilter === filter
                  ? 'bg-[#cc3634] text-white border-[#cc3634]'
                  : 'bg-white text-[#656461] border-[#deddd9] hover:bg-[#f6f5f3]'
              }`}
              onClick={() => setConfirmationFilter(filter)}
            >
              {filter === 'all'
                ? `All (${totalAssignedLecturers})`
                : filter === 'confirmed'
                  ? `Confirmed (${confirmedLecturersCount})`
                  : `Pending (${totalAssignedLecturers - confirmedLecturersCount})`}
            </button>
          ))}
        </div>

        <ul className="confirmation-list">
          {displayedLecturers
            .filter(item =>
              item.lecturer.name.toLowerCase().includes(confirmSearch.toLowerCase()) ||
              item.lecturer.department.toLowerCase().includes(confirmSearch.toLowerCase())
            )
            .map(item => (
              <li key={item.lecturer.id} className="confirmation-list-item">
                <button
                  className="confirmation-list-row"
                  onClick={() => onNavigateLecturerTimetable?.(item.lecturer.name)}
                  type="button"
                >
                  <div className="confirmation-list-left">
                    <span className="confirmation-list-name">{item.lecturer.name}</span>
                    <span className="confirmation-list-dept">{item.lecturer.department} · {item.assignedSections.length} course{item.assignedSections.length === 1 ? '' : 's'}</span>
                    <div className="confirmation-list-courses">
                      {item.assignedSections.map(sec => (
                        <span key={getSectionKey(sec)} className="confirmation-course-chip">
                          {sec.code}{sec.group ? ` · Grp ${sec.group}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="confirmation-list-right">
                    <span className={`confirmation-status-pill ${item.isConfirmed ? 'confirmed' : 'pending'}`}>
                      {item.isConfirmed ? 'Confirmed' : 'Pending'}
                    </span>
                    <button
                      className="confirm-toggle-btn"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleConfirmLecturer?.(item.lecturer.name) }}
                    >
                      {item.isConfirmed ? 'Revert' : 'Mark confirmed'}
                    </button>
                  </div>
                </button>
              </li>
            ))}
          {displayedLecturers.filter(item =>
            item.lecturer.name.toLowerCase().includes(confirmSearch.toLowerCase()) ||
            item.lecturer.department.toLowerCase().includes(confirmSearch.toLowerCase())
          ).length === 0 && (
            <li className="p-4 text-center text-xs text-[#888]">
              No lecturers match "{confirmSearch}".
            </li>
          )}
        </ul>
      </section>
      <section className="card activity-card">
        <div className="card-head">
          <div>
            <h2>Course enrollment</h2>
            <p>Student counts by major and class group</p>
          </div>
          <button className="text-button" onClick={() => onNavigate('Courses')}>
            Manage course sections <Icon name="arrow" size={15} />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {courseEnrollmentSummaries.map((course) => (
            <div
              className="flex items-start justify-between gap-4 rounded-lg border border-[#ecece9] p-3"
              key={`${course.code}-${course.title}-${course.level}`}
            >
              <div>
                <b>
                  {course.code} · {course.title}
                </b>
                <p className="mt-1 text-xs text-[#747471]">
                  {course.sections
                    .map(
                      (section) =>
                        `${section.major}${section.group ? ` · Group ${section.group}` : ''}: ${section.enrollment}`,
                    )
                    .join(' · ')}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <b>{course.total.toLocaleString()}</b>
                <small className="block text-xs text-[#747471]">students</small>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="card activity-card">
        <div className="card-head">
          <div>
            <h2>Sample timetable at a glance</h2>
            <p>Representative scheduled classes, not an audit log</p>
          </div>
          <button className="text-button" onClick={() => onNavigate('Timetables')}>
            View timetable <Icon name="arrow" size={15} />
          </button>
        </div>
        <div className="activity-list">
          {sessions.slice(0, 4).map((session) => (
            <button
              className="activity-item"
              key={getSessionKey(session)}
              onClick={() => onReschedule(session)}
            >
              <i>
                <Icon name="calendar" />
              </i>
              <div>
                <b>{session.title}</b>
                <span>
                  {session.code} ·{' '}
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][session.day]} ·{' '}
                  {formatTime(session.start)} · {session.lecturer}
                </span>
              </div>
              <em>{session.room}</em>
              <Icon name="chevron" size={16} />
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

function TimetablesPage({
  sessions,
  courses,
  lecturers = [],
  rooms = [],
  onReschedule,
  settings,
  lecturerUnavailability,
  initialLecturer,
  onJumpConsumed,
}: {
  sessions: Session[]
  courses: Course[]
  lecturers?: Lecturer[]
  rooms?: Room[]
  onReschedule: (session: Session) => void
  settings: AppSettings
  lecturerUnavailability: LecturerUnavailabilityByName
  initialLecturer?: string | null
  onJumpConsumed?: () => void
}) {
  const [timetableMode, setTimetableMode] = useState<'programme' | 'lecturer' | 'classroom'>(
    initialLecturer ? 'lecturer' : 'programme',
  )
  const [selectedLecturer, setSelectedLecturer] = useState<string>(
    initialLecturer ?? lecturers[0]?.name ?? 'Ama Boateng',
  )
  useEffect(() => {
    if (initialLecturer) {
      setTimetableMode('lecturer')
      setSelectedLecturer(initialLecturer)
      onJumpConsumed?.()
    }
  }, [initialLecturer]) // eslint-disable-line react-hooks/exhaustive-deps
  const [selectedClassroom, setSelectedClassroom] = useState<string>(rooms[0]?.name ?? 'Computer Lab 1')
  const [programme, setProgramme] = useState(
    undergraduateProgrammes.find((item) =>
      courses.some(
        (course) => course.programmes?.includes(item.major) || course.major === item.major,
      ),
    )?.label ?? '',
  )
  const [level, setLevel] = useState('100')
  const [academicPeriod, setAcademicPeriod] = useState<'September' | 'January' | 'Summer'>(
    settings.semester.includes('Semester 2') ? 'January' : 'September',
  )
  const [intake, setIntake] = useState<'All cohorts' | 'September' | 'January'>('All cohorts')
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [exportingPng, setExportingPng] = useState(false)
  const [exportError, setExportError] = useState('')
  const availableProgrammes = undergraduateProgrammes.filter((item) =>
    courses.some(
      (course) => course.programmes?.includes(item.major) || course.major === item.major,
    ),
  )
  const selectedProgramme = availableProgrammes.find((item) => item.label === programme)
  const matchingCourses = courses.filter(
    (course) =>
      (course.programmes?.includes(selectedProgramme?.major ?? '') ||
        course.major === selectedProgramme?.major) &&
      course.level === Number(level) &&
      course.academicPeriod === academicPeriod &&
      (intake === 'All cohorts' || course.intake === intake || course.intake === 'Merged'),
  )
  const filtered = useMemo(() => {
    if (timetableMode === 'lecturer') {
      return sessions.filter(
        (session) => session.lecturer === selectedLecturer && session.studentVisible !== false,
      )
    }
    if (timetableMode === 'classroom') {
      return sessions.filter(
        (session) => session.room === selectedClassroom && session.studentVisible !== false,
      )
    }
    return sessions.filter((session) => {
      return (
        session.studentVisible !== false &&
        (session.programmes?.includes(selectedProgramme?.major ?? '') ||
          session.major === selectedProgramme?.major) &&
        session.level === Number(level) &&
        session.academicPeriod === academicPeriod &&
        (intake === 'All cohorts' || session.intake === intake || session.intake === 'Merged')
      )
    })
  }, [
    timetableMode,
    selectedLecturer,
    selectedClassroom,
    sessions,
    selectedProgramme,
    level,
    academicPeriod,
    intake,
  ])

  const unscheduledCourses = matchingCourses.filter((course) => course.status === 'Draft')
  const timetablePeriods = useMemo(() => {
    return calculateTimetablePeriods(
      settings.dayStartTime || '08:00',
      settings.periodDuration || 60,
      settings.breakDuration !== undefined ? settings.breakDuration : 10,
      settings.dayEndTime || '18:20',
      settings.periodCount || 9,
    )
  }, [
    settings.dayStartTime,
    settings.periodDuration,
    settings.breakDuration,
    settings.dayEndTime,
    settings.periodCount,
  ])

  const timetableRef = useRef<HTMLDivElement>(null)
  const exportPng = async () => {
    const timetableGrid = timetableRef.current?.querySelector<HTMLElement>('.reference-timetable')
    if (!timetableGrid) {
      setExportError('The timetable is not ready to export. Please try again.')
      return
    }

    setExportingPng(true)
    setExportError('')
    try {
      await downloadElementPng(timetableGrid, `academic-city-timetable-${weekStart}.png`)
    } catch (error) {
      console.error('Unable to export timetable PNG.', error)
      setExportError('PNG export failed. Please try again.')
    } finally {
      setExportingPng(false)
    }
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Academic operations</p>
          <h1>
            {timetableMode === 'lecturer'
              ? `Lecturer timetable · ${selectedLecturer}`
              : timetableMode === 'classroom'
                ? `Classroom timetable · ${selectedClassroom}`
                : 'Programme timetable'}
          </h1>
          <p>
            {timetableMode === 'lecturer'
              ? `Viewing scheduled classes for ${selectedLecturer}. Select any class to reschedule or change details.`
              : timetableMode === 'classroom'
                ? `Viewing scheduled classes in ${selectedClassroom}. Select any class to relocate or reschedule.`
                : `${programme} · Level ${level} · ${academicPeriod} term${Number(level) === 100 && intake !== 'All cohorts' ? ` · ${intake} intake` : ''}. Select any class to edit.`}
          </p>
        </div>
        <div className="timetable-actions">
          <button className="button secondary" onClick={() => window.print()}>
            Print
          </button>
          <button className="button secondary" onClick={exportPng} disabled={exportingPng}>
            {exportingPng ? 'Preparing PNG…' : 'Export PNG'}
          </button>
        </div>
      </section>
      {exportError && (
        <p className="timetable-export-error" role="alert">
          {exportError}
        </p>
      )}
      <div className="toolbar card timetable-filter-toolbar">
        <select
          className="timetable-mode-filter font-semibold text-[#a42d2b]"
          aria-label="Select timetable view mode"
          value={timetableMode}
          onChange={(event) =>
            setTimetableMode(event.target.value as 'programme' | 'lecturer' | 'classroom')
          }
        >
          <option value="programme">Programme Timetable</option>
          <option value="lecturer">Lecturer Timetable (Edit Teacher Schedule)</option>
          <option value="classroom">Classroom Timetable</option>
        </select>

        {timetableMode === 'lecturer' && (
          <select
            aria-label="Filter timetable by lecturer"
            value={selectedLecturer}
            onChange={(event) => setSelectedLecturer(event.target.value)}
          >
            {lecturers.map((lecturer) => (
              <option key={lecturer.id} value={lecturer.name}>
                {lecturer.name} ({lecturer.department})
              </option>
            ))}
          </select>
        )}

        {timetableMode === 'classroom' && (
          <select
            aria-label="Filter timetable by classroom"
            value={selectedClassroom}
            onChange={(event) => setSelectedClassroom(event.target.value)}
          >
            {rooms.map((room) => (
              <option key={room.name} value={room.name}>
                {room.name} ({room.capacity} seats · {room.type})
              </option>
            ))}
          </select>
        )}

        {timetableMode === 'programme' && (
          <>
            <select
              className="timetable-programme-filter"
              aria-label="Filter timetable by programme or major"
              value={programme}
              onChange={(event) => setProgramme(event.target.value)}
            >
              {availableProgrammes.map((item) => (
                <option key={item.label}>{item.label}</option>
              ))}
            </select>
            <select
              className="timetable-level-filter"
              aria-label="Filter timetable by level"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              {[100, 200, 300, 400].map((item) => (
                <option key={item} value={item}>
                  Level {item}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter timetable by academic period"
              value={academicPeriod}
              onChange={(event) =>
                setAcademicPeriod(event.target.value as 'September' | 'January' | 'Summer')
              }
            >
              {(['September', 'January', 'Summer'] as const).map((period) => (
                <option key={period} value={period}>
                  {period} term
                </option>
              ))}
            </select>
            {Number(level) === 100 && (
              <select
                aria-label="Filter Level 100 timetable by intake"
                value={intake}
                onChange={(event) =>
                  setIntake(event.target.value as 'All cohorts' | 'September' | 'January')
                }
              >
                {(['All cohorts', 'September', 'January'] as const).map((cohortIntake) => (
                  <option key={cohortIntake}>{cohortIntake}</option>
                ))}
              </select>
            )}
          </>
        )}
      </div>
      <section className="card calendar-large">
        <div className="calendar-toolbar">
          <button
            className="icon-button"
            aria-label="Previous week"
            onClick={() => setWeekStart((date) => addCalendarDays(date, -7))}
          >
            ‹
          </button>
          <div>
            <h2>{getWeekLabel(weekStart, settings.includeSaturday)}</h2>
            <p>
              {academicPeriod} term · {settings.semester}
            </p>
          </div>
          <button
            className="icon-button"
            aria-label="Next week"
            onClick={() => setWeekStart((date) => addCalendarDays(date, 7))}
          >
            ›
          </button>
          <label className="calendar-date-picker">
            Week starting
            <input
              type="date"
              aria-label="Choose timetable week"
              value={weekStart}
              onChange={(event) => {
                if (event.target.value) setWeekStart(getMondayDate(event.target.value))
              }}
            />
          </label>
          <span />
          <div className="legend">
            <i className="lecture" /> Lecture <i className="tutorial" /> Tutorial{' '}
            <i className="practical" /> Practical
            <i className="lecturer-unavailable-legend" /> Lecturer unavailable
          </div>
        </div>
        <div
          ref={timetableRef}
          id="system-timetable-capture"
          className="timetable-capture"
          aria-label="Weekly timetable for export and printing"
        >
          <Timetable
            sessions={filtered}
            onSession={onReschedule}
            lecturerUnavailability={lecturerUnavailability}
            dayFilter={null}
            weekStart={weekStart}
            printTargetId="system-timetable"
            periodStarts={timetablePeriods}
            periodDuration={settings.periodDuration || 60}
            includeSaturday={settings.includeSaturday}
          />
        </div>
        {filtered.length === 0 && (
          <div className="workspace-empty">
            {timetableMode === 'lecturer'
              ? `No classes are scheduled for ${selectedLecturer}.`
              : timetableMode === 'classroom'
                ? `No classes are scheduled in ${selectedClassroom}.`
                : 'No course or timetable records match these filters.'}
          </div>
        )}
        <div className="calendar-footnote">
          Timetable allocations · Academic City University, Ghana. Click any class to reschedule.
        </div>
      </section>
    </>
  )
}

function ClassroomsPage({
  sessions,
  settings,
  lecturerUnavailability,
  onReschedule,
  selectedRoom,
  onSelectRoom,
  rooms,
  onAddRoom,
  onRemoveRoom,
  onBookRoom,
}: {
  sessions: Session[]
  settings: AppSettings
  lecturerUnavailability: LecturerUnavailabilityByName
  onReschedule: (session: Session) => void
  selectedRoom: string
  onSelectRoom: (room: string) => void
  rooms: Room[]
  onAddRoom: (room: Room) => void
  onRemoveRoom: (roomName: string) => void
  onBookRoom?: (booking: {
    room: string
    title: string
    day: number
    start: number
    duration: number
    organizer: string
  }) => { relocatedCount: number; notice: string } | void
}) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All types')
  const [availability, setAvailability] = useState('All availability')
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [showBookRoom, setShowBookRoom] = useState(false)
  const [roomNotice, setRoomNotice] = useState('')
  const activePeriod = getAcademicPeriodForSemester(settings.semester)
  const activePeriodSessions = sessions.filter((session) =>
    isSessionInAcademicPeriod(session, activePeriod),
  )
  const filtered = rooms.filter((room) => {
    const matchesText = `${room.name} ${room.location}`.toLowerCase().includes(query.toLowerCase())
    return (
      matchesText &&
      (type === 'All types' || room.type === type) &&
      (availability === 'All availability' || room.status === availability)
    )
  })
  const averageUtilisation = Math.round(
    rooms.reduce((total, room) => total + room.utilization, 0) / rooms.length,
  )
  const addRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const roomType = String(data.get('roomType')) as RoomType
    const room: Room = {
      name: String(data.get('name')).trim(),
      location: String(data.get('location')).trim(),
      capacity: Number(data.get('capacity')),
      type:
        roomType === 'lecture'
          ? 'Lecture room'
          : roomType === 'computer'
            ? 'Computer lab'
            : 'Specialised lab',
      roomType,
      status: 'Available',
      utilization: 0,
    }
    if (rooms.some((existing) => existing.name.toLowerCase() === room.name.toLowerCase())) {
      setRoomNotice(`${room.name} already exists in this sample room list.`)
      return
    }
    onAddRoom(room)
    onSelectRoom(room.name)
    setRoomNotice(`${room.name} added to this sample workspace.`)
    setShowAddRoom(false)
    event.currentTarget.reset()
  }
  const removeRoom = (room: Room) => {
    if (sessions.some((session) => session.room === room.name)) {
      setRoomNotice(
        `${room.name} is used by a scheduled class. Move those classes before removing it.`,
      )
      return
    }
    if (rooms.length <= 1) {
      setRoomNotice('Keep at least one classroom in the sample room list.')
      return
    }
    onRemoveRoom(room.name)
    setRoomNotice(`${room.name} removed from this sample room list.`)
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Facilities</p>
          <h1>Classrooms</h1>
          <p>Review room capacity, weekly bookings and safe rescheduling options.</p>
        </div>
        <div className="flex gap-2">
          <Button kind="secondary" onClick={() => setShowBookRoom((open) => !open)}>
            <Icon name="calendar" size={16} /> Book room / event
          </Button>
          <Button onClick={() => setShowAddRoom((open) => !open)}>
            <Icon name="plus" size={16} /> Add classroom
          </Button>
        </div>
      </section>
      {showBookRoom && (
        <form
          className="card workspace-form"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            const targetRoom = String(data.get('room'))
            const title = String(data.get('title'))
            const day = Number(data.get('day'))
            const timeStr = String(data.get('startTime'))
            const duration = Number(data.get('duration'))
            const [h, m] = timeStr.split(':').map(Number)
            const start = h * 60 + m
            const result = onBookRoom?.({
              room: targetRoom,
              title,
              day,
              start,
              duration,
              organizer: String(data.get('organizer')),
            })
            setRoomNotice(
              result?.notice ||
                `Room ${targetRoom} booked for "${title}". Conflicting classes were automatically relocated. Lecturers can move their classes if needed.`,
            )
            setShowBookRoom(false)
          }}
        >
          <div className="card-head">
            <div>
              <h2>Book a Classroom</h2>
              <p>
                Reserve a room for a special campus event, presentation or meeting. If classes are
                already scheduled, the system will automatically relocate them to available
                alternative rooms, and lecturers can move them if they prefer.
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowBookRoom(false)}
            >
              ×
            </button>
          </div>
          <div className="workspace-form-grid">
            <label>
              Classroom
              <select name="room" defaultValue={selectedRoom}>
                {rooms.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name} ({r.capacity} seats · {r.type})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Event / Session Title
              <input name="title" required placeholder="e.g. Industry Guest Lecture / Tech Seminar" />
            </label>
            <label>
              Organizer / Faculty
              <input name="organizer" required placeholder="e.g. Dr. K. Mensah / Career Services" />
            </label>
            <label>
              Day of Week
              <select name="day" defaultValue={0}>
                {(settings.includeSaturday
                  ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                  : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                ).map((d, idx) => (
                  <option key={d} value={idx}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start Time
              <input name="startTime" type="time" defaultValue="10:00" required />
            </label>
            <label>
              Duration
              <select name="duration" defaultValue={120}>
                <option value={60}>1 hour (60 min)</option>
                <option value={90}>1.5 hours (90 min)</option>
                <option value={120}>2 hours (120 min)</option>
                <option value={180}>3 hours (180 min)</option>
              </select>
            </label>
          </div>
          <div className="workspace-form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setShowBookRoom(false)}
            >
              Cancel
            </button>
            <button className="button primary" type="submit">
              Confirm Room Booking & Relocate Conflicts
            </button>
          </div>
        </form>
      )}
      <div className="metrics compact">
        {[
          [String(rooms.length), 'Sample rooms', 'building'],
          [
            String(rooms.filter((room) => room.status === 'Available').length),
            'Available',
            'check',
          ],
          [
            String(rooms.filter((room) => room.roomType !== 'lecture').length),
            'Lab / specialist rooms',
            'sparkles',
          ],
          [`${averageUtilisation}%`, 'Avg. utilisation', 'activity'],
        ].map(([v, l, i]) => (
          <div className="mini-stat" key={l}>
            <i>
              <Icon name={i as IconName} />
            </i>
            <div>
              <strong>{v}</strong>
              <span>{l}</span>
            </div>
          </div>
        ))}
      </div>
      {roomNotice && (
        <div className="workspace-notice">
          <span>{roomNotice}</span>
          <button onClick={() => setRoomNotice('')}>Dismiss</button>
        </div>
      )}
      {showAddRoom && (
        <form className="card workspace-form" onSubmit={addRoom}>
          <div className="card-head">
            <div>
              <h2>Add a sample classroom</h2>
              <p>New rooms are temporary and can immediately appear in room filters.</p>
            </div>
          </div>
          <div className="workspace-form-grid">
            <label>
              Room name
              <input name="name" required placeholder="e.g. Learning Studio 3" />
            </label>
            <label>
              Location
              <input name="location" required placeholder="Building and floor" />
            </label>
            <label>
              Capacity
              <input name="capacity" type="number" min="1" required defaultValue="40" />
            </label>
            <label>
              Room type
              <select name="roomType">
                <option value="lecture">Lecture room</option>
                <option value="computer">Computer lab</option>
                <option value="robotics">Robotics lab</option>
                <option value="electrical">Electrical lab</option>
                <option value="biomedical">Biomedical lab</option>
              </select>
            </label>
          </div>
          <div className="workspace-form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setShowAddRoom(false)}
            >
              Cancel
            </button>
            <button className="button primary">Add sample classroom</button>
          </div>
        </form>
      )}
      <section className="card rooms-card">
        <div className="table-tools">
          <label className="field-search">
            <Icon name="search" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search classrooms"
            />
          </label>
          <select
            aria-label="Filter by classroom type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option>All types</option>
            {[...new Set(rooms.map((room) => room.type))].map((roomType) => (
              <option key={roomType}>{roomType}</option>
            ))}
          </select>
          <select
            aria-label="Filter by classroom availability"
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
          >
            <option>All availability</option>
            {[...new Set(rooms.map((room) => room.status))].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <span />
          <Button kind="secondary">
            <Icon name="sliders" size={16} /> Filters
          </Button>
        </div>
        <div className="data-table">
          <div className="table-row table-header">
            <span>Room</span>
            <span>Capacity</span>
            <span>Type</span>
            <span>Status</span>
            <span>Utilisation</span>
            <span />
          </div>
          {filtered.map((room) => (
            <div className="table-row" key={room.name}>
              <span className="room-name">
                <i>
                  <Icon name={room.roomType === 'lecture' ? 'building' : 'sparkles'} />
                </i>
                <b>{room.name}</b>
                <small>{room.location}</small>
              </span>
              <span>
                <b>{room.capacity}</b> seats
              </span>
              <span>{room.type}</span>
              <span>
                <em className={`status ${room.status.toLowerCase().replace(' ', '-')}`}>
                  {room.status}
                </em>
              </span>
              <span className="util-cell">
                <div className="bar">
                  <i style={{ width: `${room.utilization}%` }} />
                </div>
                <b>{room.utilization}%</b>
              </span>
              <span className="room-actions">
                <button className="text-button" onClick={() => onSelectRoom(room.name)}>
                  View
                </button>
                <button
                  className="text-button remove-room"
                  onClick={() => removeRoom(room)}
                  aria-label={`Remove ${room.name}`}
                  title={
                    sessions.some((session) => session.room === room.name)
                      ? 'Move scheduled classes before removing this room'
                      : 'Remove this classroom from the sample list'
                  }
                >
                  Remove
                </button>
              </span>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="workspace-empty">No classrooms match these filters.</div>
        )}
        <div className="table-note">
          <Icon name="alert" size={15} />
          <span>
            Room capacities shown are editable planning estimates and should be verified by
            Facilities.
          </span>
        </div>
      </section>
      <section className="card room-schedule">
        <div className="card-head">
          <div>
            <h2>Classroom weekly timetable</h2>
            <p>
              {activePeriod} term bookings only. Select a room to see its classes, then select a
              class to find a safe move.
            </p>
          </div>
          <label className="room-picker">
            <span>Classroom</span>
            <select value={selectedRoom} onChange={(event) => onSelectRoom(event.target.value)}>
              {rooms.map((room) => (
                <option key={room.name} value={room.name}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="room-calendar">
          <Timetable
            sessions={activePeriodSessions}
            onSession={onReschedule}
            lecturerUnavailability={lecturerUnavailability}
            roomFilter={selectedRoom}
            includeSaturday={settings.includeSaturday}
          />
        </div>
      </section>
    </>
  )
}

function NotificationsPage({
  notifications,
  onBack,
}: {
  notifications: AppNotification[]
  onBack: () => void
}) {
  return (
    <section className="notification-page">
      <button className="notification-back-button" onClick={onBack}>
        <Icon name="arrow" size={16} />
        Back to dashboard
      </button>
      <div className="notification-page-heading">
        <div>
          <p className="eyebrow">Administrator inbox</p>
          <h1>Notifications</h1>
          <p>Timetable updates and actions that need your attention.</p>
        </div>
        <span>{notifications.length} updates</span>
      </div>
      <section className="notification-list" aria-label="All notifications">
        {notifications.length ? (
          notifications.map((notification) => (
            <article
              className={`notification-entry${notification.read ? '' : ' unread'}`}
              key={notification.id}
            >
              <span className="notification-entry-dot" aria-hidden="true" />
              <div>
                <p>{notification.message}</p>
                <small>{notification.time}</small>
              </div>
              {!notification.read && <span className="notification-entry-label">New</span>}
            </article>
          ))
        ) : (
          <p className="notification-empty-state">You’re all caught up. No notifications yet.</p>
        )}
      </section>
    </section>
  )
}

export default function App({
  forcedRole,
  onLogout,
}: {
  forcedRole?: 'admin' | 'lecturer' | 'student'
  onLogout?: () => void
} = {}) {
  const [isLoggedIn, setIsLoggedIn] = useState(forcedRole ? true : false)
  const [role, setRole] = useState<'admin' | 'lecturer' | 'student'>(forcedRole ?? 'admin')
  const [lecturerViewId, setLecturerViewId] = useState(initialLecturers[0]?.id ?? '')
  const [studentViewId, setStudentViewId] = useState(
    initialStudents[1]?.id ?? initialStudents[0]?.id ?? '',
  )
  const [page, setPage] = useState('Dashboard')
  const navigateToPage = useTabScrollRestoration(page, setPage)
  const currentNavIndex = nav.findIndex(([label]) => label === page)
  const isNavActive = currentNavIndex >= 0
  const activeNavigationIndex = isNavActive ? currentNavIndex : 0
  const notificationWrapRef = useRef<HTMLDivElement | null>(null)
  const [sessions, setSessions] = useState(initialTeachingAssignments.sessions)
  const [weekOverrides, setWeekOverrides] = useState<Record<string, Session>>({})
  const [rooms, setRooms] = useState(initialRooms)
  const [courses, setCourses] = useState(initialTeachingAssignments.courses)
  const [examSchedule, setExamSchedule] = useState<ExamScheduleItem[]>(examScheduleData)
  const [examScheduleLoadError, setExamScheduleLoadError] = useState('')
  const students = initialStudents
  const [lecturers, setLecturers] = useState(initialLecturers)
  const [lecturerUnavailability, setLecturerUnavailability] =
    useState<LecturerUnavailabilityByName>({})
  const [settings, setSettings] = useState(initialSettings)
  const [rescheduleKey, setRescheduleKey] = useState<string | null>(null)
  const [rescheduleActor, setRescheduleActor] = useState(role)
  const [confirmedSectionKeys, setConfirmedSectionKeys] = useState<string[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>(() => [
    {
      id: 1,
      message: 'Sample timetable is ready for lecturer confirmation.',
      time: 'Today',
      read:
        typeof window !== 'undefined' &&
        window.localStorage.getItem(adminNotificationReadKey) === 'true',
      audience: 'admin',
    },
  ])
  const [events, setEvents] = useState<TimetableEvent[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationSequence = useRef(2)
  const [selectedRoom, setSelectedRoom] = useState('Computer Lab 1')
  const [dashboardJumpLecturer, setDashboardJumpLecturer] = useState<string | null>(null)
  useEffect(() => {
    const syncExamSchedule = () => {
      try {
        setExamSchedule(loadSavedExamSchedule() ?? examScheduleData)
        setExamScheduleLoadError('')
      } catch (error) {
        console.error('Unable to load saved exam schedule.', error)
        setExamScheduleLoadError('The saved exam schedule could not be loaded.')
      }
    }

    syncExamSchedule()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === examScheduleStorageKey || event.key === null) syncExamSchedule()
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])
  // Nav scroll removed - fixed nav with labels
  useEffect(() => {
    if (!notificationsOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !notificationWrapRef.current?.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [notificationsOpen])
  useEffect(() => {
    if (role !== 'admin' || page !== 'Notifications') return
    if (
      !notifications.some((notification) => notification.audience === 'admin' && !notification.read)
    )
      return

    window.localStorage.setItem(adminNotificationReadKey, 'true')
    setNotifications((current) =>
      current.map((notification) =>
        notification.audience === 'admin' ? { ...notification, read: true } : notification,
      ),
    )
  }, [notifications, page, role])
  const effectiveSessions = useMemo(
    () =>
      sessions.map(
        (session) => weekOverrides[`${initialWeekStart}:${getSessionKey(session)}`] ?? session,
      ),
    [sessions, weekOverrides],
  )
  const selectedSession = effectiveSessions.find(
    (session) => getSessionKey(session) === rescheduleKey,
  )
  const activeLecturer = lecturers.find((lecturer) => lecturer.id === lecturerViewId)
  const activeStudent = students.find((student) => student.id === studentViewId)
  const notifyAdmin = (message: string) => {
    setNotifications((current) => [
      {
        id: notificationSequence.current++,
        message,
        time: 'Just now',
        read: false,
        audience: 'admin',
      },
      ...current,
    ])
  }
  const openReschedule = (session: Session) => {
    setRescheduleActor(role)
    setRescheduleKey(getSessionKey(session))
  }
  const confirmMove = (updatedSession: Session) => {
    const conflictingSession = findSessionConflicts(
      updatedSession,
      effectiveSessions,
      getSessionKey(updatedSession),
    )[0]
    if (conflictingSession) {
      const { other, type } = conflictingSession
      const reason =
        type === 'room'
          ? `${updatedSession.room} is already booked for ${other.code}`
          : type === 'lecturer'
            ? `${updatedSession.lecturer} is already teaching ${other.code}`
            : `${updatedSession.major} Level ${updatedSession.level} already has ${other.code}`
      notifyAdmin(`${updatedSession.code} was not moved because ${reason} at that time.`)
      return false
    }

    if (!updatedSession.isOnline && updatedSession.room !== 'Online') {
      const sessionDate = addCalendarDays(
        updatedSession.weekStart ?? initialWeekStart,
        updatedSession.day,
      )
      const conflictingEvent = events.find(
        (event) =>
          event.date === sessionDate &&
          event.room === updatedSession.room &&
          updatedSession.start < event.start + event.duration &&
          getSessionEnd(updatedSession) > event.start,
      )
      if (conflictingEvent) {
        notifyAdmin(
          `${updatedSession.code} was not moved because ${updatedSession.room} is booked for ${conflictingEvent.title} at that time.`,
        )
        return false
      }
    }

    setWeekOverrides((current) => ({
      ...current,
      [`${initialWeekStart}:${getSessionKey(updatedSession)}`]: updatedSession,
    }))
    if (rescheduleActor === 'lecturer') {
      notifyAdmin(
        `${updatedSession.lecturer} changed ${updatedSession.code} for this week to ${weekdayNames[updatedSession.day]} at ${formatTime(updatedSession.start)}${updatedSession.isOnline || updatedSession.room.toLowerCase().includes('online') ? ' online; classroom released' : ` in ${updatedSession.room}`}.`,
      )
    }
    return true
  }
  const confirmTeacherCourse = (session: Session) => {
    const sectionKey = getSectionKey(session)
    setConfirmedSectionKeys((current) =>
      current.includes(sectionKey) ? current : [...current, sectionKey],
    )
    notifyAdmin(`${session.lecturer} confirmed the timetable for ${session.code}.`)
  }
  const saveRandomizedExamSchedule = (schedule: ExamScheduleItem[]) => {
    saveExamSchedule(schedule)
    setExamSchedule(schedule)
    setExamScheduleLoadError('')
  }
  const bookCampusEvent = (event: Omit<TimetableEvent, 'id' | 'affectedCourses'>) => {
    const eventDate = parseCalendarDate(event.date)
    const day = (eventDate.getUTCDay() + 6) % 7
    const weekStart = getMondayDate(event.date)
    const impacted = effectiveSessions.filter(
      (session) =>
        session.day === day &&
        session.room === event.room &&
        (!session.weekStart || session.weekStart === weekStart) &&
        event.start < getSessionEnd(session) &&
        event.start + event.duration > session.start,
    )
    if (impacted.length) return false
    const bookedEvent: TimetableEvent = {
      ...event,
      id: `event-${notificationSequence.current}`,
      affectedCourses: [],
    }
    setEvents((current) => [...current, bookedEvent])
    setNotifications((current) => [
      {
        id: notificationSequence.current++,
        message: `${event.title} booked in ${event.room}; no scheduled classes were affected.`,
        time: 'Just now',
        read: false,
        audience: 'admin',
      },
      ...current,
    ])
    return true
  }
  const updateCourseMeetingPattern = (
    course: Course,
    pattern: CourseMeetingPattern,
    isTechnical: boolean,
  ): boolean | string => {
    const updatedCourse = { ...course, isTechnical }
    const patternError = getCourseMeetingPatternError(
      updatedCourse,
      pattern.sessionDuration,
      pattern.meetingsPerWeek,
    )
    if (patternError) return patternError

    const sectionKey = getSectionKey(course)
    const existingMeetings = sessions
      .filter((session) => getSectionKey(session) === sectionKey)
      .sort((left, right) => (left.meetingNumber ?? 1) - (right.meetingNumber ?? 1))
    const scheduledMeetings: Session[] = []
    const otherSessions = effectiveSessions.filter(
      (session) => getSectionKey(session) !== sectionKey,
    )

    if (existingMeetings.length) {
      for (let meetingIndex = 0; meetingIndex < pattern.meetingsPerWeek; meetingIndex += 1) {
        const source = existingMeetings[meetingIndex] ?? existingMeetings[0]
        const online = Boolean(source.isOnline) || source.room === 'Online'
        const candidate: Session = {
          ...source,
          duration: pattern.sessionDuration,
          weeklyHours: pattern.weeklyHours,
          meetingNumber: meetingIndex + 1,
          isOnline: online,
          room: online ? 'Online' : source.room,
        }
        const schedule = [...otherSessions, ...scheduledMeetings]
        const alternatives = getRescheduleAlternatives(
          candidate,
          schedule,
          rooms,
          settings.roomCapacityBuffer,
          lecturerUnavailability,
          online,
          events,
          false,
        )
        const preferred = alternatives.find(
          (alternative) => alternative.day === source.day && alternative.start === source.start,
        )
        const orderedAlternatives = preferred
          ? [preferred, ...alternatives.filter((alternative) => alternative !== preferred)]
          : alternatives
        let placement: { day: number; start: number; room: Room | undefined } | undefined
        for (const alternative of orderedAlternatives) {
          if (scheduledMeetings.some((meeting) => meeting.day === alternative.day)) continue
          const room = online
            ? undefined
            : (alternative.rooms.find(
                (item) =>
                  item.name === source.room && isRoomTypeCompatibleWithSession(candidate, item),
              ) ??
              alternative.rooms.find((item) => isRoomTypeCompatibleWithSession(candidate, item)))
          if (online || room) {
            placement = { day: alternative.day, start: alternative.start, room }
            break
          }
        }
        if (!placement) {
          return `No conflict-free slot is available for all ${pattern.meetingsPerWeek} meetings of ${course.code}; its current pattern was kept.`
        }
        scheduledMeetings.push({
          ...candidate,
          day: placement.day,
          start: placement.start,
          room: placement.room?.name ?? 'Online',
          roomTypeOverride: placement.room
            ? !isRoomTypeCompatibleWithSession(candidate, placement.room)
            : false,
        })
      }

      if (findScheduleConflicts([...otherSessions, ...scheduledMeetings]).length) {
        return `The new weekly pattern for ${course.code} would create a schedule conflict. No changes were saved.`
      }
    }

    setSessions((current) => [
      ...current.filter((session) => getSectionKey(session) !== sectionKey),
      ...scheduledMeetings,
    ])
    setWeekOverrides((current) => {
      const next = { ...current }
      for (const session of existingMeetings) {
        for (const key of Object.keys(next)) {
          if (key.endsWith(`:${getSessionKey(session)}`)) delete next[key]
        }
      }
      return next
    })
    setCourses((current) =>
      current.map((item) =>
        getSectionKey(item) === sectionKey
          ? {
              ...item,
              ...pattern,
              isTechnical,
              status: scheduledMeetings.length ? 'Scheduled' : 'Draft',
              lecturer: scheduledMeetings[0]?.lecturer ?? item.lecturer,
            }
          : item,
      ),
    )
    return true
  }
  const content = useMemo(() => {
    if (page === 'Dashboard')
      return (
        <Dashboard
          sessions={effectiveSessions}
          courses={courses}
          students={students}
          lecturers={lecturers}
          rooms={rooms}
          settings={settings}
          lecturerUnavailability={lecturerUnavailability}
          confirmedSectionKeys={confirmedSectionKeys}
          onToggleConfirmLecturer={(lecturerName) => {
            const lecturerSections = courses
              .filter((c) => c.lecturer === lecturerName)
              .map((c) => getSectionKey(c))
            setConfirmedSectionKeys((current) => {
              const allConfirmed =
                lecturerSections.length > 0 &&
                lecturerSections.every((k) => current.includes(k))
              if (allConfirmed) {
                return current.filter((k) => !lecturerSections.includes(k))
              } else {
                return Array.from(new Set([...current, ...lecturerSections]))
              }
            })
          }}
          onNavigate={navigateToPage}
          onReschedule={openReschedule}
          onNavigateLecturerTimetable={(name) => {
            setDashboardJumpLecturer(name)
            navigateToPage('Timetables')
          }}
        />
      )
    if (page === 'Timetables')
      return (
        <TimetablesPage
          sessions={effectiveSessions}
          courses={courses}
          lecturers={lecturers}
          rooms={rooms}
          onReschedule={openReschedule}
          settings={settings}
          lecturerUnavailability={lecturerUnavailability}
          initialLecturer={dashboardJumpLecturer}
          onJumpConsumed={() => setDashboardJumpLecturer(null)}
        />
      )
    if (page === 'Classrooms')
      return (
        <ClassroomsPage
          sessions={effectiveSessions}
          settings={settings}
          rooms={rooms}
          lecturerUnavailability={lecturerUnavailability}
          onReschedule={openReschedule}
          selectedRoom={selectedRoom}
          onSelectRoom={setSelectedRoom}
          onAddRoom={(room) => setRooms((current) => [...current, room])}
          onRemoveRoom={(roomName) => {
            setRooms((current) => current.filter((room) => room.name !== roomName))
            if (selectedRoom === roomName) {
              setSelectedRoom(rooms.find((room) => room.name !== roomName)?.name ?? '')
            }
          }}
          onBookRoom={(booking) => {
            const conflicting = effectiveSessions.filter(
              (s) =>
                s.room === booking.room &&
                s.day === booking.day &&
                Math.max(s.start, booking.start) <
                  Math.min(s.start + s.duration, booking.start + booking.duration),
            )
            let relocated = 0
            for (const conflict of conflicting) {
              const altRoom = rooms.find(
                (r) =>
                  r.name !== booking.room &&
                  isRoomTypeCompatibleWithSession(conflict, r) &&
                  r.capacity >= conflict.enrollment &&
                  !effectiveSessions.some(
                    (other) =>
                      other.room === r.name &&
                      other.day === conflict.day &&
                      Math.max(other.start, conflict.start) <
                        Math.min(other.start + other.duration, conflict.start + conflict.duration),
                  ),
              )
              if (altRoom) {
                confirmMove({ ...conflict, room: altRoom.name })
                notifyAdmin(
                  `System automatically relocated ${conflict.code} from ${booking.room} to ${altRoom.name} due to booking "${booking.title}". Lecturer can reschedule if needed.`,
                )
                relocated++
              }
            }
            bookCampusEvent({
              title: booking.title,
              room: booking.room,
              date: addCalendarDays(initialWeekStart, booking.day),
              start: booking.start,
              duration: booking.duration,
              audience: booking.organizer || 'Academic City Community',
            })
            return {
              relocatedCount: relocated,
              notice: `Room ${booking.room} booked for "${booking.title}". ${relocated ? `${relocated} class was automatically relocated to an alternative room.` : 'No class conflicts found.'}`,
            }
          }}
        />
      )
    if (page === 'Events')
      return (
        <EventsPage
          rooms={rooms}
          sessions={effectiveSessions}
          events={events}
          onBookEvent={bookCampusEvent}
        />
      )
    if (page === 'Examinations')
      return (
        <ExamSchedulingPage
          schedule={examSchedule}
          onSaveSchedule={saveRandomizedExamSchedule}
          scheduleLoadError={examScheduleLoadError}
        />
      )
    if (page === 'Scheduling')
      return (
        <SchedulingPage
          sessions={effectiveSessions}
          courses={courses}
          rooms={rooms}
          settings={settings}
          lecturerUnavailability={lecturerUnavailability}
          onNavigate={navigateToPage}
        />
      )
    if (page === 'Courses')
      return (
        <CoursesPage
          courses={courses}
          lecturers={lecturers}
          sessions={effectiveSessions}
          onAdd={(course) => setCourses((current) => [...current, course])}
          onAssignLecturer={(course, lecturerName) => {
            const targetKey = getSectionKey(course)
            setCourses((current) =>
              current.map((c) =>
                getSectionKey(c) === targetKey ? { ...c, lecturer: lecturerName } : c,
              ),
            )
            setSessions((current) =>
              current.map((s) =>
                getSectionKey(s) === targetKey ? { ...s, lecturer: lecturerName } : s,
              ),
            )
          }}
          onUpdatePattern={updateCourseMeetingPattern}
          onSplit={(course, groupAEnrollment, groupALecturer, groupBEnrollment, groupBLecturer) => {
            const existingKey = getSectionKey(course)
            const existingSessions = effectiveSessions.filter(
              (session) => getSectionKey(session) === existingKey,
            )
            const groupASessions = existingSessions.map((session) => ({
              ...session,
              group: 'A' as const,
              enrollment: groupAEnrollment,
              lecturer: groupALecturer,
            }))
            const groupBSessions: Session[] = []
            const sessionsWithoutOriginal = effectiveSessions.filter(
              (session) => getSectionKey(session) !== existingKey,
            )
            for (const existingSession of existingSessions) {
              const groupBTemplate: Session = {
                ...existingSession,
                weekStart: existingSession.weekStart ?? initialWeekStart,
                group: 'B',
                enrollment: groupBEnrollment,
                lecturer: groupBLecturer,
                roomTypeOverride: false,
              }
              const groupBAlternatives = getRescheduleAlternatives(
                groupBTemplate,
                [...sessionsWithoutOriginal, ...groupASessions, ...groupBSessions],
                rooms,
                settings.roomCapacityBuffer,
                lecturerUnavailability,
                Boolean(groupBTemplate.isOnline),
                events,
                false,
              )
              const groupBSlot = groupBAlternatives.find(
                (alternative) =>
                  !groupBSessions.some((session) => session.day === alternative.day) &&
                  alternative.rooms.some((room) =>
                    isRoomTypeCompatibleWithSession(groupBTemplate, room),
                  ),
              )
              const groupBRoom = groupBSlot?.rooms.find((room) =>
                isRoomTypeCompatibleWithSession(groupBTemplate, room),
              )
              if (!groupBSlot || !groupBRoom) return false
              groupBSessions.push({
                ...groupBTemplate,
                day: groupBSlot.day,
                start: groupBSlot.start,
                room: groupBRoom.name,
                roomTypeOverride: !isRoomTypeCompatibleWithSession(groupBTemplate, groupBRoom),
              })
            }
            const groupA: Course = {
              ...course,
              group: 'A',
              enrollment: groupAEnrollment,
              lecturer: groupALecturer,
            }
            const groupB: Course = {
              ...course,
              group: 'B',
              enrollment: groupBEnrollment,
              lecturer: groupBLecturer,
              status: groupBSessions.length ? 'Scheduled' : 'Draft',
            }
            setCourses((current) =>
              current.flatMap((existing) =>
                getSectionKey(existing) === existingKey ? [groupA, groupB] : [existing],
              ),
            )
            setSessions((current) => [
              ...current.map((session) => {
                const sessionIndex = existingSessions.findIndex(
                  (existing) => getSessionKey(existing) === getSessionKey(session),
                )
                return sessionIndex === -1 ? session : groupASessions[sessionIndex]
              }),
              ...groupBSessions,
            ])
            setWeekOverrides((current) => {
              const next = { ...current }
              for (const existingSession of existingSessions) {
                delete next[`${initialWeekStart}:${getSessionKey(existingSession)}`]
              }
              return next
            })
            return true
          }}
          onNavigate={navigateToPage}
        />
      )
    if (page === 'Students')
      return (
        <StudentsPage
          students={students}
          sessions={effectiveSessions}
          onReschedule={openReschedule}
        />
      )
    if (page === 'Lecturers')
      return (
        <LecturersPage
          lecturers={lecturers}
          courses={courses}
          sessions={effectiveSessions}
          lecturerUnavailability={lecturerUnavailability}
          onAdd={(lecturer) => setLecturers((current) => [...current, lecturer])}
          onToggleLecturerUnavailability={(lecturerName, day, start, end) =>
            setLecturerUnavailability((current) => ({
              ...current,
              [lecturerName]: toggleLecturerUnavailabilityBlock(
                current[lecturerName] ?? [],
                day,
                start,
                end,
              ),
            }))
          }
          onReschedule={openReschedule}
        />
      )
    if (page === 'Optimisation')
      return (
        <OptimisationPage
          courses={courses}
          sessions={effectiveSessions}
          rooms={rooms}
          lecturerUnavailability={lecturerUnavailability}
          onReschedule={openReschedule}
          onNavigate={navigateToPage}
        />
      )
    if (page === 'Reports')
      return (
        <ReportsPage
          courses={courses}
          students={students}
          lecturers={lecturers}
          sessions={effectiveSessions}
          rooms={rooms}
        />
      )
    if (page === 'Notifications')
      return (
        <NotificationsPage
          notifications={notifications.filter((notification) => notification.audience === 'admin')}
          onBack={() => navigateToPage('Dashboard')}
        />
      )
    return <SettingsPage settings={settings} onSave={setSettings} />
  }, [
    page,
    sessions,
    effectiveSessions,
    rooms,
    selectedRoom,
    courses,
    students,
    lecturers,
    lecturerUnavailability,
    settings,
    examSchedule,
    examScheduleLoadError,
    saveRandomizedExamSchedule,
    role,
    events,
    notifications,
    navigateToPage,
  ])
  if (!isLoggedIn) {
    return (
      <LoginPage
        lecturers={lecturers}
        onLogin={(selectedRole, selectedId) => {
          if (selectedRole === 'admin') {
            setRole('admin')
          } else if (selectedRole === 'teacher') {
            setRole('lecturer')
            setLecturerViewId(selectedId)
          } else {
            setRole('student')
            setStudentViewId(selectedId)
          }
          setIsLoggedIn(true)
        }}
      />
    )
  }

  const unreadAdminNotificationCount = notifications.filter(
    (notification) => notification.audience === 'admin' && !notification.read,
  ).length
  const previousSemester = shiftAcademicSemester(settings.semester, -1)
  const nextSemester = shiftAcademicSemester(settings.semester, 1)

  return (
    <div className="app">
      <div className={`main-shell no-sidebar${role === 'admin' ? ' bottom-nav-shell' : ''}`}>
        <header className="topbar">
          <img
            className="topbar-brand"
            src="/academic-city-landscape-cropped.png"
            alt="Academic City University"
          />
          {role === 'admin' && (
            <div className="semester-chip">
              <span>Current academic term</span>
              <div className="semester-chip-current">
                <button
                  type="button"
                  className="semester-stepper-button previous"
                  aria-label="Previous academic semester"
                  disabled={!previousSemester}
                  onClick={() => {
                    if (previousSemester) {
                      setSettings((current) => ({ ...current, semester: previousSemester }))
                    }
                  }}
                >
                  <Icon name="chevron" size={14} />
                </button>
                <b>{settings.semester}</b>
                <button
                  type="button"
                  className="semester-stepper-button"
                  aria-label="Next academic semester"
                  disabled={!nextSemester}
                  onClick={() => {
                    if (nextSemester) {
                      setSettings((current) => ({ ...current, semester: nextSemester }))
                    }
                  }}
                >
                  <Icon name="chevron" size={14} />
                </button>
              </div>
            </div>
          )}
          <div className="topbar-actions">
            {role === 'admin' && (
              <div className="notification-wrap" ref={notificationWrapRef}>
                <button
                  className="inbox-btn"
                  aria-label={`Notifications, ${unreadAdminNotificationCount} unread`}
                  aria-expanded={notificationsOpen}
                  onClick={() => setNotificationsOpen((open) => !open)}
                >
                  <svg
                    viewBox="0 0 512 512"
                    height={16}
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z" />
                  </svg>
                  {unreadAdminNotificationCount > 0 && (
                    <span className="msg-count" aria-hidden="true">
                      {unreadAdminNotificationCount > 99 ? '99+' : unreadAdminNotificationCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <section className="notification-panel">
                    <div className="notification-panel-heading">
                      <b>Administrator notifications</b>
                      <span>
                        {unreadAdminNotificationCount
                          ? `${unreadAdminNotificationCount} unread`
                          : 'All caught up'}
                      </span>
                    </div>
                    {notifications.some((notification) => notification.audience === 'admin') ? (
                      notifications
                        .filter((notification) => notification.audience === 'admin')
                        .slice(0, 4)
                        .map((notification) => (
                          <article key={notification.id}>
                            <p>{notification.message}</p>
                            <small>{notification.time}</small>
                          </article>
                        ))
                    ) : (
                      <p className="notification-empty">No timetable updates yet.</p>
                    )}
                    <button
                      className="notification-view-all"
                      onClick={() => {
                        setNotificationsOpen(false)
                        navigateToPage('Notifications')
                      }}
                    >
                      View all notifications
                      <Icon name="arrow" size={15} />
                    </button>
                    <p className="notification-demo-note">
                      Demo inbox only. Email and push delivery are not configured.
                    </p>
                  </section>
                )}
              </div>
            )}
            <div className="top-profile">
              <span>{role === 'admin' ? 'AC' : role === 'lecturer' ? 'LC' : 'ST'}</span>
              <div>
                <b>{role === 'admin' ? 'Academic Registry' : role === 'lecturer' ? 'Faculty Portal' : 'Student Portal'}</b>
                <small>
                  {role === 'admin'
                    ? 'Academic Operations'
                    : role === 'lecturer'
                      ? 'Faculty Lecturer'
                      : 'Undergraduate Student'}
                </small>
              </div>
            </div>
          </div>
        </header>
        <main>
          {role === 'admin' ? (
            content
          ) : role === 'lecturer' ? (
            <TeacherView
              lecturers={lecturers}
              courses={courses}
              sessions={effectiveSessions}
              rooms={rooms}
              lecturerId={lecturerViewId}
              events={events}
              notifications={notifications}
              lecturerUnavailability={lecturerUnavailability}
              confirmedCodes={confirmedSectionKeys}
              semester={settings.semester}
              onToggleUnavailable={(lecturerName, day, start, end) =>
                setLecturerUnavailability((current) => ({
                  ...current,
                  [lecturerName]: toggleLecturerUnavailabilityBlock(
                    current[lecturerName] ?? [],
                    day,
                    start,
                    end,
                  ),
                }))
              }
              onConfirmCourse={confirmTeacherCourse}
              onSessionChange={(s, newDay, newStart, newRoom, isOnline) => {
                const destinationRoom = rooms.find((room) => room.name === newRoom)
                return confirmMove({
                  ...s,
                  day: newDay,
                  start: newStart,
                  room: newRoom,
                  roomTypeOverride:
                    !isOnline &&
                    destinationRoom !== undefined &&
                    !isRoomTypeCompatibleWithSession(s, destinationRoom),
                  isOnline,
                })
              }}
              onLogout={() => setIsLoggedIn(false)}
            />
          ) : (
            <StudentViewPage
              students={students}
              sessions={effectiveSessions}
              studentId={studentViewId}
              notifications={notifications}
              semester={settings.semester}
              onLogout={() => setIsLoggedIn(false)}
            />
          )}
          <footer>
            Academic City University, Ghana · Timetabling &amp; Academic Operations System
          </footer>
        </main>
        {role === 'admin' && (
          <nav className="bottom-navigation admin-bottom-nav" aria-label="Administrator navigation">
            <div
              className="admin-nav-fixed"
              style={{ '--active-index': activeNavigationIndex } as React.CSSProperties}
            >
              {isNavActive && (
                <span
                  className="bottom-nav-indicator"
                  aria-hidden="true"
                />
              )}
              {nav.map(([label, icon]) => (
                <button
                  className={`admin-nav-item${page === label ? ' active' : ''}`}
                  aria-label={label}
                  aria-current={page === label ? 'page' : undefined}
                  title={label}
                  onClick={() => navigateToPage(label)}
                  key={label}
                >
                  <i className={`hgi hgi-stroke hgi-${icon}`} aria-hidden="true" />
                  {label === 'Courses' && (
                    courses.filter(
                      (course) =>
                        !sessions.some(
                          (session) => getSectionKey(session) === getSectionKey(course),
                        ),
                    ).length > 0 && (
                      <em>
                        {
                          courses.filter(
                            (course) =>
                              !sessions.some(
                                (session) => getSectionKey(session) === getSectionKey(course),
                              ),
                          ).length
                        }
                      </em>
                    )
                  )}
                </button>
              ))}
            </div>
            <button
              className="admin-nav-logout"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => (onLogout ? onLogout() : setIsLoggedIn(false))}
            >
              <i className="hgi hgi-stroke hgi-logout-01" aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
      {selectedSession && (
        <RescheduleModal
          session={selectedSession}
          getAlternatives={(online) =>
            getRescheduleAlternatives(
              selectedSession,
              effectiveSessions,
              rooms,
              settings.roomCapacityBuffer,
              lecturerUnavailability,
              online,
              events,
            )
          }
          onClose={() => setRescheduleKey(null)}
          onConfirm={confirmMove}
        />
      )}
    </div>
  )
}

