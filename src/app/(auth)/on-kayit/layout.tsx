import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Ön Kayıt",
  description: "Sporcu Paneli ön kayıt formu. Hemen ön kayıt olun, spor akademimize katılın.",
  robots: {
    index: false,
    follow: true,
  },
}

export default function OnKayitLayout({ children }: { children: React.ReactNode }) {
  return children
}
