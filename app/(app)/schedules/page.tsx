export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import SchedulesClient, {
  type DepartmentFilterOption,
  type ProfessorFilterOption,
  type ScheduleSlotItem,
} from './schedules-client'

function firstItem<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null
  return Array.isArray(val) ? (val[0] ?? null) : val
}

export default async function SchedulesPage() {
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'fr' ? 'fr' : 'en'

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', userId)
    .maybeSingle()

  const role = profile?.role ?? 'professor'

  let allowedDeptIds: string[] = []
  if (role === 'dept_head' && userId) {
    const { data: headRows } = await supabase
      .from('department_heads')
      .select('department_id')
      .eq('profile_id', userId)

    allowedDeptIds = (headRows ?? []).map((r) => r.department_id)
  }

  const { data: semesters } = await supabase
    .from('semesters')
    .select('id, code, label_en, label_fr, is_current')
    .order('academic_year', { ascending: false })
    .order('term_number', { ascending: true })

  const cookieStore = await cookies()
  const savedSemesterId = cookieStore.get('UPF_SEMESTER_ID')?.value
  const activeSemester =
    semesters?.find((s) => s.id === savedSemesterId) ??
    semesters?.find((s) => s.is_current) ??
    semesters?.[0]

  let departmentsData: DepartmentFilterOption[] = []
  if (role === 'admin') {
    const { data } = await supabase
      .from('departments')
      .select('id, code, name_en, name_fr')
      .eq('is_active', true)
      .order('code')
    departmentsData = (data ?? []) as DepartmentFilterOption[]
  } else if (role === 'dept_head' && allowedDeptIds.length > 0) {
    const { data } = await supabase
      .from('departments')
      .select('id, code, name_en, name_fr')
      .eq('is_active', true)
      .in('id', allowedDeptIds)
      .order('code')
    departmentsData = (data ?? []) as DepartmentFilterOption[]
  }

  let professorsData: ProfessorFilterOption[] = []
  if (role === 'admin' || role === 'dept_head') {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('is_active', true)
      .in('role', ['professor', 'dept_head', 'admin'])
      .order('full_name')
    professorsData = (data ?? []) as ProfessorFilterOption[]
  } else if (userId) {
    professorsData = [
      {
        id: userId,
        full_name: profile?.full_name || profile?.email || 'Professor',
        email: profile?.email || '',
      },
    ]
  }

  const slots: ScheduleSlotItem[] = []

  if (activeSemester) {
    let smQuery = supabase
      .from('semi_modules')
      .select(`
        id,
        subject,
        course_format,
        term_block,
        group_name,
        title_en,
        title_fr,
        professor_id,
        room_number,
        schedule_note,
        professor:profiles (
          id,
          full_name,
          email
        ),
        module:modules!inner (
          year_level,
          semester_id,
          department_id,
          department:departments (
            id,
            code,
            name_en,
            name_fr,
            color_accent
          )
        )
      `)
      .eq('module.semester_id', activeSemester.id)

    if (role === 'professor' && userId) {
      smQuery = smQuery.eq('professor_id', userId)
    } else if (role === 'dept_head') {
      if (allowedDeptIds.length === 0) {
        smQuery = null as never
      } else {
        smQuery = smQuery.in('module.department_id', allowedDeptIds)
      }
    }

    const { data: semiRows } = smQuery ? await smQuery : { data: [] }

    for (const row of semiRows ?? []) {
      const mod = firstItem(row.module)
      const dept = firstItem(mod?.department)
      const prof = firstItem(row.professor)

      if (
        role === 'dept_head' &&
        dept?.id &&
        !allowedDeptIds.includes(dept.id)
      ) {
        continue
      }

      slots.push({
        id: row.id,
        subject: row.subject,
        course_format: row.course_format ?? 'semi_module',
        term_block: row.term_block ?? 'block_1_8w',
        group_name: row.group_name,
        title_en: row.title_en,
        title_fr: row.title_fr,
        room_number: row.room_number,
        schedule_note: row.schedule_note,
        year_level: mod?.year_level ?? 1,
        department_id: dept?.id ?? '',
        department_code: dept?.code ?? '',
        department_name_en: dept?.name_en ?? '',
        department_name_fr: dept?.name_fr ?? '',
        department_color: dept?.color_accent ?? '#1d4ed8',
        professor_id: row.professor_id ?? prof?.id ?? null,
        professor_name: prof?.full_name || prof?.email || null,
      })
    }
  }

  return (
    <SchedulesClient
      semesterLabel={
        activeSemester
          ? locale === 'fr'
            ? activeSemester.label_fr
            : activeSemester.label_en
          : ''
      }
      slots={slots}
      departments={departmentsData}
      professors={professorsData}
      locale={locale}
    />
  )
}