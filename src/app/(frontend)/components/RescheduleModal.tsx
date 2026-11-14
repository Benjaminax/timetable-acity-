'use client'

import { useEffect, useState } from 'react'
import { addCalendarDays, getCurrentWeekStart, parseCalendarDate } from './calendar-utils'
import type { RescheduleAlternative } from './reschedule-utils'
import type { Room, Session } from './scheduler-types'
import { getSessionEnd } from './scheduler-types'
import AppIcon, { type AppIconName } from './AppIcon'
import { isRoomTypeCompatibleWithSession } from './scheduler-types'

function Icon({ name, size = 18 }: { name: AppIconName; size?: number }) {
  return <AppIcon name={name} size={size} />
}

function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function formatDate(day: number, weekStart: string) {
  const date = parseCalendarDate(addCalendarDays(weekStart, day))
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function RescheduleModal({
  session,
  getAlternatives,
  onClose,
  onConfirm,
}: {
  session: Session
  getAlternatives: (online: boolean) => RescheduleAlternative[]
  onClose: () => void
  onConfirm: (session: Session) => boolean | void
}) {
  const weekStart = session.weekStart ?? getCurrentWeekStart()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [online, setOnline] = useState(
    Boolean(session.isOnline || session.room.toLowerCase().includes('online')),
  )
  const [availabilityError, setAvailabilityError] = useState('')
  const [completedMove, setCompletedMove] = useState<{
    day: number
    start: number
    room: Room | null
  } | null>(null)

  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const previousRootOverflow = root.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousBodyPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - root.clientWidth

    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      root.style.overflow = previousRootOverflow
      body.style.overflow = previousBodyOverflow
      body.style.paddingRight = previousBodyPaddingRight
    }
  }, [])

  const alternatives = getAlternatives(online).sort(
    (left, right) => left.day - right.day || left.start - right.start,
  )
  const selected = alternatives.find((option) => `${option.day}-${option.start}` === selectedKey)
  const selectedRoomForSlot = online
    ? undefined
    : (selected?.rooms.find((room) => room.name === selectedRoom) ?? selected?.rooms[0])

  const confirmMove = () => {
    if (!selected || (!online && !selectedRoomForSlot)) return
    const latestOption = getAlternatives(online).find(
      (option) => option.day === selected.day && option.start === selected.start,
    )
    const latestRoom = online
      ? undefined
      : latestOption?.rooms.find((room) => room.name === selectedRoomForSlot?.name)
    if (!latestOption || (!online && !latestRoom)) {
      setSelectedKey(null)
      setSelectedRoom(null)
      setAvailabilityError(
        'That time or classroom is no longer available. Please choose another option.',
      )
      return
    }

    const updatedSession: Session = {
      ...session,
      weekStart,
      day: latestOption.day,
      start: latestOption.start,
      room: online ? 'Online' : (latestRoom?.name ?? ''),
      isOnline: online,
      roomTypeOverride:
        !online &&
        latestRoom !== undefined &&
        !isRoomTypeCompatibleWithSession(session, latestRoom),
    }
    const accepted = onConfirm(updatedSession)
    if (accepted === false) {
      setAvailabilityError(
        'That room is no longer available at the selected time. Please choose another option.',
      )
      return
    }

    setAvailabilityError('')
    setCompletedMove({
      day: latestOption.day,
      start: latestOption.start,
      room: latestRoom ?? null,
    })
  }

  if (completedMove) {
    return (
      <div className="modal-backdrop">
        <div className="modal success-modal" role="dialog" aria-modal="true">
          <button className="modal-close" aria-label="Close confirmation" onClick={onClose}>
            <Icon name="x" />
          </button>
          <div className="success-check">
            <Icon name="check" size={28} />
          </div>
          <h2>Timetable updated</h2>
          <p>
            {session.title} was moved to {formatDate(completedMove.day, weekStart)} at{' '}
            {formatTime(completedMove.start)}{' '}
            {completedMove.room
              ? `in ${completedMove.room.name}`
              : 'online; the physical classroom is now free'}
            . The sample timetable is updated for this browser session.
          </p>
          <div className="sync-list">
            {[
              completedMove.room ? 'Original classroom released' : 'No classroom is reserved',
              completedMove.room ? 'New classroom booking added' : 'Physical room space is freed',
              'Major and level availability rechecked',
              'Change applies to this sample week only',
              'This prototype does not save to university records',
            ].map((item) => (
              <span key={item}>
                <Icon name="check" size={15} />
                {item}
              </span>
            ))}
          </div>
          <button className="button primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal reschedule-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
      >
        <div className="modal-header reschedule-header">
          <div>
            <p className="eyebrow">Reschedule class</p>
            <h2 id="reschedule-title">
              {session.code} · {session.title}
            </h2>
            <p className="reschedule-subtitle">{session.lecturer}</p>
          </div>
          <button className="modal-close" aria-label="Close reschedule dialog" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <section className="reschedule-current" aria-label="Current class time">
          <div>
            <span>Current class</span>
            <strong>
              {formatDate(session.day, weekStart)} · {formatTime(session.start)}–
              {formatTime(getSessionEnd(session))}
            </strong>
            <small>{session.room}</small>
          </div>
        </section>
        <div className="class-delivery-mode">
          <div className="class-delivery-copy">
            <b>Class format</b>
            <small>Virtual classes do not reserve a room.</small>
          </div>
          <div className="class-delivery-options" role="group" aria-label="Class format">
            <button
              type="button"
              className={`class-delivery-option ${online ? '' : 'selected'}`}
              aria-pressed={!online}
              onClick={() => {
                setOnline(false)
                setSelectedKey(null)
                setSelectedRoom(null)
                setAvailabilityError('')
              }}
            >
              In person
            </button>
            <button
              type="button"
              className={`class-delivery-option ${online ? 'selected' : ''}`}
              aria-pressed={online}
              onClick={() => {
                setOnline(true)
                setSelectedKey(null)
                setSelectedRoom(null)
                setAvailabilityError('')
              }}
            >
              Virtual class
            </button>
          </div>
        </div>
        <div className="alternative-head">
          <div>
            <h3>Choose a new time</h3>
            <p>
              {alternatives.length === 0
                ? 'No conflict-free times available.'
                : `${alternatives.length} conflict-free ${alternatives.length === 1 ? 'time' : 'times'} available across the week.`}
            </p>
          </div>
        </div>
        {availabilityError && (
          <p className="reschedule-validation-error" role="alert">
            {availabilityError}
          </p>
        )}
        <div className="alternative-list" role="group" aria-label="Available alternative times">
          {alternatives.map((option, index) => (
            <button
              type="button"
              className={`alternative ${selected === option ? 'selected' : ''}`}
              aria-pressed={selected === option}
              aria-label={`${weekdayNames[option.day]}, ${formatTime(option.start)} to ${formatTime(getSessionEnd({ start: option.start, duration: session.duration }))}, ${online ? 'virtual class' : `${option.rooms.length} suitable rooms`}`}
              onClick={() => {
                setSelectedKey(`${option.day}-${option.start}`)
                setSelectedRoom(option.rooms[0]?.name ?? null)
                setAvailabilityError('')
              }}
              key={`${option.day}-${option.start}`}
            >
              <span className="alternative-choice" aria-hidden="true">
                <span />
              </span>
              <span className="alternative-date">
                <strong>{weekdayNames[option.day]}</strong>
                <small>{formatDate(option.day, weekStart)}</small>
              </span>
              <span className="alternative-time">
                <strong>
                  {formatTime(option.start)}–
                  {formatTime(getSessionEnd({ start: option.start, duration: session.duration }))}
                </strong>
              </span>
              <span className="alternative-room-info">
                <span className="alternative-detail">
                  {online
                    ? 'Virtual class'
                    : `${option.rooms.length} suitable ${option.rooms.length === 1 ? 'room' : 'rooms'}`}
                </span>
                {index === 0 && <span className="alternative-badge">Recommended</span>}
              </span>
            </button>
          ))}
          {alternatives.length === 0 && (
            <p className="no-alternatives">
              {online
                ? 'Try another day or switch to in person.'
                : 'Try another day or choose virtual class.'}
            </p>
          )}
        </div>
        {selected && !online && selected.rooms.length > 0 && (
          <label className="candidate-room">
            <span className="candidate-room-label">
              <b>Choose a room</b>
              <small>All listed rooms fit {session.enrollment} students.</small>
            </span>
            <span className="candidate-room-control">
              <span className="candidate-room-icon">
                <Icon name="location" size={17} />
              </span>
              <select
                aria-label="Room for the new class time"
                value={selectedRoomForSlot?.name ?? ''}
                onChange={(event) => {
                  setSelectedRoom(event.target.value)
                  setAvailabilityError('')
                }}
              >
                {selected.rooms.map((room) => (
                  <option key={room.name} value={room.name}>
                    {room.name} · {room.type}
                  </option>
                ))}
              </select>
              <span className="candidate-room-chevron">
                <Icon name="chevron" size={15} />
              </span>
            </span>
          </label>
        )}
        {selected && (
          <div className="selection-summary" role="status">
            <Icon name="check" size={17} />
            <span>
              {online
                ? 'No room will be reserved. Lecturer and class conflicts are clear.'
                : `${selectedRoomForSlot?.name ?? 'Selected room'} fits ${session.enrollment} students. No time conflicts found.`}
            </span>
          </div>
        )}
        <div className="modal-footer reschedule-footer">
          <p>Changes apply to this demo week only.</p>
          <div className="reschedule-actions">
            <button className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={confirmMove}
              disabled={!selected || (!online && !selectedRoomForSlot)}
            >
              Move class
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
