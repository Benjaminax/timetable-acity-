import { downloadElementPng } from './capture-element-png'

export async function exportTimetablePng(filename: string) {
  const timetable = Array.from(document.querySelectorAll<HTMLElement>('.reference-timetable')).find(
    (element) => {
      const bounds = element.getBoundingClientRect()
      return bounds.width > 0 && bounds.height > 0
    },
  )

  if (!timetable) throw new Error('The timetable grid is not available for export.')

  await downloadElementPng(timetable, filename.endsWith('.png') ? filename : `${filename}.png`)
}
