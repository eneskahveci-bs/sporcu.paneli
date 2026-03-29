import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Giriş Yap",
  description: "Sporcu Paneli'ne giriş yapın. Sporcu, antrenör veya yönetici girişi.",
  robots: {
    index: false,
    follow: true,
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
