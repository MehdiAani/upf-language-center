import Link from 'next/link'
import { cookies } from 'next/headers'
import { getLocale } from 'next-intl/server'
import {
  BookOpen,
  ChevronRight,
  Clock,
  GraduationCap,
  Plus,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface DepartmentStat {
  department_id: string
  department_code: string
  name_en: string
  name_fr: string
  color_accent: string
  is_active: boolean
  semester_id: string
  semester_code: string
  module_count: number
  semi_module_count: number
  english_semi_module_count: number
  french_semi_module_count: number
  full_module_count: number
  english_full_module_count: number
  french_full_module_count: number
  semi_only_count: number
  english_semi_only_count: number
  french_semi_only_count: number
  professor_count: number
  active_student_count: number
}

interface DepartmentInfo {
  code: string
  name_en: string
  name_fr: string
  color_accent: string
}

interface ModuleInfo {
  code: string
  name_en: string
  name_fr: string
  semester_id: string
  department: DepartmentInfo | DepartmentInfo[] | null
}

interface SemiModuleRow {
  id: string
  subject: 'english' | 'french'
  course_format: 'full_module' | 'semi_module'
  term_block: 'full_16w' | 'block_1_8w' | 'block_2_8w'
  group_name: string
  title_en: string
  title_fr: string
  room_number: string | null
  schedule_note: string | null
  module: ModuleInfo | ModuleInfo[] | null
}

const COPY = {
  en: {
    title: 'Dashboard',
    adminSubtitle: 'Select a department to manage courses, professors, and students.',
    headSubtitle: 'Your assigned departments for this semester.',
    profSubtitle: 'Your assigned English and French courses for this semester.',
    manageDepts: 'Manage Departments',
    professors: 'Professors',
    students: 'Active Students',
    englishShort: 'EN',
    frenchShort: 'FR',
    fullModules: 'Full Modules (16w)',
    semiModules: 'Semi-Modules (8w)',
    viewDepartment: 'Open department',
    noDepartments: 'No assigned departments found for this semester.',
    noSemiModules: 'No courses are assigned to you for this semester yet.',
    englishTrack: 'English',
    frenchTrack: 'French',
    fullBadge: 'Full Module • 16w',
    semiBadge: 'Semi-Module • 8w',
    openClass: 'Open workspace',
  },
  fr: {
    title: 'Tableau de bord',
    adminSubtitle: 'Sélectionnez un département pour gérer les cours, professeurs et étudiants.',
    headSubtitle: 'Vos départements assignés pour ce semestre.',
    profSubtitle: 'Vos cours d’anglais et de français assignés pour ce semestre.',
    manageDepts: 'Gérer les départements',
    professors: 'Professeurs',
    students: 'Étudiants actifs',
    englishShort: 'EN',
    frenchShort: 'FR',
    fullModules: 'Modules complets (16s)',
    semiModules: 'Semi-modules (8s)',
    viewDepartment: 'Ouvrir le département',
    noDepartments: 'Aucun département assigné trouvé pour ce semestre.',
    noSemiModules: 'Aucun cours ne vous est encore assigné pour ce semestre.',
    englishTrack: 'Anglais',
    frenchTrack: 'Français',
    fullBadge: 'Module Complet • 16 sem.',
    semiBadge: 'Semi-Module • 8 sem.',
    openClass: 'Ouvrir la classe',
  },
} as const

function firstItem<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null
  return Array.isArray(val) ? (val[0] ?? null) : val
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'fr' ? 'fr' : 'en'
  const t = COPY[locale]

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  const { data: semesters } = await supabase
    .from('semesters')
    .select('id, label_en, label_fr, is_current')
    .order('academic_year', { ascending: false })
    .order('term_number', { ascending: true })

  const cookieStore = await cookies()
  const savedSemesterId = cookieStore.get('UPF_SEMESTER_ID')?.value
  const activeSemester =
    semesters?.find((s) => s.id === savedSemesterId) ??
    semesters?.find((s) => s.is_current) ??
    semesters?.[0]

  const isAdmin = profile?.role === 'admin'
  const isDeptHead = profile?.role === 'dept_head'
  const isProfessor = profile?.role === 'professor'

  let allowedDeptIds: string[] = []
  if (isDeptHead && userId) {
    const { data: headRows } = await supabase
      .from('department_heads')
      .select('department_id')
      .eq('profile_id', userId)

    allowedDeptIds = (headRows ?? []).map((r) => r.department_id)
  }

  let departments: DepartmentStat[] = []
  if ((isAdmin || isDeptHead) && activeSemester) {
    let query = supabase
      .from('department_semester_stats')
      .select('*')
      .eq('semester_id', activeSemester.id)
      .eq('is_active', true)
      .order('department_code')

    if (isDeptHead) {
      if (allowedDeptIds.length === 0) {
        departments = []
      } else {
        query = query.in('department_id', allowedDeptIds)
        const { data: deptStats } = await query
        departments = (deptStats as DepartmentStat[]) ?? []
      }
    } else {
      const { data: deptStats } = await query
      departments = (deptStats as DepartmentStat[]) ?? []
    }
  }

  let professorClasses: SemiModuleRow[] = []
  if (isProfessor && userId && activeSemester) {
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
        room_number,
        schedule_note,
        module:modules (
          code,
          name_en,
          name_fr,
          semester_id,
          department:departments (
            code,
            name_en,
            name_fr,
            color_accent
          )
        )
      `)
      .eq('professor_id', userId)

    professorClasses = ((smData as SemiModuleRow[]) ?? []).filter((row) => {
      const mod = firstItem(row.module)
      return mod?.semester_id === activeSemester.id
    })
  }

  const subtitle = isAdmin
    ? t.adminSubtitle
    : isDeptHead
      ? t.headSubtitle
      : t.profSubtitle

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        {isAdmin && (
          <Link
            href="/admin/departments"
            className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {t.manageDepts}
          </Link>
        )}
      </div>

      {(isAdmin || isDeptHead) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {departments.map((dept) => {
            const deptName = locale === 'fr' ? dept.name_fr : dept.name_en
            return (
              <Link
                key={dept.department_id}
                href={`/departments/${dept.department_id}`}
                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ backgroundColor: dept.color_accent || '#1d4ed8' }}
                />

                <div>
                  <div className="mt-1 flex items-start justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: dept.color_accent || '#1d4ed8' }}
                      />
                      {dept.department_code}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600 dark:text-slate-600 dark:group-hover:text-blue-400" />
                  </div>

                  <h2 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                    {deptName}
                  </h2>
                </div>

                <div className="mt-5">
                  <div className="space-y-2.5 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        {t.professors}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {dept.professor_count}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-slate-400" />
                        {t.students}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {dept.active_student_count}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                        {t.fullModules}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {dept.english_full_module_count ?? 0} {t.englishShort} /{' '}
                        {dept.french_full_module_count ?? 0} {t.frenchShort}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-purple-500" />
                        {t.semiModules}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {dept.english_semi_only_count ?? 0} {t.englishShort} /{' '}
                        {dept.french_semi_only_count ?? 0} {t.frenchShort}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {t.viewDepartment}
                  </div>
                </div>
              </Link>
            )
          })}

          {departments.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              {t.noDepartments}
            </div>
          )}
        </div>
      )}

      {isProfessor && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {professorClasses.map((sm) => {
            const mod = firstItem(sm.module)
            const dept = firstItem(mod?.department)
            const title = locale === 'fr' ? sm.title_fr : sm.title_en
            const deptName = dept
              ? locale === 'fr'
                ? dept.name_fr
                : dept.name_en
              : ''

            return (
              <Link
                key={sm.id}
                href={`/semi-modules/${sm.id}`}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                        sm.subject === 'english'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                      }`}
                    >
                      {sm.subject === 'english' ? t.englishTrack : t.frenchTrack}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Clock className="h-3 w-3" />
                      {sm.course_format === 'full_module'
                        ? t.fullBadge
                        : t.semiBadge}
                    </span>
                  </div>

                  <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {deptName}
                    {sm.room_number ? ` • ${sm.room_number}` : ''}
                  </p>
                  {sm.schedule_note && (
                    <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                      {sm.schedule_note}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    {sm.group_name}
                  </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {t.openClass}
                  </span>
                </div>
              </Link>
            )
          })}

          {professorClasses.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              {t.noSemiModules}
            </div>
          )}
        </div>
      )}
    </div>
  )
}