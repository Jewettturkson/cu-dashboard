'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { flushQueue } from '@/lib/offline-queue'

// Registers the service worker (installable app + shell caching)
// and drains the offline deposit queue whenever connectivity
// returns — from any page, not just /collect.
export default function PWASetup() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW is progressive enhancement; the app works without it
      })
    }

    const supabase = createClient()
    const sync = () => { flushQueue(supabase).catch(() => {}) }

    sync() // drain anything left over from a previous offline session
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [])

  return null
}
