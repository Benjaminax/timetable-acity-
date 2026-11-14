'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SchedulerApp from '../components/SchedulerApp'

export default function AdminPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    setMounted(true)
    const storedRole = localStorage.getItem('acity_user_role')
    if (storedRole !== 'admin') {
      router.push('/login')
    } else {
      setAuthorized(true)
    }
  }, [router])

  if (!mounted || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f6]">
        <div className="text-xs text-[#747471] font-medium animate-pulse">Verifying administrator credentials...</div>
      </div>
    )
  }

  return (
    <SchedulerApp
      forcedRole="admin"
      onLogout={() => {
        localStorage.removeItem('acity_user_role')
        localStorage.removeItem('acity_user_id')
        router.push('/login')
      }}
    />
  )
}

