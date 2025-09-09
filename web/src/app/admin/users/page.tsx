"use client"

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/services/database/userService'
import { deleteUser, listUsers, updateUserRoles } from '@/services/database/admin'

interface UserRow { auth_user_id: string; username: string; email: string; is_admin?: boolean; is_moderator?: boolean }

export default function AdminUsersPage() {
  const [allowed, setAllowed] = useState(false)
  const [items, setItems] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')

  const load = async () => {
    const prof = await getCurrentUserProfile()
    const can = !!prof.data?.is_admin || !!prof.data?.is_moderator
    setAllowed(can)
    if (can) {
      const { data } = await listUsers({ search })
      setItems(data as UserRow[])
    }
  }

  useEffect(() => { load() // eslint-disable-next-line
  }, [])

  const toggleRole = async (u: UserRow, role: 'is_admin' | 'is_moderator') => {
    const val = !(u[role] ?? false)
    const { error } = await updateUserRoles(u.auth_user_id, { [role]: val })
    if (!error) {
      setItems(prev => prev.map(x => x.auth_user_id === u.auth_user_id ? { ...x, [role]: val } : x))
    } else {
      alert('Rol güncellenemedi')
    }
  }

  const remove = async (u: UserRow) => {
    if (!confirm(`${u.username} kullanıcısını silmek istediğine emin misin?`)) return
    const { error } = await deleteUser(u.auth_user_id)
    if (!error) setItems(prev => prev.filter(x => x.auth_user_id !== u.auth_user_id))
  }

  if (!allowed) return <div className="max-w-5xl mx-auto p-6">Yetkin yok.</div>

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Kullanıcı Yönetimi</h1>
      <div className="flex gap-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ara (kullanıcı/ad)" className="border rounded px-3 py-2" />
        <button onClick={load} className="px-3 py-2 rounded bg-gray-800 text-white">Ara</button>
      </div>
      <div className="space-y-2">
        {items.map(u => (
          <div key={u.auth_user_id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{u.username}</div>
              <div className="text-xs text-gray-500">{u.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={!!u.is_admin} onChange={()=>toggleRole(u, 'is_admin')} /> Admin
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={!!u.is_moderator} onChange={()=>toggleRole(u, 'is_moderator')} /> Mod
              </label>
              <button onClick={()=>remove(u)} className="px-3 py-1 rounded bg-red-600 text-white">Sil</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-gray-600 dark:text-gray-400">Kayıt yok.</div>}
      </div>
    </div>
  )
}
