'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  CalendarClock,
  Clock,
  DoorOpen,
  Filter,
  RotateCcw,
  UserCheck,
} from 'lucide-react'

export interface DepartmentFilterOption {
  id: string
  code: string
  name_en: string
  name_fr: string
}

export interface ProfessorFilterOption {
  id: string
  full_name: string
  email: string
}

export interface ScheduleSlotItem {
  id: string
  subject: 'english' | 'french'
  course_format: 'full_module' | 'semi_module'
  term_block: 'full_16w' | 'block_1_8w' | 'block_2_8w'
  group_name: string
  title_en: string
  title_fr: string
  room_number: string | null
  schedule_note: string | null
  year_level: number
  department_id: string
  department_code: string
  department_name_en: string
  department_name_fr: string
  department_color: string
  professor_id: string | null
  professor_name: string | null
}

interface SchedulesClientProps {
  semesterLabel: string
  slots: ScheduleSlotItem[]
  departments: DepartmentFilterOption[]
  professors: ProfessorFilterOption[]
  locale: 'en' | 'fr'
}

const COPY = {
  en: {
    title: 'Summative Professor Schedule',
    subtitle:
      'Complete overview of all teaching time slots, classrooms, formats, and rotation blocks across professors.',
    filterProfessor: 'Professor',
    allProfessors: 'All Professors',
    unassignedFilter: 'Unassigned Slots',
    filterDepartment: 'Department',
    allDepartments: 'All Departments',
    filterLanguage: 'Language',
    allLanguages: 'All Languages',
    english: 'English',
    french: 'French',
    filterFormat: 'Course Format',
    allFormats: 'All Formats',
    fullModule: 'Full Module (16w)',
    semiModule: 'Semi-Module (8w)',
    resetFilters: 'Reset Filters',
    unassignedLabel: 'Unassigned Professor',
    slotsCount: (n: number) => `${n} ${n === 1 ? 'Slot' : 'Slots'}`,
    yearLabel: (y: number) => `Year ${y}`,
    roomTbd: 'Room TBD',
    scheduleTbd: 'Schedule TBD',
    badgeFull: 'Full Module • 16w',
    badgeSemi1: 'Semi-Module • Weeks 1–8',
    badgeSemi2: 'Semi-Module • Weeks 9–16',
    openWorkspace: 'Open Class',
    empty: 'No scheduled time slots match the selected filters for this semester.',
  },
  fr: {
    title: 'Emploi du Temps Sommatif des Professeurs',
    subtitle:
      'Vue complète de tous les créneaux horaires, salles, formats et blocs de rotation par professeur.',
    filterProfessor: 'Professeur',
    allProfessors: 'Tous les professeurs',
    unassignedFilter: 'Créneaux non assignés',
    filterDepartment: 'Département',
    allDepartments: 'Tous les départements',
    filterLanguage: 'Langue',
    allLanguages: 'Toutes les langues',
    english: 'Anglais',
    french: 'Français',
    filterFormat: 'Format du cours',
    allFormats: 'Tous les formats',
    fullModule: 'Module Complet (16s)',
    semiModule: 'Semi-Module (8s)',
    resetFilters: 'Réinitialiser',
    unassignedLabel: 'Professeur non assigné',
    slotsCount: (n: number) => `${n} ${n === 1 ? 'Créneau' : 'Créneaux'}`,
    yearLabel: (y: number) => (y === 1 ? '1ère Année' : `${y}ème Année`),
    roomTbd: 'Salle à définir',
    scheduleTbd: 'Horaire à définir',
    badgeFull: 'Module Complet • 16 sem.',
    badgeSemi1: 'Semi-Module • Sem. 1–8',
    badgeSemi2: 'Semi-Module • Sem. 9–16',
    openWorkspace: 'Ouvrir',
    empty: 'Aucun créneau ne correspond aux filtres sélectionnés pour ce semestre.',
  },
} as const

export default function SchedulesClient({
  semesterLabel,
  slots,
  departments,
  professors,
  locale,
}: SchedulesClientProps) {
  const t = COPY[locale]

  const [professorFilter, setProfessorFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [languageFilter, setLanguageFilter] = useState<string>('all')
  const [formatFilter, setFormatFilter] = useState<string>('all')

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (professorFilter === 'unassigned' && slot.professor_id !== null) {
        return false
      }
      if (
        professorFilter !== 'all' &&
        professorFilter !== 'unassigned' &&
        slot.professor_id !== professorFilter
      ) {
        return false
      }
      if (
        departmentFilter !== 'all' &&
        slot.department_id !== departmentFilter
      ) {
        return false
      }
      if (languageFilter !== 'all' && slot.subject !== languageFilter) {
        return false
      }
      if (formatFilter !== 'all' && slot.course_format !== formatFilter) {
        return false
      }
      return true
    })
  }, [slots, professorFilter, departmentFilter, languageFilter, formatFilter])

  const groupedByProfessor = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        name: string
        isUnassigned: boolean
        items: ScheduleSlotItem[]
      }
    >()

    for (const slot of filteredSlots) {
      const key = slot.professor_id ?? '__unassigned__'
      const displayName = slot.professor_name || t.unassignedLabel
      const existing = map.get(key)
      if (existing) {
        existing.items.push(slot)
      } else {
        map.set(key, {
          key,
          name: displayName,
          isUnassigned: !slot.professor_id,
          items: [slot],
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.isUnassigned && !b.isUnassigned) return 1
      if (!a.isUnassigned && b.isUnassigned) return -1
      return a.name.localeCompare(b.name)
    })
  }, [filteredSlots, t.unassignedLabel])

  function hasActiveFilters() {
    return (
      professorFilter !== 'all' ||
      departmentFilter !== 'all' ||
      languageFilter !== 'all' ||
      formatFilter !== 'all'
    )
  }

  function resetAll() {
    setProfessorFilter('all')
    setDepartmentFilter('all')
    setLanguageFilter('all')
    setFormatFilter('all')
  }

  function getFormatLabel(slot: ScheduleSlotItem) {
    if (slot.course_format === 'full_module') return t.badgeFull
    return slot.term_block === 'block_2_8w' ? t.badgeSemi2 : t.badgeSemi1
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <CalendarClock className="h-6 w-6 text-blue-600" />
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t.subtitle}
          </p>
        </div>

        {semesterLabel && (
          <span className="inline-flex self-start rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 sm:self-auto">
            {semesterLabel} • {t.slotsCount(filteredSlots.length)}
          </span>
        )}
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            Filters
          </span>

          {hasActiveFilters() && (
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t.resetFilters}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              {t.filterProfessor}
            </label>
            <select
              value={professorFilter}
              onChange={(e) => setProfessorFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">{t.allProfessors}</option>
              <option value="unassigned">{t.unassignedFilter}</option>
              {professors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              {t.filterDepartment}
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">{t.allDepartments}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {locale === 'fr' ? d.name_fr : d.name_en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              {t.filterLanguage}
            </label>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">{t.allLanguages}</option>
              <option value="english">{t.english}</option>
              <option value="french">{t.french}</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              {t.filterFormat}
            </label>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">{t.allFormats}</option>
              <option value="full_module">{t.fullModule}</option>
              <option value="semi_module">{t.semiModule}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grouped Professor Timetables */}
      {groupedByProfessor.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {t.empty}
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByProfessor.map((group) => (
            <section
              key={group.key}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <UserCheck
                    className={`h-4 w-4 ${
                      group.isUnassigned ? 'text-slate-400' : 'text-blue-600'
                    }`}
                  />
                  <h2
                    className={`text-base font-bold ${
                      group.isUnassigned
                        ? 'italic text-slate-500 dark:text-slate-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {group.name}
                  </h2>
                </div>

                <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {t.slotsCount(group.items.length)}
                </span>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {group.items.map((slot) => {
                  const isEnglish = slot.subject === 'english'
                  return (
                    <div
                      key={slot.id}
                      className="flex flex-col justify-between gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30 md:flex-row md:items-center"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {slot.department_code} • {t.yearLabel(slot.year_level)}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                              isEnglish
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                            }`}
                          >
                            {isEnglish ? t.english : t.french} • {slot.group_name}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                            <Clock className="h-3 w-3" />
                            {getFormatLabel(slot)}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {locale === 'fr' ? slot.title_fr : slot.title_en}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium dark:bg-slate-800">
                          <CalendarClock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          {slot.schedule_note || t.scheduleTbd}
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium dark:bg-slate-800">
                          <DoorOpen className="h-3.5 w-3.5 text-slate-500" />
                          {slot.room_number || t.roomTbd}
                        </span>

                        <Link
                          href={`/semi-modules/${slot.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {t.openWorkspace}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}