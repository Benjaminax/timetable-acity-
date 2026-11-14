'use client'

import { useState } from 'react'
import AppIcon from './AppIcon'
import { addCalendarDays } from './calendar-utils'
import { generateRandomizedExamSchedule, type ExamScheduleItem } from './exam-schedule'

function formatExamDate(date: string) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatExamTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export default function ExamSchedulingPage({
  schedule,
  onSaveSchedule,
  scheduleLoadError,
}: {
  schedule: ExamScheduleItem[]
  onSaveSchedule: (schedule: ExamScheduleItem[]) => void
  scheduleLoadError: string
}) {
  const firstExamDate = schedule.reduce(
    (earliest, exam) => (exam.date < earliest ? exam.date : earliest),
    schedule[0]?.date ?? '',
  )
  const [startDate, setStartDate] = useState(firstExamDate)
  const [endDate, setEndDate] = useState(() =>
    firstExamDate ? addCalendarDays(firstExamDate, 13) : '',
  )
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleRandomize = () => {
    setError('')
    setNotice('')
    try {
      const randomizedSchedule = generateRandomizedExamSchedule(startDate, endDate)
      onSaveSchedule(randomizedSchedule)
      setNotice(
        `All ${randomizedSchedule.length} exams were assigned conflict-free sittings within the selected period.`,
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The exam schedule could not be randomized.',
      )
    }
  }

  return (
    <section className="space-y-5">
      <header className="page-heading">
        <div className="flex items-start gap-3">
          <img
            className="mt-1 h-11 w-11 shrink-0 object-contain"
            src="/academic-city-crest.png"
            alt=""
          />
          <div>
            <p className="eyebrow">Examination Directorate</p>
            <h1>Exam schedule</h1>
            <p>Set the exam period, then randomize all sittings across up to two weeks.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#e3e3e0] bg-white px-3 py-2 text-xs font-semibold text-[#52525b]">
          <AppIcon name="calendar" size={15} />
          14-day scheduling window
        </span>
      </header>

      {scheduleLoadError && (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          role="alert"
        >
          {scheduleLoadError}
        </p>
      )}
      {error && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          role="status"
        >
          {notice}
        </p>
      )}

      <section className="card space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#fff2f2] text-[#a22d2b]">
            <AppIcon name="calendar" size={18} />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Choose the exam period</h2>
            <p className="mt-1 text-sm text-[#747471]">
              Exams are placed on weekdays in morning or afternoon sittings. The selected range
              cannot exceed 14 calendar days.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            <span className="flex items-center gap-2">
              <AppIcon name="calendar" size={15} />
              Start date
            </span>
            <input
              className="rounded-lg border border-[#dededb] bg-white px-3 py-2.5"
              type="date"
              value={startDate}
              onChange={(event) => {
                const nextStartDate = event.target.value
                setStartDate(nextStartDate)
                if (
                  nextStartDate &&
                  (!endDate ||
                    endDate < nextStartDate ||
                    endDate > addCalendarDays(nextStartDate, 13))
                ) {
                  setEndDate(addCalendarDays(nextStartDate, 13))
                }
                setError('')
                setNotice('')
              }}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            <span className="flex items-center gap-2">
              <AppIcon name="calendar" size={15} />
              End date
            </span>
            <input
              className="rounded-lg border border-[#dededb] bg-white px-3 py-2.5"
              type="date"
              value={endDate}
              min={startDate || undefined}
              max={startDate ? addCalendarDays(startDate, 13) : undefined}
              onChange={(event) => {
                setEndDate(event.target.value)
                setError('')
                setNotice('')
              }}
            />
          </label>
        </div>
        <button className="button primary" type="button" onClick={handleRandomize}>
          <AppIcon name="sparkles" size={15} />
          Randomize exam sittings
        </button>
        <div className="flex items-start gap-2 rounded-lg bg-[#f7f7f5] px-3 py-2.5 text-xs leading-relaxed text-[#747471]">
          <AppIcon name="check" size={15} />
          <p>
            Conflict checks prevent overlapping exams for the same major and level, and prevent an
            exam hall from being assigned to two exams at once.
          </p>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="card-head px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f2f2f0] text-[#636361]">
              <AppIcon name="file" size={17} />
            </span>
            <div>
              <h2>Scheduled exams</h2>
              <p>{schedule.length} exams · sorted by date and sitting</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="workspace-table min-w-[760px]">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Major &amp; level</th>
                <th>Date</th>
                <th>Sitting</th>
                <th>Exam hall</th>
                <th>Students</th>
              </tr>
            </thead>
            <tbody>
              {[...schedule]
                .sort(
                  (left, right) => left.date.localeCompare(right.date) || left.start - right.start,
                )
                .map((exam) => (
                  <tr key={exam.code}>
                    <td>
                      <b>{exam.code}</b>
                      <span>{exam.title}</span>
                    </td>
                    <td>
                      {exam.major}
                      <span>Level {exam.level}</span>
                    </td>
                    <td>{formatExamDate(exam.date)}</td>
                    <td>
                      {formatExamTime(exam.start)}–{formatExamTime(exam.end)}
                    </td>
                    <td>{exam.room}</td>
                    <td>{exam.enrollment}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
