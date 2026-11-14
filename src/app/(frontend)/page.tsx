'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const role = localStorage.getItem('acity_user_role')
    if (role === 'admin') {
      router.replace('/administrator')
    } else if (role === 'teacher') {
      router.replace('/lecturer')
    } else if (role === 'student') {
      router.replace('/student')
    } else {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f6]">
      <div className="text-xs text-[#747471] font-medium animate-pulse">Redirecting to Academic City portal...</div>
    </div>
  )
}
