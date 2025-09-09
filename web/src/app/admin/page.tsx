"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/services/database/userService'
import type { Route } from 'next'

export default function AdminHome() {
  const [allowed, setAllowed] = useState<boolean>(false)

  useEffect(() => {
    getCurrentUserProfile().then(r => {
      setAllowed(!!r.data?.is_admin || !!r.data?.is_moderator)
    })
  }, [])

  if (!allowed) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Yönetici</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Yönetim Paneli</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Link href={"/admin/content-requests" as Route} className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="font-medium">İçerik İstekleri</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Bekleyen istekleri onayla veya reddet</div>
        </Link>
  <Link href={"/admin/content" as Route} className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="font-medium">İçerik Yönetimi</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">İçerik bilgilerini düzenle veya sil</div>
        </Link>
  <Link href={"/admin/users" as Route} className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="font-medium">Kullanıcılar</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Rolleri güncelle veya kullanıcıyı sil</div>
        </Link>
  <Link href={"/admin/moderation" as Route} className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="font-medium">İçerik Moderasyonu</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Yorum ve cevapları yönet</div>
        </Link>
      </div>
    </div>
  )
}
