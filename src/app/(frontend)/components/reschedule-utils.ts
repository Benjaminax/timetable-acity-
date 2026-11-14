import { addCalendarDays, getCurrentWeekStart } from './calendar-utils'
import type { TimetableEvent } from './RoleViews'
import {
  findSessionConflicts,
  getSessionKey,
  getSessionElapsedDuration,
  hasLecturerUnavailability,
  TIMETABLE_PERIOD_STARTS,
  type LecturerUnavailabilityByName,
  type Room,
  type Session,
} from './scheduler-types'

export type RescheduleAlternative = {
  day: number
  start: number
  rooms: Room[]
}

const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const timeSlots = TIMETABLE_PERIOD_STARTS

export function findAlternatives(
  session: Session,
  schedule: Session[],
  availableRooms: Room[],
  capacityBuffer = 0,
  lecturerUnavailability: LecturerUnavailabilityByName = {},
  online = false,
  events: TimetableEvent[] = [],
  excludeCurrentSlot = true,
) {
  return weekdayNames
    .flatMap((_, day) => {
      return timeSlots.flatMap((start) => {
        if (excludeCurrentSlot && day === session.day && start === session.start) return []
        const slotEnd = start + getSessionElapsedDuration(session.duration)
        const timetableEnd = timeSlots[timeSlots.length - 1] + 60
        if (slotEnd > timetableEnd) return []
        const proposedSession = {
          ...session,
          day,
          start,
          room: 'Online',
          isOnline: true,
        }
        const conflicts =
          findSessionConflicts(proposedSession, schedule, getSessionKey(session)).length > 0
        if (
          conflicts ||
          hasLecturerUnavailability(lecturerUnavailability[session.lecturer], day, start, slotEnd)
        )
          return []
        if (online) return [{ day, start, rooms: [] as Room[] }]
        const matchingRooms = availableRooms
          .filter(
            (room) =>
              room.status !== 'Restricted' && room.capacity >= session.enrollment + capacityBuffer,
          )
          .filter(
            (room) =>
              findSessionConflicts(
                { ...session, day, start, room: room.name, isOnline: false },
                schedule,
                getSessionKey(session),
              ).length === 0,
          )
          .filter((room) => {
            const date = addCalendarDays(session.weekStart ?? getCurrentWeekStart(), day)
            return events.every(
              (event) =>
                event.date !== date ||
                event.room !== room.name ||
                start >= event.start + event.duration ||
                slotEnd <= event.start,
            )
          })
          .sort((left, right) => left.capacity - right.capacity)
        return matchingRooms.length ? [{ day, start, rooms: matchingRooms }] : []
      })
    })
    .sort((left, right) => left.day - right.day || left.start - right.start)
}
