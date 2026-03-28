'use client'
import { useEffect } from 'react'
import { initDb } from '@/lib/db'

export default function AppInit() {
  useEffect(() => {
    initDb().catch(console.error)
  }, [])
  return null
}
