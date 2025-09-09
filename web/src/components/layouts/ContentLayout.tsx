"use client"

import React from 'react'

type ContentLayoutProps = {
  left: React.ReactNode
  rightHeader: React.ReactNode
  children: React.ReactNode
}

export default function ContentLayout({ left, rightHeader, children }: ContentLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>{left}</div>
        <div className="md:col-span-2 space-y-4">
          {rightHeader}
          {children}
        </div>
      </div>
    </div>
  )
}
