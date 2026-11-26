'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function setLocaleAction(locale: 'en' | 'fr') {
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', locale)

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (data?.user) {
    await supabase.from('profiles').update({ preferred_locale: locale }).eq('id', data.user.id)
  }
}
