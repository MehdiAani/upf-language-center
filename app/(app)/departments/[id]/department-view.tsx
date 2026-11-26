'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  DoorOpen,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface DepartmentInfo {
  id: string
  code: string
  name_en: string
  name_fr: string
  color_accent: string
}

export interface ProfessorOption {
  id: string
  full_name: string
  email: string
  role: string
}

export type CourseFormat = 'full_module' | 'semi_module'
export type TermBlock = 'full_16w' | 'block_1_8w' | 'block_2_8w'

export interface ClassItem {
  id: string
  module_id: string
  year_level: number
  subject: 'english' | 'french'
  course_format: CourseFormat
  term_block: TermBlock
  group_name: string
  title_en: string
  title_fr: string
  professor_id: string | null
  room_number: string | null
  schedule_note: string | null
  max_absences_allowed: number
}

interface DepartmentViewProps {
  department: DepartmentInfo
  semesterId: string
  semesterLabel: string
  initialClasses: ClassItem[]
  professors: ProfessorOption[]
  canManage: boolean
  locale: 'en' | 'fr'
}

const YEARS = [1, 2, 3, 4, 5] as const

const COPY = {
  en: {
    back: 'Back to Dashboard',
    yearTab: (y: number) => `Year ${y}`,
    addClass: 'Add Course / Class',
    englishSection: 'English Courses',
    frenchSection: 'French Courses',
    noClasses: 'No courses configured for this track yet.',
    unassigned: 'Unassigned',
    roomPlaceholder: 'Room TBD',
    schedulePlaceholder: 'Schedule TBD',
    openRoster: 'Roster, CSV Import, Absences & Grades',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Delete this course? This cannot be undone.',
    modalAddTitle: 'Add Language Course',
    modalEditTitle: 'Edit Language Course',
    subjectLabel: 'Language Track',
    english: 'English',
    french: 'French',
    formatLabel: 'Course Format & Duration',
    fullModuleOption: 'Full Module (16 Weeks)',
    semiModuleOption: 'Semi-Module (8 Weeks)',
    blockLabel: 'Rotation Period',
    blockFull16w: 'Full Semester (Weeks 1–16)',
    block1_8w: '1st Half — Block 1 (Weeks 1–8)',
    block2_8w: '2nd Half — Block 2 (Weeks 9–16)',
    badgeFullModule: 'Full Module • 16w',
    badgeSemiBlock1: 'Semi-Module • Weeks 1–8',
    badgeSemiBlock2: 'Semi-Module • Weeks 9–16',
    groupLabel: 'Group / Class Name',
    groupPlaceholder: 'e.g. DAI2, Group A, G1',
    professorLabel: 'Assigned Professor',
    noProfessor: 'Unassigned (assign later)',
    roomLabel: 'Classroom',
    roomInputPlaceholder: 'e.g. Room B12, Amphi A',
    scheduleLabel: 'Schedule Note',
    scheduleInputPlaceholder: 'e.g. Mon 10:00 - 12:00',
    cancel: 'Cancel',
    save: 'Save Course',
    saving: 'Saving...',
  },
  fr: {
    back: 'Retour au tableau de bord',
    yearTab: (y: number) => (y === 1 ? '1ere Annee' : `${y}eme Annee`),
    addClass: 'Ajouter un cours',
    englishSection: "Cours d'Anglais",
    frenchSection: 'Cours de Francais',
    noClasses: 'Aucun cours configure pour cette langue.',
    unassigned: 'Non assigne',
    roomPlaceholder: 'Salle a definir',
    schedulePlaceholder: 'Horaire a definir',
    openRoster: 'Liste, Import CSV, Absences & Notes',
    edit: 'Modifier',
    delete: 'Supprimer',
    confirmDelete: 'Supprimer ce cours ? Cette action est irreversible.',
    modalAddTitle: 'Ajouter un cours de langue',
    modalEditTitle: 'Modifier le cours de langue',
    subjectLabel: 'Langue',
    english: 'Anglais',
    french: 'Francais',
    formatLabel: 'Format & Duree du cours',
    fullModuleOption: 'Module Complet (16 Semaines)',
    semiModuleOption: 'Semi-Module (8 Semaines)',
    blockLabel: 'Periode / Rotation',
    blockFull16w: 'Semestre Complet (Semaines 1–16)',
    block1_8w: '1ere Moitie — Bloc 1 (Semaines 1–8)',
    block2_8w: '2eme Moitie — Bloc 2 (Semaines 9–16)',
    badgeFullModule: 'Module Complet • 16 sem.',
    badgeSemiBlock1: 'Semi-Module • Sem. 1–8',
    badgeSemiBlock2: 'Semi-Module • Sem. 9–16',
    groupLabel: 'Nom du groupe / classe',
    groupPlaceholder: 'ex. DAI2, Groupe A, G1',
    professorLabel: 'Professeur assigne',
    noProfessor: 'Non assigne (assigner plus tard)',
    roomLabel: 'Salle de classe',
    roomInputPlaceholder: 'ex. Salle B12, Amphi A',
    scheduleLabel: 'Horaire',
    scheduleInputPlaceholder: 'ex. Lun 10h00 - 12h00',
    cancel: 'Annuler',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
  },
} as const

export default function DepartmentView({
  department,
  semesterId,
  semesterLabel,
  initialClasses,
  professors,
  canManage,
  locale,
}: DepartmentViewProps) {
  const router = useRouter()
  const t = COPY[locale]

  const [selectedYear, setSelectedYear] = useState<number>(1)
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [subject, setSubject] = useState<'english' | 'french'>('english')
  const [courseFormat, setCourseFormat] = useState<CourseFormat>('semi_module')
  const [termBlock, setTermBlock] = useState<TermBlock>('block_1_8w')
  const [groupName, setGroupName] = useState('')
  const [professorId, setProfessorId] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [scheduleNote, setScheduleNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deptName = locale === 'fr' ? department.name_fr : department.name_en
  const yearClasses = classes.filter((c) => c.year_level === selectedYear)
  const englishClasses = yearClasses.filter((c) => c.subject === 'english')
  const frenchClasses = yearClasses.filter((c) => c.subject === 'french')

  function getProfessorName(id: string | null) {
    if (!id) return t.unassigned
    const prof = professors.find((p) => p.id === id)
    return prof ? prof.full_name || prof.email : t.unassigned
  }

  function getFormatBadge(item: ClassItem) {
    if (item.course_format === 'full_module') return t.badgeFullModule
    return item.term_block === 'block_2_8w'
      ? t.badgeSemiBlock2
      : t.badgeSemiBlock1
  }

  function handleFormatSelect(nextFormat: CourseFormat) {
    setCourseFormat(nextFormat)
    if (nextFormat === 'full_module') {
      setTermBlock('full_16w')
    } else if (termBlock === 'full_16w') {
      setTermBlock('block_1_8w')
    }
  }

  function openAddModal(defaultSubject: 'english' | 'french' = 'english') {
    setEditingId(null)
    setSubject(defaultSubject)
    setCourseFormat('semi_module')
    setTermBlock('block_1_8w')
    setGroupName('')
    setProfessorId('')
    setRoomNumber('')
    setScheduleNote('')
    setError(null)
    setModalOpen(true)
  }

  function openEditModal(item: ClassItem) {
    setEditingId(item.id)
    setSubject(item.subject)
    setCourseFormat(item.course_format ?? 'semi_module')
    setTermBlock(
      item.course_format === 'full_module'
        ? 'full_16w'
        : item.term_block === 'block_2_8w'
          ? 'block_2_8w'
          : 'block_1_8w'
    )
    setGroupName(item.group_name)
    setProfessorId(item.professor_id ?? '')
    setRoomNumber(item.room_number ?? '')
    setScheduleNote(item.schedule_note ?? '')
    setError(null)
    setModalOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!groupName.trim() || !semesterId) return

    setSaving(true)
    setError(null)
    const supabase = createClient()

    try {
      const cleanGroup = groupName.trim()
      const resolvedBlock: TermBlock =
        courseFormat === 'full_module' ? 'full_16w' : termBlock

      const blockSuffixEn =
        courseFormat === 'full_module'
          ? 'Full Module'
          : resolvedBlock === 'block_2_8w'
            ? 'Semi-Module B2'
            : 'Semi-Module B1'

      const blockSuffixFr =
        courseFormat === 'full_module'
          ? 'Module Complet'
          : resolvedBlock === 'block_2_8w'
            ? 'Semi-Module B2'
            : 'Semi-Module B1'

      const titleEn = `${subject === 'english' ? 'English' : 'French'} - Year ${selectedYear} (${cleanGroup}) • ${blockSuffixEn}`
      const titleFr = `${subject === 'english' ? 'Anglais' : 'Francais'} - ${
        selectedYear === 1 ? '1ere Annee' : `${selectedYear}eme Annee`
      } (${cleanGroup}) • ${blockSuffixFr}`

      if (editingId) {
        const { data: updated, error: updateErr } = await supabase
          .from('semi_modules')
          .update({
            subject,
            course_format: courseFormat,
            term_block: resolvedBlock,
            group_name: cleanGroup,
            title_en: titleEn,
            title_fr: titleFr,
            professor_id: professorId || null,
            room_number: roomNumber.trim() || null,
            schedule_note: scheduleNote.trim() || null,
          })
          .eq('id', editingId)
          .select()
          .single()

        if (updateErr) {
          setError(updateErr.message)
          return
        }

        setClasses((prev) =>
          prev.map((c) =>
            c.id === editingId
              ? {
                  ...c,
                  subject: updated.subject,
                  course_format: updated.course_format,
                  term_block: updated.term_block,
                  group_name: updated.group_name,
                  title_en: updated.title_en,
                  title_fr: updated.title_fr,
                  professor_id: updated.professor_id,
                  room_number: updated.room_number,
                  schedule_note: updated.schedule_note,
                }
              : c
          )
        )
      } else {
        const { data: existingMod } = await supabase
          .from('modules')
          .select('id')
          .eq('department_id', department.id)
          .eq('semester_id', semesterId)
          .eq('year_level', selectedYear)
          .maybeSingle()

        let moduleId = existingMod?.id

        if (!moduleId) {
          const { data: newMod, error: modErr } = await supabase
            .from('modules')
            .insert({
              department_id: department.id,
              semester_id: semesterId,
              cohort_level: selectedYear,
              year_level: selectedYear,
              code: `${department.code}-Y${selectedYear}`,
              name_en: `${department.code} Year ${selectedYear} Languages`,
              name_fr: `${department.code} ${
                selectedYear === 1 ? '1ere' : `${selectedYear}eme`
              } Annee Langues`,
            })
            .select('id')
            .single()

          if (modErr || !newMod) {
            setError(modErr?.message ?? 'Could not create year module.')
            return
          }
          moduleId = newMod.id
        }

        const { data: inserted, error: insertErr } = await supabase
          .from('semi_modules')
          .insert({
            module_id: moduleId,
            subject,
            course_format: courseFormat,
            term_block: resolvedBlock,
            group_name: cleanGroup,
            title_en: titleEn,
            title_fr: titleFr,
            professor_id: professorId || null,
            room_number: roomNumber.trim() || null,
            schedule_note: scheduleNote.trim() || null,
          })
          .select()
          .single()

        if (insertErr || !inserted) {
          setError(insertErr?.message ?? 'Could not create class.')
          return
        }

        setClasses((prev) => [
          ...prev,
          {
            id: inserted.id,
            module_id: inserted.module_id,
            year_level: selectedYear,
            subject: inserted.subject,
            course_format: inserted.course_format,
            term_block: inserted.term_block,
            group_name: inserted.group_name,
            title_en: inserted.title_en,
            title_fr: inserted.title_fr,
            professor_id: inserted.professor_id,
            room_number: inserted.room_number,
            schedule_note: inserted.schedule_note,
            max_absences_allowed: inserted.max_absences_allowed ?? 3,
          },
        ])
      }

      setModalOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t.confirmDelete)) return
    const supabase = createClient()
    const { error: delErr } = await supabase
      .from('semi_modules')
      .delete()
      .eq('id', id)

    if (!delErr) {
      setClasses((prev) => prev.filter((c) => c.id !== id))
      router.refresh()
    }
  }

  function renderClassCard(item: ClassItem) {
    const isEnglish = item.subject === 'english'
    const isFull = item.course_format === 'full_module'
    return (
      <div
        key={item.id}
        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                  isEnglish
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                }`}
              >
                {item.group_name}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                  isFull
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                }`}
              >
                <Clock className="h-3 w-3" />
                {getFormatBadge(item)}
              </span>
            </div>

            {canManage && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  aria-label={t.edit}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  aria-label={t.delete}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <h3 className="mt-2.5 text-base font-bold text-slate-900 dark:text-white">
            {locale === 'fr' ? item.title_fr : item.title_en}
          </h3>

          <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 shrink-0 text-slate-400" />
              <span
                className={
                  item.professor_id
                    ? 'font-medium text-slate-900 dark:text-slate-200'
                    : 'italic text-slate-400'
                }
              >
                {getProfessorName(item.professor_id)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 shrink-0 text-slate-400" />
              <span>{item.room_number || t.roomPlaceholder}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              <span>{item.schedule_note || t.schedulePlaceholder}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
          <Link
            href={`/semi-modules/${item.id}`}
            className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            <Users className="h-3.5 w-3.5" />
            <span>{t.openRoster}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.back}
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <span
              className="h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: department.color_accent || '#1d4ed8' }}
            />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {deptName}
            </h1>
          </div>
          {semesterLabel && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {semesterLabel}
            </p>
          )}
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => openAddModal('english')}
            className="inline-flex cursor-pointer items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {t.addClass}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {YEARS.map((year) => {
          const count = classes.filter((c) => c.year_level === year).length
          const active = selectedYear === year
          return (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYear(year)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800 dark:hover:bg-slate-800'
              }`}
            >
              {t.yearTab(year)}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  active
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t.englishSection}
            </h2>
            {canManage && (
              <button
                type="button"
                onClick={() => openAddModal('english')}
                className="cursor-pointer text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                + {t.addClass}
              </button>
            )}
          </div>

          {englishClasses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              {t.noClasses}
            </div>
          ) : (
            <div className="space-y-3">{englishClasses.map(renderClassCard)}</div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t.frenchSection}
            </h2>
            {canManage && (
              <button
                type="button"
                onClick={() => openAddModal('french')}
                className="cursor-pointer text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400"
              >
                + {t.addClass}
              </button>
            )}
          </div>

          {frenchClasses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              {t.noClasses}
            </div>
          ) : (
            <div className="space-y-3">{frenchClasses.map(renderClassCard)}</div>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? t.modalEditTitle : t.modalAddTitle} (
                {t.yearTab(selectedYear)})
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.subjectLabel}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSubject('english')}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      subject === 'english'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {t.english}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubject('french')}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      subject === 'french'
                        ? 'border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {t.french}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.formatLabel}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFormatSelect('full_module')}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      courseFormat === 'full_module'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {t.fullModuleOption}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormatSelect('semi_module')}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      courseFormat === 'semi_module'
                        ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {t.semiModuleOption}
                  </button>
                </div>
              </div>

              {courseFormat === 'semi_module' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.blockLabel}
                  </label>
                  <select
                    value={termBlock}
                    onChange={(e) => setTermBlock(e.target.value as TermBlock)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="block_1_8w">{t.block1_8w}</option>
                    <option value="block_2_8w">{t.block2_8w}</option>
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.groupLabel}
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={t.groupPlaceholder}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.professorLabel}
                </label>
                <select
                  value={professorId}
                  onChange={(e) => setProfessorId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">{t.noProfessor}</option>
                  {professors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.roomLabel}
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder={t.roomInputPlaceholder}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.scheduleLabel}
                  </label>
                  <input
                    type="text"
                    value={scheduleNote}
                    onChange={(e) => setScheduleNote(e.target.value)}
                    placeholder={t.scheduleInputPlaceholder}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
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
                  disabled={saving}
                  className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}