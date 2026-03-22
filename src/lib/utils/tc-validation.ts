/**
 * TC Kimlik No Doğrulama Algoritması
 * Türkiye Cumhuriyeti Kimlik Numarası doğrulama
 */
export function validateTC(tc: string): boolean {
  if (!tc || tc.length !== 11) return false
  if (!/^\d{11}$/.test(tc)) return false
  if (tc[0] === '0') return false

  const digits = tc.split('').map(Number)

  // 10. hane kontrolü
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7]
  const d10 = ((oddSum * 7) - evenSum) % 10
  if (d10 !== digits[9]) return false

  // 11. hane kontrolü
  const firstTenSum = digits.slice(0, 10).reduce((a, b) => a + b, 0)
  const d11 = firstTenSum % 10
  if (d11 !== digits[10]) return false

  return true
}

export function formatTC(tc: string): string {
  return tc.replace(/\D/g, '').slice(0, 11)
}
