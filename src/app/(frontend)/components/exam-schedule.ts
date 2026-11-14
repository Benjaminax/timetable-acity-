import { addCalendarDays, getCurrentWeekStart, parseCalendarDate } from './calendar-utils'

export type ExamScheduleItem = {
  code: string
  title: string
  major: string
  level: number
  date: string
  start: number
  end: number
  room: string
  enrollment: number
}

export const examScheduleStorageKey = 'acity_exam_schedule'
export const examWeekStart = addCalendarDays(getCurrentWeekStart(), 28)

const examTemplates: Omit<ExamScheduleItem, 'date'>[] = [
  {
    code: 'CS 302',
    title: 'Software Engineering',
    major: 'Computer Science',
    level: 300,
    start: 540,
    end: 690,
    room: 'Main Exam Hall A1',
    enrollment: 60,
  },
  {
    code: 'CS 315',
    title: 'Database Systems',
    major: 'Computer Science',
    level: 300,
    start: 780,
    end: 930,
    room: 'Exam Hall L2',
    enrollment: 45,
  },
  {
    code: 'CE 304',
    title: 'Embedded Systems',
    major: 'Computer Engineering',
    level: 300,
    start: 540,
    end: 690,
    room: 'Engineering Exam Hall U2',
    enrollment: 50,
  },
  {
    code: 'EE 204',
    title: 'Circuit Analysis',
    major: 'Electrical Engineering',
    level: 200,
    start: 780,
    end: 930,
    room: 'Main Exam Hall A2',
    enrollment: 60,
  },
  {
    code: 'EE 218',
    title: 'Digital Electronics',
    major: 'Electrical Engineering',
    level: 200,
    start: 540,
    end: 690,
    room: 'Specialized Hardware Lab',
    enrollment: 40,
  },
  {
    code: 'CS 208',
    title: 'Data Structures',
    major: 'Computer Science',
    level: 200,
    start: 780,
    end: 930,
    room: 'Computing Lab 1 (Exam Mode)',
    enrollment: 50,
  },
  {
    code: 'MATH 201',
    title: 'Linear Algebra',
    major: 'Computer Engineering',
    level: 200,
    start: 540,
    end: 690,
    room: 'Main Exam Hall A1',
    enrollment: 60,
  },
]

const initialDayOffsets = [0, 2, 1, 0, 3, 1, 2]

export const examScheduleData: ExamScheduleItem[] = examTemplates.map((exam, index) => ({
  ...exam,
  date: addCalendarDays(examWeekStart, initialDayOffsets[index]),
}))

type ExamSitting = {
  date: string
  start: number
  end: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = parseCalendarDate(value)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isExamScheduleItem(value: unknown): value is ExamScheduleItem {
  if (!isRecord(value)) return false
  return (
    typeof value.code === 'string' &&
    typeof value.title === 'string' &&
    typeof value.major === 'string' &&
    typeof value.level === 'number' &&
    typeof value.date === 'string' &&
    isIsoDate(value.date) &&
    typeof value.start === 'number' &&
    typeof value.end === 'number' &&
    value.end > value.start &&
    typeof value.room === 'string' &&
    typeof value.enrollment === 'number'
  )
}

function isCompleteExamSchedule(value: unknown): value is ExamScheduleItem[] {
  if (!Array.isArray(value) || value.length !== examScheduleData.length) return false
  if (!value.every(isExamScheduleItem)) return false
  const codes = new Set(value.map((exam) => exam.code))
  return (
    codes.size === examScheduleData.length && examScheduleData.every((exam) => codes.has(exam.code))
  )
}

export function loadSavedExamSchedule() {
  const storedSchedule = window.localStorage.getItem(examScheduleStorageKey)
  if (storedSchedule === null) return null

  let parsedSchedule: unknown
  try {
    parsedSchedule = JSON.parse(storedSchedule)
  } catch {
    throw new Error('The saved exam schedule is not valid JSON.')
  }
  if (!isCompleteExamSchedule(parsedSchedule)) {
    throw new Error('The saved exam schedule is incomplete or invalid.')
  }
  return parsedSchedule
}

export function saveExamSchedule(schedule: ExamScheduleItem[]) {
  if (!isCompleteExamSchedule(schedule)) {
    throw new Error('The exam schedule must include every valid exam before it can be saved.')
  }
  window.localStorage.setItem(examScheduleStorageKey, JSON.stringify(schedule))
}

function shuffle<T>(values: T[], random: () => number) {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }
  return shuffled
}

function examsConflict(
  candidateExam: Omit<ExamScheduleItem, 'date' | 'start' | 'end'>,
  candidateSitting: ExamSitting,
  scheduledExam: ExamScheduleItem,
) {
  if (candidateSitting.date !== scheduledExam.date) return false
  const overlaps =
    candidateSitting.start < scheduledExam.end && candidateSitting.end > scheduledExam.start
  if (!overlaps) return false
  const studentsOverlap =
    candidateExam.major === scheduledExam.major && candidateExam.level === scheduledExam.level
  return studentsOverlap || candidateExam.room === scheduledExam.room
}

export function generateRandomizedExamSchedule(
  startDate: string,
  endDate: string,
  random: () => number = Math.random,
) {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    throw new Error('Choose valid start and end dates.')
  }
  const rangeLength =
    (parseCalendarDate(endDate).getTime() - parseCalendarDate(startDate).getTime()) /
      (24 * 60 * 60 * 1000) +
    1
  if (rangeLength < 1) throw new Error('The end date must be on or after the start date.')
  if (rangeLength > 14) throw new Error('The exam period must fit within two weeks.')

  const sittings: ExamSitting[] = Array.from({ length: rangeLength }, (_, offset) =>
    addCalendarDays(startDate, offset),
  )
    .filter((date) => {
      const weekday = parseCalendarDate(date).getUTCDay()
      return weekday >= 1 && weekday <= 5
    })
    .flatMap((date) => [
      { date, start: 540, end: 690 },
      { date, start: 780, end: 930 },
    ])
  if (!sittings.length) {
    throw new Error('The selected two-week period has no weekdays for exam sittings.')
  }

  const randomizedExams = shuffle(examTemplates, random)
  const schedule: ExamScheduleItem[] = []
  for (const exam of randomizedExams) {
    const duration = exam.end - exam.start
    const sitting = shuffle(sittings, random).find((candidate) => {
      const examSitting = { ...candidate, end: candidate.start + duration }
      return !schedule.some((scheduledExam) => examsConflict(exam, examSitting, scheduledExam))
    })
    if (!sitting) {
      throw new Error(
        `No conflict-free sitting is available for ${exam.code} within the selected two-week period.`,
      )
    }
    schedule.push({
      ...exam,
      date: sitting.date,
      start: sitting.start,
      end: sitting.start + duration,
    })
  }

  return schedule.sort(
    (left, right) => left.date.localeCompare(right.date) || left.start - right.start,
  )
}
