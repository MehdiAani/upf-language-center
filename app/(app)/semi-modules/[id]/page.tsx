export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import ClassWorkspaceClient, {
  type AbsenceRecord,
  type ClassMeta,
  type GradeRecord,
  type StudentItem,
} from './class-workspace-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SemiModulePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'fr' ? 'fr' : 'en'

  const { data: userData } = await supabase.auth.getUser()

  const { data: smData } = await supabase
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
      max_absences_allowed,
      weight_cc1,
      weight_cc2,
      weight_ex,
      module:modules (
        year_level,
        code,
        semester:semesters (
          academic_year,
          term_number,
          label_en,
          label_fr
        ),
        department:departments (
          id,
          code,
          name_en,
          name_fr
        )
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (!smData) {
    notFound()
  }

  const mod = Array.isArray(smData.module) ? smData.module[0] : smData.module
  const dept = mod
    ? Array.isArray(mod.department)
      ? mod.department[0]
      : mod.department
    : null
  const sem = mod
    ? Array.isArray(mod.semester)
      ? mod.semester[0]
      : mod.semester
    : null

  let professorName = ''
  if (smData.professor_id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', smData.professor_id)
      .maybeSingle()
    professorName = prof?.full_name || prof?.email || ''
  }

  const formatSuffix =
    smData.course_format === 'full_module'
      ? locale === 'fr'
        ? 'Module Complet (16 sem.)'
        : 'Full Module (16w)'
      : smData.term_block === 'block_2_8w'
        ? locale === 'fr'
          ? 'Semi-Module (Sem. 9 to 16)'
          : 'Semi-Module (Weeks 9 to 16)'
        : locale === 'fr'
          ? 'Semi-Module (Sem. 1 to 8)'
          : 'Semi-Module (Weeks 1 to 8)'

  const classMeta: ClassMeta = {
    id: smData.id,
    subject: smData.subject,
    group_name: smData.group_name,
    title_en: smData.title_en,
    title_fr: smData.title_fr,
    room_number: smData.room_number
      ? `${smData.room_number} | ${formatSuffix}`
      : formatSuffix,
    schedule_note: smData.schedule_note,
    max_absences_allowed: smData.max_absences_allowed ?? 3,
    year_level: mod?.year_level ?? 1,
    department_id: dept?.id ?? '',
    department_code: dept?.code ?? '',
    department_name_en: dept?.name_en ?? '',
    department_name_fr: dept?.name_fr ?? '',
    academic_year: sem?.academic_year ?? '2026-2027',
    semester_number: sem?.term_number ?? 1,
    semester_label: sem
      ? locale === 'fr'
        ? sem.label_fr
        : sem.label_en
      : '',
    professor_name: professorName,
    weight_cc1: Number(smData.weight_cc1 ?? 25),
    weight_cc2: Number(smData.weight_cc2 ?? 25),
    weight_ex: Number(smData.weight_ex ?? 50),
  }

  const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select(`
      student:students (
        id,
        student_code,
        cne,
        first_name,
        last_name,
        email,
        home_department_id,
        cohort_level,
        is_active
      )
    `)
    .eq('semi_module_id', id)

  const students: StudentItem[] = []
  for (const row of enrollments ?? []) {
    const st = Array.isArray(row.student) ? row.student[0] : row.student
    if (st) {
      students.push(st as StudentItem)
    }
  }
  students.sort((a, b) => a.last_name.localeCompare(b.last_name))

  const { data: absencesData } = await supabase
    .from('student_absences')
    .select('id, student_id, session_date, status, reason')
    .eq('semi_module_id', id)
    .order('session_date', { ascending: false })

  const { data: gradesData } = await supabase
    .from('student_grades')
    .select('id, student_id, cc1, cc2, ex, midterm, post_midterm, final_exam, notes')
    .eq('semi_module_id', id)

  return (
    <ClassWorkspaceClient
      classMeta={classMeta}
      currentUserId={userData?.user?.id ?? null}
      initialStudents={students}
      initialAbsences={(absencesData ?? []) as AbsenceRecord[]}
      initialGrades={(gradesData ?? []) as GradeRecord[]}
      locale={locale}
    />
  )
}