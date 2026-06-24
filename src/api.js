let unauthorizedHandler = null

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn
}

async function request(method, path, body) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    unauthorizedHandler?.()
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${method} /api/${path} failed (${res.status}): ${text}`)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${method} /api/${path} failed (${res.status}): ${text}`)
  }
  return res.json()
}

export const api = {
  // Auth — me() returns null instead of throwing on 401 (used for initial auth check)
  me: async () => {
    const res = await fetch('/api/me')
    if (!res.ok) return null
    return res.json()
  },
  login: (username, password) => request('POST', 'login', { username, password }),
  logout: () => request('POST', 'logout'),

  // Hymns
  getHymns: () => request('GET', 'hymns'),
  createHymn: (data) => request('POST', 'hymns', data),
  updateHymn: (id, data) => request('PUT', `hymns/${id}`, data),
  deleteHymn: (id) => request('DELETE', `hymns/${id}`),

  // Audio — uploadAudio returns the updated hymn with audioKey set
  uploadAudio: async (hymnId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/hymns/${hymnId}/audio`, { method: 'PUT', body: formData })
    if (res.status === 401) { unauthorizedHandler?.(); throw new Error('未登录') }
    if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`上传失败: ${t}`) }
    return res.json()
  },
  deleteAudio: (hymnId) => request('DELETE', `hymns/${hymnId}/audio`),
  getAudioUrl: (hymnId) => `/api/hymns/${hymnId}/audio`,

  // History
  getHistory: () => request('GET', 'history'),
  saveHistory: (date, ids) => request('PUT', `history/${date}`, ids),

  // Import
  importAll: (hymns, selectionHistory) => request('POST', 'import', { hymns, selectionHistory }),
}
