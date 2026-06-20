async function request(method, path, body) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${method} /api/${path} failed (${res.status}): ${text}`)
  }
  return res.json()
}

export const api = {
  getHymns: () => request('GET', 'hymns'),
  createHymn: (data) => request('POST', 'hymns', data),
  updateHymn: (id, data) => request('PUT', `hymns/${id}`, data),
  deleteHymn: (id) => request('DELETE', `hymns/${id}`),
  getHistory: () => request('GET', 'history'),
  saveHistory: (date, ids) => request('PUT', `history/${date}`, ids),
  importAll: (hymns, selectionHistory) => request('POST', 'import', { hymns, selectionHistory }),
}
