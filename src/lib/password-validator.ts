/**
 * Güçlü şifre doğrulama — tüm uygulama genelinde tek kaynak
 */

export interface PasswordValidation {
  valid: boolean
  score: number          // 0-4
  errors: string[]
  suggestions: string[]
}

const COMMON_PASSWORDS = [
  '12345678', '123456789', 'password', 'qwerty123', 'iloveyou',
  '11111111', '00000000', '99999999', 'password1', 'abc12345',
  '12341234', 'sporcupaneli', '87654321',
]

export function validatePassword(password: string, context?: { tc?: string; email?: string }): PasswordValidation {
  const errors: string[] = []
  const suggestions: string[] = []
  let score = 0

  // Zorunlu kurallar
  if (password.length < 8) {
    errors.push('En az 8 karakter olmalıdır')
  } else {
    score++
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('En az bir harf içermelidir')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('En az bir rakam içermelidir')
  } else {
    score++
  }

  // Bağlam kontrolü: TC kimlik ile aynı olamaz
  if (context?.tc && password === context.tc) {
    errors.push('Şifre TC kimlik numaranızla aynı olamaz')
  }

  // TC son 6 hanesi olamaz (eski varsayılan şifre)
  if (context?.tc && context.tc.length === 11 && password === context.tc.slice(-6)) {
    errors.push('Güvenlik için lütfen daha güçlü bir şifre belirleyin')
  }

  // Yaygın şifreler
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Bu şifre çok yaygın, farklı bir şifre seçin')
  }

  // Güç puanı (bonus)
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) {
    score++
    // Özel karakter varsa bonus
  }

  // Öneriler (hata değil, sadece tavsiye)
  if (!/[A-Z]/.test(password)) suggestions.push('Büyük harf ekleyin')
  if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push('Özel karakter ekleyin (!@#$%)')
  if (password.length < 12) suggestions.push('12+ karakter daha güvenli')

  return {
    valid: errors.length === 0,
    score: Math.min(score, 4),
    errors,
    suggestions,
  }
}

export const SCORE_LABELS = ['Çok Zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü']
export const SCORE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#0ea5e9', '#10b981']
