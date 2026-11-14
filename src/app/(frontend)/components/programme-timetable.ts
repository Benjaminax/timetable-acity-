import { programmeElectiveGroups, undergraduateProgrammes } from './programme-curricula'
import type { ProgrammeLevel } from './programme-curricula'
import {
  getCourseMeetingPatternError,
  getDefaultCourseMeetingPattern,
  getSectionKey,
  findScheduleConflicts,
  findSessionConflicts,
  getSessionElapsedDuration,
  getSessionEnd,
  TIMETABLE_PERIOD_STARTS,
} from './scheduler-types'
import type {
  AcademicPeriod,
  CohortIntake,
  Course,
  Lecturer,
  Room,
  RoomType,
  Session,
} from './scheduler-types'

const WEEKDAYS = [0, 1, 2, 3, 4]
const DEFAULT_COHORT_SIZE = 64
const DEFAULT_SEPTEMBER_SHARE = 60
type Offering = {
  id: string
  title: string
  level: ProgrammeLevel
  semester: 1 | 2
  academicPeriod: AcademicPeriod
  intake: CohortIntake
  programmeEnrollments: Map<string, number>
  departments: Set<string>
  electiveGroup?: string
  courseCode?: string
}

type OfferingPeriod = {
  academicPeriod: AcademicPeriod
  intake: CohortIntake
  enrollment: number
}

function getCoursePeriods(
  level: ProgrammeLevel,
  semester: 1 | 2,
  cohortSize: number,
  septemberShare: number,
): OfferingPeriod[] {
  if (level !== 100) {
    return [
      {
        academicPeriod: semester === 1 ? 'September' : 'January',
        intake: 'Merged',
        enrollment: cohortSize,
      },
    ]
  }

  const septemberEnrollment = Math.round((cohortSize * septemberShare) / 100)
  const januaryEnrollment = cohortSize - septemberEnrollment
  if (semester === 1) {
    return [
      { academicPeriod: 'September', intake: 'September', enrollment: septemberEnrollment },
      { academicPeriod: 'January', intake: 'January', enrollment: januaryEnrollment },
    ]
  }
  return [
    { academicPeriod: 'January', intake: 'September', enrollment: septemberEnrollment },
    { academicPeriod: 'Summer', intake: 'January', enrollment: januaryEnrollment },
  ]
}

function normalizeCourseTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/fundamentals of innovation and entrepreneurship\s*\(fie\)/g, 'fie')
    .replace(/fundamentals of innovation and entrepreneurship/g, 'fie')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function shouldShareCourse(title: string) {
  return !/\b(elective|project|internship|attachment|capstone|portfolio)\b/i.test(title)
}

function createCourseCode(title: string, level: number, semester: number) {
  const normalizedTitle = normalizeCourseTitle(title)
  const prefix = normalizedTitle
    .split(' ')
    .filter((word) => !['and', 'of', 'the', 'in', 'for', 'with'].includes(word))
    .map((word) => word[0])
    .join('')
    .slice(0, 4)
    .toUpperCase()
  let hash = 0
  for (const character of normalizedTitle) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }
  return `${prefix || 'GEN'} ${level}${semester}${(hash % 97).toString().padStart(2, '0')}`
}

function getRoomType(offering: Offering): RoomType {
  if (!/\b(lab|laboratory|studio|workshop)\b/i.test(offering.title)) return 'lecture'
  if (offering.departments.has('Biomedical Engineering')) return 'biomedical'
  if (offering.departments.has('Electrical, Electronics & Computer Engineering'))
    return 'electrical'
  if (offering.departments.has('Mechanical, Industrial & Systems Engineering')) return 'robotics'
  return 'computer'
}

function getEligibleRooms(rooms: Room[], roomType: RoomType) {
  const available = rooms.filter((room) => room.status !== 'Restricted')
  const exact = available.filter((room) => roomType === 'lecture' || room.roomType === roomType)
  const candidates = exact.length ? exact : available
  return candidates.sort((left, right) => left.capacity - right.capacity)
}

function getOfferingSchedule(offering: Offering) {
  const isTechnical = getRoomType(offering) !== 'lecture'
  return getDefaultCourseMeetingPattern({
    code: offering.courseCode ?? '',
    title: offering.title,
    level: offering.level,
    sessionType: isTechnical ? 'Practical' : 'Lecture',
    isTechnical,
  })
}

function splitEnrollment(offering: Offering, capacity: number) {
  const remaining = new Map(offering.programmeEnrollments)
  const sections: Array<{ enrollment: number; programmes: string[] }> = []
  const totalEnrollment = [...remaining.values()].reduce((total, count) => total + count, 0)
  if (totalEnrollment > capacity * 2) {
    return [
      {
        enrollment: totalEnrollment,
        programmes: [...remaining.entries()]
          .filter(([, count]) => count > 0)
          .map(([major]) => major),
      },
    ]
  }

  while ([...remaining.values()].some((count) => count > 0)) {
    let enrollment = 0
    const programmes: string[] = []
    for (const [major, amount] of remaining) {
      if (enrollment === capacity) break
      if (amount <= 0) continue
      const allocated = Math.min(amount, capacity - enrollment)
      enrollment += allocated
      remaining.set(major, amount - allocated)
      programmes.push(major)
    }
    if (!enrollment) break
    sections.push({ enrollment, programmes })
  }
  return sections
}

function hasConflict(candidate: Session, schedule: Session[], lecturer: string) {
  return findSessionConflicts({ ...candidate, lecturer }, schedule).length > 0
}

function workloadFor(sessions: Session[], lecturerName: string, academicPeriod: AcademicPeriod) {
  return sessions
    .filter(
      (session) =>
        session.lecturer === lecturerName &&
        session.academicPeriod === academicPeriod &&
        !session.isWorkshop,
    )
    .reduce((hours, session) => hours + session.duration / 60, 0)
}

function placeOffering(
  offering: Offering,
  rooms: Room[],
  lecturers: Lecturer[],
  sessions: Session[],
  courses: Course[],
) {
  const roomType = getRoomType(offering)
  const suitableRooms = getEligibleRooms(rooms, roomType)
  const largestRoom = suitableRooms.at(-1)
  if (!largestRoom) {
    return
  }
  const sections = splitEnrollment(offering, largestRoom.capacity)
  const courseCode =
    offering.courseCode ?? createCourseCode(offering.title, offering.level, offering.semester)
  const { sessionDuration, meetingsPerWeek } = getOfferingSchedule(offering)
  const isTechnical = getRoomType(offering) !== 'lecture'
  const weeklyHours = (sessionDuration / 60) * meetingsPerWeek
  const defaultLecturerPool = lecturers.filter(
    (lecturer) =>
      offering.departments.has(lecturer.department) ||
      lecturer.department === 'Mathematics & General Studies',
  )
  const slots = WEEKDAYS.flatMap((day) => TIMETABLE_PERIOD_STARTS.map((start) => ({ day, start })))

  for (const [sectionIndex, section] of sections.entries()) {
    const group = sections.length > 1 ? (sectionIndex === 0 ? 'A' : 'B') : undefined
    const sharedCourseId = offering.id
    const candidateLecturers = [...defaultLecturerPool].sort(
      (left, right) =>
        workloadFor(sessions, left.name, offering.academicPeriod) / left.weeklyLimit -
        workloadFor(sessions, right.name, offering.academicPeriod) / right.weeklyLimit,
    )
    let placedSessions: Session[] = []
    let assignedLecturer: Lecturer | undefined
    const electiveOffset = offering.electiveGroup
      ? [...offering.electiveGroup].reduce((sum, character) => sum + character.charCodeAt(0), 0)
      : courses.length * 7
    const offset = (electiveOffset + sectionIndex * 3) % slots.length

    for (const lecturer of candidateLecturers) {
      if (
        workloadFor(sessions, lecturer.name, offering.academicPeriod) + weeklyHours >
        lecturer.weeklyLimit
      ) {
        continue
      }

      const scheduledMeetings: Session[] = []
      for (let meetingIndex = 0; meetingIndex < meetingsPerWeek; meetingIndex += 1) {
        let placedMeeting: Session | undefined
        const meetingOffset = (offset + meetingIndex * 13) % slots.length
        for (let slotIndex = 0; slotIndex < slots.length && !placedMeeting; slotIndex += 1) {
          const { day, start } = slots[(slotIndex + meetingOffset) % slots.length]
          if (scheduledMeetings.some((session) => session.day === day)) continue
          const candidateEnd = start + getSessionElapsedDuration(sessionDuration)
          const timetableEnd = TIMETABLE_PERIOD_STARTS.at(-1)! + 60
          if (candidateEnd > timetableEnd) continue

          for (const room of suitableRooms) {
            if (room.capacity < section.enrollment) continue
            const candidate: Session = {
              day,
              start,
              duration: sessionDuration,
              title: offering.title,
              code: courseCode,
              room: room.name,
              type: isTechnical ? 'Practical' : 'Lecture',
              tone: isTechnical ? 'red' : 'dark',
              lecturer: lecturer.name,
              major: section.programmes[0],
              programmes: section.programmes,
              electiveGroup: offering.electiveGroup,
              level: offering.level,
              enrollment: section.enrollment,
              roomType,
              roomTypeOverride: roomType !== 'lecture' && room.roomType !== roomType,
              sectionId: sharedCourseId,
              group,
              sharedCourseId,
              semester: offering.semester,
              academicPeriod: offering.academicPeriod,
              intake: offering.intake,
              weeklyHours,
              meetingNumber: meetingIndex + 1,
            }
            if (!hasConflict(candidate, [...sessions, ...scheduledMeetings], lecturer.name)) {
              placedMeeting = candidate
              break
            }
          }
        }
        if (!placedMeeting) break
        scheduledMeetings.push(placedMeeting)
      }

      if (scheduledMeetings.length === meetingsPerWeek) {
        placedSessions = scheduledMeetings
        assignedLecturer = lecturer
        break
      }
    }

    const sectionCourse: Course = {
      code: courseCode,
      title: offering.title,
      major: section.programmes[0],
      programmes: section.programmes,
      electiveGroup: offering.electiveGroup,
      level: offering.level,
      enrollment: section.enrollment,
      lecturer: assignedLecturer?.name ?? 'Unassigned',
      sessionType: isTechnical ? 'Practical' : 'Lecture',
      credits: 3,
      status: placedSessions.length === meetingsPerWeek ? 'Scheduled' : 'Draft',
      isTechnical,
      sectionId: offering.id,
      group,
      sharedCourseId: offering.id,
      semester: offering.semester,
      academicPeriod: offering.academicPeriod,
      intake: offering.intake,
      sessionDuration,
      meetingsPerWeek,
      weeklyHours,
    }
    courses.push(sectionCourse)
    if (placedSessions.length === meetingsPerWeek) sessions.push(...placedSessions)
  }
}

function buildOfferings(cohortSize: number, septemberShare: number) {
  const offerings = new Map<string, Offering>()
  for (const programme of undergraduateProgrammes) {
    for (const [levelString, semesters] of Object.entries(programme.courses)) {
      const level = Number(levelString) as ProgrammeLevel
      for (const [semesterString, titles] of Object.entries(semesters)) {
        const semester = Number(semesterString) as 1 | 2
        const periods = getCoursePeriods(level, semester, cohortSize, septemberShare)
        for (const period of periods) {
          const seenTitles = new Set<string>()
          for (const title of titles) {
            const normalizedTitle = normalizeCourseTitle(title)
            if (seenTitles.has(normalizedTitle)) continue
            seenTitles.add(normalizedTitle)
            const electiveGroup = programmeElectiveGroups.find(
              (group) =>
                group.major === programme.major &&
                group.level === level &&
                group.semester === semester &&
                group.choices.some((choice) => choice.title === title),
            )
            const electiveChoice = electiveGroup?.choices.find((choice) => choice.title === title)
            const sharedKey =
              shouldShareCourse(title) && !electiveGroup
                ? normalizedTitle
                : `${normalizedTitle} ${programme.major}`
            const id = [level, semester, period.academicPeriod, period.intake, sharedKey].join('::')
            let offering = offerings.get(id)
            if (!offering) {
              offering = {
                id,
                title,
                level,
                semester,
                academicPeriod: period.academicPeriod,
                intake: period.intake,
                programmeEnrollments: new Map(),
                departments: new Set(),
                electiveGroup: electiveGroup?.id,
                courseCode: electiveChoice?.code,
              }
              offerings.set(id, offering)
            }
            offering.programmeEnrollments.set(programme.major, period.enrollment)
            offering.departments.add(programme.department)
          }
        }
      }
    }
  }
  return [...offerings.values()].sort((left, right) => {
    const enrollmentDiff =
      [...right.programmeEnrollments.values()].reduce((sum, size) => sum + size, 0) -
      [...left.programmeEnrollments.values()].reduce((sum, size) => sum + size, 0)
    return enrollmentDiff || left.level - right.level || left.title.localeCompare(right.title)
  })
}

function buildCareerWorkshops(sessions: Session[], rooms: Room[]) {
  const workshopRoom = rooms.find((room) => room.name === 'A1' && room.status !== 'Restricted')
  if (!workshopRoom) return
  const originalSampleMajors = [
    'Computer Science',
    'Computer Engineering',
    'Electrical Engineering',
    'Biomedical Engineering',
    'Information Technology',
  ]
  let index = 0
  for (const major of originalSampleMajors) {
    for (const level of [100, 200, 300, 400]) {
      const slots = WEEKDAYS.flatMap((day) =>
        TIMETABLE_PERIOD_STARTS.map((start) => ({ day, start })),
      )
      let session: Session | undefined
      for (let attempt = 0; attempt < slots.length && !session; attempt += 1) {
        const { day, start } = slots[(index + attempt) % slots.length]
        const candidate: Session = {
          day,
          start,
          duration: 60,
          title: 'Career Workshop (Group A)',
          code: 'CW400',
          room: workshopRoom.name,
          type: 'Career Workshop',
          tone: 'grey',
          lecturer: 'Anna Tetteh',
          major,
          programmes: [major],
          level,
          enrollment: 28,
          roomType: 'lecture',
          semester: 1,
          academicPeriod: 'September',
          intake: level === 100 ? 'September' : 'Merged',
          isWorkshop: true,
        }
        if (!hasConflict(candidate, sessions, candidate.lecturer)) {
          session = candidate
        }
      }
      if (session) sessions.push(session)
      index += 1
    }
  }
}

export function buildProgrammeTeachingAssignments({
  rooms,
  lecturers,
  cohortSize = DEFAULT_COHORT_SIZE,
  septemberShare = DEFAULT_SEPTEMBER_SHARE,
}: {
  rooms: Room[]
  lecturers: Lecturer[]
  cohortSize?: number
  septemberShare?: number
  courses?: Course[]
  sessions?: Session[]
}) {
  if (!Number.isInteger(cohortSize) || cohortSize < 1) {
    throw new Error('Programme cohort size must be a positive whole number.')
  }
  if (!Number.isInteger(septemberShare) || septemberShare < 0 || septemberShare > 100) {
    throw new Error('The September intake share must be between 0 and 100.')
  }
  if (!lecturers.length)
    throw new Error('At least one lecturer is required for timetable generation.')

  const courses: Course[] = []
  const sessions: Session[] = []
  buildCareerWorkshops(sessions, rooms)

  const offerings = buildOfferings(cohortSize, septemberShare)
  for (const offering of offerings) {
    placeOffering(offering, rooms, lecturers, sessions, courses)
  }

  for (const course of courses) {
    if (course.group && course.group !== 'A' && course.group !== 'B') {
      throw new Error(`${course.code} was assigned an unsupported group ${course.group}.`)
    }
    const patternError = getCourseMeetingPatternError(
      course,
      course.sessionDuration ?? 0,
      course.meetingsPerWeek ?? 0,
    )
    if (patternError) throw new Error(`${course.code}: ${patternError}`)
    const courseSessions = sessions.filter(
      (session) => getSectionKey(session) === getSectionKey(course),
    )
    if (
      courseSessions.length &&
      (courseSessions.length !== course.meetingsPerWeek ||
        courseSessions.some((session) => session.duration !== course.sessionDuration) ||
        new Set(courseSessions.map((session) => session.day)).size !== courseSessions.length)
    ) {
      throw new Error(`${course.code} does not match its saved weekly meeting pattern.`)
    }
  }

  if (sessions.some((session) => session.isWorkshop && session.duration !== 60)) {
    throw new Error('Career Workshop must remain one-hour sessions.')
  }

  for (const { type, session, other } of findScheduleConflicts(sessions)) {
    const conflict =
      type === 'room'
        ? `Room ${session.room} is double-booked`
        : type === 'lecturer'
          ? `Lecturer ${session.lecturer} has overlapping classes`
          : `${session.major} Level ${session.level} has overlapping classes`
    throw new Error(`${conflict}: ${session.code} and ${other.code}.`)
  }

  return { courses, sessions }
}
