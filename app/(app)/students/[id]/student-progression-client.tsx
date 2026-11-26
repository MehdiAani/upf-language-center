'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Clock,
  DoorOpen,
  GraduationCap,
  TrendingUp,
  UserCheck,
} from 'lucide-react'

export interface StudentProfileMeta {
  id: string
  student_code: string
  first_name: string
  last_name: string
  email: string | null
  cohort_level: string | null
  is_active: boolean
  department_code: string
  department_name_en: string
  department_name_fr: string
  department_color: string
}

export interface StudentCourseHistory {
  semi_module_id: string
  subject: 'english' | 'french'
  course_format: 'full_module' | 'semi_module'
  term_block: 'full_16w' | 'block_1_8w' | 'block_2_8w'
  group_name: string
  title_en: string
  title_fr: string
  room_number: string | null
  schedule_note: string | null
  max_absences_allowed: number
  professor_name: string | null
  year_level: number
  department_code: string
  semester_id: string
  semester_code: string
  semester_label_en: string
  semester_label_fr: string
  academic_year: string
  term_number: number
  midterm: number | null
  post_midterm: number | null
  final_exam: number | null
  notes: string | null
  unexcused_absences: number
}

export interface StudentAbsenceHistory {
  id: string
  session_date: string
  status: 'absent' | 'late' | 'excused'
  reason: string | null
  course_title_en: string
  course_title_fr: string
  semester_label_en: string
  semester_label_fr: string
}

interface StudentProgressionClientProps {
  student: StudentProfileMeta
  courses: StudentCourseHistory[]
  absences: StudentAbsenceHistory[]
  locale: 'en' | 'fr'
}

const COPY = {
  en: {
    back: 'Back to Previous Page',
    activeBadge: 'Active Student',
    inactiveBadge: 'Inactive',
    yearLabel: (y: string | null) => (y ? `Year ${y}` : 'Year N/A'),
    kpiOverallAvg: 'Overall Average',
    kpiEnglishAvg: 'English Average',
    kpiFrenchAvg: 'French Average',
    kpiTotalAbsences: 'Unexcused Absences',
    chartTitle: 'Academic Progression Across Evaluations & Semesters',
    chartSubtitle:
      'Tracks Midterm, Post-Midterm, and Final Exam progression (/20) in English and French.',
    noChartData:
      'No grades recorded yet. Once evaluation scores are entered, the progression chart will appear here automatically.',
    englishLegend: 'English',
    frenchLegend: 'French',
    coursesSectionTitle: 'Enrolled Courses, Schedule & Grade History',
    noCourses: 'This student is not enrolled in any language courses yet.',
    unassignedProf: 'Unassigned',
    roomTbd: 'Room TBD',
    scheduleTbd: 'Schedule TBD',
    midterm: 'Midterm',
    postMidterm: 'Post-Midterm',
    finalExam: 'Final Exam',
    average: 'Average',
    openClass: 'Open Class',
    absencesSectionTitle: 'Absence & Attendance Log',
    noAbsences: 'No absences recorded for this student.',
    dateCol: 'Date',
    courseCol: 'Course',
    semesterCol: 'Semester',
    statusCol: 'Status',
    reasonCol: 'Reason / Note',
    statusAbsent: 'Absent',
    statusLate: 'Late',
    statusExcused: 'Excused',
    fullModuleBadge: 'Full Module (16w)',
    semiBlock1Badge: 'Semi-Module (Weeks 1–8)',
    semiBlock2Badge: 'Semi-Module (Weeks 9–16)',
  },
  fr: {
    back: 'Retour a la page precedente',
    activeBadge: 'Etudiant actif',
    inactiveBadge: 'Inactif',
    yearLabel: (y: string | null) =>
      y ? (y === '1' ? '1ere Annee' : `${y}eme Annee`) : 'Annee N/D',
    kpiOverallAvg: 'Moyenne Generale',
    kpiEnglishAvg: 'Moyenne Anglais',
    kpiFrenchAvg: 'Moyenne Francais',
    kpiTotalAbsences: 'Absences non justifiees',
    chartTitle: 'Progression Academique par Evaluation & Semestre',
    chartSubtitle:
      'Suivi des notes (/20) au Midterm, Post-Midterm et Examen Final en Anglais et Francais.',
    noChartData:
      'Aucune note enregistree. Le graphique apparaitra automatiquement des la saisie des evaluations.',
    englishLegend: 'Anglais',
    frenchLegend: 'Francais',
    coursesSectionTitle: 'Cours inscrits, Emploi du temps & Historique des notes',
    noCourses: 'Cet etudiant n’est inscrit a aucun cours de langue pour le moment.',
    unassignedProf: 'Non assigne',
    roomTbd: 'Salle a definir',
    scheduleTbd: 'Horaire a definir',
    midterm: 'Midterm',
    postMidterm: 'Post-Midterm',
    finalExam: 'Examen Final',
    average: 'Moyenne',
    openClass: 'Ouvrir le cours',
    absencesSectionTitle: 'Historique des absences',
    noAbsences: 'Aucune absence enregistree pour cet etudiant.',
    dateCol: 'Date',
    courseCol: 'Cours',
    semesterCol: 'Semestre',
    statusCol: 'Statut',
    reasonCol: 'Motif / Remarque',
    statusAbsent: 'Absent',
    statusLate: 'En retard',
    statusExcused: 'Justifie',
    fullModuleBadge: 'Module Complet (16 sem.)',
    semiBlock1Badge: 'Semi-Module (Sem. 1–8)',
    semiBlock2Badge: 'Semi-Module (Sem. 9–16)',
  },
} as const

function computeCourseAvg(c: StudentCourseHistory): number | null {
  const vals = [c.midterm, c.post_midterm, c.final_exam].filter(
    (v): v is number => v !== null && v !== undefined
  )
  if (vals.length === 0) return null
  return vals.reduce((acc, v) => acc + Number(v), 0) / vals.length
}

interface ChartPoint {
  label: string
  score: number
}

export default function StudentProgressionClient({
  student,
  courses,
  absences,
  locale,
}: StudentProgressionClientProps) {
  const router = useRouter()
  const t = COPY[locale]

  const deptName =
    locale === 'fr' ? student.department_name_fr : student.department_name_en

  const englishCourses = courses.filter((c) => c.subject === 'english')
  const frenchCourses = courses.filter((c) => c.subject === 'french')

  const allAverages = courses
    .map(computeCourseAvg)
    .filter((v): v is number => v !== null)
  const enAverages = englishCourses
    .map(computeCourseAvg)
    .filter((v): v is number => v !== null)
  const frAverages = frenchCourses
    .map(computeCourseAvg)
    .filter((v): v is number => v !== null)

  const overallAvg =
    allAverages.length > 0
      ? (allAverages.reduce((a, b) => a + b, 0) / allAverages.length).toFixed(2)
      : '—'
  const englishAvg =
    enAverages.length > 0
      ? (enAverages.reduce((a, b) => a + b, 0) / enAverages.length).toFixed(2)
      : '—'
  const frenchAvg =
    frAverages.length > 0
      ? (frAverages.reduce((a, b) => a + b, 0) / frAverages.length).toFixed(2)
      : '—'

  const totalUnexcused = absences.filter((a) => a.status === 'absent').length

  // Build chronological evaluation checkpoints for English and French
  function buildTrackPoints(trackCourses: StudentCourseHistory[]): ChartPoint[] {
    const pts: ChartPoint[] = []
    for (const c of trackCourses) {
      const semShort = c.semester_code || `S${c.term_number}`
      if (c.midterm !== null && c.midterm !== undefined) {
        pts.push({ label: `${semShort} • M1`, score: Number(c.midterm) })
      }
      if (c.post_midterm !== null && c.post_midterm !== undefined) {
        pts.push({ label: `${semShort} • M2`, score: Number(c.post_midterm) })
      }
      if (c.final_exam !== null && c.final_exam !== undefined) {
        pts.push({ label: `${semShort} • Final`, score: Number(c.final_exam) })
      }
    }
    return pts
  }

  const enPoints = buildTrackPoints(englishCourses)
  const frPoints = buildTrackPoints(frenchCourses)
  const maxPointsCount = Math.max(enPoints.length, frPoints.length)

  // SVG Chart dimensions
  const chartW = 720
  const chartH = 230
  const padL = 42
  const padR = 24
  const padT = 20
  const padB = 38
  const plotW = chartW - padL - padR
  const plotH = chartH - padT - padB

  function getCoords(points: ChartPoint[]) {
    return points.map((pt, idx) => {
      const x =
        maxPointsCount <= 1
          ? padL + plotW / 2
          : padL + (idx / (maxPointsCount - 1)) * plotW
      const y = padT + plotH - (Math.min(20, Math.max(0, pt.score)) / 20) * plotH
      return { ...pt, x, y }
    })
  }

  const enCoords = getCoords(enPoints)
  const frCoords = getCoords(frPoints)

  const xLabels =
    enPoints.length >= frPoints.length
      ? enPoints.map((p) => p.label)
      : frPoints.map((p) => p.label)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.back}
        </button>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
              style={{ backgroundColor: student.department_color || '#1d4ed8' }}
            >
              {student.first_name.charAt(0)}
              {student.last_name.charAt(0)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {student.first_name} {student.last_name}
                </h1>
                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {student.student_code}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    student.is_active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {student.is_active ? t.activeBadge : t.inactiveBadge}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {deptName || student.department_code || 'UPF'} •{' '}
                {t.yearLabel(student.cohort_level)}
                {student.email ? ` • ${student.email}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{t.kpiOverallAvg}</span>
            <Award className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {overallAvg}{' '}
            <span className="text-sm font-normal text-slate-400">/ 20</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{t.kpiEnglishAvg}</span>
            <GraduationCap className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {englishAvg}{' '}
            <span className="text-sm font-normal text-slate-400">/ 20</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{t.kpiFrenchAvg}</span>
            <BookOpen className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {frenchAvg}{' '}
            <span className="text-sm font-normal text-slate-400">/ 20</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{t.kpiTotalAbsences}</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {totalUnexcused}
          </p>
        </div>
      </div>

      {/* Progression Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              {t.chartTitle}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.chartSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              {t.englishLegend}
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              {t.frenchLegend}
            </span>
          </div>
        </div>

        {maxPointsCount === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {t.noChartData}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="h-60 w-full min-w-[540px]"
              role="img"
              aria-label={t.chartTitle}
            >
              {/* Horizontal grid lines (0, 5, 10, 15, 20) */}
              {[0, 5, 10, 15, 20].map((tick) => {
                const y = padT + plotH - (tick / 20) * plotH
                const isPassingLine = tick === 10
                return (
                  <g key={tick}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={chartW - padR}
                      y2={y}
                      stroke={isPassingLine ? '#10b981' : '#94a3b8'}
                      strokeOpacity={isPassingLine ? 0.55 : 0.2}
                      strokeDasharray={isPassingLine ? '4 4' : undefined}
                      strokeWidth={1}
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 text-[11px]"
                    >
                      {tick}
                    </text>
                  </g>
                )
              })}

              {/* English trend line */}
              {enCoords.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={enCoords.map((p) => `${p.x},${p.y}`).join(' ')}
                />
              )}

              {/* French trend line */}
              {frCoords.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={frCoords.map((p) => `${p.x},${p.y}`).join(' ')}
                />
              )}

              {/* English data points */}
              {enCoords.map((pt, i) => (
                <g key={`en-${i}`}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={4.5}
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 9}
                    textAnchor="middle"
                    className="fill-blue-600 text-[11px] font-bold dark:fill-blue-400"
                  >
                    {pt.score}
                  </text>
                </g>
              ))}

              {/* French data points */}
              {frCoords.map((pt, i) => (
                <g key={`fr-${i}`}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={4.5}
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                  <text
                    x={pt.x}
                    y={pt.y + 16}
                    textAnchor="middle"
                    className="fill-amber-600 text-[11px] font-bold dark:fill-amber-400"
                  >
                    {pt.score}
                  </text>
                </g>
              ))}

              {/* X-axis checkpoint labels */}
              {xLabels.map((lbl, idx) => {
                const x =
                  maxPointsCount <= 1
                    ? padL + plotW / 2
                    : padL + (idx / (maxPointsCount - 1)) * plotW
                return (
                  <text
                    key={`lbl-${idx}`}
                    x={x}
                    y={chartH - 10}
                    textAnchor="middle"
                    className="fill-slate-500 text-[11px] dark:fill-slate-400"
                  >
                    {lbl}
                  </text>
                )
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Enrolled Courses, Schedule & Grades */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {t.coursesSectionTitle}
        </h2>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {t.noCourses}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {courses.map((c) => {
              const avg = computeCourseAvg(c)
              const formatLabel =
                c.course_format === 'full_module'
                  ? t.fullModuleBadge
                  : c.term_block === 'block_2_8w'
                    ? t.semiBlock2Badge
                    : t.semiBlock1Badge

              return (
                <div
                  key={c.semi_module_id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            c.subject === 'english'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                          }`}
                        >
                          {locale === 'fr'
                            ? c.semester_label_fr
                            : c.semester_label_en}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <Clock className="h-3 w-3" />
                          {formatLabel}
                        </span>
                      </div>

                      <Link
                        href={`/semi-modules/${c.semi_module_id}`}
                        className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {t.openClass}
                      </Link>
                    </div>

                    <h3 className="mt-2.5 text-base font-bold text-slate-900 dark:text-white">
                      {locale === 'fr' ? c.title_fr : c.title_en}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                        {c.professor_name || t.unassignedProf}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                        {c.room_number || t.roomTbd}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {c.schedule_note || t.scheduleTbd}
                      </span>
                    </div>
                  </div>

                  {/* 3-Evaluation Score Strip */}
                  <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-950/60">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t.midterm}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                        {c.midterm !== null ? Number(c.midterm).toFixed(2) : '—'}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-950/60">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t.postMidterm}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                        {c.post_midterm !== null
                          ? Number(c.post_midterm).toFixed(2)
                          : '—'}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-950/60">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t.finalExam}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                        {c.final_exam !== null
                          ? Number(c.final_exam).toFixed(2)
                          : '—'}
                      </p>
                    </div>

                    <div className="rounded-lg bg-blue-50/80 p-2 dark:bg-blue-950/40">
                      <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
                        {t.average}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-blue-700 dark:text-blue-300">
                        {avg !== null ? avg.toFixed(2) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Absence Log */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {t.absencesSectionTitle}
        </h2>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">{t.dateCol}</th>
                <th className="px-5 py-3">{t.courseCol}</th>
                <th className="px-5 py-3">{t.semesterCol}</th>
                <th className="px-5 py-3">{t.statusCol}</th>
                <th className="px-5 py-3">{t.reasonCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {absences.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                    {a.session_date}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                    {locale === 'fr' ? a.course_title_fr : a.course_title_en}
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                    {locale === 'fr'
                      ? a.semester_label_fr
                      : a.semester_label_en}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        a.status === 'absent'
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          : a.status === 'late'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {a.status === 'absent'
                        ? t.statusAbsent
                        : a.status === 'late'
                          ? t.statusLate
                          : t.statusExcused}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                    {a.reason || '—'}
                  </td>
                </tr>
              ))}

              {absences.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    {t.noAbsences}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}