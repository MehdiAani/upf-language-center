export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from './shell'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export interface SemesterOption {
  id: string
  code: string
  label_en: string
  label_fr: string
  is_current: boolean
}

export default async function AppLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data?.user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, preferred_locale, is_active')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    const detailText =
      [
        profileError.code,
        profileError.message,
        profileError.details,
        profileError.hint,
      ]
        .filter(Boolean)
        .join(' | ') || 'Unknown database error'

    redirect(`/pending?reason=db_error&detail=${encodeURIComponent(detailText)}`)
  }

  if (!profile) {
    redirect('/pending?reason=no_profile')
  }

  if (!profile.is_active) {
    redirect('/pending?reason=inactive')
  }

  if (profile.role === 'pending') {
    redirect('/pending?reason=role_pending')
  }

  const { data: semestersData } = await supabase
    .from('semesters')
    .select('id, code, label_en, label_fr, is_current')
    .order('academic_year', { ascending: false })
    .order('term_number', { ascending: true })

  const semesters: SemesterOption[] = semestersData ?? []

  const cookieStore = await cookies()
  const savedSemesterId = cookieStore.get('UPF_SEMESTER_ID')?.value
  const matchedSemester =
    semesters.find((s) => s.id === savedSemesterId) ??
    semesters.find((s) => s.is_current) ??
    semesters[0]

  return (
    <DashboardShell
      profile={profile}
      semesters={semesters}
      currentSemesterId={matchedSemester?.id ?? ''}
    >
      {children}
    </DashboardShell>
  )
}