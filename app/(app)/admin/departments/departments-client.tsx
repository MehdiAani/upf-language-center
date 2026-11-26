'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  Archive,
  CalendarRange,
  CheckCircle2,
  Pencil,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface DepartmentRow {
  id: string
  code: string
  name_en: string
  name_fr: string
  description_en: string | null
  description_fr: string | null
  color_accent: string
  is_active: boolean
}

export interface SemesterRow {
  id: string
  code: string
  label_en: string
  label_fr: string
  academic_year: string
  term_number: number
  is_current: boolean
}

interface DepartmentsClientProps {
  initialDepartments: DepartmentRow[]
  initialSemesters: SemesterRow[]
  locale: 'en' | 'fr'
}

const COPY = {
  en: {
    title: 'Departments & Semesters',
    subtitle:
      'Manage UPF departments, codes, bilingual names, accent colors, and cumulative academic semesters.',
    addDept: 'Add Department',
    editTitle: 'Edit Department',
    addTitle: 'Add Department',
    code: 'Code',
    codePlaceholder: 'e.g. ESMAB, FSI, FBS, HEALTH',
    nameEn: 'Name (English)',
    nameFr: 'Name (French)',
    color: 'Accent Color',
    status: 'Status',
    actions: 'Actions',
    active: 'Active',
    archived: 'Archived',
    archive: 'Archive',
    restore: 'Restore',
    save: 'Save Department',
    saving: 'Saving...',
    cancel: 'Cancel',
    empty: 'No departments found.',
    semestersTitle: 'Academic Semesters (Cumulative History)',
    semestersSubtitle:
      'Add new semesters as terms progress. Past semesters remain stored for student grade and attendance progression.',
    addSemester: 'Add Semester',
    semCodeLabel: 'Semester Code',
    semCodePlaceholder: 'e.g. 2026-2027-S2',
    academicYearLabel: 'Academic Year',
    academicYearPlaceholder: 'e.g. 2026-2027',
    termNumberLabel: 'Term #',
    labelEnLabel: 'Label (English)',
    labelEnPlaceholder: 'e.g. 2026-2027 - Semester 2',
    labelFrLabel: 'Label (French)',
    labelFrPlaceholder: 'e.g. 2026-2027 - Semestre 2',
    setCurrent: 'Set as Default',
    currentBadge: 'Current Default',
    termBadge: (n: number) => `Term ${n}`,
    saveSemester: 'Save Semester',
    savingSemester: 'Adding...',
    semCreatedMsg: 'New semester added. Prior semesters and records remain preserved.',
    currentUpdatedMsg: 'Default semester updated.',
  },
  fr: {
    title: 'Départements & Semestres',
    subtitle:
      'Gérez les départements de l’UPF, leurs codes, noms bilingues, couleurs et semestres académiques.',
    addDept: 'Ajouter un département',
    editTitle: 'Modifier le département',
    addTitle: 'Ajouter un département',
    code: 'Code',
    codePlaceholder: 'ex. ESMAB, FSI, FBS, HEALTH',
    nameEn: 'Nom (Anglais)',
    nameFr: 'Nom (Français)',
    color: 'Couleur',
    status: 'Statut',
    actions: 'Actions',
    active: 'Actif',
    archived: 'Archivé',
    archive: 'Archiver',
    restore: 'Restaurer',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    cancel: 'Annuler',
    empty: 'Aucun département trouvé.',
    semestersTitle: 'Semestres Académiques (Historique Cumulatif)',
    semestersSubtitle:
      'Ajoutez de nouveaux semestres au fil du temps. Les semestres précédents restent conservés pour le suivi des étudiants.',
    addSemester: 'Ajouter un semestre',
    semCodeLabel: 'Code du semestre',
    semCodePlaceholder: 'ex. 2026-2027-S2',
    academicYearLabel: 'Année universitaire',
    academicYearPlaceholder: 'ex. 2026-2027',
    termNumberLabel: 'N° Semestre',
    labelEnLabel: 'Libellé (Anglais)',
    labelEnPlaceholder: 'ex. 2026-2027 - Semester 2',
    labelFrLabel: 'Libellé (Français)',
    labelFrPlaceholder: 'ex. 2026-2027 - Semestre 2',
    setCurrent: 'Définir par défaut',
    currentBadge: 'Par défaut',
    termBadge: (n: number) => `Semestre ${n}`,
    saveSemester: 'Enregistrer le semestre',
    savingSemester: 'Ajout...',
    semCreatedMsg:
      'Nouveau semestre ajouté. Les semestres précédents et leurs données sont conservés.',
    currentUpdatedMsg: 'Semestre par défaut mis à jour.',
  },
} as const

export default function DepartmentsClient({
  initialDepartments,
  initialSemesters,
  locale,
}: DepartmentsClientProps) {
  const router = useRouter()
  const t = COPY[locale]

  const [departments, setDepartments] = useState<DepartmentRow[]>(initialDepartments)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [nameFr, setNameFr] = useState('')
  const [colorAccent, setColorAccent] = useState('#1d4ed8')
  const [saving, setSaving] = useState(false)

  // Cumulative Semesters state
  const [semesters, setSemesters] = useState<SemesterRow[]>(initialSemesters)
  const [semModalOpen, setSemModalOpen] = useState(false)
  const [semCode, setSemCode] = useState('')
  const [academicYear, setAcademicYear] = useState('2026-2027')
  const [termNumber, setTermNumber] = useState(2)
  const [labelEn, setLabelEn] = useState('')
  const [labelFr, setLabelFr] = useState('')
  const [makeCurrent, setMakeCurrent] = useState(false)
  const [savingSem, setSavingSem] = useState(false)

  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function openAdd() {
    setEditingId(null)
    setCode('')
    setNameEn('')
    setNameFr('')
    setColorAccent('#1d4ed8')
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  function openEdit(dept: DepartmentRow) {
    setEditingId(dept.id)
    setCode(dept.code)
    setNameEn(dept.name_en)
    setNameFr(dept.name_fr)
    setColorAccent(dept.color_accent || '#1d4ed8')
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  function openAddSemester() {
    setSemCode('')
    setAcademicYear('2026-2027')
    setTermNumber(2)
    setLabelEn('')
    setLabelFr('')
    setMakeCurrent(false)
    setError(null)
    setFeedback(null)
    setSemModalOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!code.trim() || !nameEn.trim() || !nameFr.trim()) return

    setSaving(true)
    setError(null)
    const supabase = createClient()

    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name_en: nameEn.trim(),
        name_fr: nameFr.trim(),
        color_accent: colorAccent,
      }

      if (editingId) {
        const { data: updated, error: err } = await supabase
          .from('departments')
          .update(payload)
          .eq('id', editingId)
          .select()
          .single()

        if (err) {
          setError(err.message)
          return
        }

        setDepartments((prev) =>
          prev.map((d) => (d.id === editingId ? (updated as DepartmentRow) : d))
        )
      } else {
        const { data: inserted, error: err } = await supabase
          .from('departments')
          .insert({ ...payload, is_active: true })
          .select()
          .single()

        if (err) {
          setError(err.message)
          return
        }

        setDepartments((prev) =>
          [...prev, inserted as DepartmentRow].sort((a, b) =>
            a.code.localeCompare(b.code)
          )
        )
      }

      setModalOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleArchive(dept: DepartmentRow) {
    setError(null)
    const supabase = createClient()
    const nextActive = !dept.is_active

    const { error: err } = await supabase
      .from('departments')
      .update({ is_active: nextActive })
      .eq('id', dept.id)

    if (err) {
      setError(err.message)
      return
    }

    setDepartments((prev) =>
      prev.map((d) => (d.id === dept.id ? { ...d, is_active: nextActive } : d))
    )
    router.refresh()
  }

  async function handleSaveSemester(e: FormEvent) {
    e.preventDefault()
    if (!semCode.trim() || !labelEn.trim() || !labelFr.trim()) return

    setSavingSem(true)
    setError(null)
    setFeedback(null)
    const supabase = createClient()

    try {
      if (makeCurrent) {
        await supabase.from('semesters').update({ is_current: false }).neq('id', '')
      }

      const { data: inserted, error: err } = await supabase
        .from('semesters')
        .insert({
          code: semCode.trim(),
          academic_year: academicYear.trim() || '2026-2027',
          term_number: Number(termNumber) || 1,
          label_en: labelEn.trim(),
          label_fr: labelFr.trim(),
          is_current: makeCurrent,
        })
        .select()
        .single()

      if (err || !inserted) {
        setError(err?.message ?? 'Could not create semester.')
        return
      }

      const created = inserted as SemesterRow
      setSemesters((prev) => {
        const updatedList = makeCurrent
          ? prev.map((s) => ({ ...s, is_current: false }))
          : prev
        return [created, ...updatedList]
      })

      setSemModalOpen(false)
      setFeedback(t.semCreatedMsg)
      router.refresh()
    } finally {
      setSavingSem(false)
    }
  }

  async function handleSetCurrentSemester(semId: string) {
    setError(null)
    setFeedback(null)
    const supabase = createClient()

    const { error: clearErr } = await supabase
      .from('semesters')
      .update({ is_current: false })
      .neq('id', '')

    if (clearErr) {
      setError(clearErr.message)
      return
    }

    const { error: setErr } = await supabase
      .from('semesters')
      .update({ is_current: true })
      .eq('id', semId)

    if (setErr) {
      setError(setErr.message)
      return
    }

    setSemesters((prev) =>
      prev.map((s) => ({ ...s, is_current: s.id === semId }))
    )
    setFeedback(t.currentUpdatedMsg)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex cursor-pointer items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {t.addDept}
        </button>
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

      {/* Departments Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3.5">{t.code}</th>
              <th className="px-5 py-3.5">{t.nameEn}</th>
              <th className="px-5 py-3.5">{t.nameFr}</th>
              <th className="px-5 py-3.5">{t.color}</th>
              <th className="px-5 py-3.5">{t.status}</th>
              <th className="px-5 py-3.5">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {departments.map((dept) => (
              <tr
                key={dept.id}
                className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
              >
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                  {dept.code}
                </td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                  {dept.name_en}
                </td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                  {dept.name_fr}
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-700"
                      style={{ backgroundColor: dept.color_accent }}
                    />
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {dept.color_accent}
                    </span>
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      dept.is_active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {dept.is_active ? t.active : t.archived}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(dept)}
                      aria-label={t.editTitle}
                      className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleArchive(dept)}
                      aria-label={dept.is_active ? t.archive : t.restore}
                      className={`cursor-pointer rounded-lg p-1.5 transition ${
                        dept.is_active
                          ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50'
                      }`}
                    >
                      {dept.is_active ? (
                        <Archive className="h-4 w-4" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {departments.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  {t.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cumulative Semesters Section */}
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <CalendarRange className="h-5 w-5 text-blue-600" />
              {t.semestersTitle}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.semestersSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={openAddSemester}
            className="inline-flex cursor-pointer items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            {t.addSemester}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {semesters.map((sem) => (
            <div
              key={sem.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {sem.code}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {t.termBadge(sem.term_number)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  {locale === 'fr' ? sem.label_fr : sem.label_en}
                </p>
              </div>

              {sem.is_current ? (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                  {t.currentBadge}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetCurrentSemester(sem.id)}
                  className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t.setCurrent}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Department Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? t.editTitle : t.addTitle}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.code}
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t.codePlaceholder}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 uppercase focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.nameEn}
                </label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.nameFr}
                </label>
                <input
                  type="text"
                  required
                  value={nameFr}
                  onChange={(e) => setNameFr(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.color}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={colorAccent}
                    onChange={(e) => setColorAccent(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-transparent p-1 dark:border-slate-700"
                  />
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {colorAccent}
                  </span>
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

      {/* Add Semester Modal */}
      {semModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.addSemester}
              </h2>
              <button
                type="button"
                onClick={() => setSemModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSemester} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.semCodeLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={semCode}
                    onChange={(e) => setSemCode(e.target.value)}
                    placeholder={t.semCodePlaceholder}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.termNumberLabel}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    required
                    value={termNumber}
                    onChange={(e) => setTermNumber(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.academicYearLabel}
                </label>
                <input
                  type="text"
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder={t.academicYearPlaceholder}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.labelEnLabel}
                </label>
                <input
                  type="text"
                  required
                  value={labelEn}
                  onChange={(e) => setLabelEn(e.target.value)}
                  placeholder={t.labelEnPlaceholder}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.labelFrLabel}
                </label>
                <input
                  type="text"
                  required
                  value={labelFr}
                  onChange={(e) => setLabelFr(e.target.value)}
                  placeholder={t.labelFrPlaceholder}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={makeCurrent}
                  onChange={(e) => setMakeCurrent(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>{t.setCurrent}</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSemModalOpen(false)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingSem}
                  className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingSem ? t.savingSemester : t.saveSemester}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}