export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { cookies } from 'next/headers'
import { getLocale } from 'next-intl/server'
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarCheck,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface DepartmentRow {
  id: string
  code: string
  name_en: string
  name_fr: string
  color_accent: string | null
  is_active: boolean
}

const COPY = {
  en: {
    title: 'UPF Language Center Overview',
    subtitle:
      'Active semester summary across departments, full modules (16w), and semi-modules (8w).',
    kpiStudents: 'Enrolled Students',
    kpiCourses: 'Total Language Courses',
    kpiAssigned: 'Assigned Classes',
    kpiDepartments: 'Active Departments',
    breakdownCourses: (fullCount: number, semiCount: number) =>
      `${fullCount} Full (16w) | ${semiCount} Semi (8w)`,
    departmentsHeading: 'Departments & Cohorts',
    openDepartment: 'Open Department',
    noDepartments:
      'No active departments found for this semester. Configure departments in Administration.',
  },
  fr: {
    title: 'Vue d ensemble - Centre de Langues UPF',
    subtitle:
      'Synthese du semestre actif sur les departements, modules complets (16 sem.) et semi-modules (8 sem.).',
    kpiStudents: 'Etudiants inscrits',
    kpiCourses: 'Total des cours de langues',
    kpiAssigned: 'Classes affectees',
    kpiDepartments: 'Departements actifs',
    breakdownCourses: (fullCount: number, semiCount: number) =>
      `${fullCount} Complets (16 sem.) | ${semiCount} Semi (8 sem.)`,
    departmentsHeading: 'Departements & Filieres',
    openDepartment: 'Ouvrir le departement',
    noDepartments:
      'Aucun departement actif pour ce semestre. Configurez-les dans Administration.',
  },
} as const

export default async function DashboardPage() {
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'fr' ? 'fr' : 'en'
  const t = COPY[locale]

  const cookieStore = await cookies()
  let activeSemesterId = cookieStore.get('UPF_SEMESTER_ID')?.value || ''

  if (!activeSemesterId) {
    const { data: activeSem } = await supabase
      .from('semesters')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()

    if (activeSem?.id) {
      activeSemesterId = activeSem.id
    } else {
      const { data: firstSem } = await supabase
        .from('semesters')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      activeSemesterId = firstSem?.id ?? ''
    }
  }

  const { data: deptRows } = await supabase
    .from('departments')
    .select('id, code, name_en, name_fr, color_accent, is_active')
    .eq('is_active', true)
    .order('name_en', { ascending: true })

  const departments = (deptRows ?? []) as DepartmentRow[]

  let semiModulesQuery = supabase
    .from('semi_modules')
    .select(`
      id,
      course_format,
      professor_id,
      module:modules!inner (
        id,
        semester_id,
        department_id
      )
    `)

  if (activeSemesterId) {
    semiModulesQuery = semiModulesQuery.eq('module.semester_id', activeSemesterId)
  }

  const { data: smRows } = await semiModulesQuery
  const semiModulesList = smRows ?? []

  const totalCourses = semiModulesList.length
  const fullModulesCount = semiModulesList.filter(
    (sm) => sm.course_format === 'full_module'
  ).length
  const semiModulesCount = totalCourses - fullModulesCount
  const assignedClassesCount = semiModulesList.filter(
    (sm) => Boolean(sm.professor_id)
  ).length

  const smIds = semiModulesList.map((sm) => sm.id)
  let uniqueStudentsCount = 0

  if (smIds.length > 0) {
    const { data: enrollmentRows } = await supabase
      .from('student_enrollments')
      .select('student_id')
      .in('semi_module_id', smIds)

    const distinctIds = new Set(
      (enrollmentRows ?? []).map((r) => r.student_id).filter(Boolean)
    )
    uniqueStudentsCount = distinctIds.size
  }

  const kpis = [
    {
      label: t.kpiStudents,
      value: String(uniqueStudentsCount),
      subtext: locale === 'fr' ? 'Inscrits sur le semestre' : 'Across active semester classes',
      icon: Users,
      accentClass: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: t.kpiCourses,
      value: String(totalCourses),
      subtext: t.breakdownCourses(fullModulesCount, semiModulesCount),
      icon: BookOpen,
      accentClass: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: t.kpiAssigned,
      value: `${assignedClassesCount} / ${totalCourses}`,
      subtext: locale === 'fr' ? 'Avec professeur assigne' : 'With assigned faculty',
      icon: CalendarCheck,
      accentClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: t.kpiDepartments,
      value: String(departments.length),
      subtext: locale === 'fr' ? 'Filieres actives' : 'Active academic tracks',
      icon: Building2,
      accentClass: 'text-slate-700 dark:text-slate-200',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t.subtitle}
        </p>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const IconComponent = kpi.icon
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  {kpi.label}
                </span>
                <IconComponent className={`h-4 w-4 ${kpi.accentClass}`} />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white">
                {kpi.value}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {kpi.subtext}
              </p>
            </div>
          )
        })}
      </div>

      {/* Departments Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {t.departmentsHeading}
        </h2>

        {departments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {t.noDepartments}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {departments.map((dept) => {
              const displayName = locale === 'fr' ? dept.name_fr : dept.name_en
              const accent = dept.color_accent || '#ef8122'
              return (
                <Link
                  key={dept.id}
                  href={`/departments/${dept.id}`}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="inline-block rounded-md px-2.5 py-1 font-mono text-xs font-bold text-white"
                        style={{ backgroundColor: accent }}
                      >
                        {dept.code}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-900 dark:group-hover:text-white" />
                    </div>
                    <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                      {displayName}
                    </h3>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    {t.openDepartment}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}