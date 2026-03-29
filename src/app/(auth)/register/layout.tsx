import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Kayıt Ol",
  description: "Sporcu Paneli'ne kayıt olun. Spor akademisi yönetim sistemini hemen kullanmaya başlayın.",
  robots: {
    index: false,
    follow: true,
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
