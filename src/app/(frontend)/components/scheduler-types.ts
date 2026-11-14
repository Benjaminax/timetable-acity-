export type RoomType = 'lecture' | 'computer' | 'robotics' | 'electrical' | 'biomedical'
export type SectionGroup = string
export type AcademicPeriod = 'September' | 'January' | 'Summer'
export type CohortIntake = 'September' | 'January' | 'Merged'

export function getAcademicPeriodForSemester(semester: string): AcademicPeriod {
  if (/summer/i.test(semester)) return 'Summer'
  return /semester\s*2/i.test(semester) ? 'January' : 'September'
}

export function isSessionInAcademicPeriod(
  session: Pick<Session, 'academicPeriod'>,
  academicPeriod: AcademicPeriod,
) {
  return !session.academicPeriod || session.academicPeriod === academicPeriod
}

export const TIMETABLE_PERIOD_DURATION = 60
export const TIMETABLE_BREAK_DURATION = 10
export const TIMETABLE_PERIOD_COUNT = 9
export const TIMETABLE_PERIOD_STARTS = Array.from(
  { length: TIMETABLE_PERIOD_COUNT },
  (_, index) => 8 * 60 + index * (TIMETABLE_PERIOD_DURATION + TIMETABLE_BREAK_DURATION),
)

export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function calculateTimetablePeriods(
  startTimeStr: string = '08:00',
  durationMin: number = 60,
  breakMin: number = 10,
  endTimeStr: string = '18:20',
): number[] {
  const startMinutes = timeStringToMinutes(startTimeStr)
  const endMinutes = timeStringToMinutes(endTimeStr)
  const periods: number[] = []
  let current = startMinutes
  while (current + durationMin <= endMinutes && periods.length < 14) {
    periods.push(current)
    current += durationMin + breakMin
  }
  return periods.length > 0 ? periods : TIMETABLE_PERIOD_STARTS
}

export type Session = {
  weekStart?: string
  day: number
  start: number
  duration: number
  title: string
  code: string
  room: string
  type: string
  tone: string
  lecturer: string
  major: string
  level: number
  enrollment: number
  roomType: RoomType
  sectionId?: string
  studentVisible?: boolean
  group?: SectionGroup
  meetingNumber?: number
  isWorkshop?: boolean
  roomTypeOverride?: boolean
  isOnline?: boolean
  programmes?: string[]
  electiveGroup?: string
  sharedCourseId?: string
  semester?: 1 | 2
  academicPeriod?: AcademicPeriod
  intake?: CohortIntake
  weeklyHours?: number
}

export type Room = {
  name: string
  location: string
  capacity: number
  type: string
  roomType: RoomType
  status: string
  utilization: number
}

export function isRoomCompatibleWithSession(session: Session, room: Room) {
  if (session.isOnline) return true
  if (session.roomTypeOverride) return true
  if (session.roomType === 'lecture') return true
  return room.roomType === session.roomType
}

export function isRoomTypeCompatibleWithSession(session: Session, room: Room) {
  if (session.roomType === 'lecture') return true
  return room.roomType === session.roomType
}

export function getSectionKey(section: {
  code: string
  major: string
  level: number
  sectionId?: string
  group?: SectionGroup
  sharedCourseId?: string
}) {
  const sectionIdentity = section.sectionId
    ? `${section.sectionId}${section.group ? `-${section.group}` : ''}`
    : (section.group ?? 'all')
  if (section.sharedCourseId) return `${section.sharedCourseId}::${sectionIdentity}`
  return `${section.code}::${section.major}::${section.level}::${sectionIdentity}`
}

export function getSessionKey(session: Session) {
  return `${getSectionKey(session)}::meeting-${session.meetingNumber ?? 1}`
}

export function getSessionElapsedDuration(duration: number) {
  const periodCount = Math.max(1, Math.ceil(duration / TIMETABLE_PERIOD_DURATION))
  return duration + (periodCount - 1) * TIMETABLE_BREAK_DURATION
}

export function getSessionEnd(session: Pick<Session, 'start' | 'duration'>) {
  return session.start + getSessionElapsedDuration(session.duration)
}

export type SessionConflictType = 'room' | 'lecturer' | 'cohort'

export type SessionConflict = {
  type: SessionConflictType
  session: Session
  other: Session
}

export function getSessionConflictType(left: Session, right: Session): SessionConflictType | null {
  if (
    left.day !== right.day ||
    (left.weekStart && right.weekStart && left.weekStart !== right.weekStart) ||
    (left.academicPeriod && right.academicPeriod && left.academicPeriod !== right.academicPeriod) ||
    (left.semester && right.semester && left.semester !== right.semester) ||
    left.start >= getSessionEnd(right) ||
    getSessionEnd(left) <= right.start
  ) {
    return null
  }

  if (
    !left.isOnline &&
    left.room !== 'Online' &&
    !right.isOnline &&
    right.room !== 'Online' &&
    left.room === right.room
  ) {
    return 'room'
  }
  if (left.lecturer && left.lecturer !== 'Unassigned' && left.lecturer === right.lecturer) {
    return 'lecturer'
  }
  if (sessionsShareStudentGroup(left, right)) return 'cohort'
  return null
}

export function findSessionConflicts(
  session: Session,
  schedule: Session[],
  excludedSessionKey?: string,
): SessionConflict[] {
  return schedule.flatMap((other) => {
    if (excludedSessionKey && getSessionKey(other) === excludedSessionKey) return []
    const type = getSessionConflictType(session, other)
    return type ? [{ type, session, other }] : []
  })
}

export function findScheduleConflicts(schedule: Session[]): SessionConflict[] {
  return schedule.flatMap((session, index) =>
    schedule.slice(index + 1).flatMap((other) => {
      const type = getSessionConflictType(session, other)
      return type ? [{ type, session, other }] : []
    }),
  )
}

export function findRoomConflict(
  session: Session,
  schedule: Session[],
  excludedSessionKey?: string,
) {
  return schedule.find(
    (other) =>
      (!excludedSessionKey || getSessionKey(other) !== excludedSessionKey) &&
      getSessionConflictType(session, other) === 'room',
  )
}

export function sessionsShareStudentGroup(left: Session, right: Session) {
  if (
    left.electiveGroup &&
    left.electiveGroup === right.electiveGroup &&
    left.sharedCourseId !== right.sharedCourseId
  ) {
    return false
  }
  if (left.academicPeriod && right.academicPeriod && left.academicPeriod !== right.academicPeriod) {
    return false
  }
  if (left.semester && right.semester && left.semester !== right.semester) return false

  const leftProgrammes = left.programmes ?? [left.major]
  const rightProgrammes = right.programmes ?? [right.major]
  const shareProgramme = leftProgrammes.some((programme) => rightProgrammes.includes(programme))
  const sameIntake =
    !left.intake ||
    !right.intake ||
    left.intake === 'Merged' ||
    right.intake === 'Merged' ||
    left.intake === right.intake

  return shareProgramme && left.level === right.level && sameIntake
}

export type Course = {
  code: string
  title: string
  major: string
  level: number
  enrollment: number
  lecturer: string
  sessionType: string
  credits: number
  status: 'Scheduled' | 'Draft'
  isTechnical?: boolean
  sectionId?: string
  group?: SectionGroup
  programmes?: string[]
  electiveGroup?: string
  sharedCourseId?: string
  semester?: 1 | 2
  academicPeriod?: AcademicPeriod
  intake?: CohortIntake
  sessionDuration?: number
  meetingsPerWeek?: number
  weeklyHours?: number
}

export type CourseMeetingPattern = {
  sessionDuration: number
  meetingsPerWeek: number
  weeklyHours: number
}

export function isTechnicalCourse(
  course: Pick<Course, 'code' | 'title' | 'isTechnical' | 'sessionType'>,
) {
  const isWorkshop = course.code.toUpperCase() === 'CW400' || /career workshop/i.test(course.title)
  return !isWorkshop && (course.isTechnical === true || course.sessionType === 'Practical')
}

export function getDefaultCourseMeetingPattern(
  course: Pick<Course, 'code' | 'title' | 'level' | 'sessionType' | 'isTechnical'>,
): CourseMeetingPattern {
  const isWorkshop = course.code.toUpperCase() === 'CW400' || /career workshop/i.test(course.title)
  const isProject = /\b(project|internship|attachment|capstone)\b/i.test(course.title)
  const sessionDuration = isWorkshop
    ? 60
    : isTechnicalCourse(course)
      ? 120
      : isProject
        ? 120
        : course.level === 100
          ? 180
          : 120
  const meetingsPerWeek =
    isWorkshop ||
    (isProject && !isTechnicalCourse(course)) ||
    (course.level === 100 && !isTechnicalCourse(course))
      ? 1
      : 2
  return {
    sessionDuration,
    meetingsPerWeek,
    weeklyHours: (sessionDuration / 60) * meetingsPerWeek,
  }
}

export function getCourseMeetingPatternError(
  course: Pick<Course, 'code' | 'title' | 'level' | 'sessionType' | 'isTechnical'>,
  sessionDuration: number,
  meetingsPerWeek: number,
) {
  const isWorkshop = course.code.toUpperCase() === 'CW400' || /career workshop/i.test(course.title)
  const isProject = /\b(project|internship|attachment|capstone)\b/i.test(course.title)
  if (isWorkshop) {
    return sessionDuration === 60 && meetingsPerWeek === 1
      ? null
      : 'Career Workshop must remain one 1-hour meeting per week.'
  }
  if (isTechnicalCourse(course)) {
    return sessionDuration === 120 && meetingsPerWeek === 2
      ? null
      : 'Technical courses must have two 2-hour meetings per week.'
  }
  if (isProject) {
    if (![60, 90, 120].includes(sessionDuration)) {
      return 'Project and internship meetings must be no longer than 2 hours.'
    }
    return meetingsPerWeek === 1 ? null : 'Projects and internships must have one meeting per week.'
  }
  if (!Number.isInteger(meetingsPerWeek) || ![1, 2].includes(meetingsPerWeek)) {
    return 'Meetings per week must be one or two.'
  }
  const allowedDurations =
    course.level === 100 && !isTechnicalCourse(course) ? [60, 90, 120, 180] : [60, 90, 120]
  if (!allowedDurations.includes(sessionDuration)) {
    return course.level === 100
      ? 'Meetings must be 1-2 hours, except non-technical Level 100 core classes.'
      : 'Meetings must be no longer than 2 hours.'
  }
  if (sessionDuration === 180 && meetingsPerWeek !== 1) {
    return 'A 3-hour Level 100 meeting can occur only once per week.'
  }
  return null
}

export type Student = {
  id: string
  name: string
  major: string
  level: number
  courses: number
  status: 'Registered' | 'Pending'
  progressionStatus: 'Approved' | 'Pending'
  intake?: CohortIntake
}

export type Lecturer = {
  id: string
  name: string
  email: string
  department: string
  office: string
  weeklyLimit: number
}

export type LecturerUnavailability = {
  day: number
  start: number
  end: number
}

export type LecturerUnavailabilityByName = Record<string, LecturerUnavailability[]>

export function hasLecturerUnavailability(
  blocks: LecturerUnavailability[] | undefined,
  day: number,
  start: number,
  end: number,
) {
  return (
    blocks?.some((block) => block.day === day && start < block.end && end > block.start) ?? false
  )
}

export function toggleLecturerUnavailabilityBlock(
  blocks: LecturerUnavailability[],
  day: number,
  start: number,
  end: number,
) {
  const isAlreadyUnavailable = hasLecturerUnavailability(blocks, day, start, end)
  const updated = blocks.flatMap((block) => {
    if (block.day !== day || block.end <= start || block.start >= end) return [block]
    if (!isAlreadyUnavailable) return [block]
    return [
      ...(block.start < start ? [{ ...block, end: start }] : []),
      ...(block.end > end ? [{ ...block, start: end }] : []),
    ]
  })

  if (!isAlreadyUnavailable) updated.push({ day, start, end })

  const sameDay = updated
    .filter((block) => block.day === day)
    .sort((left, right) => left.start - right.start)
  const merged: LecturerUnavailability[] = []
  sameDay.forEach((block) => {
    const previous = merged.at(-1)
    if (previous && block.start <= previous.end) {
      previous.end = Math.max(previous.end, block.end)
    } else {
      merged.push({ ...block })
    }
  })

  return [...updated.filter((block) => block.day !== day), ...merged].sort(
    (left, right) => left.day - right.day || left.start - right.start,
  )
}

export type AppSettings = {
  semester: string
  campus: string
  timezone: string
  notifications: boolean
  conflictWarnings: boolean
  roomCapacityBuffer: number
  defaultSessionLength: number
  dayStartTime?: string
  dayEndTime?: string
  periodDuration?: number
  breakDuration?: number
}
