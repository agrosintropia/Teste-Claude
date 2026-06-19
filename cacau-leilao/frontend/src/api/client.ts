export const TOKEN_KEY = 'loteforte_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api/v1${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Erro na requisição')
  }

  if (res.status === 204) return undefined as unknown as T
  return res.json()
}

export const apiGet = <T>(path: string) => apiFetch<T>(path)
export const apiPost = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
export const apiPatch = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })

export const api = {
  get: apiGet,
  post: apiPost,
  patch: apiPatch,
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}

export function wsUrl(path: string): string {
  const token = getToken()
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/api/v1${path}${token ? `?token=${token}` : ''}`
}
