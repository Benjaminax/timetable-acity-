const timeZone = 'Africa/Accra'

export function getDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function parseCalendarDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function addCalendarDays(date: string, days: number) {
  const result = parseCalendarDate(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

export function getMondayDate(date: string) {
  const parsed = parseCalendarDate(date)
  parsed.setUTCDate(parsed.getUTCDate() - ((parsed.getUTCDay() + 6) % 7))
  return parsed.toISOString().slice(0, 10)
}

export function getCurrentWeekStart(now = new Date()) {
  return getMondayDate(getDateKey(now))
}

export function getCurrentAcademicSemester(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const academicYearStart = month >= 8 ? year : year - 1
  const semester = month >= 8 ? 1 : 2
  return `${academicYearStart}/${String((academicYearStart + 1) % 100).padStart(2, '0')} · Semester ${semester}`
}

function getEasterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
}

function observedWeekday(date: string) {
  const weekday = parseCalendarDate(date).getUTCDay()
  return weekday === 6 ? addCalendarDays(date, 2) : weekday === 0 ? addCalendarDays(date, 1) : date
}

export function getGhanaHolidaysForYear(year: number) {
  const fixedHolidays = [
    { date: `${year}-01-01`, name: "New Year's Day" },
    { date: `${year}-01-07`, name: 'Constitution Day' },
    { date: `${year}-03-06`, name: 'Independence Day' },
    { date: `${year}-05-01`, name: 'May Day' },
    { date: `${year}-05-25`, name: 'African Union Day' },
    { date: `${year}-07-01`, name: 'Republic Day' },
    { date: `${year}-09-21`, name: 'Kwame Nkrumah Memorial Day' },
    { date: `${year}-12-25`, name: 'Christmas Day' },
  ]
  const easterSunday = getEasterSunday(year)
  const decemberFirst = parseCalendarDate(`${year}-12-01`)
  const firstFridayOffset = (5 - decemberFirst.getUTCDay() + 7) % 7
  const farmersDay = addCalendarDays(`${year}-12-01`, firstFridayOffset)
  const boxingDay = observedWeekday(addCalendarDays(`${year}-12-25`, 1))

  return [
    ...fixedHolidays.map((holiday) => ({
      ...holiday,
      date: observedWeekday(holiday.date),
    })),
    { date: farmersDay, name: "Farmers' Day" },
    { date: boxingDay, name: 'Boxing Day' },
    { date: addCalendarDays(easterSunday, -2), name: 'Good Friday' },
    { date: addCalendarDays(easterSunday, 1), name: 'Easter Monday' },
  ].sort((left, right) => left.date.localeCompare(right.date))
}

export function getUpcomingGhanaHolidays(count: number, fromDate = getDateKey()) {
  const year = Number(fromDate.slice(0, 4))
  return [year, year + 1]
    .flatMap(getGhanaHolidaysForYear)
    .filter((holiday) => holiday.date >= fromDate)
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, count)
}

export function getGhanaHoliday(date: string) {
  const year = Number(date.slice(0, 4))
  return getGhanaHolidaysForYear(year)
    .filter((holiday) => holiday.date === date)
    .map((holiday) => holiday.name)
    .join(' · ')
}

export function formatWeekLabel(weekStart: string) {
  const start = parseCalendarDate(weekStart)
  const end = parseCalendarDate(addCalendarDays(weekStart, 4))
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  const startLabel = new Intl.DateTimeFormat('en', options).format(start)
  const endLabel = new Intl.DateTimeFormat('en', {
    ...options,
    year: 'numeric',
  }).format(end)
  return `Week of ${startLabel}–${endLabel}`
}
