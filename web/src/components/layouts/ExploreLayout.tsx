"use client"

import React from 'react'

type ExploreLayoutProps = {
  title: string
  subtitle?: string
  ctaHref?: string
  ctaText?: string
  filters?: React.ReactNode
  children: React.ReactNode
  errorBox?: React.ReactNode
}

export default function ExploreLayout({
  title,
  subtitle,
  ctaHref = '/dashboard/content-requests',
  ctaText = 'İçerik iste',
  filters,
  children,
  errorBox,
}: ExploreLayoutProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {(subtitle || ctaHref) && (
          <div className="flex items-center justify-between gap-2">
            {subtitle ? (
              <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>
            ) : <div />}
            {ctaHref && (
              <a href={ctaHref} className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">{ctaText}</a>
            )}
          </div>
        )}
      </div>

      {filters ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          {filters}
        </div>
      ) : null}

      {errorBox}

      {children}
    </div>
  )
}
