'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { ArrowRight, Eye, EyeOff, Globe, Lock, Mail, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/app/theme-toggle'

const COPY = {
  en: {
    subtitle: 'UPF Language Center',
    signInTitle: 'Sign in',
    signUpTitle: 'Create an account',
    fullName: 'Full name',
    fullNamePlaceholder: 'e.g. Mehdi Aani',
    email: 'Email',
    emailPlaceholder: 'name@upf.ac.ma',
    password: 'Password',
    passwordPlaceholder: 'At least 6 characters',
    signInBtn: 'Sign in',
    signUpBtn: 'Create account',
    loading: 'Please wait...',
    noAccount: "Don't have an account?",
    signUpLink: 'Sign up',
    hasAccount: 'Already have an account?',
    signInLink: 'Sign in',
    switchLang: 'Français',
    confirmEmailNotice:
      'Account created! Check your email inbox to confirm your address, then sign in.',
    missingName: 'Please enter your full name.',
  },
  fr: {
    subtitle: 'Centre de Langues UPF',
    signInTitle: 'Connexion',
    signUpTitle: 'Créer un compte',
    fullName: 'Nom complet',
    fullNamePlaceholder: 'ex. Mehdi Aani',
    email: 'E-mail',
    emailPlaceholder: 'nom@upf.ac.ma',
    password: 'Mot de passe',
    passwordPlaceholder: 'Au moins 6 caractères',
    signInBtn: 'Se connecter',
    signUpBtn: 'Créer le compte',
    loading: 'Chargement...',
    noAccount: 'Pas encore de compte ?',
    signUpLink: "S'inscrire",
    hasAccount: 'Vous avez déjà un compte ?',
    signInLink: 'Se connecter',
    switchLang: 'English',
    confirmEmailNotice:
      'Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.',
    missingName: 'Veuillez saisir votre nom complet.',
  },
} as const

export default function LoginPage() {
  const router = useRouter()
  const rawLocale = useLocale()
  const locale = rawLocale === 'fr' ? 'fr' : 'en'
  const t = COPY[locale]

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function toggleLocale() {
    const nextLocale = locale === 'en' ? 'fr' : 'en'
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  function switchMode(nextMode: 'signin' | 'signup') {
    setMode(nextMode)
    setError(null)
    setNotice(null)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    const supabase = createClient()

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (signInError) {
          setError(signInError.message)
          return
        }

        router.push('/dashboard')
        router.refresh()
      } else {
        if (!fullName.trim()) {
          setError(t.missingName)
          return
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        })

        if (signUpError) {
          setError(signUpError.message)
          return
        }

        if (data.session) {
          router.push('/dashboard')
          router.refresh()
        } else {
          setNotice(t.confirmEmailNotice)
          setMode('signin')
          setPassword('')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 transition-colors dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-400">
              {t.subtitle}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {mode === 'signin' ? t.signInTitle : t.signUpTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLocale}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" />
              {t.switchLang}
            </button>
            <ThemeToggle />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label
                htmlFor="full-name"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {t.fullName}
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="full-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.fullNamePlaceholder}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {t.email}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {t.password}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-10 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {loading ? t.loading : mode === 'signin' ? t.signInBtn : t.signUpBtn}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          {mode === 'signin' ? (
            <>
              {t.noAccount}{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="font-semibold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
              >
                {t.signUpLink}
              </button>
            </>
          ) : (
            <>
              {t.hasAccount}{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="font-semibold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
              >
                {t.signInLink}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}