import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../../src/app/(frontend)/styles.css'

export const metadata: Metadata = {
  title: 'Academic City Timetabling Platform',
  description: 'Demo timetable interface using sample data. Changes are temporary.',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
