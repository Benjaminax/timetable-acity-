'use client'

import { useState } from 'react'
import type { Session } from './scheduler-types'
import {
  buildGoogleCalendarEventUrl,
  downloadTimetableIcs,
  GOOGLE_CALENDAR_IMPORT_URL,
  getGoogleCalendarSubscribeUrl,
} from './google-calendar-utils'

interface GoogleCalendarModalProps {
  isOpen: boolean
  onClose: () => void
  sessions: Session[]
  calendarTitle?: string
  calendarSubtitle?: string
  feedId?: string
  feedType?: 'student' | 'lecturer' | 'admin'
  nextSession?: Session | null
  weekStart?: string
}

function GoogleCalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#4285F4" />
      <path d="M5 9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V9Z" fill="#FFFFFF" />
      <path d="M5 6C5 5.44772 5.44772 5 6 5H18C18.5523 5 19 5.44772 19 6V9H5V6Z" fill="#1967D2" />
      <rect x="7" y="3" width="2" height="4" rx="1" fill="#FFFFFF" />
      <rect x="15" y="3" width="2" height="4" rx="1" fill="#FFFFFF" />
      <text
        x="12"
        y="16.5"
        fill="#1967D2"
        fontSize="8.5"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
      >
        31
      </text>
    </svg>
  )
}

export function GoogleCalendarModal({
  isOpen,
  onClose,
  sessions,
  calendarTitle = 'Academic City Timetable',
  calendarSubtitle = 'Weekly Academic Schedule',
  feedId = 'general',
  feedType = 'student',
  nextSession,
  weekStart,
}: GoogleCalendarModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'live' | 'quick'>('import')
  const [copied, setCopied] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  if (!isOpen) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://timetables.acity.edu.gh'
  const feedUrl = `${origin}/api/calendar/${feedType}/${feedId}`
  const webcalUrl = feedUrl.replace(/^https?:\/\//, 'webcal://')

  const handleCopyFeed = async () => {
    try {
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(feedUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      }
    } catch (err) {
      console.error('Failed to copy feed URL', err)
    }
  }

  const handleDownload = () => {
    const filename = `${calendarTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-google-calendar.ics`
    downloadTimetableIcs(filename, sessions, {
      calendarName: calendarTitle,
      calendarDescription: `${calendarSubtitle} · Academic City University College`,
      weekStart,
    })
    setDownloadSuccess(true)
    setTimeout(() => setDownloadSuccess(false), 4000)
  }

  const openGoogleCalendarImport = () => {
    window.open(GOOGLE_CALENDAR_IMPORT_URL, '_blank', 'noopener,noreferrer')
  }

  const openOneClickSubscribe = () => {
    const subscribeUrl = getGoogleCalendarSubscribeUrl(feedUrl)
    window.open(subscribeUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 580,
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gcal-modal-title"
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e8e8e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <GoogleCalendarIcon />
            <div>
              <h2
                id="gcal-modal-title"
                style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#111827', lineHeight: 1.2 }}
              >
                Connect to Google Calendar
              </h2>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0' }}>
                {calendarTitle} · {sessions.length} sessions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="button secondary"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              minWidth: 0,
              border: '1px solid #d1d5db',
            }}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e8e8e8',
            background: '#f9fafb',
            padding: '0 24px',
            gap: 8,
          }}
        >
          <button
            onClick={() => setActiveTab('import')}
            style={{
              padding: '12px 14px',
              fontSize: 12,
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'import' ? '2px solid #cc2222' : '2px solid transparent',
              color: activeTab === 'import' ? '#cc2222' : '#6b7280',
              cursor: 'pointer',
            }}
          >
            Full Semester (.ics)
          </button>
          <button
            onClick={() => setActiveTab('live')}
            style={{
              padding: '12px 14px',
              fontSize: 12,
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'live' ? '2px solid #cc2222' : '2px solid transparent',
              color: activeTab === 'live' ? '#cc2222' : '#6b7280',
              cursor: 'pointer',
            }}
          >
            Live Auto-Sync Feed
          </button>
          {nextSession && (
            <button
              onClick={() => setActiveTab('quick')}
              style={{
                padding: '12px 14px',
                fontSize: 12,
                fontWeight: 600,
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'quick' ? '2px solid #cc2222' : '2px solid transparent',
                color: activeTab === 'quick' ? '#cc2222' : '#6b7280',
                cursor: 'pointer',
              }}
            >
              Next Class 1-Click
            </button>
          )}
        </div>

        {/* Body Content */}
        <div style={{ padding: 24, overflowY: 'auto' }}>
          {/* TAB 1: FULL SEMESTER IMPORT */}
          {activeTab === 'import' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                      Complete Timetable Package (.ics)
                    </h3>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
                      Pre-configured with weekly recurring classes until semester close and 15-minute before-class alerts.
                    </p>
                  </div>
                  <span
                    style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sessions.length} weekly slots
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button
                    className="button primary"
                    onClick={handleDownload}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontSize: 12,
                      padding: '10px 16px',
                    }}
                  >
                    <span>Download Timetable (.ics)</span>
                  </button>
                  <button
                    className="button secondary"
                    onClick={openGoogleCalendarImport}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontSize: 12,
                      padding: '10px 16px',
                      borderColor: '#4285F4',
                      color: '#1a73e8',
                    }}
                  >
                    <span>Open Google Calendar Import ↗</span>
                  </button>
                </div>

                {downloadSuccess && (
                  <p
                    style={{
                      fontSize: 11,
                      color: '#16a34a',
                      fontWeight: 600,
                      margin: '10px 0 0',
                      textAlign: 'center',
                    }}
                  >
                    File downloaded successfully! Follow the 2 steps below to import into Google Calendar.
                  </p>
                )}
              </div>

              {/* Step-by-Step Instructions */}
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                  How to Import into Google Calendar (Takes 30 seconds):
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        background: '#cc2222',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      1
                    </span>
                    <p style={{ fontSize: 12, color: '#4b5563', margin: 0, lineHeight: 1.4 }}>
                      Click <b>Download Timetable (.ics)</b> above to save your Academic City timetable file.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        background: '#cc2222',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      2
                    </span>
                    <p style={{ fontSize: 12, color: '#4b5563', margin: 0, lineHeight: 1.4 }}>
                      Click <b>Open Google Calendar Import ↗</b> or visit{' '}
                      <a
                        href={GOOGLE_CALENDAR_IMPORT_URL}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#1a73e8', textDecoration: 'underline' }}
                      >
                        Google Calendar Settings → Import
                      </a>
                      .
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        background: '#cc2222',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      3
                    </span>
                    <p style={{ fontSize: 12, color: '#4b5563', margin: 0, lineHeight: 1.4 }}>
                      Select the downloaded <b>.ics</b> file, choose your calendar (or create an &quot;Academic City&quot; calendar), and click <b>Import</b>. All your classes will immediately appear across every week of the semester!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE AUTO-SYNC FEED */}
          {activeTab === 'live' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Live Webcal / iCalendar Subscription Feed
                </h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 12px' }}>
                  Subscribing by URL enables Google Calendar to automatically update whenever timetable administrators adjust classrooms or lecture hours.
                </p>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={feedUrl}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: 11,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      color: '#1e293b',
                      fontFamily: 'monospace',
                    }}
                  />
                  <button
                    className="button secondary"
                    onClick={handleCopyFeed}
                    style={{
                      padding: '8px 14px',
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy URL'}
                  </button>
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                  <button
                    className="button primary"
                    onClick={openOneClickSubscribe}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <span>1-Click Subscribe in Google Calendar ↗</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                  Alternative Manual Setup in Google Calendar:
                </h4>
                <ol style={{ fontSize: 12, color: '#4b5563', paddingLeft: 18, margin: 0, lineHeight: 1.6 }}>
                  <li>Open <b>Google Calendar</b> on your computer.</li>
                  <li>On the left panel, find <b>Other calendars</b> and click the <b>+</b> icon.</li>
                  <li>Click <b>From URL</b>.</li>
                  <li>Paste the feed URL copied above and click <b>Add calendar</b>.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: NEXT CLASS 1-CLICK */}
          {activeTab === 'quick' && nextSession && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#cc2222',
                        letterSpacing: 0.5,
                      }}
                    >
                      Next Upcoming Class
                    </span>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: '4px 0 2px', color: '#0f172a' }}>
                      {nextSession.code} · {nextSession.title}
                    </h3>
                    <p style={{ fontSize: 12, color: '#475569', margin: '2px 0 0' }}>
                      {nextSession.lecturer} · <b>{nextSession.room}</b>
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <a
                    href={buildGoogleCalendarEventUrl(nextSession, { weekStart, recurring: true })}
                    target="_blank"
                    rel="noreferrer"
                    className="button primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '10px 16px',
                      textDecoration: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <span>Add Weekly Recurring Class to Google Calendar ↗</span>
                  </a>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  All Course Sessions in Your Timetable:
                </h4>
                <div
                  style={{
                    maxHeight: 200,
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                  }}
                >
                  {sessions.map((s, idx) => {
                    const gcalUrl = buildGoogleCalendarEventUrl(s, { weekStart, recurring: true })
                    return (
                      <div
                        key={`${s.code}-${s.day}-${s.start}-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderBottom: idx === sessions.length - 1 ? 'none' : '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                            {s.code}: {s.title}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][s.day] || 'Weekday'} · {s.room} · {s.lecturer}
                          </div>
                        </div>
                        <a
                          href={gcalUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#1a73e8',
                            textDecoration: 'none',
                            padding: '4px 8px',
                            border: '1px solid #bfdbfe',
                            borderRadius: 4,
                            background: '#eff6ff',
                          }}
                        >
                          + Google Cal
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e8e8e8',
            background: '#fafafa',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 11, color: '#6b7280' }}>
            Academic City University College · Accra, Ghana
          </span>
          <button
            onClick={onClose}
            className="button secondary"
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

