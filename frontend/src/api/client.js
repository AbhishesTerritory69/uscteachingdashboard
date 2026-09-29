const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
const TOKEN_KEY = 'sste-auth-token'

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.message || `Request failed (${status}).`)
    this.name = 'ApiError'
    this.status = status
    this.details = payload?.details
  }
}

export const tokenStore = {
  get: () => window.sessionStorage.getItem(TOKEN_KEY),
  set: (token) => window.sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => window.sessionStorage.removeItem(TOKEN_KEY),
}

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    signal,
    auth = true,
    retries = method === 'GET' ? 1 : 0,
  } = options
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const requestHeaders = new Headers(headers)
  if (body !== undefined && !isFormData && !requestHeaders.has('content-type')) {
    requestHeaders.set('content-type', 'application/json')
  }
  if (auth) {
    const token = tokenStore.get()
    if (token) requestHeaders.set('authorization', `Bearer ${token}`)
  }

  for (let attempt = 0; ; attempt += 1) {
    let response
    try {
      response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
        signal,
      })
    } catch (error) {
      if (error.name === 'AbortError') throw error
      if (attempt < retries) {
        await wait(250 * (attempt + 1))
        continue
      }
      throw new ApiError(0, { message: 'The backend is unavailable. Check the connection and retry.' })
    }

    if (response.status >= 500 && attempt < retries) {
      await wait(250 * (attempt + 1))
      continue
    }

    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().then((text) => ({ message: text })).catch(() => null)

    if (!response.ok) {
      if (response.status === 401 && auth) {
        window.dispatchEvent(new Event('sste:unauthorized'))
      }
      throw new ApiError(response.status, payload)
    }
    return payload
  }
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}

export const toQuery = (values = {}) => {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}