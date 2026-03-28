import { redirect } from 'next/navigation'

// Giriş ekranı ana sayfada (/) modal olarak açılıyor
export default function LoginPage() {
  redirect('/?modal=login')
}
