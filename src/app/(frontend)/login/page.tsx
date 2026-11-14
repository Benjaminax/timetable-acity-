'use client'

import { useRouter } from 'next/navigation'
import LoginPage, { type AppRole } from '../components/LoginPage'
import { initialLecturers } from '../components/sample-lecturers'

export default function LoginRoutePage() {
  const router = useRouter()

  const handleLogin = (role: AppRole, id: string) => {
    localStorage.setItem('acity_user_role', role)
    localStorage.setItem('acity_user_id', id)

    if (role === 'admin') {
      router.push('/administrator')
    } else if (role === 'teacher') {
      router.push('/lecturer')
    } else {
      router.push('/student')
    }
  }

  return <LoginPage lecturers={initialLecturers} onLogin={handleLogin} />
}
