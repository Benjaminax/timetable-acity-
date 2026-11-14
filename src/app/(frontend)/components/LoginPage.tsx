'use client'

import { useState } from 'react'
import AppIcon, { type AppIconName } from './AppIcon'
import type { Lecturer } from './scheduler-types'

export type AppRole = 'admin' | 'teacher' | 'student'

const roleOptions: Array<{ value: AppRole; label: string; icon: AppIconName }> = [
  { value: 'student', label: 'Student', icon: 'students' },
  { value: 'teacher', label: 'Teacher', icon: 'lecturer' },
  { value: 'admin', label: 'Admin', icon: 'building' },
]

export const ACCOUNTS: Record<
  AppRole,
  Array<{ email: string; name: string; id: string; roleLabel: string }>
> = {
  admin: [
    {
      email: 'admin@acity.edu.gh',
      name: 'Nana Adomako',
      id: 'admin-1',
      roleLabel: 'Timetable Administrator',
    },
  ],
  teacher: [],
  student: [
    {
      email: 'stu0182@acity.edu.gh',
      name: 'Ama Serwaa',
      id: 'ACU-24-0182',
      roleLabel: 'BSc Computer Science · Level 300',
    },
    {
      email: 'stu0211@acity.edu.gh',
      name: 'Kojo Antwi',
      id: 'ACU-24-0211',
      roleLabel: 'BSc Computer Science · Level 300',
    },
    {
      email: 'stu0305@acity.edu.gh',
      name: 'Nana Yeboah',
      id: 'ACU-24-0305',
      roleLabel: 'BSc Computer Engineering · Level 300',
    },
    {
      email: 'stu0441@acity.edu.gh',
      name: 'Efua Sarpong',
      id: 'ACU-24-0441',
      roleLabel: 'BSc Electrical Engineering · Level 200',
    },
  ],
}

export default function LoginPage({
  lecturers,
  onLogin,
}: {
  lecturers: Lecturer[]
  onLogin: (role: AppRole, id: string) => void
}) {
  const [role, setRole] = useState<AppRole>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const accounts =
    role === 'teacher'
      ? lecturers.map((lecturer) => ({
          email: lecturer.email,
          name: lecturer.name,
          id: lecturer.id,
          roleLabel: `Lecturer, ${lecturer.department}`,
        }))
      : ACCOUNTS[role]

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      setError('Please provide your Academic City email.')
      return
    }

    if (!cleanEmail.endsWith('@acity.edu.gh')) {
      setError('Email must end with @acity.edu.gh.')
      return
    }

    if (!password) {
      setError('Please enter your password.')
      return
    }

    const matched = accounts.find((acc) => acc.email.toLowerCase() === cleanEmail)
    if (matched) {
      onLogin(role, matched.id)
    } else {
      setError('This account is not in the demo roster. Contact the school administrator.')
    }
  }

  const fillCredential = (accountEmail: string) => {
    setEmail(accountEmail)
    setPassword('••••••••')
    setError('')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7f7f6] px-4 py-8">
      <div className="w-full max-w-md">
        <header className="mb-5 flex items-center justify-center gap-3 sm:justify-start">
          <img
            className="h-12 w-10 shrink-0 object-contain"
            src="/academic-city-crest.png"
            alt="Academic City University crest"
          />
          <div>
            <h1 className="text-[19px] font-semibold tracking-[-0.03em] text-[#202124]">
              Academic City
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#a22d2b]">
              Timetabling & Examination Portal
            </p>
          </div>
        </header>

        <section className="rounded-[11px] border border-[#e3e3e0] bg-white p-5 shadow-sm sm:p-6">
          <p className="mb-5 flex items-start gap-2.5 rounded-lg border border-[#e8e8e5] bg-[#f7f7f5] px-3 py-2.5 text-xs leading-relaxed text-[#666663]">
            <span className="mt-0.5 shrink-0 text-[#a22d2b]">
              <AppIcon name="alert" size={15} />
            </span>
            <span>
              Demo preview only. Google Workspace sign-in, Google profile photos, and the school
              database are not connected.
            </span>
          </p>

          <div className="mb-5 grid grid-cols-3 gap-1 rounded-lg bg-[#f1f1ef] p-1">
            {roleOptions.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setRole(value)
                  setEmail('')
                  setPassword('')
                  setError('')
                }}
                aria-pressed={role === value}
                className={`inline-flex items-center justify-center gap-2 rounded-md px-2 py-2.5 text-xs font-medium transition ${
                  role === value
                    ? 'bg-white text-[#242424] shadow-sm'
                    : 'text-[#666663] hover:text-[#202124]'
                }`}
              >
                <span className={role === value ? 'text-[#cc3634]' : ''}>
                  <AppIcon name={icon} size={15} />
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#686863]">
                Institution Email (@acity.edu.gh)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  role === 'student'
                    ? 'stu0211@acity.edu.gh'
                    : role === 'teacher'
                      ? 'emp014@acity.edu.gh'
                      : 'admin@acity.edu.gh'
                }
                className="min-h-10 w-full rounded-[7px] border border-[#e1e1de] bg-white px-3 text-[13px] text-[#444] outline-none transition focus:border-[#b94a48] focus:ring-2 focus:ring-[#cc3634]/15"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#686863]">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="min-h-10 w-full rounded-[7px] border border-[#e1e1de] bg-white px-3 text-[13px] text-[#444] outline-none transition focus:border-[#b94a48] focus:ring-2 focus:ring-[#cc3634]/15"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800 font-medium">
                {error}
              </div>
            )}

            <button type="submit" className="button primary w-full">
              Sign In to {role.charAt(0).toUpperCase() + role.slice(1)} Portal
            </button>
          </form>

          <div className="mt-5 border-t border-[#eee] pt-4">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#858580]">
              Available demo credentials
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => fillCredential(acc.email)}
                  className="flex w-full items-center justify-between rounded-lg border border-[#e8e8e5] bg-white px-3 py-2.5 text-left transition hover:border-[#d8b4b3] hover:bg-[#faf7f7]"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#252625]">{acc.name}</p>
                    <p className="mt-0.5 text-[11px] text-[#7d7d79]">{acc.email}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#7f302f]">
                    Use
                    <AppIcon name="arrow" size={12} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <p className="mt-4 text-center text-[11px] text-[#858580]">
          Academic City University. All credentials require @acity.edu.gh domain.
        </p>
      </div>
    </main>
  )
}
