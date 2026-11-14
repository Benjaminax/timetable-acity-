'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Session } from './scheduler-types'
import { getSessionEnd } from './scheduler-types'
import { buildGoogleCalendarEventUrl } from './google-calendar-utils'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function NextClassCountdown({
  sessions,
  role = 'student',
  onViewTimetable,
  onConnectGoogleCalendar,
}: {
  sessions: Session[]
  role?: 'student' | 'lecturer'
  onViewTimetable?: () => void
  onConnectGoogleCalendar?: () => void
}) {
  const [now, setNow] = useState<Date>(() => new Date())

  // Ticking timer every 1000ms
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Find the current or next upcoming session
  const { targetSession, targetTime, isLiveNow } = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return { targetSession: null, targetTime: null, isLiveNow: false }
    }

    const currentDay = (now.getDay() + 6) % 7 // 0=Mon ... 4=Fri, 5=Sat, 6=Sun
    const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60

    // Check if any class is in progress right now
    const liveSession = sessions.find(
      (s) => s.day === currentDay && currentMinutes >= s.start && currentMinutes < getSessionEnd(s),
    )

    if (liveSession) {
      const endMinutes = getSessionEnd(liveSession)
      const target = new Date(now)
      target.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)
      return { targetSession: liveSession, targetTime: target.getTime(), isLiveNow: true }
    }

    // Sort sessions chronologically across the week
    const sorted = [...sessions].sort((a, b) => a.day - b.day || a.start - b.start)

    // 1. Next session today
    const nextToday = sorted.find((s) => s.day === currentDay && s.start > currentMinutes)
    if (nextToday) {
      const target = new Date(now)
      target.setHours(Math.floor(nextToday.start / 60), nextToday.start % 60, 0, 0)
      return { targetSession: nextToday, targetTime: target.getTime(), isLiveNow: false }
    }

    // 2. Next session later this week
    const nextLaterThisWeek = sorted.find((s) => s.day > currentDay)
    if (nextLaterThisWeek) {
      const daysAhead = nextLaterThisWeek.day - currentDay
      const target = new Date(now)
      target.setDate(target.getDate() + daysAhead)
      target.setHours(Math.floor(nextLaterThisWeek.start / 60), nextLaterThisWeek.start % 60, 0, 0)
      return { targetSession: nextLaterThisWeek, targetTime: target.getTime(), isLiveNow: false }
    }

    // 3. Earliest session next week
    const earliestNextWeek = sorted[0]
    if (earliestNextWeek) {
      const daysAhead = (7 - currentDay) + earliestNextWeek.day
      const target = new Date(now)
      target.setDate(target.getDate() + daysAhead)
      target.setHours(Math.floor(earliestNextWeek.start / 60), earliestNextWeek.start % 60, 0, 0)
      return { targetSession: earliestNextWeek, targetTime: target.getTime(), isLiveNow: false }
    }

    return { targetSession: null, targetTime: null, isLiveNow: false }
  }, [sessions, now])

  // Calculate remaining time components
  const remaining = useMemo(() => {
    if (!targetTime) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 }
    const diff = Math.max(0, targetTime - now.getTime())
    const totalSeconds = Math.floor(diff / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return { days, hours, minutes, seconds, totalSeconds }
  }, [targetTime, now])

  if (!targetSession) {
    return (
      <div className="card" style={{ padding: '20px 24px', margin: '16px 0' }}>
        <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
          No scheduled classes found on your academic timetable.
        </p>
      </div>
    )
  }

  return (
    <div
      className="card countdown-card"
      style={{
        padding: '20px 24px',
        margin: '18px 0',
        background: isLiveNow
          ? 'linear-gradient(135deg, #fffcfb 0%, #fff4f2 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #fbfbfc 100%)',
        border: isLiveNow ? '1.5px solid #f0bebb' : '1px solid #e5e5e3',
        borderRadius: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Left Side: Countdown info & course details */}
        <div style={{ flex: '1 1 320px', minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: isLiveNow ? '#cc2222' : '#777775',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isLiveNow ? '#cc2222' : '#22aa55',
                  boxShadow: isLiveNow
                    ? '0 0 0 3px rgba(204, 34, 34, 0.2)'
                    : '0 0 0 3px rgba(34, 170, 85, 0.2)',
                  display: 'inline-block',
                  animation: 'pulseBeacon 1.5s infinite',
                }}
              />
              {isLiveNow ? 'Class in Session Now' : role === 'lecturer' ? 'Next Lecture' : 'Next Class'}
            </span>
            <span style={{ fontSize: 11, color: '#999' }}>·</span>
            <span style={{ fontSize: 11, color: '#666', fontWeight: 500 }}>
              {WEEKDAYS[targetSession.day]} · {formatTime(targetSession.start)} –{' '}
              {formatTime(getSessionEnd(targetSession))}
            </span>
          </div>

          <h3
            style={{
              margin: '2px 0 6px',
              fontSize: 16,
              fontWeight: 700,
              color: '#111111',
              lineHeight: 1.25,
            }}
          >
            <span style={{ color: '#cc2222', marginRight: 6 }}>{targetSession.code}</span>
            {targetSession.title}
          </h3>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: 12,
              color: '#555555',
              marginTop: 4,
            }}
          >
            <span>
              <strong>Room:</strong> {targetSession.room}
            </span>
            <span>
              <strong>{role === 'lecturer' ? 'Cohort' : 'Lecturer'}:</strong>{' '}
              {role === 'lecturer'
                ? `${targetSession.major} · Level ${targetSession.level}`
                : targetSession.lecturer}
            </span>
          </div>
        </div>

        {/* Right Side: Animated Countdown Digits */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: '0 0 auto',
          }}
        >
          {remaining.days > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 54,
                padding: '8px 10px',
                background: '#ffffff',
                border: '1px solid #dcdcd9',
                borderRadius: 6,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#111111',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                {String(remaining.days).padStart(2, '0')}
              </span>
              <small
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#888',
                  textTransform: 'uppercase',
                  marginTop: 3,
                }}
              >
                Days
              </small>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 54,
              padding: '8px 10px',
              background: '#ffffff',
              border: '1px solid #dcdcd9',
              borderRadius: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#111111',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {String(remaining.hours).padStart(2, '0')}
            </span>
            <small
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: '#888',
                textTransform: 'uppercase',
                marginTop: 3,
              }}
            >
              Hours
            </small>
          </div>

          <span style={{ fontSize: 18, fontWeight: 700, color: '#888', lineHeight: 1 }}>:</span>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 54,
              padding: '8px 10px',
              background: '#ffffff',
              border: '1px solid #dcdcd9',
              borderRadius: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#111111',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {String(remaining.minutes).padStart(2, '0')}
            </span>
            <small
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: '#888',
                textTransform: 'uppercase',
                marginTop: 3,
              }}
            >
              Mins
            </small>
          </div>

          <span style={{ fontSize: 18, fontWeight: 700, color: '#888', lineHeight: 1 }}>:</span>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 54,
              padding: '8px 10px',
              background: '#ffffff',
              border: '1.5px solid #cc2222',
              borderRadius: 6,
              boxShadow: '0 1px 4px rgba(204, 34, 34, 0.12)',
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#cc2222',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {String(remaining.seconds).padStart(2, '0')}
            </span>
            <small
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#cc2222',
                textTransform: 'uppercase',
                marginTop: 3,
              }}
            >
              Secs
            </small>
          </div>

          {onViewTimetable && (
            <button
              className="button secondary"
              onClick={onViewTimetable}
              style={{ marginLeft: 6, padding: '8px 12px', fontSize: 11 }}
            >
              View Grid
            </button>
          )}

          {onConnectGoogleCalendar ? (
            <button
              className="button secondary"
              onClick={onConnectGoogleCalendar}
              style={{
                marginLeft: 4,
                padding: '8px 12px',
                fontSize: 11,
                borderColor: '#4285F4',
                color: '#1a73e8',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
              title="Connect schedule to Google Calendar"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="5" fill="#4285F4" />
                <path d="M5 9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V9Z" fill="#FFFFFF" />
                <path d="M5 6C5 5.44772 5.44772 5 6 5H18C18.5523 5 19 5.44772 19 6V9H5V6Z" fill="#1967D2" />
                <text x="12" y="16.5" fill="#1967D2" fontSize="8.5" fontWeight="800" textAnchor="middle">31</text>
              </svg>
              Google Calendar
            </button>
          ) : targetSession ? (
            <a
              href={buildGoogleCalendarEventUrl(targetSession, { recurring: true })}
              target="_blank"
              rel="noreferrer"
              className="button secondary"
              style={{
                marginLeft: 4,
                padding: '8px 12px',
                fontSize: 11,
                borderColor: '#4285F4',
                color: '#1a73e8',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                textDecoration: 'none',
              }}
              title="Add this class to Google Calendar"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="5" fill="#4285F4" />
                <path d="M5 9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V9Z" fill="#FFFFFF" />
                <path d="M5 6C5 5.44772 5.44772 5 6 5H18C18.5523 5 19 5.44772 19 6V9H5V6Z" fill="#1967D2" />
                <text x="12" y="16.5" fill="#1967D2" fontSize="8.5" fontWeight="800" textAnchor="middle">31</text>
              </svg>
              + Google Cal
            </a>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulseBeacon {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.55;
            transform: scale(1.15);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

