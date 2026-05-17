// Web Push subscribe helper'ları

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function isPushSupported(): Promise<boolean> {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!(await isPushSupported())) return null
  const reg = await navigator.serviceWorker.ready
  return await reg.pushManager.getSubscription()
}

export async function subscribePush(): Promise<{ ok: boolean; error?: string }> {
  if (!(await isPushSupported())) return { ok: false, error: 'unsupported' }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, error: 'permission_denied' }

  const keyRes = await fetch('/api/push/vapid-key')
  if (!keyRes.ok) return { ok: false, error: 'no_vapid_key' }
  const { publicKey } = await keyRes.json()
  if (!publicKey) return { ok: false, error: 'no_vapid_key' }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return { ok: false, error: err.error || 'subscribe_failed' }
  }
  return { ok: true }
}

export async function unsubscribePush(): Promise<{ ok: boolean }> {
  const sub = await getCurrentSubscription()
  if (!sub) return { ok: true }
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  })
  return { ok: true }
}
