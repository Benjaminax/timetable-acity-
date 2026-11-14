'use client'

import { useMemo, useState, type ReactNode } from 'react'
import type { Session } from './scheduler-types'
import {
  getSessionKey,
  getSessionEnd,
  getSessionElapsedDuration,
  hasLecturerUnavailability,
  TIMETABLE_PERIOD_COUNT,
  TIMETABLE_PERIOD_STARTS,
  type LecturerUnavailabilityByName,
} from './scheduler-types'
import {
  addCalendarDays,
  getCurrentWeekStart,
  getGhanaHoliday,
  parseCalendarDate,
} from './calendar-utils'

const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const timetablePeriodCount = TIMETABLE_PERIOD_COUNT
const timetablePeriodStarts = TIMETABLE_PERIOD_STARTS

function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function getTimetableSessionRows(
  start: number,
  duration: number,
  periodStarts: number[] = TIMETABLE_PERIOD_STARTS,
) {
  const periodCountTotal = periodStarts.length
  const startIndex = periodStarts.reduce(
    (closestIndex, periodStart, index) =>
      Math.abs(periodStart - start) < Math.abs(periodStarts[closestIndex] - start)
        ? index
        : closestIndex,
    0,
  )
  const slotDuration = periodStarts.length > 1 ? periodStarts[1] - periodStarts[0] : 60
  const periodCount = Math.max(1, Math.ceil(duration / slotDuration))
  const endIndex = Math.min(periodCountTotal, startIndex + periodCount)
  const visiblePeriodCount = endIndex - startIndex
  const heightPercent = Math.min(
    (getSessionElapsedDuration(duration) / (slotDuration * periodCountTotal)) * 100,
    (visiblePeriodCount / periodCountTotal) * 100,
  )
  return { startIndex, periodCount: visiblePeriodCount, heightPercent }
}

export function AdminTimetable({
  sessions,
  onSession,
  lecturerUnavailability = {},
  roomFilter,
  weekStart = getCurrentWeekStart(),
  customSubtitle,
  showDates = false,
  periodStarts = TIMETABLE_PERIOD_STARTS,
  periodDuration = 60,
}: {
  sessions: Session[]
  onSession?: (session: Session) => void
  lecturerUnavailability?: LecturerUnavailabilityByName
  roomFilter?: string
  weekStart?: string
  customSubtitle?: (session: Session) => string
  showDates?: boolean
  periodStarts?: number[]
  periodDuration?: number
}) {
  const timetablePeriodCount = periodStarts.length
  const timetablePeriodStarts = periodStarts
  const dates = useMemo(() => {
    return weekdayNames.map((_, index) => addCalendarDays(weekStart, index))
  }, [weekStart])

  return (
    <div
      className="timetable reference-timetable"
      style={{ gridTemplateColumns: '6% repeat(5, minmax(0, 1fr))' }}
    >
      <div className="day-head time-head">Time</div>
      {weekdayNames.map((day, i) => {
        const date = parseCalendarDate(dates[i])
        const holiday = getGhanaHoliday(dates[i])
        return (
          <div className={`day-head ${holiday ? 'holiday' : ''}`} key={dates[i]}>
            <span>{day.slice(0, 3)}</span>
            {holiday ? (
              <small>Holiday</small>
            ) : showDates ? (
              <small>
                {new Intl.DateTimeFormat('en', {
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC',
                }).format(date)}
              </small>
            ) : null}
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
      {weekdayNames.map((_, day) => (
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
                .flatMap(([lecturer, blocks]) =>
                  (blocks ?? [])
                    .filter((block) => block.day === day)
                    .map((block) => ({ lecturer, block })),
                )
                .map(({ lecturer, block }, index) => {
                  const { startIndex, periodCount, heightPercent } = getTimetableSessionRows(
                    block.start,
                    block.end - block.start,
                    timetablePeriodStarts,
                  )
                  return (
                    <div
                      className="lecturer-unavailable-block"
                      style={{
                        top: `${(startIndex / timetablePeriodCount) * 100}%`,
                        height: `${heightPercent}%`,
                      }}
                      key={`${lecturer}-${block.start}-${index}`}
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
                  (session) => session.day === day && (!roomFilter || session.room === roomFilter),
                )
                .map((s) => {
                  const { startIndex, periodCount } = getTimetableSessionRows(
                    s.start,
                    s.duration,
                    timetablePeriodStarts,
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
                      className={`session ${s.tone || 'red'}${periodCount === 1 ? ' is-single-period' : ''}${isBottom ? ' is-bottom' : ''}${unavailable ? ' has-unavailable-period' : ''}`}
                      style={{
                        top: `${(startIndex / timetablePeriodCount) * 100}%`,
                        height: `${(periodCount / timetablePeriodCount) * 100}%`,
                        ...(isBottom ? { borderBottom: 'none' } : {}),
                      }}
                      key={getSessionKey(s)}
                      onClick={() => onSession?.(s)}
                    >
                      <b>{`${s.code} - ${s.title}${s.group ? ` - Group ${s.group}` : ''}`}</b>
                      <span>{s.lecturer}</span>
                      {unavailable && (
                        <small className="session-unavailable-warning">Unavailable</small>
                      )}
                      <em>{customSubtitle ? customSubtitle(s) : s.room}</em>
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
