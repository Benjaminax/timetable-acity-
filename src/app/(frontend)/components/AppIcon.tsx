const iconNames = {
  grid: 'grid-view',
  calendar: 'calendar-03',
  sparkles: 'sparkles',
  building: 'building-01',
  book: 'book-open-01',
  students: 'user-group',
  lecturer: 'teacher',
  chart: 'chart-line-data-01',
  file: 'file-01',
  settings: 'settings-01',
  search: 'search-01',
  bell: 'notification-01',
  chevron: 'arrow-right-01',
  plus: 'add-01',
  arrow: 'arrow-right-01',
  clock: 'clock-01',
  alert: 'alert-01',
  check: 'tick-01',
  activity: 'activity-01',
  more: 'more-horizontal',
  menu: 'menu-01',
  help: 'help-circle',
  logout: 'logout-01',
  x: 'cancel-01',
  refresh: 'refresh-01',
  location: 'location-01',
  sliders: 'sliders-horizontal',
  download: 'download-01',
  home: 'home-01',
} as const

export type AppIconName = keyof typeof iconNames

export function isAppIconName(name: string): name is AppIconName {
  return Object.prototype.hasOwnProperty.call(iconNames, name)
}

export default function AppIcon({ name, size = 18 }: { name: AppIconName; size?: number }) {
  return (
    <i
      className={`hgi hgi-stroke hgi-${iconNames[name]} app-icon`}
      style={{ fontSize: size }}
      aria-hidden="true"
    />
  )
}
