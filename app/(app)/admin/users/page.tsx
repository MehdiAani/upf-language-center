export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import UsersClient, {
  type DepartmentOption,
  type UserProfileItem,
} from './users-client'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'fr' ? 'fr' : 'en'

  const { data: userData } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData?.user?.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, preferred_locale, is_active, created_at')
    .order('created_at', { ascending: false })

  const { data: deptHeadsData } = await supabase
    .from('department_heads')
    .select('profile_id, department_id')

  const { data: departmentsData } = await supabase
    .from('departments')
    .select('id, code, name_en, name_fr')
    .order('code')

  const headMap = new Map<string, string[]>()
  for (const dh of deptHeadsData ?? []) {
    const existing = headMap.get(dh.profile_id) ?? []
    existing.push(dh.department_id)
    headMap.set(dh.profile_id, existing)
  }

  const users: UserProfileItem[] = ((profilesData ?? []) as Omit<UserProfileItem, 'department_ids'>[]).map(
    (p) => ({
      ...p,
      department_ids: headMap.get(p.id) ?? [],
    })
  )

  return (
    <UsersClient
      initialUsers={users}
      departments={(departmentsData ?? []) as DepartmentOption[]}
      locale={locale}
    />
  )
}