'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
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
  Undo2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  computeWeightedAverage,
  exportPvSpreadsheet,
  parsePvSpreadsheet,
} from '@/lib/pv-excel'

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
  academic_year?: string
  semester_number?: number
  semester_label?: string
  professor_name?: string
  weight_cc1?: number
  weight_cc2?: number
  weight_ex?: number
}

export interface StudentItem {
  id: string
  student_code: string
  cne?: string | null
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
  cc1?: number | null
  cc2?: number | null
  ex?: number | null
  midterm: number | null
  post_midterm: number | null
  final_exam: number | null
  notes: string | null
}

interface GradeDraft {
  cc1: string
  cc2: string
  ex: string
  notes: string
}

interface WorkspaceSnapshot {
  label: string
  students: StudentItem[]
  absences: AbsenceRecord[]
  gradeDrafts: Record<string, GradeDraft>
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
    addStudent: 'Add Student',
    editStudent: 'Edit Student',
    importCsv: 'Import .CSV',
    importPv: 'Import PV / Roster (.xls/.xlsx)',
    exportPv: 'Export Official PV',
    downloadTemplate: 'CSV Template',
    undoAction: 'Undo (Ctrl+Z)',
    removeSelected: 'Remove from Class',
    deleteSelectedPermanently: 'Delete Selected Students',
    csvHint:
      'Supports PV files (.xls/.xlsx), roster/placement sheets with Nom et Prenom or Nom + Prenom, and CSV files even without grades.',
    tabRoster: 'Student Roster',
    tabAbsences: 'Absence Tracker',
    tabGrades: 'Gradebook (CC1 / CC2 / EX)',
    codeCol: 'Matricule',
    cneCol: 'CNE',
    nameCol: 'Student Name',
    emailCol: 'Email',
    absencesCol: 'Absences',
    actionsCol: 'Actions',
    noStudents: 'No students enrolled yet.',
    studentCodeLabel: 'Matricule / Student Code',
    cneLabel: 'CNE (Optional)',
    firstNameLabel: 'First / Full Name',
    lastNameLabel: 'Last Name (Optional)',
    emailLabel: 'Email (Optional)',
    cancel: 'Cancel',
    save: 'Save Student',
    saving: 'Saving...',
    removeConfirm: 'Remove this student from this class?',
    bulkRemoveConfirm: (n: number) =>
      'Remove ' + n + ' selected student(s) from this class?',
    bulkDeleteConfirm: (n: number) =>
      'Permanently delete ' +
      n +
      ' selected student record(s) from the database so they no longer show up in search?',
    sessionDateLabel: 'Session Date',
    statusLabel: 'Status',
    reasonLabel: 'Note / Reason (Optional)',
    logAbsence: 'Record Absence',
    statusAbsent: 'Absent',
    statusLate: 'Late',
    statusExcused: 'Excused',
    noAbsences: 'No absences recorded yet.',
    gradebookHint:
      'Enter scores out of 20 for CC1, CC2, and EX. Weighted average (/20) and percentage update live.',
    cc1Col: 'CC1 (/20)',
    cc2Col: 'CC2 (/20)',
    exCol: 'EX (/20)',
    averageCol: 'Average & %',
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
    addStudent: 'Ajouter un etudiant',
    editStudent: "Modifier l'etudiant",
    importCsv: 'Importer .CSV',
    importPv: 'Importer PV / Liste (.xls/.xlsx)',
    exportPv: 'Exporter PV Officiel',
    downloadTemplate: 'Modele CSV',
    undoAction: 'Annuler (Ctrl+Z)',
    removeSelected: 'Retirer de la classe',
    deleteSelectedPermanently: 'Supprimer etudiants selectionnes',
    csvHint:
      'Prend en charge les PV (.xls/.xlsx), les listes ou tests de placement avec Nom et Prenom ou Nom + Prenom, et les CSV meme sans notes.',
    tabRoster: 'Liste des etudiants',
    tabAbsences: 'Suivi des absences',
    tabGrades: 'Notes (CC1 / CC2 / EX)',
    codeCol: 'Matricule',
    cneCol: 'CNE',
    nameCol: 'Nom complet',
    emailCol: 'E-mail',
    absencesCol: 'Absences',
    actionsCol: 'Actions',
    noStudents: 'Aucun etudiant inscrit pour le moment.',
    studentCodeLabel: 'Matricule / Code etudiant',
    cneLabel: 'CNE (Optionnel)',
    firstNameLabel: 'Prenom / Nom complet',
    lastNameLabel: 'Nom (Optionnel)',
    emailLabel: 'E-mail (Optionnel)',
    cancel: 'Annuler',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    removeConfirm: 'Retirer cet etudiant de cette classe ?',
    bulkRemoveConfirm: (n: number) =>
      'Retirer ' + n + ' etudiant(s) selectionne(s) de cette classe ?',
    bulkDeleteConfirm: (n: number) =>
      'Supprimer definitivement ' +
      n +
      ' fiche(s) etudiant(s) afin qu elles n apparaissent plus dans la recherche ?',
    sessionDateLabel: 'Date de seance',
    statusLabel: 'Statut',
    reasonLabel: 'Remarque / Motif (Optionnel)',
    logAbsence: 'Enregistrer absence',
    statusAbsent: 'Absent',
    statusLate: 'En retard',
    statusExcused: 'Justifie',
    noAbsences: 'Aucune absence enregistree.',
    gradebookHint:
      'Saisissez les notes sur 20 pour CC1, CC2 et EX. La moyenne (/20) et le pourcentage se calculent en direct.',
    cc1Col: 'CC1 (/20)',
    cc2Col: 'CC2 (/20)',
    exCol: 'EX (/20)',
    averageCol: 'Moyenne & %',
    remarksCol: 'Observations',
    saveAllGrades: 'Enregistrer toutes les notes',
    savingGrades: 'Enregistrement...',
    exportGradesCsv: 'Exporter Notes CSV',
    gradesSavedMsg: 'Toutes les notes ont ete enregistrees.',
    classAverageLabel: 'Moyenne de classe',
    gradedCountLabel: 'Etudiants notes',
  },
} as const

function formatDisplayName(st: StudentItem): string {
  const f = (st.first_name ?? '').trim().replace(/\s+/g, ' ')
  const l = (st.last_name ?? '').trim().replace(/\s+/g, ' ')
  if (!l) return f
  if (!f) return l
  if (f.toLowerCase() === l.toLowerCase()) return f
  if (f.toLowerCase().includes(l.toLowerCase())) return f
  if (l.toLowerCase().includes(f.toLowerCase())) return l
  return f + ' ' + l
}

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

function normalizeNameKey(lastName: string, firstName: string): string {
  return (firstName + ' ' + lastName)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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

  const weights = {
    cc1: classMeta.weight_cc1 ?? 25,
    cc2: classMeta.weight_cc2 ?? 25,
    ex: classMeta.weight_ex ?? 50,
  }

  const [activeTab, setActiveTab] = useState<'roster' | 'absences' | 'grades'>('roster')
  const [students, setStudents] = useState<StudentItem[]>(initialStudents)
  const [absences, setAbsences] = useState<AbsenceRecord[]>(initialAbsences)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [historyStack, setHistoryStack] = useState<WorkspaceSnapshot[]>([])
  const [reverting, setReverting] = useState(false)

  const [gradeDrafts, setGradeDrafts] = useState<Record<string, GradeDraft>>(() => {
    const map: Record<string, GradeDraft> = {}
    for (const st of initialStudents) {
      const existing = initialGrades.find((g) => g.student_id === st.id)
      const vCc1 = existing?.cc1 ?? existing?.midterm ?? null
      const vCc2 = existing?.cc2 ?? existing?.post_midterm ?? null
      const vEx = existing?.ex ?? existing?.final_exam ?? null
      map[st.id] = {
        cc1: vCc1 !== null && vCc1 !== undefined ? String(vCc1) : '',
        cc2: vCc2 !== null && vCc2 !== undefined ? String(vCc2) : '',
        ex: vEx !== null && vEx !== undefined ? String(vEx) : '',
        notes: existing?.notes ?? '',
      }
    }
    return map
  })
  const [savingGrades, setSavingGrades] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null)
  const [studentCode, setStudentCode] = useState('')
  const [cne, setCne] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [savingStudent, setSavingStudent] = useState(false)

  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudents[0]?.id ?? '')
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [absenceStatus, setAbsenceStatus] = useState<'absent' | 'late' | 'excused'>('absent')
  const [absenceReason, setAbsenceReason] = useState('')
  const [savingAbsence, setSavingAbsence] = useState(false)

  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const classTitle = locale === 'fr' ? classMeta.title_fr : classMeta.title_en
  const deptName = locale === 'fr' ? classMeta.department_name_fr : classMeta.department_name_en

  function pushSnapshot(label: string) {
    setHistoryStack((prev) => [
      ...prev.slice(-19),
      {
        label,
        students: students.map((s) => ({ ...s })),
        absences: absences.map((a) => ({ ...a })),
        gradeDrafts: Object.fromEntries(
          Object.entries(gradeDrafts).map(([k, v]) => [k, { ...v }])
        ),
      },
    ])
  }

  async function handleUndo() {
    if (historyStack.length === 0 || reverting) return
    setReverting(true)
    setError(null)
    setFeedback(null)

    const last = historyStack[historyStack.length - 1]
    const supabase = createClient()

    try {
      // Restore student records and enrollments in Supabase
      if (last.students.length > 0) {
        const studentRows = last.students.map((s) => ({
          id: s.id,
          student_code: s.student_code,
          cne: s.cne ?? null,
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email ?? null,
          home_department_id: s.home_department_id ?? (classMeta.department_id || null),
          cohort_level: s.cohort_level ?? String(classMeta.year_level),
          is_active: s.is_active ?? true,
        }))

        await supabase.from('students').upsert(studentRows, { onConflict: 'id' })
      }

      const prevIds = new Set(last.students.map((s) => s.id))
      const removedIds = students.map((s) => s.id).filter((id) => !prevIds.has(id))

      if (removedIds.length > 0) {
        await supabase
          .from('student_enrollments')
          .delete()
          .eq('semi_module_id', classMeta.id)
          .in('student_id', removedIds)
      }

      if (last.students.length > 0) {
        await supabase
          .from('student_enrollments')
          .upsert(
            last.students.map((s) => ({
              semi_module_id: classMeta.id,
              student_id: s.id,
            })),
            { onConflict: 'semi_module_id,student_id' }
          )
      }

      setHistoryStack((prev) => prev.slice(0, -1))
      setStudents(last.students)
      setAbsences(last.absences)
      setGradeDrafts(last.gradeDrafts)
      setSelectedIds([])
      setFeedback('Reverted: ' + last.label)
      router.refresh()
    } finally {
      setReverting(false)
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName
      const isEditingText =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isEditingText) {
        if (historyStack.length > 0) {
          e.preventDefault()
          void handleUndo()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function getAbsenceCount(studentId: string) {
    return absences.filter((a) => a.student_id === studentId && a.status === 'absent').length
  }

  function ensureDraft(studentId: string): GradeDraft {
    return gradeDrafts[studentId] ?? { cc1: '', cc2: '', ex: '', notes: '' }
  }

  function getSummaryForStudent(studentId: string) {
    const d = ensureDraft(studentId)
    return computeWeightedAverage(parseScore(d.cc1), parseScore(d.cc2), parseScore(d.ex), weights)
  }

  function updateGradeField(studentId: string, field: keyof GradeDraft, value: string) {
    setGradeDrafts((prev) => ({
      ...prev,
      [studentId]: { ...ensureDraft(studentId), [field]: value },
    }))
  }

  function toggleSelectStudent(studentId: string) {
    setSelectedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  function toggleSelectAll() {
    if (selectedIds.length === students.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(students.map((s) => s.id))
    }
  }

  function openAddModal() {
    setEditingStudent(null)
    setStudentCode('')
    setCne('')
    setFirstName('')
    setLastName('')
    setEmail('')
    setError(null)
    setModalOpen(true)
  }

  function openEditModal(st: StudentItem) {
    setEditingStudent(st)
    setStudentCode(st.student_code)
    setCne(st.cne ?? '')
    setFirstName(st.first_name)
    setLastName(st.last_name)
    setEmail(st.email ?? '')
    setError(null)
    setModalOpen(true)
  }

  function handleDownloadTemplate() {
    const csvContent =
      'student_code,cne,first_name,last_name,email\n1.DAI.101.26,N130000001,Yasmine,Benhari,\n'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download =
      (classMeta.department_code || 'UPF') +
      '-Y' +
      classMeta.year_level +
      '-' +
      classMeta.group_name +
      '-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleExportGradesCsv() {
    const header = 'matricule,cne,nom,prenom,cc1,cc2,ex,average_20,percentage,notes'
    const rows = students.map((st) => {
      const d = ensureDraft(st.id)
      const summary = getSummaryForStudent(st.id)
      const safeNotes = '"' + (d.notes ?? '').replace(/"/g, '""') + '"'
      return [
        st.student_code,
        st.cne ?? '',
        st.last_name,
        st.first_name,
        d.cc1,
        d.cc2,
        d.ex,
        summary.average20 !== null ? summary.average20.toFixed(2) : '',
        summary.percentage !== null ? summary.percentage.toFixed(1) + '%' : '',
        safeNotes,
      ].join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download =
      (classMeta.department_code || 'UPF') +
      '-Y' +
      classMeta.year_level +
      '-' +
      classMeta.group_name +
      '-' +
      classMeta.subject +
      '-grades.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleExportOfficialPv() {
    exportPvSpreadsheet(
      {
        academicYear: classMeta.academic_year || '2026-2027',
        session: locale === 'fr' ? 'Automne / Printemps' : 'Regular',
        filiere: deptName || classMeta.department_code || 'UPF',
        groupe: classMeta.group_name || 'Tous',
        niveau: classMeta.year_level,
        semestre: classMeta.semester_number || 1,
        option: 'NA',
        matiere: classMeta.subject === 'french' ? 'Francais' : 'Anglais',
        professorName: classMeta.professor_name || 'UPF',
        departmentCode: classMeta.department_code || 'PV',
      },
      students.map((st) => {
        const d = ensureDraft(st.id)
        return {
          matricule: st.student_code,
          cne: st.cne ?? '',
          lastName: st.last_name,
          firstName: st.first_name,
          cc1: parseScore(d.cc1),
          cc2: parseScore(d.cc2),
          ex: parseScore(d.ex),
        }
      })
    )
  }

  async function handlePvFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)
    setFeedback(null)

    try {
      const parsed = await parsePvSpreadsheet(file)
      if (parsed.rows.length === 0) {
        setError('No student rows detected in the file.')
        return
      }

      pushSnapshot('Import from ' + file.name)

      const supabase = createClient()
      let matchedCount = 0
      let importedNewCount = 0
      let gradesSyncedCount = 0
      const nextDrafts: Record<string, GradeDraft> = { ...gradeDrafts }
      const updatedStudentsList: StudentItem[] = [...students]

      for (const row of parsed.rows) {
        const codeKey = row.matricule.trim().toLowerCase()
        const cneKey = row.cne.trim().toLowerCase()
        const nameKey = normalizeNameKey(row.lastName, row.firstName)
        const emailKey = (row.email ?? '').trim().toLowerCase()

        let matched = updatedStudentsList.find(
          (s) =>
            (codeKey && s.student_code.trim().toLowerCase() === codeKey) ||
            (cneKey && (s.cne ?? '').trim().toLowerCase() === cneKey) ||
            (emailKey && (s.email ?? '').trim().toLowerCase() === emailKey) ||
            (nameKey && normalizeNameKey(s.last_name, s.first_name) === nameKey)
        )

        if (!matched) {
          const uniqueCode =
            row.matricule ||
            row.cne ||
            'STU-' +
              String(updatedStudentsList.length + importedNewCount + 1).padStart(3, '0')

          const { data: upsertedSt, error: stErr } = await supabase
            .from('students')
            .upsert(
              {
                student_code: uniqueCode,
                cne: row.cne || null,
                first_name: row.firstName || 'Student',
                last_name: row.lastName || '',
                email: row.email || null,
                home_department_id: classMeta.department_id || null,
                cohort_level: String(classMeta.year_level),
                is_active: true,
              },
              { onConflict: 'student_code' }
            )
            .select()
            .single()

          if (!stErr && upsertedSt) {
            await supabase
              .from('student_enrollments')
              .upsert(
                { semi_module_id: classMeta.id, student_id: upsertedSt.id },
                { onConflict: 'semi_module_id,student_id' }
              )
            matched = upsertedSt as StudentItem
            updatedStudentsList.push(matched)
            importedNewCount += 1
          }
        }

        if (matched) {
          matchedCount += 1
          const hasAnyGrade =
            row.cc1 !== null || row.cc2 !== null || row.ex !== null
          if (hasAnyGrade) gradesSyncedCount += 1

          const prev = nextDrafts[matched.id] ?? { cc1: '', cc2: '', ex: '', notes: '' }
          nextDrafts[matched.id] = {
            cc1: row.cc1 !== null ? String(row.cc1) : prev.cc1,
            cc2: row.cc2 !== null ? String(row.cc2) : prev.cc2,
            ex: row.ex !== null ? String(row.ex) : prev.ex,
            notes: prev.notes,
          }
        }
      }

      updatedStudentsList.sort((a, b) =>
        formatDisplayName(a).localeCompare(formatDisplayName(b))
      )
      setStudents(updatedStudentsList)
      setGradeDrafts(nextDrafts)
      if (!selectedStudentId && updatedStudentsList[0]) {
        setSelectedStudentId(updatedStudentsList[0].id)
      }
      setFeedback(
        'Processed sheet "' +
          parsed.sheetName +
          '": ' +
          matchedCount +
          ' student(s) detected (' +
          importedNewCount +
          ' newly added, ' +
          gradesSyncedCount +
          ' with grades). Click Save All Grades if grades were imported.'
      )
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse spreadsheet.')
    }
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
        const vCc1 = parseScore(d.cc1)
        const vCc2 = parseScore(d.cc2)
        const vEx = parseScore(d.ex)
        return {
          semi_module_id: classMeta.id,
          student_id: st.id,
          cc1: vCc1,
          cc2: vCc2,
          ex: vEx,
          midterm: vCc1,
          post_midterm: vCc2,
          final_exam: vEx,
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
    if (!studentCode.trim() || !firstName.trim()) return

    setSavingStudent(true)
    setError(null)
    setFeedback(null)
    pushSnapshot(editingStudent ? 'Edit student' : 'Add student')
    const supabase = createClient()

    try {
      const codeClean = studentCode.trim()
      const cneClean = cne.trim() || null
      const firstClean = firstName.trim()
      const lastClean = lastName.trim()
      const emailClean = email.trim() || null

      if (editingStudent) {
        const { data: updated, error: upErr } = await supabase
          .from('students')
          .update({
            student_code: codeClean,
            cne: cneClean,
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
            .sort((a, b) => formatDisplayName(a).localeCompare(formatDisplayName(b)))
        )
      } else {
        const { data: upserted, error: stErr } = await supabase
          .from('students')
          .upsert(
            {
              student_code: codeClean,
              cne: cneClean,
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
            { semi_module_id: classMeta.id, student_id: upserted.id },
            { onConflict: 'semi_module_id,student_id' }
          )

        if (enrErr) {
          setError(enrErr.message)
          return
        }

        setStudents((prev) => {
          const filtered = prev.filter((s) => s.id !== upserted.id)
          return [...filtered, upserted as StudentItem].sort((a, b) =>
            formatDisplayName(a).localeCompare(formatDisplayName(b))
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
    pushSnapshot('Remove student from class')
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
    setSelectedIds((prev) => prev.filter((id) => id !== studentId))
    router.refresh()
  }

  async function handleBulkRemoveFromClass() {
    if (selectedIds.length === 0) return
    if (!window.confirm(t.bulkRemoveConfirm(selectedIds.length))) return
    setError(null)
    pushSnapshot('Remove ' + selectedIds.length + ' student(s) from class')
    const supabase = createClient()

    const { error: delErr } = await supabase
      .from('student_enrollments')
      .delete()
      .eq('semi_module_id', classMeta.id)
      .in('student_id', selectedIds)

    if (delErr) {
      setError(delErr.message)
      return
    }

    const removedSet = new Set(selectedIds)
    setStudents((prev) => prev.filter((s) => !removedSet.has(s.id)))
    setSelectedIds([])
    setFeedback('Removed selected student(s) from this class.')
    router.refresh()
  }

  async function handleBulkDeleteStudentsPermanently() {
    if (selectedIds.length === 0) return
    if (!window.confirm(t.bulkDeleteConfirm(selectedIds.length))) return
    setError(null)
    pushSnapshot('Delete ' + selectedIds.length + ' student record(s)')
    const supabase = createClient()

    const { error: delErr } = await supabase
      .from('students')
      .delete()
      .in('id', selectedIds)

    if (delErr) {
      setError(delErr.message)
      return
    }

    const deletedSet = new Set(selectedIds)
    setStudents((prev) => prev.filter((s) => !deletedSet.has(s.id)))
    setSelectedIds([])
    setFeedback('Deleted selected student record(s) from database.')
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

    pushSnapshot('Import CSV ' + file.name)

    const firstRow = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
    const hasHeader =
      firstRow.includes('student_code') ||
      firstRow.includes('matricule') ||
      firstRow.includes('code') ||
      firstRow.includes('first_name') ||
      firstRow.includes('nom')

    const startIndex = hasHeader ? 1 : 0
    const codeIdx = hasHeader
      ? Math.max(
          firstRow.indexOf('student_code'),
          firstRow.indexOf('matricule'),
          firstRow.indexOf('code'),
          0
        )
      : 0
    const cneIdx = hasHeader ? firstRow.indexOf('cne') : -1
    const firstIdx = hasHeader
      ? Math.max(firstRow.indexOf('first_name'), firstRow.indexOf('prenom'), 1)
      : 1
    const lastIdx = hasHeader
      ? Math.max(firstRow.indexOf('last_name'), firstRow.indexOf('nom'), 2)
      : 2
    const emailIdx = hasHeader ? firstRow.indexOf('email') : 3

    const rowsToImport: {
      student_code: string
      cne: string | null
      first_name: string
      last_name: string
      email: string | null
      home_department_id: string | null
      cohort_level: string
      is_active: boolean
    }[] = []

    for (let i = startIndex; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i])
      const codeVal =
        cols[codeIdx]?.trim() ||
        'CSV-' + String(rowsToImport.length + 1).padStart(3, '0')
      const cneVal = cneIdx >= 0 ? cols[cneIdx]?.trim() || null : null
      const firstVal = cols[firstIdx]?.trim() || 'Student'
      const lastVal = cols[lastIdx]?.trim() || ''
      const emailVal = emailIdx >= 0 ? cols[emailIdx]?.trim() || null : null

      if (!firstVal && !lastVal && !cneVal) continue

      rowsToImport.push({
        student_code: codeVal,
        cne: cneVal,
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
        formatDisplayName(a).localeCompare(formatDisplayName(b))
      )
    })

    setGradeDrafts((prev) => {
      const next = { ...prev }
      for (const s of upsertedStudents) {
        if (!next[s.id]) {
          next[s.id] = { cc1: '', cc2: '', ex: '', notes: '' }
        }
      }
      return next
    })

    if (!selectedStudentId && upsertedStudents[0]) {
      setSelectedStudentId(upsertedStudents[0].id)
    }

    setFeedback(upsertedStudents.length + ' student(s) imported into this class.')
    router.refresh()
  }

  async function handleRecordAbsence(e: FormEvent) {
    e.preventDefault()
    if (!selectedStudentId || !sessionDate) return

    setSavingAbsence(true)
    setError(null)
    pushSnapshot('Record absence')
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
          (a) => !(a.student_id === saved.student_id && a.session_date === saved.session_date)
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
    pushSnapshot('Delete absence entry')
    const supabase = createClient()
    const { error: delErr } = await supabase.from('student_absences').delete().eq('id', id)
    if (!delErr) {
      setAbsences((prev) => prev.filter((a) => a.id !== id))
      router.refresh()
    }
  }

  const gradedSummaries = students
    .map((s) => getSummaryForStudent(s.id))
    .filter((sum) => sum.average20 !== null)

  const classAverage =
    gradedSummaries.length > 0
      ? (gradedSummaries.reduce((acc, s) => acc + (s.average20 ?? 0), 0) / gradedSummaries.length).toFixed(2)
      : '--'

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <Link
            href={'/departments/' + classMeta.department_id}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.backToDept}
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {classTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {deptName} | Year {classMeta.year_level} | {students.length} students
            {classMeta.room_number ? ' | ' + classMeta.room_number : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {historyStack.length > 0 && (
            <button
              type="button"
              disabled={reverting}
              onClick={() => void handleUndo()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Undo2 className="h-3.5 w-3.5" />
              {reverting ? 'Reverting...' : t.undoAction + ' (' + historyStack.length + ')'}
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            {t.downloadTemplate}
          </button>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            <Upload className="h-3.5 w-3.5" />
            {t.importCsv}
            <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="hidden" />
          </label>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 dark:hover:bg-amber-950">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {t.importPv}
            <input type="file" accept=".xls,.xlsx,.csv" onChange={handlePvFileUpload} className="hidden" />
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

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={
            activeTab === 'roster'
              ? 'cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition'
              : 'cursor-pointer rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800'
          }
        >
          {t.tabRoster} ({students.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('absences')}
          className={
            activeTab === 'absences'
              ? 'cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition'
              : 'cursor-pointer rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800'
          }
        >
          {t.tabAbsences} ({absences.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('grades')}
          className={
            activeTab === 'grades'
              ? 'cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition'
              : 'cursor-pointer rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800'
          }
        >
          {t.tabGrades}
        </button>
      </div>

      {activeTab === 'roster' && (
        <div className="space-y-3">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.csvHint}</p>

            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {selectedIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => void handleBulkRemoveFromClass()}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                >
                  {t.removeSelected}
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkDeleteStudentsPermanently()}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t.deleteSelectedPermanently}
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="w-10 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={students.length > 0 && selectedIds.length === students.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all students"
                      className="h-4 w-4 cursor-pointer rounded border-slate-300"
                    />
                  </th>
                  <th className="px-5 py-3.5">{t.codeCol}</th>
                  <th className="px-5 py-3.5">{t.cneCol}</th>
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
                  const isChecked = selectedIds.includes(st.id)
                  const displayName = formatDisplayName(st)
                  return (
                    <tr
                      key={st.id}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectStudent(st.id)}
                          aria-label={'Select ' + displayName}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300"
                        />
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {st.student_code}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {st.cne || '--'}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                        <Link
                          href={'/students/' + st.id}
                          className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                        >
                          {displayName}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {st.email || '--'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={
                            overLimit
                              ? 'inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : absCount > 0
                                ? 'inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }
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
                            onClick={() => void handleRemoveFromClass(st.id)}
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
                    {st.student_code} - {formatDisplayName(st)}
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
                  setAbsenceStatus(e.target.value as 'absent' | 'late' | 'excused')
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
                          ? formatDisplayName(st) + ' (' + st.student_code + ')'
                          : rec.student_id}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={
                            rec.status === 'absent'
                              ? 'inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : rec.status === 'late'
                                ? 'inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          }
                        >
                          {rec.status === 'absent'
                            ? t.statusAbsent
                            : rec.status === 'late'
                              ? t.statusLate
                              : t.statusExcused}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {rec.reason || '--'}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => void handleDeleteAbsence(rec.id)}
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
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.gradebookHint}</p>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>
                  {t.classAverageLabel}:{' '}
                  <strong className="text-blue-600 dark:text-blue-400">
                    {classAverage} / 20
                  </strong>
                </span>
                <span>
                  {t.gradedCountLabel}: {gradedSummaries.length} / {students.length}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportOfficialPv}
                disabled={students.length === 0}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 dark:hover:bg-amber-950"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {t.exportPv}
              </button>

              <button
                type="button"
                onClick={handleExportGradesCsv}
                disabled={students.length === 0}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                {t.exportGradesCsv}
              </button>

              <button
                type="button"
                onClick={() => void handleSaveAllGrades()}
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
                  <th className="px-4 py-3.5">{t.cc1Col}</th>
                  <th className="px-4 py-3.5">{t.cc2Col}</th>
                  <th className="px-4 py-3.5">{t.exCol}</th>
                  <th className="px-4 py-3.5">{t.averageCol}</th>
                  <th className="px-4 py-3.5">{t.remarksCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {students.map((st) => {
                  const draft = ensureDraft(st.id)
                  const summary = getSummaryForStudent(st.id)
                  const passing = summary.average20 !== null && summary.average20 >= 10
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
                          href={'/students/' + st.id}
                          className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                        >
                          {formatDisplayName(st)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          value={draft.cc1}
                          onChange={(e) => updateGradeField(st.id, 'cc1', e.target.value)}
                          placeholder="--"
                          className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          value={draft.cc2}
                          onChange={(e) => updateGradeField(st.id, 'cc2', e.target.value)}
                          placeholder="--"
                          className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          value={draft.ex}
                          onChange={(e) => updateGradeField(st.id, 'ex', e.target.value)}
                          placeholder="--"
                          className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {summary.average20 !== null ? (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={
                                passing
                                  ? 'inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'inline-flex w-fit rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              }
                            >
                              {summary.average20.toFixed(2)} / 20
                            </span>
                            {summary.percentage !== null && (
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {summary.percentage.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={draft.notes}
                          onChange={(e) => updateGradeField(st.id, 'notes', e.target.value)}
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
              <div className="grid grid-cols-2 gap-3">
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

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.cneLabel}
                  </label>
                  <input
                    type="text"
                    value={cne}
                    onChange={(e) => setCne(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
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