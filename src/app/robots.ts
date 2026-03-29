import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sporcu-paneli.vercel.app'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register', '/on-kayit', '/gizlilik', '/kullanim-kosullari', '/kvkk'],
        disallow: ['/dashboard', '/athletes', '/payments', '/attendance', '/coaches', '/classes', '/sports', '/reports', '/settings', '/sms', '/messages', '/calendar', '/inventory', '/pre-registrations', '/portal', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
