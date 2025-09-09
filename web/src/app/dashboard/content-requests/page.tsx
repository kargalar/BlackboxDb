"use client"

import { useEffect, useState } from 'react'
import { createContentRequest, listMyContentRequests, ContentRequestStatus, type ContentRequest } from '@/services/database/contentRequests'

export default function ContentRequestsPage() {
  const [title, setTitle] = useState('')
  const [type, setType] = useState(1)
  const [desc, setDesc] = useState('')
  const [year, setYear] = useState<string>('')
  const [duration, setDuration] = useState<string>('')
  // Common rich fields captured in details json
  const [directors, setDirectors] = useState('') // comma-separated
  const [cast, setCast] = useState('') // comma-separated
  const [authors, setAuthors] = useState('') // books
  const [platforms, setPlatforms] = useState('') // games or streaming
  const [languages, setLanguages] = useState('')
  const [countries, setCountries] = useState('')
  const [genres, setGenres] = useState('')
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ContentRequest[]>([])

  const load = async () => {
    const { data } = await listMyContentRequests()
    setItems(data)
  }

  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    const details: Record<string, any> = {}
    if (directors.trim()) details.directors = directors.split(',').map(s=>s.trim()).filter(Boolean)
    if (cast.trim()) details.cast = cast.split(',').map(s=>s.trim()).filter(Boolean)
    if (authors.trim()) details.authors = authors.split(',').map(s=>s.trim()).filter(Boolean)
    if (platforms.trim()) details.platforms = platforms.split(',').map(s=>s.trim()).filter(Boolean)
    if (languages.trim()) details.languages = languages.split(',').map(s=>s.trim()).filter(Boolean)
    if (countries.trim()) details.countries = countries.split(',').map(s=>s.trim()).filter(Boolean)
    if (genres.trim()) details.genres = genres.split(',').map(s=>s.trim()).filter(Boolean)

    const payload: any = {
      title,
      content_type_id: type,
      description: desc || null,
      year: year ? Number(year) : null,
      duration_minutes: duration ? Number(duration) : null,
      details: Object.keys(details).length ? details : null,
    }

    const { error } = await createContentRequest(payload)
    setLoading(false)
    if (!error) {
      setTitle('')
      setDesc('')
  // reset
  setYear(''); setDuration(''); setDirectors(''); setCast(''); setAuthors(''); setPlatforms(''); setLanguages(''); setCountries(''); setGenres('')
  await load()
    } else {
      const msg = typeof error === 'string' ? error : (error as any)?.message || 'Bilinmeyen hata'
      alert('İstek oluşturulamadı: ' + msg)
    }
  }

  const statusText = (s: number) => s === ContentRequestStatus.PENDING ? 'Beklemede' : s === ContentRequestStatus.APPROVED ? 'Onaylandı' : 'Reddedildi'

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">İçerik İstekleri</h1>

      <form onSubmit={submit} className="space-y-3 p-3 border rounded-md">
        <div>
          <label className="block text-sm mb-1">Başlık</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="Örn: The Matrix (1999)" />
        </div>
        <div>
          <label className="block text-sm mb-1">Tür</label>
          <select value={type} onChange={e=>setType(Number(e.target.value))} className="w-full border px-3 py-2 rounded">
            <option value={1}>Film</option>
            <option value={2}>Oyun</option>
            <option value={3}>TV</option>
            <option value={4}>Kitap</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Yıl</label>
            <input value={year} onChange={e=>setYear(e.target.value)} inputMode="numeric" pattern="[0-9]*" className="w-full border px-3 py-2 rounded" placeholder="1999" />
          </div>
          <div>
            <label className="block text-sm mb-1">Süre (dk)</label>
            <input value={duration} onChange={e=>setDuration(e.target.value)} inputMode="numeric" pattern="[0-9]*" className="w-full border px-3 py-2 rounded" placeholder="136" />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Açıklama</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} className="w-full border px-3 py-2 rounded" rows={3} />
        </div>
        {/* Per-type helpers (all optional) */}
        {type === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Yönetmen(ler)</label>
              <input value={directors} onChange={e=>setDirectors(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="Lana Wachowski, Lilly Wachowski" />
            </div>
            <div>
              <label className="block text-sm mb-1">Oyuncular</label>
              <input value={cast} onChange={e=>setCast(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="Keanu Reeves, Carrie-Anne Moss" />
            </div>
          </div>
        )}
        {type === 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Yaratıcı/Yönetmen</label>
              <input value={directors} onChange={e=>setDirectors(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="Vince Gilligan" />
            </div>
            <div>
              <label className="block text-sm mb-1">Oyuncular</label>
              <input value={cast} onChange={e=>setCast(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="Bryan Cranston, Aaron Paul" />
            </div>
          </div>
        )}
        {type === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Platformlar</label>
              <input value={platforms} onChange={e=>setPlatforms(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="PC, PS5, Xbox Series" />
            </div>
            <div>
              <label className="block text-sm mb-1">Diller</label>
              <input value={languages} onChange={e=>setLanguages(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="en, tr" />
            </div>
          </div>
        )}
        {type === 4 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Yazar(lar)</label>
              <input value={authors} onChange={e=>setAuthors(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="J. R. R. Tolkien" />
            </div>
            <div>
              <label className="block text-sm mb-1">Diller</label>
              <input value={languages} onChange={e=>setLanguages(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="en, tr" />
            </div>
          </div>
        )}
        {/* Shared optional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Ülkeler</label>
            <input value={countries} onChange={e=>setCountries(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="US, GB" />
          </div>
          <div>
            <label className="block text-sm mb-1">Türler</label>
            <input value={genres} onChange={e=>setGenres(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="Aksiyon, Bilim Kurgu" />
          </div>
        </div>
        <button disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Gönder</button>
      </form>

      <div className="mt-6">
        <h2 className="font-medium mb-2">İsteklerim</h2>
        <div className="space-y-2">
          {items.map(it => (
            <div key={it.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{it.title}</div>
                <div className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</div>
              </div>
              <span className="text-sm">{statusText(it.status_id)}</span>
            </div>
          ))}
          {items.length === 0 && (<div className="text-sm text-gray-500">Henüz isteğin yok.</div>)}
        </div>
      </div>
    </div>
  )
}
