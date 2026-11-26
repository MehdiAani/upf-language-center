'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Clock, Globe, LogOut, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/app/theme-toggle'

const COPY = {
  en: {
    subtitle: 'UPF Language Center',
    title: 'Account pending approval',
    body: 'Your account has been created and is waiting for an administrator to assign your role (Admin, Department Head, or Professor).',
    checkBtn: 'Check status / Go to Dashboard',
    checking: 'Checking...',
    signOutBtn: 'Sign out',
    switchLang: 'Français',
  },
  fr: {
    subtitle: 'Centre de Langues UPF',
    title: 'Compte en attente de validation',
    body: 'Votre compte a bien été créé et attend qu’un administrateur vous attribue un rôle (Administrateur, Chef de département ou Professeur).',
    checkBtn: 'Vérifier le statut / Accéder au tableau de bord',
    checking: 'Vérification...',
    signOutBtn: 'Se déconnecter',
    switchLang: 'English',
  },
} as const

export default function PendingPage() {
  const router = useRouter()
  const rawLocale = useLocale()
  const locale = rawLocale === 'fr' ? 'fr' : 'en'
  const t = COPY[locale]

  const [checking, setChecking] = useState(false)

  function toggleLocale() {
    const nextLocale = locale === 'en' ? 'fr' : 'en'
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  function handleCheckStatus() {
    setChecking(true)
    router.push('/dashboard')
    router.refresh()
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 transition-colors dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-400">
                {t.subtitle}
              </p>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLocale}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Globe className="h-3.5 w-3.5" />
              {t.switchLang}
            </button>
            <ThemeToggle />
          </div>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {t.body}
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={checking}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? t.checking : t.checkBtn}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" />
            {t.signOutBtn}
          </button>
        </div>
      </div>
    </main>
  )
}