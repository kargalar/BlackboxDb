'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Authentication error:', error)
        router.push('/auth/login?error=auth_error')
      } else if (data?.session) {
        // Successful authentication
        router.push('/')
      } else {
        // No session found
        router.push('/auth/login')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Giriş yapılıyor...</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Lütfen bekleyin</p>
      </div>
    </div>
  )
}
