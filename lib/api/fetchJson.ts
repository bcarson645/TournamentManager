export interface FetchJsonResult<T> {
  ok: boolean
  status: number
  data?: T
  error?: string
}

/** Parse API responses safely — avoids "Unexpected token" when the server returns HTML/plain errors. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<FetchJsonResult<T>> {
  try {
    const res = await fetch(url, init)
    const contentType = res.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const data = (await res.json()) as T & { error?: string }
      if (!res.ok) {
        const err =
          typeof data === 'object' && data != null && 'error' in data && typeof data.error === 'string'
            ? data.error
            : res.statusText || `Request failed (${res.status})`
        return { ok: false, status: res.status, error: err }
      }
      return { ok: true, status: res.status, data }
    }

    const text = (await res.text()).trim()
    let error = text || res.statusText || `Request failed (${res.status})`
    if (error.startsWith('<')) {
      if (res.status === 413 || /entity too large/i.test(text)) {
        error = 'Upload too large for this server (try a smaller CSV or increase the host body-size limit).'
      } else if (res.status >= 500) {
        error = `Server error (${res.status}). Check server logs and database configuration.`
      } else {
        error = `Unexpected response (${res.status}). The API may be misconfigured on this host.`
      }
    }
    return { ok: false, status: res.status, error: error.slice(0, 500) }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed'
    return { ok: false, status: 0, error: message }
  }
}
