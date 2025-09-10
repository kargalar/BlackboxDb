"use client"

import { listContent, updateContent, deleteContent, getContentById } from '@/services/database/admin'
import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/services/database/userService'

interface ContentRow { id: string; title: string; content_type_id: number; release_date: string | null; description: string | null; length: number | null; poster_path: string | null }

export default function AdminContentPage() {
  const [allowed, setAllowed] = useState(false)
  const [items, setItems] = useState<ContentRow[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<ContentRow>>({})
  const [search, setSearch] = useState('')

  const load = async () => {
    const prof = await getCurrentUserProfile()
    const can = !!prof.data?.is_admin || !!prof.data?.is_moderator
    setAllowed(can)
    if (can) {
      const { data } = await listContent({ search })
      setItems(data as ContentRow[])
    }
  }

  useEffect(() => { load() // eslint-disable-next-line
  }, [])

  const startEdit = async (id: string) => {
    const { data } = await getContentById(id)
    setEditing(id)
    setEditData({ ...data })
  }

  const save = async () => {
    if (!editing) return
    const { error } = await updateContent(editing, {
      title: editData.title!,
      description: (editData.description ?? null) as any,
      release_date: (editData.release_date ?? null) as any,
      length: (editData.length ?? null) as any,
      poster_path: (editData.poster_path ?? null) as any,
    })
    if (!error) {
      setEditing(null)
      setEditData({})
      load()
    } else {
      alert('Kaydedilemedi')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Bu içeriği silmek istediğine emin misin?')) return
    const { error } = await deleteContent(id)
    if (!error) setItems(prev => prev.filter(i => i.id !== id))
  }

  if (!allowed) {
    return <div className="max-w-5xl mx-auto p-6">Yetkin yok.</div>
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">İçerik Yönetimi</h1>
      <div className="flex gap-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ara" className="border rounded px-3 py-2" />
        <button onClick={load} className="px-3 py-2 rounded bg-gray-800 text-white">Ara</button>
      </div>
      <div className="space-y-3">
        {items.map(it => (
          <div key={it.id} className="border rounded p-3">
            {editing === it.id ? (
              <div className="space-y-2">
                <input className="w-full border rounded px-3 py-2" value={editData.title ?? ''} onChange={e=>setEditData(d=>({...d, title: e.target.value}))} />
                <textarea className="w-full border rounded px-3 py-2" value={editData.description ?? ''} onChange={e=>setEditData(d=>({...d, description: e.target.value}))} />
                <div className="flex gap-2">
                  <input type="date" className="border rounded px-3 py-2" value={editData.release_date ?? ''} onChange={e=>setEditData(d=>({...d, release_date: e.target.value}))} />
                  <input type="number" className="border rounded px-3 py-2" placeholder="Süre (dk)" value={editData.length ?? ''} onChange={e=>setEditData(d=>({...d, length: e.target.value ? Number(e.target.value) : null}))} />
                </div>
                <input className="w-full border rounded px-3 py-2" placeholder="Poster URL" value={editData.poster_path ?? ''} onChange={e=>setEditData(d=>({...d, poster_path: e.target.value}))} />
                <div className="flex gap-2">
                  <button onClick={save} className="px-3 py-2 rounded bg-green-600 text-white">Kaydet</button>
                  <button onClick={()=>{setEditing(null); setEditData({})}} className="px-3 py-2 rounded bg-gray-500 text-white">Vazgeç</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">[{it.id}] {it.title}</div>
                  <div className="text-xs text-gray-500">{it.release_date || 'Tarih yok'} · {it.length ?? '-'} dk</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>startEdit(it.id)} className="px-3 py-1 rounded bg-blue-600 text-white">Düzenle</button>
                  <button onClick={()=>remove(it.id)} className="px-3 py-1 rounded bg-red-600 text-white">Sil</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-gray-600 dark:text-gray-400">Kayıt yok.</div>}
      </div>
    </div>
  )
}
