import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import StudentProgressionClient, {
  type StudentAbsenceHistory,
  type StudentCourseHistory,
  type StudentProfileMeta,
} from './student-progression-client'

interface PageProps {
  params: Promise<{ id: string }>
}

function firstItem<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null
  return Array.isArray(val) ? (val[0] ?? null) : val
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'fr' ? 'fr' : 'en'

  const { data: studentData } = await supabase
    .from('students')
    .select(`
      id,
      student_code,
      first_name,
      last_name,
      email,
      cohort_level,
      is_active,
      department:departments (
        id,
        code,
        name_en,
        name_fr,
        color_accent
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (!studentData) {
    notFound()
  }

  const homeDept = firstItem(studentData.department)

  const studentMeta: StudentProfileMeta = {
    id: studentData.id,
    student_code: studentData.student_code,
    first_name: studentData.first_name,
    last_name: studentData.last_name,
    email: studentData.email,
    cohort_level: studentData.cohort_level,
    is_active: studentData.is_active,
    department_code: homeDept?.code ?? '',
    department_name_en: homeDept?.name_en ?? '',
    department_name_fr: homeDept?.name_fr ?? '',
    department_color: homeDept?.color_accent ?? '#1d4ed8',
  }

  // Fetch all enrollments across all semesters
  const { data: enrollmentsData } = await supabase
    .from('student_enrollments')
    .select(`
      id,
      semi_module:semi_modules (
        id,
        subject,
        course_format,
        term_block,
        group_name,
        title_en,
        title_fr,
        room_number,
        schedule_note,
        max_absences_allowed,
        professor:profiles (
          full_name,
          email
        ),
        module:modules (
          year_level,
          semester:semesters (
            id,
            code,
            label_en,
            label_fr,
            academic_year,
            term_number
          ),
          department:departments (
            code,
            name_en,
            name_fr
          )
        )
      )
    `)
    .eq('student_id', id)

  // Fetch all grades across all semesters
  const { data: gradesData } = await supabase
    .from('student_grades')
    .select('semi_module_id, midterm, post_midterm, final_exam, notes, updated_at')
    .eq('student_id', id)

  // Fetch all absences across all semesters
  const { data: absencesData } = await supabase
    .from('student_absences')
    .select('id, semi_module_id, session_date, status, reason')
    .eq('student_id', id)
    .order('session_date', { ascending: false })

  const gradesMap = new Map(
    (gradesData ?? []).map((g) => [g.semi_module_id, g])
  )

  const courseHistory: StudentCourseHistory[] = []

  for (const enr of enrollmentsData ?? []) {
    const sm = firstItem(enr.semi_module)
    if (!sm) continue

    const mod = firstItem(sm.module)
    const sem = firstItem(mod?.semester)
    const dept = firstItem(mod?.department)
    const prof = firstItem(sm.professor)
    const grade = gradesMap.get(sm.id)

    const classAbsences = (absencesData ?? []).filter(
      (a) => a.semi_module_id === sm.id && a.status === 'absent'
    ).length

    courseHistory.push({
      semi_module_id: sm.id,
      subject: sm.subject,
      course_format: sm.course_format ?? 'semi_module',
      term_block: sm.term_block ?? 'block_1_8w',
      group_name: sm.group_name,
      title_en: sm.title_en,
      title_fr: sm.title_fr,
      room_number: sm.room_number,
      schedule_note: sm.schedule_note,
      max_absences_allowed: sm.max_absences_allowed ?? 3,
      professor_name: prof?.full_name || prof?.email || null,
      year_level: mod?.year_level ?? 1,
      department_code: dept?.code ?? '',
      semester_id: sem?.id ?? '',
      semester_code: sem?.code ?? '',
      semester_label_en: sem?.label_en ?? 'Unknown Semester',
      semester_label_fr: sem?.label_fr ?? 'Semestre inconnu',
      academic_year: sem?.academic_year ?? '',
      term_number: sem?.term_number ?? 1,
      midterm: grade?.midterm ?? null,
      post_midterm: grade?.post_midterm ?? null,
      final_exam: grade?.final_exam ?? null,
      notes: grade?.notes ?? null,
      unexcused_absences: classAbsences,
    })
  }

  // Sort chronologically (oldest to newest) for the progression chart
  courseHistory.sort((a, b) => {
    const yearCmp = a.academic_year.localeCompare(b.academic_year)
    if (yearCmp !== 0) return yearCmp
    return a.term_number - b.term_number
  })

  const absenceHistory: StudentAbsenceHistory[] = (absencesData ?? []).map(
    (a) => {
      const matchedCourse = courseHistory.find(
        (c) => c.semi_module_id === a.semi_module_id
      )
      return {
        id: a.id,
        session_date: a.session_date,
        status: a.status as 'absent' | 'late' | 'excused',
        reason: a.reason,
        course_title_en: matchedCourse?.title_en ?? '',
        course_title_fr: matchedCourse?.title_fr ?? '',
        semester_label_en: matchedCourse?.semester_label_en ?? '',
        semester_label_fr: matchedCourse?.semester_label_fr ?? '',
      }
    }
  )

  return (
    <StudentProgressionClient
      student={studentMeta}
      courses={courseHistory}
      absences={absenceHistory}
      locale={locale}
    />
  )
}