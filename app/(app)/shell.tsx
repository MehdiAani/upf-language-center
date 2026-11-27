'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  Building2,
  CalendarClock,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/app/theme-toggle'
import { UpfLogo } from '@/components/upf-logo'
import type { SemesterOption } from './layout'

interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'dept_head' | 'professor' | 'pending'
  preferred_locale: string
  is_active: boolean
}

interface DashboardShellProps {
  profile: Profile
  semesters: SemesterOption[]
  currentSemesterId: string
  children: React.ReactNode
}

const COPY = {
  en: {
    brand: 'UPF Language Center',
    dashboard: 'Dashboard',
    schedules: 'Professor Schedules',
    adminSection: 'Administration',
    manageDepartments: 'Departments & Semesters',
    manageUsers: 'Users & Roles',
    semester: 'Semester',
    noSemesters: 'No semesters',
    switchLang: 'Français',
    signOut: 'Sign out',
    roles: {
      admin: 'Admin',
      dept_head: 'Dept. Head',
      professor: 'Professor',
      pending: 'Pending',
    },
  },
  fr: {
    brand: 'Centre de Langues UPF',
    dashboard: 'Tableau de bord',
    schedules: 'Emplois du temps profs',
    adminSection: 'Administration',
    manageDepartments: 'Départements & Semestres',
    manageUsers: 'Utilisateurs & Rôles',
    semester: 'Semestre',
    noSemesters: 'Aucun semestre',
    switchLang: 'English',
    signOut: 'Déconnexion',
    roles: {
      admin: 'Administrateur',
      dept_head: 'Chef de dép.',
      professor: 'Professeur',
      pending: 'En attente',
    },
  },
} as const

export default function DashboardShell({
  profile,
  semesters,
  currentSemesterId,
  children,
}: DashboardShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const rawLocale = useLocale()
  const locale = rawLocale === 'fr' ? 'fr' : 'en'
  const t = COPY[locale]

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedSemester, setSelectedSemester] = useState(currentSemesterId)

  const isAdmin = profile.role === 'admin'

  async function handleToggleLocale() {
    const nextLocale = locale === 'en' ? 'fr' : 'en'
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`

    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ preferred_locale: nextLocale })
      .eq('id', profile.id)

    router.refresh()
  }

  function handleSemesterChange(semesterId: string) {
    setSelectedSemester(semesterId)
    document.cookie = `UPF_SEMESTER_ID=${semesterId}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.assign('/login')
  }

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
    }`

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <Link
            href="/dashboard"
            className="flex items-center overflow-hidden py-1"
            aria-label={t.brand}
          >
            <UpfLogo className="h-8 w-auto max-w-[195px]" />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={navLinkClass(
              pathname === '/dashboard' || pathname.startsWith('/departments')
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            {t.dashboard}
          </Link>

          <Link
            href="/schedules"
            onClick={() => setSidebarOpen(false)}
            className={navLinkClass(pathname.startsWith('/schedules'))}
          >
            <CalendarClock className="h-4 w-4" />
            {t.schedules}
          </Link>

          {isAdmin && (
            <>
              <div className="px-3 pt-5 pb-1.5 text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                {t.adminSection}
              </div>
              <Link
                href="/admin/departments"
                onClick={() => setSidebarOpen(false)}
                className={navLinkClass(pathname === '/admin/departments')}
              >
                <Building2 className="h-4 w-4" />
                {t.manageDepartments}
              </Link>
              <Link
                href="/admin/users"
                onClick={() => setSidebarOpen(false)}
                className={navLinkClass(pathname === '/admin/users')}
              >
                <Users className="h-4 w-4" />
                {t.manageUsers}
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <LogOut className="h-4 w-4" />
            {t.signOut}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 transition-colors dark:border-slate-800 dark:bg-slate-900 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <label
                htmlFor="semester-select"
                className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 sm:inline"
              >
                {t.semester}
              </label>
              <select
                id="semester-select"
                value={selectedSemester}
                onChange={(e) => handleSemesterChange(e.target.value)}
                disabled={semesters.length === 0}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {semesters.length === 0 ? (
                  <option value="">{t.noSemesters}</option>
                ) : (
                  semesters.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      {locale === 'fr' ? sem.label_fr : sem.label_en}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleLocale}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Globe className="h-3.5 w-3.5" />
              {t.switchLang}
            </button>

            <ThemeToggle />

            <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-800 sm:flex">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {profile.full_name || profile.email}
                </p>
                <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                  {t.roles[profile.role]}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}