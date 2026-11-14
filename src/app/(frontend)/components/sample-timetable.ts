import {
  getSectionKey,
  getSessionConflictType,
  getSessionElapsedDuration,
  getSessionEnd,
  TIMETABLE_PERIOD_STARTS,
} from './scheduler-types'
import type { Course, Lecturer, Room, RoomType, Session } from './scheduler-types'

const teachingMajorsByDepartment: Record<string, string[]> = {
  'Computer Science': ['Computer Science'],
  'Computer Engineering': ['Computer Engineering'],
  'Electrical Engineering': ['Electrical Engineering'],
  'Biomedical Engineering': ['Biomedical Engineering'],
  'Information Technology': ['Information Technology'],
  'Mathematics & General Studies': ['Computer Engineering', 'Electrical Engineering'],
}
const sampleTeachingDays = [0, 1, 2, 3, 4]
const sampleTeachingStarts = TIMETABLE_PERIOD_STARTS
const studentMajors = [
  'Computer Science',
  'Computer Engineering',
  'Electrical Engineering',
  'Biomedical Engineering',
  'Information Technology',
]
const studentLevels = [100, 200, 300, 400]
const coursePrefixes: Record<string, string> = {
  'Computer Science': 'CS',
  'Computer Engineering': 'CE',
  'Electrical Engineering': 'EE',
  'Biomedical Engineering': 'BIO',
  'Information Technology': 'IT',
}
const courseTopics: Record<string, string[]> = {
  'Computer Science': [
    'Programming Fundamentals',
    'Algorithms and Data Structures',
    'Computer Architecture',
    'Systems Security',
    'Cloud Computing',
  ],
  'Computer Engineering': [
    'Digital Logic Design',
    'Computer Architecture',
    'Embedded Systems',
    'Robotics Engineering',
    'Hardware Design Project',
  ],
  'Electrical Engineering': [
    'Circuit Analysis',
    'Digital Electronics',
    'Signals and Systems',
    'Control Engineering',
    'Power Systems Design',
  ],
  'Biomedical Engineering': [
    'Human Biology for Engineers',
    'Biomedical Instrumentation',
    'Medical Imaging Systems',
    'Biomechanics',
    'Clinical Engineering Project',
  ],
  'Information Technology': [
    'Information Systems',
    'Web Application Development',
    'Network Administration',
    'Database Management',
    'IT Service Design',
  ],
}
const courseDepartmentByMajor: Record<string, string> = {
  'Computer Science': 'Computer Science',
  'Computer Engineering': 'Computer Engineering',
  'Electrical Engineering': 'Electrical Engineering',
  'Biomedical Engineering': 'Biomedical Engineering',
  'Information Technology': 'Information Technology',
}

function createStudentCourses(existingCourses: Course[], lecturers: Lecturer[]) {
  const generated: Course[] = []
  const nextLecturerByMajor = new Map<string, number>()

  for (const major of studentMajors) {
    const prefix = coursePrefixes[major]
    const topics = courseTopics[major]
    const faculty = lecturers.filter(
      (lecturer) => lecturer.department === courseDepartmentByMajor[major],
    )
    if (!prefix || !topics || faculty.length === 0) {
      throw new Error(`Sample courses or lecturers are missing for ${major}.`)
    }

    for (const level of studentLevels) {
      const cohortCourses = existingCourses.filter(
        (course) => course.major === major && course.level === level && !course.sectionId,
      )
      const usedCourseCodes = new Set(
        existingCourses
          .filter((course) => course.major === major && course.level === level)
          .map((course) => course.code),
      )
      if (cohortCourses.length > topics.length) {
        throw new Error(`${major} Level ${level} has more sample courses than supported.`)
      }

      for (let courseIndex = cohortCourses.length; courseIndex < 5; courseIndex += 1) {
        const lecturerIndex = nextLecturerByMajor.get(major) ?? 0
        const lecturer = faculty[lecturerIndex % faculty.length]
        nextLecturerByMajor.set(major, lecturerIndex + 1)
        let courseNumber = courseIndex + 1
        let code = `${prefix} ${level}${courseNumber}`
        while (usedCourseCodes.has(code)) {
          courseNumber += 1
          code = `${prefix} ${level}${courseNumber}`
        }
        usedCourseCodes.add(code)
        generated.push({
          code,
          title: `${topics[courseIndex]}`,
          major,
          level,
          enrollment: 28,
          lecturer: lecturer.name,
          sessionType: 'Lecture',
          credits: 3,
          status: 'Scheduled',
        })
      }
    }
  }

  return generated
}

function getCourseRoomType(course: Course): RoomType {
  if (course.sessionType !== 'Practical') return 'lecture'
  if (course.code.startsWith('CS')) return 'computer'
  if (course.code.startsWith('CE')) return 'robotics'
  if (course.code.startsWith('EE')) return 'electrical'
  if (course.code.startsWith('BIO')) return 'biomedical'
  return 'lecture'
}

export function buildLegacyInitialTeachingAssignments({
  courses: baseCourses,
  sessions: baseSessions,
  rooms,
  lecturers,
}: {
  courses: Course[]
  sessions: Session[]
  rooms: Room[]
  lecturers: Lecturer[]
}) {
  const courses = [
    ...baseCourses.map((course) => ({ ...course })),
    ...createStudentCourses(baseCourses, lecturers),
  ]
  const sessions = baseSessions.map((session) => ({ ...session }))
  let assignmentIndex = 0

  const scheduleCourse = (course: Course, meetingNumber = 1, isWorkshop = false) => {
    const roomType = getCourseRoomType(course)
    const suitableRooms = isWorkshop
      ? rooms.filter(
          (room) =>
            room.name === 'A1' &&
            room.roomType === roomType &&
            room.status !== 'Restricted' &&
            room.capacity >= course.enrollment,
        )
      : rooms.filter(
          (room) =>
            room.roomType === roomType &&
            room.status === 'Available' &&
            room.capacity >= course.enrollment,
        )
    if (suitableRooms.length === 0) {
      throw new Error(`No suitable sample room is available for ${course.code} (${course.major}).`)
    }

    const assignment: Session = {
      day: 0,
      start: sampleTeachingStarts[0],
      duration: isWorkshop ? 60 : 120,
      title: course.title,
      code: course.code,
      room: '',
      type: course.sessionType,
      tone: course.sessionType === 'Practical' ? 'red' : 'dark',
      lecturer: course.lecturer,
      major: course.major,
      level: course.level,
      enrollment: course.enrollment,
      roomType,
      sectionId: course.sectionId,
      studentVisible: !course.sectionId,
      group: course.group,
      meetingNumber,
      isWorkshop,
    }
    const periodCount = Math.ceil(assignment.duration / 60)
    const slots = sampleTeachingDays.flatMap((day) =>
      sampleTeachingStarts
        .slice(0, sampleTeachingStarts.length - periodCount + 1)
        .map((start) => ({ day, start })),
    )
    const offset = (assignmentIndex * 7) % slots.length
    let scheduled: Session | undefined

    for (let slotIndex = 0; slotIndex < slots.length && !scheduled; slotIndex += 1) {
      const { day, start } = slots[(slotIndex + offset) % slots.length]
      for (let roomIndex = 0; roomIndex < suitableRooms.length; roomIndex += 1) {
        const room = suitableRooms[(roomIndex + assignmentIndex) % suitableRooms.length]
        const candidate = { ...assignment, day, start, room: room.name }
        const overlapsExisting = sessions.some(
          (other) => getSessionConflictType(candidate, other) !== null,
        )
        if (!overlapsExisting) {
          scheduled = candidate
          break
        }
      }
    }

    if (!scheduled) {
      throw new Error(
        `Could not find a conflict-free sample timetable slot for ${course.lecturer} (${course.code}).`,
      )
    }

    sessions.push(scheduled)
    if (!isWorkshop) {
      const courseIndex = courses.findIndex(
        (existing) => getSectionKey(existing) === getSectionKey(course),
      )
      if (courseIndex === -1) courses.push({ ...course, status: 'Scheduled' })
      else courses[courseIndex] = { ...course, status: 'Scheduled' }
    }
    assignmentIndex += 1
  }

  const repeatedCourseKeys = new Set(
    studentMajors.flatMap((major) =>
      studentLevels.flatMap((level) =>
        courses
          .filter((course) => course.major === major && course.level === level && !course.sectionId)
          .slice(0, -1)
          .map((course) => getSectionKey(course)),
      ),
    ),
  )

  for (const course of [...courses]) {
    const courseKey = getSectionKey(course)
    const existingMeetings = sessions.filter((session) => getSectionKey(session) === courseKey)
    const targetMeetings = repeatedCourseKeys.has(courseKey) ? 2 : 1
    for (
      let meetingNumber = existingMeetings.length + 1;
      meetingNumber <= targetMeetings;
      meetingNumber += 1
    ) {
      scheduleCourse(course, meetingNumber)
    }
  }

  for (const major of studentMajors) {
    for (const level of studentLevels) {
      const workshop = {
        code: 'CW400',
        title: 'Career Workshop (Group A)',
        major,
        level,
        enrollment: 28,
        lecturer: 'Anna Tetteh',
        sessionType: 'Career Workshop',
        credits: 0,
        status: 'Scheduled' as const,
      }
      if (
        !sessions.some(
          (session) => session.isWorkshop && session.major === major && session.level === level,
        )
      ) {
        scheduleCourse(workshop, 1, true)
      }
    }
  }

  const nextCourseByDepartment = new Map<string, number>()
  for (const lecturer of lecturers) {
    if (sessions.some((session) => session.lecturer === lecturer.name)) continue
    const eligibleMajors = teachingMajorsByDepartment[lecturer.department] ?? []
    const eligibleCourses = baseCourses.filter((course) => eligibleMajors.includes(course.major))
    if (eligibleCourses.length === 0) {
      throw new Error(`No sample course is mapped to ${lecturer.department}.`)
    }

    const courseIndex = nextCourseByDepartment.get(lecturer.department) ?? 0
    const template = eligibleCourses[courseIndex % eligibleCourses.length]
    nextCourseByDepartment.set(lecturer.department, courseIndex + 1)
    scheduleCourse({
      ...template,
      lecturer: lecturer.name,
      status: 'Scheduled',
      sectionId: lecturer.id,
    })
  }

  for (const major of studentMajors) {
    for (const level of studentLevels) {
      const cohortSessions = sessions.filter(
        (session) =>
          session.studentVisible !== false &&
          session.major === major &&
          session.level === level &&
          !session.isWorkshop,
      )
      const meetingCounts = new Map<string, number>()
      cohortSessions.forEach((session) => {
        const key = getSectionKey(session)
        meetingCounts.set(key, (meetingCounts.get(key) ?? 0) + 1)
      })
      const workshopSessions = sessions.filter(
        (session) => session.isWorkshop && session.major === major && session.level === level,
      )
      const twiceWeeklyCourses = [...meetingCounts.values()].filter((count) => count === 2).length
      const onceWeeklyCourses = [...meetingCounts.values()].filter((count) => count === 1).length
      if (
        meetingCounts.size !== 5 ||
        [...meetingCounts.values()].some((count) => count > 2) ||
        twiceWeeklyCourses !== 4 ||
        onceWeeklyCourses !== 1 ||
        workshopSessions.length !== 1 ||
        workshopSessions[0].duration !== 60 ||
        workshopSessions[0].code !== 'CW400' ||
        workshopSessions[0].title !== 'Career Workshop (Group A)' ||
        workshopSessions[0].lecturer !== 'Anna Tetteh' ||
        workshopSessions[0].room !== 'A1'
      ) {
        throw new Error(
          `${major} Level ${level} sample timetable is invalid: ${meetingCounts.size} courses with meeting counts ${[...meetingCounts.values()].join(', ')}, ${workshopSessions.length} workshops; expected one 60-minute CW400 workshop with Anna Tetteh in A1.`,
        )
      }
    }
  }

  const dayEnd = sampleTeachingStarts.at(-1)! + 60
  const invalidSession = sessions.find(
    (session) => !sampleTeachingStarts.includes(session.start) || getSessionEnd(session) > dayEnd,
  )
  if (invalidSession) {
    throw new Error(`${invalidSession.code} is outside the configured timetable periods.`)
  }

  return { courses, sessions }
}

export { buildProgrammeTeachingAssignments as buildInitialTeachingAssignments } from './programme-timetable'
