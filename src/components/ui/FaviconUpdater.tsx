'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function FaviconUpdater() {
  const supabase = createClient()

  useEffect(() => {
    const update = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const orgId = user?.user_metadata?.organization_id
      if (!orgId) return

      const { data: org } = await supabase
        .from('organizations')
        .select('logo')
        .eq('id', orgId)
        .single()

      const logoUrl = org?.logo && isSafeImageUrl(org.logo) ? org.logo : null
      const faviconUrl = logoUrl ?? '/icons/icon-192.png'

      const favicon = document.getElementById('dyn-favicon') as HTMLLinkElement | null
      if (favicon) favicon.href = faviconUrl

      const apple = document.getElementById('dyn-apple-icon') as HTMLLinkElement | null
      if (apple) apple.href = faviconUrl

      const ogImg = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null
      if (ogImg) ogImg.content = faviconUrl
    }

    update()
  }, [supabase])

  return null
}
