export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import DepartmentsClient, {
  type DepartmentRow,
  type SemesterRow,
} from './departments-client'

export default async function AdminDepartmentsPage() {
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'fr' ? 'fr' : 'en'

  const { data: userData } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData?.user?.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: departments } = await supabase
    .from('departments')
    .select(
      'id, code, name_en, name_fr, description_en, description_fr, color_accent, is_active'
    )
    .order('code')

  const { data: semesters } = await supabase
    .from('semesters')
    .select('id, code, label_en, label_fr, academic_year, term_number, is_current')
    .order('academic_year', { ascending: false })
    .order('term_number', { ascending: true })

  return (
    <DepartmentsClient
      initialDepartments={(departments ?? []) as DepartmentRow[]}
      initialSemesters={(semesters ?? []) as SemesterRow[]}
      locale={locale}
    />
  )
}