export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import DepartmentView, {
  type ClassItem,
  type DepartmentInfo,
  type ProfessorOption,
} from './department-view'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DepartmentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'fr' ? 'fr' : 'en'

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  if (!userId) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (!profile || profile.role === 'professor') {
    redirect('/dashboard')
  }

  if (profile.role === 'dept_head') {
    const { data: assignment } = await supabase
      .from('department_heads')
      .select('department_id')
      .eq('profile_id', userId)
      .eq('department_id', id)
      .maybeSingle()

    if (!assignment) {
      redirect('/dashboard')
    }
  }

  const canManage =
    profile.role === 'admin' || profile.role === 'dept_head'

  const { data: dept, error: deptError } = await supabase
    .from('departments')
    .select('id, code, name_en, name_fr, color_accent')
    .eq('id', id)
    .maybeSingle()

  if (!dept) {
    const deptErrMsg =
      deptError && typeof deptError === 'object' && 'message' in deptError
        ? String((deptError as { message: string }).message)
        : 'none'
    const profErrMsg =
      profileError && typeof profileError === 'object' && 'message' in profileError
        ? String((profileError as { message: string }).message)
        : 'none'

    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
        <p className="font-bold">Department lookup returned empty on live server</p>
        <p className="mt-2 font-mono text-xs">Requested ID: {id}</p>
        <p className="mt-1 font-mono text-xs">Role: {profile.role}</p>
        <p className="mt-1 font-mono text-xs">Profile Error: {profErrMsg}</p>
        <p className="mt-1 font-mono text-xs">Department Error: {deptErrMsg}</p>
      </div>
    )
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

  const { data: professorsData } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('is_active', true)
    .in('role', ['professor', 'dept_head', 'admin'])
    .order('full_name')

  const professors: ProfessorOption[] = (professorsData ?? []) as ProfessorOption[]

  const classes: ClassItem[] = []
  if (activeSemester) {
    const { data: modulesData } = await supabase
      .from('modules')
      .select(`
        id,
        year_level,
        code,
        semi_modules (
          id,
          module_id,
          subject,
          course_format,
          term_block,
          group_name,
          title_en,
          title_fr,
          professor_id,
          room_number,
          schedule_note,
          max_absences_allowed
        )
      `)
      .eq('department_id', dept.id)
      .eq('semester_id', activeSemester.id)
      .order('year_level', { ascending: true })

    if (modulesData) {
      for (const mod of modulesData) {
        const semiList = Array.isArray(mod.semi_modules)
          ? mod.semi_modules
          : []
        for (const sm of semiList) {
          classes.push({
            id: sm.id,
            module_id: sm.module_id,
            year_level: mod.year_level ?? 1,
            subject: sm.subject,
            course_format: sm.course_format ?? 'semi_module',
            term_block: sm.term_block ?? 'block_1_8w',
            group_name: sm.group_name,
            title_en: sm.title_en,
            title_fr: sm.title_fr,
            professor_id: sm.professor_id,
            room_number: sm.room_number,
            schedule_note: sm.schedule_note,
            max_absences_allowed: sm.max_absences_allowed ?? 3,
          })
        }
      }
    }
  }

  return (
    <DepartmentView
      department={dept as DepartmentInfo}
      semesterId={activeSemester?.id ?? ''}
      semesterLabel={
        activeSemester
          ? locale === 'fr'
            ? activeSemester.label_fr
            : activeSemester.label_en
          : ''
      }
      initialClasses={classes}
      professors={professors}
      canManage={canManage}
      locale={locale}
    />
  )
}