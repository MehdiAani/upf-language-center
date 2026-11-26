'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface UserProfileItem {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'dept_head' | 'professor' | 'pending'
  preferred_locale: string
  is_active: boolean
  created_at: string
  department_ids: string[]
}

export interface DepartmentOption {
  id: string
  code: string
  name_en: string
  name_fr: string
}

interface UsersClientProps {
  initialUsers: UserProfileItem[]
  departments: DepartmentOption[]
  locale: 'en' | 'fr'
}

const COPY = {
  en: {
    title: 'Users & Roles',
    subtitle: 'Approve accounts, assign roles, and link department heads to UPF departments.',
    name: 'Name',
    email: 'Email',
    role: 'Role',
    departments: 'Departments',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    activate: 'Activate',
    deactivate: 'Deactivate',
    assignDepts: 'Assign',
    noDepts: 'None',
    empty: 'No users found.',
    roles: {
      admin: 'Admin',
      dept_head: 'Department Head',
      professor: 'Professor',
      pending: 'Pending',
    },
    modalTitle: 'Assign Departments to Department Head',
    save: 'Save Assignments',
    saving: 'Saving...',
    cancel: 'Cancel',
  },
  fr: {
    title: 'Utilisateurs & Rôles',
    subtitle: 'Validez les comptes, attribuez les rôles et associez les chefs de département.',
    name: 'Nom',
    email: 'E-mail',
    role: 'Rôle',
    departments: 'Départements',
    status: 'Statut',
    active: 'Actif',
    inactive: 'Inactif',
    activate: 'Activer',
    deactivate: 'Désactiver',
    assignDepts: 'Assigner',
    noDepts: 'Aucun',
    empty: 'Aucun utilisateur trouvé.',
    roles: {
      admin: 'Administrateur',
      dept_head: 'Chef de département',
      professor: 'Professeur',
      pending: 'En attente',
    },
    modalTitle: 'Assigner des départements au chef de département',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    cancel: 'Annuler',
  },
} as const

export default function UsersClient({
  initialUsers,
  departments,
  locale,
}: UsersClientProps) {
  const router = useRouter()
  const t = COPY[locale]

  const [users, setUsers] = useState<UserProfileItem[]>(initialUsers)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [editingHeadUser, setEditingHeadUser] = useState<UserProfileItem | null>(null)
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([])
  const [savingDepts, setSavingDepts] = useState(false)

  async function handleRoleChange(
    userId: string,
    nextRole: UserProfileItem['role']
  ) {
    setBusyId(userId)
    setError(null)
    const supabase = createClient()

    try {
      const autoActivate = nextRole !== 'pending'
      const { error: err } = await supabase
        .from('profiles')
        .update({
          role: nextRole,
          ...(autoActivate ? { is_active: true } : {}),
        })
        .eq('id', userId)

      if (err) {
        setError(err.message)
        return
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role: nextRole,
                is_active: autoActivate ? true : u.is_active,
              }
            : u
        )
      )
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function handleToggleActive(user: UserProfileItem) {
    setBusyId(user.id)
    setError(null)
    const supabase = createClient()

    try {
      const nextActive = !user.is_active
      const { error: err } = await supabase
        .from('profiles')
        .update({ is_active: nextActive })
        .eq('id', user.id)

      if (err) {
        setError(err.message)
        return
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: nextActive } : u))
      )
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  function openDeptModal(user: UserProfileItem) {
    setEditingHeadUser(user)
    setSelectedDeptIds(user.department_ids)
    setError(null)
  }

  function toggleDeptSelection(deptId: string) {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    )
  }

  async function handleSaveDeptAssignments() {
    if (!editingHeadUser) return
    setSavingDepts(true)
    setError(null)
    const supabase = createClient()

    try {
      const { error: delErr } = await supabase
        .from('department_heads')
        .delete()
        .eq('profile_id', editingHeadUser.id)

      if (delErr) {
        setError(delErr.message)
        return
      }

      if (selectedDeptIds.length > 0) {
        const rows = selectedDeptIds.map((department_id) => ({
          profile_id: editingHeadUser.id,
          department_id,
        }))
        const { error: insErr } = await supabase
          .from('department_heads')
          .insert(rows)

        if (insErr) {
          setError(insErr.message)
          return
        }
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingHeadUser.id
            ? { ...u, department_ids: selectedDeptIds }
            : u
        )
      )
      setEditingHeadUser(null)
      router.refresh()
    } finally {
      setSavingDepts(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t.subtitle}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3.5">{t.name}</th>
              <th className="px-5 py-3.5">{t.email}</th>
              <th className="px-5 py-3.5">{t.role}</th>
              <th className="px-5 py-3.5">{t.departments}</th>
              <th className="px-5 py-3.5">{t.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {users.map((u) => {
              const assignedCodes = u.department_ids
                .map((id) => departments.find((d) => d.id === id)?.code)
                .filter(Boolean)
                .join(', ')

              return (
                <tr
                  key={u.id}
                  className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {u.full_name || u.email}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {u.email}
                  </td>

                  <td className="px-5 py-4">
                    <select
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) =>
                        handleRoleChange(
                          u.id,
                          e.target.value as UserProfileItem['role']
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="admin">{t.roles.admin}</option>
                      <option value="dept_head">{t.roles.dept_head}</option>
                      <option value="professor">{t.roles.professor}</option>
                      <option value="pending">{t.roles.pending}</option>
                    </select>
                  </td>

                  <td className="px-5 py-4">
                    {u.role === 'dept_head' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {assignedCodes || t.noDepts}
                        </span>
                        <button
                          type="button"
                          onClick={() => openDeptModal(u)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <Building2 className="h-3 w-3" />
                          {t.assignDepts}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">—</span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => handleToggleActive(u)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                      }`}
                    >
                      {u.is_active ? t.active : t.inactive}
                    </button>
                  </td>
                </tr>
              )
            })}

            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  {t.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingHeadUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.modalTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingHeadUser.full_name || editingHeadUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingHeadUser(null)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              {departments.map((dept) => {
                const checked = selectedDeptIds.includes(dept.id)
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDeptSelection(dept.id)}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                      checked
                        ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <span className="font-bold">{dept.code}</span>{' '}
                      <span className="text-xs opacity-80">
                        — {locale === 'fr' ? dept.name_fr : dept.name_en}
                      </span>
                    </div>
                    {checked && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                  </button>
                )
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingHeadUser(null)}
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={savingDepts}
                onClick={handleSaveDeptAssignments}
                className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingDepts ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}