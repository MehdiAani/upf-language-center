'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Pencil,
  Save,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface ClassMeta {
  id: string
  subject: 'english' | 'french'
  group_name: string
  title_en: string
  title_fr: string
  room_number: string | null
  schedule_note: string | null
  max_absences_allowed: number
  year_level: number
  department_id: string
  department_code: string
  department_name_en: string
  department_name_fr: string
}

export interface StudentItem {
  id: string
  student_code: string
  first_name: string
  last_name: string
  email: string | null
  home_department_id: string | null
  cohort_level: string | null
  is_active: boolean
}

export interface AbsenceRecord {
  id: string
  student_id: string
  session_date: string
  status: 'absent' | 'late' | 'excused'
  reason: string | null
}

export interface GradeRecord {
  id?: string
  student_id: string
  midterm: number | null
  post_midterm: number | null
  final_exam: number | null
  notes: string | null
}

interface GradeDraft {
  midterm: string
  post_midterm: string
  final_exam: string
  notes: string
}

interface ClassWorkspaceClientProps {
  classMeta: ClassMeta
  currentUserId: string | null
  initialStudents: StudentItem[]
  initialAbsences: AbsenceRecord[]
  initialGrades: GradeRecord[]
  locale: 'en' | 'fr'
}

const COPY = {
  en: {
    backToDept: 'Back to Department',
    studentsCount: (n: number) => `${n} ${n === 1 ? 'Student' : 'Students'}`,
    addStudent: 'Add Student',
    editStudent: 'Edit Student',
    importCsv: 'Import .CSV',
    downloadTemplate: 'CSV Template',
    csvHint:
      'Expected CSV headers: student_code, first_name, last_name, email (optional). You can also use placeholder names like Student 01 until department assistants send the full list.',
    tabRoster: 'Student Roster',
    tabAbsences: 'Absence Tracker',
    tabGrades: 'Gradebook (3 Evaluations)',
    codeCol: 'Student ID',
    nameCol: 'Student Name',
    emailCol: 'Email',
    absencesCol: 'Absences',
    actionsCol: 'Actions',
    noStudents:
      'No students enrolled yet. Add a student manually or import a .CSV file.',
    studentCodeLabel: 'Student Number / Code',
    firstNameLabel: 'First Name',
    lastNameLabel: 'Last Name',
    emailLabel: 'Email (Optional)',
    cancel: 'Cancel',
    save: 'Save Student',
    saving: 'Saving...',
    removeConfirm: 'Remove this student from this class?',
    sessionDateLabel: 'Session Date',
    statusLabel: 'Status',
    reasonLabel: 'Note / Reason (Optional)',
    logAbsence: 'Record Absence',
    statusAbsent: 'Absent',
    statusLate: 'Late',
    statusExcused: 'Excused',
    noAbsences: 'No absences recorded for this class yet.',
    gradebookHint:
      'Enter scores out of 20 for Midterm, Post-Midterm Evaluation, and Final Exam. Average updates automatically.',
    midtermCol: 'Midterm (/20)',
    postMidtermCol: 'Post-Midterm (/20)',
    finalCol: 'Final Exam (/20)',
    averageCol: 'Average (/20)',
    remarksCol: 'Remarks',
    saveAllGrades: 'Save All Grades',
    savingGrades: 'Saving Grades...',
    exportGradesCsv: 'Export Grades CSV',
    gradesSavedMsg: 'All student grades saved successfully.',
    classAverageLabel: 'Class Average',
    gradedCountLabel: 'Students Graded',
  },
  fr: {
    backToDept: 'Retour au departement',
    studentsCount: (n: number) => `${n} ${n === 1 ? 'Etudiant' : 'Etudiants'}`,
    addStudent: 'Ajouter un etudiant',
    editStudent: "Modifier l'etudiant",
    importCsv: 'Importer .CSV',
    downloadTemplate: 'Modele CSV',
    csvHint:
      'Colonnes attendues : student_code, first_name, last_name, email (optionnel). Vous pouvez utiliser des noms provisoires en attendant les listes des assistants.',
    tabRoster: 'Liste des etudiants',
    tabAbsences: 'Suivi des absences',
    tabGrades: 'Notes (3 Evaluations)',
    codeCol: 'Matricule / Code',
    nameCol: 'Nom complet',
    emailCol: 'E-mail',
    absencesCol: 'Absences',
    actionsCol: 'Actions',
    noStudents:
      'Aucun etudiant inscrit. Ajoutez-en un manuellement ou importez un fichier .CSV.',
    studentCodeLabel: 'Numero / Code etudiant',
    firstNameLabel: 'Prenom',
    lastNameLabel: 'Nom',
    emailLabel: 'E-mail (Optionnel)',
    cancel: 'Annuler',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    removeConfirm: 'Retirer cet etudiant de cette classe ?',
    sessionDateLabel: 'Date de seance',
    statusLabel: 'Statut',
    reasonLabel: 'Remarque / Motif (Optionnel)',
    logAbsence: 'Enregistrer absence',
    statusAbsent: 'Absent',
    statusLate: 'En retard',
    statusExcused: 'Justifie',
    noAbsences: 'Aucune absence enregistree pour cette classe.',
    gradebookHint:
      'Saisissez les notes sur 20 pour le controle continu (Midterm), la 2eme evaluation et l’examen final. La moyenne est calculee automatiquement.',
    midtermCol: 'Midterm (/20)',
    postMidtermCol: 'Post-Midterm (/20)',
    finalCol: 'Examen Final (/20)',
    averageCol: 'Moyenne (/20)',
    remarksCol: 'Observations',
    saveAllGrades: 'Enregistrer toutes les notes',
    savingGrades: 'Enregistrement...',
    exportGradesCsv: 'Exporter Notes CSV',
    gradesSavedMsg: 'Toutes les notes ont ete enregistrees.',
    classAverageLabel: 'Moyenne de classe',
    gradedCountLabel: 'Etudiants notes',
  },
} as const

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseScore(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.')
  if (!cleaned) return null
  const num = Number(cleaned)
  if (Number.isNaN(num)) return null
  return Math.max(0, Math.min(20, Math.round(num * 100) / 100))
}

function computeAverage(draft?: GradeDraft): number | null {
  if (!draft) return null
  const values = [draft.midterm, draft.post_midterm, draft.final_exam]
    .map(parseScore)
    .filter((v): v is number => v !== null)
  if (values.length === 0) return null
  const sum = values.reduce((acc, v) => acc + v, 0)
  return Math.round((sum / values.length) * 100) / 100
}

export default function ClassWorkspaceClient({
  classMeta,
  currentUserId,
  initialStudents,
  initialAbsences,
  initialGrades,
  locale,
}: ClassWorkspaceClientProps) {
  const router = useRouter()
  const t = COPY[locale]

  const [activeTab, setActiveTab] = useState<'roster' | 'absences' | 'grades'>(
    'roster'
  )
  const [students, setStudents] = useState<StudentItem[]>(initialStudents)
  const [absences, setAbsences] = useState<AbsenceRecord[]>(initialAbsences)

  // Gradebook drafts keyed by student_id
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, GradeDraft>>(
    () => {
      const map: Record<string, GradeDraft> = {}
      for (const st of initialStudents) {
        const existing = initialGrades.find((g) => g.student_id === st.id)
        map[st.id] = {
          midterm:
            existing?.midterm !== null && existing?.midterm !== undefined
              ? String(existing.midterm)
              : '',
          post_midterm:
            existing?.post_midterm !== null &&
            existing?.post_midterm !== undefined
              ? String(existing.post_midterm)
              : '',
          final_exam:
            existing?.final_exam !== null && existing?.final_exam !== undefined
              ? String(existing.final_exam)
              : '',
          notes: existing?.notes ?? '',
        }
      }
      return map
    }
  )
  const [savingGrades, setSavingGrades] = useState(false)

  // Manual add/edit student modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null)
  const [studentCode, setStudentCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [savingStudent, setSavingStudent] = useState(false)

  // Absence recording state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudents[0]?.id ?? ''
  )
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [absenceStatus, setAbsenceStatus] = useState<
    'absent' | 'late' | 'excused'
  >('absent')
  const [absenceReason, setAbsenceReason] = useState('')
  const [savingAbsence, setSavingAbsence] = useState(false)

  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const classTitle = locale === 'fr' ? classMeta.title_fr : classMeta.title_en
  const deptName =
    locale === 'fr' ? classMeta.department_name_fr : classMeta.department_name_en

  function getAbsenceCount(studentId: string) {
    return absences.filter(
      (a) => a.student_id === studentId && a.status === 'absent'
    ).length
  }

  function ensureDraft(studentId: string): GradeDraft {
    return (
      gradeDrafts[studentId] ?? {
        midterm: '',
        post_midterm: '',
        final_exam: '',
        notes: '',
      }
    )
  }

  function updateGradeField(
    studentId: string,
    field: keyof GradeDraft,
    value: string
  ) {
    setGradeDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...ensureDraft(studentId),
        [field]: value,
      },
    }))
  }

  function openAddModal() {
    setEditingStudent(null)
    setStudentCode('')
    setFirstName('')
    setLastName('')
    setEmail('')
    setError(null)
    setModalOpen(true)
  }

  function openEditModal(st: StudentItem) {
    setEditingStudent(st)
    setStudentCode(st.student_code)
    setFirstName(st.first_name)
    setLastName(st.last_name)
    setEmail(st.email ?? '')
    setError(null)
    setModalOpen(true)
  }

  function handleDownloadTemplate() {
    const csvContent =
      'student_code,first_name,last_name,email\nUPF-2026-001,Placeholder,Student 01,\nUPF-2026-002,Placeholder,Student 02,\n'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${classMeta.department_code || 'UPF'}-Y${classMeta.year_level}-${classMeta.group_name}-template.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleExportGradesCsv() {
    const header =
      'student_code,first_name,last_name,midterm,post_midterm,final_exam,average,notes'
    const rows = students.map((st) => {
      const d = ensureDraft(st.id)
      const avg = computeAverage(d)
      const safeNotes = `"${(d.notes ?? '').replace(/"/g, '""')}"`
      return [
        st.student_code,
        st.first_name,
        st.last_name,
        d.midterm,
        d.post_midterm,
        d.final_exam,
        avg !== null ? avg.toFixed(2) : '',
        safeNotes,
      ].join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${classMeta.department_code || 'UPF'}-Y${classMeta.year_level}-${classMeta.group_name}-${classMeta.subject}-grades.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleSaveAllGrades() {
    if (students.length === 0) return
    setSavingGrades(true)
    setError(null)
    setFeedback(null)

    const supabase = createClient()
    try {
      const payload = students.map((st) => {
        const d = ensureDraft(st.id)
        return {
          semi_module_id: classMeta.id,
          student_id: st.id,
          midterm: parseScore(d.midterm),
          post_midterm: parseScore(d.post_midterm),
          final_exam: parseScore(d.final_exam),
          notes: d.notes.trim() || null,
          updated_by: currentUserId,
          updated_at: new Date().toISOString(),
        }
      })

      const { error: saveErr } = await supabase
        .from('student_grades')
        .upsert(payload, { onConflict: 'semi_module_id,student_id' })

      if (saveErr) {
        setError(saveErr.message)
        return
      }

      setFeedback(t.gradesSavedMsg)
      router.refresh()
    } finally {
      setSavingGrades(false)
    }
  }

  async function handleSaveStudent(e: FormEvent) {
    e.preventDefault()
    if (!studentCode.trim() || !firstName.trim() || !lastName.trim()) return

    setSavingStudent(true)
    setError(null)
    setFeedback(null)
    const supabase = createClient()

    try {
      const codeClean = studentCode.trim()
      const firstClean = firstName.trim()
      const lastClean = lastName.trim()
      const emailClean = email.trim() || null

      if (editingStudent) {
        const { data: updated, error: upErr } = await supabase
          .from('students')
          .update({
            student_code: codeClean,
            first_name: firstClean,
            last_name: lastClean,
            email: emailClean,
          })
          .eq('id', editingStudent.id)
          .select()
          .single()

        if (upErr || !updated) {
          setError(upErr?.message ?? 'Could not update student.')
          return
        }

        setStudents((prev) =>
          prev
            .map((s) => (s.id === editingStudent.id ? (updated as StudentItem) : s))
            .sort((a, b) => a.last_name.localeCompare(b.last_name))
        )
      } else {
        const { data: upserted, error: stErr } = await supabase
          .from('students')
          .upsert(
            {
              student_code: codeClean,
              first_name: firstClean,
              last_name: lastClean,
              email: emailClean,
              home_department_id: classMeta.department_id || null,
              cohort_level: String(classMeta.year_level),
              is_active: true,
            },
            { onConflict: 'student_code' }
          )
          .select()
          .single()

        if (stErr || !upserted) {
          setError(stErr?.message ?? 'Could not save student.')
          return
        }

        const { error: enrErr } = await supabase
          .from('student_enrollments')
          .upsert(
            {
              semi_module_id: classMeta.id,
              student_id: upserted.id,
            },
            { onConflict: 'semi_module_id,student_id' }
          )

        if (enrErr) {
          setError(enrErr.message)
          return
        }

        setStudents((prev) => {
          const filtered = prev.filter((s) => s.id !== upserted.id)
          return [...filtered, upserted as StudentItem].sort((a, b) =>
            a.last_name.localeCompare(b.last_name)
          )
        })
        setGradeDrafts((prev) => ({
          ...prev,
          [upserted.id]: ensureDraft(upserted.id),
        }))
        if (!selectedStudentId) {
          setSelectedStudentId(upserted.id)
        }
      }

      setModalOpen(false)
      router.refresh()
    } finally {
      setSavingStudent(false)
    }
  }

  async function handleRemoveFromClass(studentId: string) {
    if (!window.confirm(t.removeConfirm)) return
    setError(null)
    const supabase = createClient()

    const { error: delErr } = await supabase
      .from('student_enrollments')
      .delete()
      .eq('semi_module_id', classMeta.id)
      .eq('student_id', studentId)

    if (delErr) {
      setError(delErr.message)
      return
    }

    setStudents((prev) => prev.filter((s) => s.id !== studentId))
    router.refresh()
  }

  async function handleCsvUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)
    setFeedback(null)

    const text = await file.text()
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      setError('CSV file is empty.')
      return
    }

    const firstRow = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
    const hasHeader =
      firstRow.includes('student_code') ||
      firstRow.includes('code') ||
      firstRow.includes('first_name')

    const startIndex = hasHeader ? 1 : 0
    const codeIdx = hasHeader
      ? Math.max(firstRow.indexOf('student_code'), firstRow.indexOf('code'), 0)
      : 0
    const firstIdx = hasHeader
      ? Math.max(firstRow.indexOf('first_name'), 1)
      : 1
    const lastIdx = hasHeader ? Math.max(firstRow.indexOf('last_name'), 2) : 2
    const emailIdx = hasHeader ? firstRow.indexOf('email') : 3

    const rowsToImport: {
      student_code: string
      first_name: string
      last_name: string
      email: string | null
      home_department_id: string | null
      cohort_level: string
      is_active: boolean
    }[] = []

    for (let i = startIndex; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i])
      const codeVal = cols[codeIdx]?.trim()
      const firstVal = cols[firstIdx]?.trim() || 'Placeholder'
      const lastVal = cols[lastIdx]?.trim() || `Student ${i}`
      const emailVal = emailIdx >= 0 ? cols[emailIdx]?.trim() || null : null

      if (!codeVal) continue

      rowsToImport.push({
        student_code: codeVal,
        first_name: firstVal,
        last_name: lastVal,
        email: emailVal,
        home_department_id: classMeta.department_id || null,
        cohort_level: String(classMeta.year_level),
        is_active: true,
      })
    }

    if (rowsToImport.length === 0) {
      setError('No valid student rows found in CSV.')
      return
    }

    const supabase = createClient()
    const { data: upsertedStudents, error: upErr } = await supabase
      .from('students')
      .upsert(rowsToImport, { onConflict: 'student_code' })
      .select()

    if (upErr || !upsertedStudents) {
      setError(upErr?.message ?? 'Failed to import students.')
      return
    }

    const enrollmentRows = upsertedStudents.map((st) => ({
      semi_module_id: classMeta.id,
      student_id: st.id,
    }))

    const { error: enrErr } = await supabase
      .from('student_enrollments')
      .upsert(enrollmentRows, { onConflict: 'semi_module_id,student_id' })

    if (enrErr) {
      setError(enrErr.message)
      return
    }

    setStudents((prev) => {
      const map = new Map<string, StudentItem>()
      for (const s of prev) map.set(s.id, s)
      for (const s of upsertedStudents as StudentItem[]) map.set(s.id, s)
      return Array.from(map.values()).sort((a, b) =>
        a.last_name.localeCompare(b.last_name)
      )
    })

    setGradeDrafts((prev) => {
      const next = { ...prev }
      for (const s of upsertedStudents) {
        if (!next[s.id]) {
          next[s.id] = {
            midterm: '',
            post_midterm: '',
            final_exam: '',
            notes: '',
          }
        }
      }
      return next
    })

    if (!selectedStudentId && upsertedStudents[0]) {
      setSelectedStudentId(upsertedStudents[0].id)
    }

    setFeedback(`${upsertedStudents.length} student(s) imported into this class.`)
    router.refresh()
  }

  async function handleRecordAbsence(e: FormEvent) {
    e.preventDefault()
    if (!selectedStudentId || !sessionDate) return

    setSavingAbsence(true)
    setError(null)
    const supabase = createClient()

    try {
      const { data: saved, error: absErr } = await supabase
        .from('student_absences')
        .upsert(
          {
            semi_module_id: classMeta.id,
            student_id: selectedStudentId,
            session_date: sessionDate,
            status: absenceStatus,
            reason: absenceReason.trim() || null,
          },
          { onConflict: 'semi_module_id,student_id,session_date' }
        )
        .select()
        .single()

      if (absErr || !saved) {
        setError(absErr?.message ?? 'Could not record absence.')
        return
      }

      setAbsences((prev) => {
        const filtered = prev.filter(
          (a) =>
            !(
              a.student_id === saved.student_id &&
              a.session_date === saved.session_date
            )
        )
        return [saved as AbsenceRecord, ...filtered].sort((a, b) =>
          b.session_date.localeCompare(a.session_date)
        )
      })
      setAbsenceReason('')
      router.refresh()
    } finally {
      setSavingAbsence(false)
    }
  }

  async function handleDeleteAbsence(id: string) {
    const supabase = createClient()
    const { error: delErr } = await supabase
      .from('student_absences')
      .delete()
      .eq('id', id)

    if (!delErr) {
      setAbsences((prev) => prev.filter((a) => a.id !== id))
      router.refresh()
    }
  }

  const gradedAverages = students
    .map((s) => computeAverage(gradeDrafts[s.id]))
    .filter((v): v is number => v !== null)

  const classAverage =
    gradedAverages.length > 0
      ? (
          gradedAverages.reduce((acc, v) => acc + v, 0) / gradedAverages.length
        ).toFixed(2)
      : '—'

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <Link
            href={`/departments/${classMeta.department_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.backToDept}
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {classTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {deptName} • Year {classMeta.year_level} •{' '}
            {t.studentsCount(students.length)}
            {classMeta.room_number ? ` • ${classMeta.room_number}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            {t.downloadTemplate}
          </button>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            <Upload className="h-3.5 w-3.5" />
            {t.importCsv}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {t.addStudent}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'roster'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800'
          }`}
        >
          {t.tabRoster} ({students.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('absences')}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'absences'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800'
          }`}
        >
          {t.tabAbsences} ({absences.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('grades')}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'grades'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800'
          }`}
        >
          {t.tabGrades}
        </button>
      </div>

      {activeTab === 'roster' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.csvHint}</p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">{t.codeCol}</th>
                  <th className="px-5 py-3.5">{t.nameCol}</th>
                  <th className="px-5 py-3.5">{t.emailCol}</th>
                  <th className="px-5 py-3.5">{t.absencesCol}</th>
                  <th className="px-5 py-3.5">{t.actionsCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {students.map((st) => {
                  const absCount = getAbsenceCount(st.id)
                  const overLimit = absCount >= classMeta.max_absences_allowed
                  return (
                    <tr
                      key={st.id}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {st.student_code}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                        <Link
                          href={`/students/${st.id}`}
                          className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                        >
                          {st.first_name} {st.last_name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {st.email || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            overLimit
                              ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : absCount > 0
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {overLimit && <AlertTriangle className="h-3 w-3" />}
                          {absCount} / {classMeta.max_absences_allowed}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(st)}
                            className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromClass(st.id)}
                            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {students.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      {t.noStudents}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'absences' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleRecordAbsence}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <CalendarPlus className="h-4 w-4 text-blue-600" />
              {t.logAbsence}
            </h2>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                {t.nameCol}
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.student_code} - {st.first_name} {st.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                {t.sessionDateLabel}
              </label>
              <input
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                {t.statusLabel}
              </label>
              <select
                value={absenceStatus}
                onChange={(e) =>
                  setAbsenceStatus(
                    e.target.value as 'absent' | 'late' | 'excused'
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="absent">{t.statusAbsent}</option>
                <option value="late">{t.statusLate}</option>
                <option value="excused">{t.statusExcused}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                {t.reasonLabel}
              </label>
              <input
                type="text"
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={savingAbsence || students.length === 0}
              className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {savingAbsence ? t.saving : t.logAbsence}
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">{t.sessionDateLabel}</th>
                  <th className="px-5 py-3.5">{t.nameCol}</th>
                  <th className="px-5 py-3.5">{t.statusLabel}</th>
                  <th className="px-5 py-3.5">{t.reasonLabel}</th>
                  <th className="px-5 py-3.5">{t.actionsCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {absences.map((rec) => {
                  const st = students.find((s) => s.id === rec.student_id)
                  return (
                    <tr key={rec.id}>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {rec.session_date}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                        {st
                          ? `${st.first_name} ${st.last_name} (${st.student_code})`
                          : rec.student_id}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            rec.status === 'absent'
                              ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : rec.status === 'late'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {rec.status === 'absent'
                            ? t.statusAbsent
                            : rec.status === 'late'
                              ? t.statusLate
                              : t.statusExcused}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {rec.reason || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteAbsence(rec.id)}
                          className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {absences.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      {t.noAbsences}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'grades' && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.gradebookHint}
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>
                  {t.classAverageLabel}:{' '}
                  <strong className="text-blue-600 dark:text-blue-400">
                    {classAverage} / 20
                  </strong>
                </span>
                <span>
                  {t.gradedCountLabel}: {gradedAverages.length} /{' '}
                  {students.length}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportGradesCsv}
                disabled={students.length === 0}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {t.exportGradesCsv}
              </button>

              <button
                type="button"
                onClick={handleSaveAllGrades}
                disabled={savingGrades || students.length === 0}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {savingGrades ? t.savingGrades : t.saveAllGrades}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">{t.codeCol}</th>
                  <th className="px-4 py-3.5">{t.nameCol}</th>
                  <th className="px-4 py-3.5">{t.midtermCol}</th>
                  <th className="px-4 py-3.5">{t.postMidtermCol}</th>
                  <th className="px-4 py-3.5">{t.finalCol}</th>
                  <th className="px-4 py-3.5">{t.averageCol}</th>
                  <th className="px-4 py-3.5">{t.remarksCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {students.map((st) => {
                  const draft = ensureDraft(st.id)
                  const avg = computeAverage(draft)
                  const passing = avg !== null && avg >= 10
                  return (
                    <tr
                      key={st.id}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {st.student_code}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        <Link
                          href={`/students/${st.id}`}
                          className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                        >
                          {st.first_name} {st.last_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          value={draft.midterm}
                          onChange={(e) =>
                            updateGradeField(st.id, 'midterm', e.target.value)
                          }
                          placeholder="—"
                          className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          value={draft.post_midterm}
                          onChange={(e) =>
                            updateGradeField(
                              st.id,
                              'post_midterm',
                              e.target.value
                            )
                          }
                          placeholder="—"
                          className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          value={draft.final_exam}
                          onChange={(e) =>
                            updateGradeField(st.id, 'final_exam', e.target.value)
                          }
                          placeholder="—"
                          className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {avg !== null ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              passing
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            }`}
                          >
                            {avg.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={draft.notes}
                          onChange={(e) =>
                            updateGradeField(st.id, 'notes', e.target.value)
                          }
                          placeholder="Optional note..."
                          className="w-44 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </td>
                    </tr>
                  )
                })}

                {students.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      {t.noStudents}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingStudent ? t.editStudent : t.addStudent}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.studentCodeLabel}
                </label>
                <input
                  type="text"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.firstNameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.lastNameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.emailLabel}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingStudent ? t.saving : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}