const DEFAULT_BACKEND_ORIGIN = 'http://localhost:8081'

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '')

const ensureLeadingPrefix = (path: string) => {
  if (!path) return ''
  if (path.startsWith('/') || path.startsWith('?')) return path
  return `/${path}`
}

const rawBackendPreference =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  DEFAULT_BACKEND_ORIGIN

const normalizedPreference = stripTrailingSlashes(rawBackendPreference)
const hasApiSuffix = normalizedPreference.toLowerCase().endsWith('/api')

export const BACKEND_ORIGIN = hasApiSuffix
  ? normalizedPreference.slice(0, -4)
  : normalizedPreference

export const API_BASE_URL = hasApiSuffix
  ? normalizedPreference
  : `${BACKEND_ORIGIN}/api`

const parseBackendOrigin = () => {
  try {
    return new URL(BACKEND_ORIGIN)
  } catch {
    return undefined
  }
}

const backendOriginUrl = parseBackendOrigin()

export const buildBackendUrl = (path = ''): string => {
  if (!path) return BACKEND_ORIGIN
  return `${BACKEND_ORIGIN}${ensureLeadingPrefix(path)}`
}

export const buildApiUrl = (path = ''): string => {
  if (!path) return API_BASE_URL
  return `${API_BASE_URL}${ensureLeadingPrefix(path)}`
}

export const buildBackendWsUrl = (path = ''): string => {
  if (backendOriginUrl) {
    const wsUrl = new URL(backendOriginUrl.toString())
    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsUrl.origin}${ensureLeadingPrefix(path)}`
  }

  const fallbackOrigin = BACKEND_ORIGIN.replace(/^http/, 'ws')
  return `${fallbackOrigin}${ensureLeadingPrefix(path)}`
}

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>

const createFetcher =
  (urlBuilder: (path: string) => string): Fetcher =>
  (path: string, init: RequestInit = {}) => {
    const url = urlBuilder(path)
    return fetch(url, {
      ...init,
      credentials: init.credentials ?? 'include',
    })
  }

export const apiFetch: Fetcher = createFetcher(buildApiUrl)
export const backendFetch: Fetcher = createFetcher(buildBackendUrl)

