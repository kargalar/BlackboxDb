"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative"
    >
      <svg
        className={`h-4 w-4 transition-all ${
          theme === "light" ? "rotate-0 scale-100" : "rotate-90 scale-0"
        }`}
        fill="none"
        height="24"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="24"
      >
        <circle cx="12" cy="12" r="5" />
        <path d="m12 1v2" />
        <path d="m12 21v2" />
        <path d="m4.22 4.22l1.42 1.42" />
        <path d="m18.36 18.36l1.42 1.42" />
        <path d="m1 12h2" />
        <path d="m21 12h2" />
        <path d="m4.22 19.78l1.42-1.42" />
        <path d="m18.36 5.64l1.42-1.42" />
      </svg>
      <svg
        className={`absolute h-4 w-4 transition-all ${
          theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0"
        }`}
        fill="none"
        height="24"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="24"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <span className="sr-only">Temayı değiştir</span>
    </Button>
  )
}
