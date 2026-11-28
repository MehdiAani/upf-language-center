'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface StudentSearchResult {
  id: string
  student_code: string
  cne: string | null
  first_name: string
  last_name: string
  cohort_level: string | null
}

interface GlobalStudentSearchProps {
  locale?: 'en' | 'fr'
}

export function GlobalStudentSearch({ locale = 'en' }: GlobalStudentSearchProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StudentSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const placeholderText =
    locale === 'fr'
      ? 'Rechercher etudiant, CNE, matricule...'
      : 'Search student, CNE, matricule...'

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const escaped = trimmed.replace(/[%_,]/g, '')
        const { data } = await supabase
          .from('students')
          .select('id, student_code, cne, first_name, last_name, cohort_level')
          .or(
            `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,student_code.ilike.%${escaped}%,cne.ilike.%${escaped}%`
          )
          .limit(8)

        if (!cancelled) {
          setResults((data ?? []) as StudentSearchResult[])
          setOpen(true)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }, 180)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  function handleSelectStudent(studentId: string) {
    setOpen(false)
    setQuery('')
    router.push(`/students/${studentId}`)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          placeholder={placeholderText}
          aria-label={placeholderText}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-8 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults([])
              setOpen(false)
            }}
            aria-label="Clear search"
            className="absolute right-2 cursor-pointer rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute right-0 left-0 z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {loading ? (
            <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
              {locale === 'fr' ? 'Recherche en cours...' : 'Searching...'}
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
              {locale === 'fr'
                ? 'Aucun etudiant trouve.'
                : 'No matching students found.'}
            </div>
          ) : (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {results.map((st) => (
                <li key={st.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectStudent(st.id)}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {st.last_name.toUpperCase()} {st.first_name}
                      </p>
                      <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                        {st.student_code}
                        {st.cne ? ` | CNE: ${st.cne}` : ''}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                      <GraduationCap className="h-3 w-3" />
                      {st.cohort_level ? `Y${st.cohort_level}` : 'Profile'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}