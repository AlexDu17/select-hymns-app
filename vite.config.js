import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function mockApiPlugin() {
  const seed = JSON.parse(readFileSync(join(__dirname, 'hymns-import.json'), 'utf-8'))
  let hymns = seed.hymns.map(h => ({ ...h }))
  let selectionHistory = { ...(seed.selectionHistory ?? {}) }
  let nextId = hymns.reduce((max, h) => Math.max(max, h.id ?? 0), 0) + 1
  let mockSession = false // in-memory session state for dev

  function send(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }

  function sendWithCookie(res, data, cookie, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Set-Cookie': cookie })
    res.end(JSON.stringify(data))
  }

  function hasSession(req) {
    return (req.headers['cookie'] ?? '').includes('session=mock')
  }

  return {
    name: 'mock-api',
    configureServer(server) {
      console.log('\n  [mock-api] 使用本地 hymns-import.json 数据，共', hymns.length, '首诗歌\n')

      server.middlewares.use('/api', (req, res, next) => {
        const path = req.url.replace(/^\//, '')
        const method = req.method.toUpperCase()
        const chunks = []
        req.on('data', chunk => { chunks.push(chunk) })
        req.on('end', () => {
          const contentType = req.headers['content-type'] ?? ''
          const isMultipart = contentType.startsWith('multipart/')
          let data = null
          if (!isMultipart && chunks.length > 0) {
            try { data = JSON.parse(Buffer.concat(chunks).toString('utf-8')) } catch {}
          }

          // POST /api/login — any password works for 'admin' in dev
          if (method === 'POST' && path === 'login') {
            if (data?.username === 'admin') {
              mockSession = true
              return sendWithCookie(res, { ok: true }, 'session=mock; Path=/; SameSite=Strict')
            }
            return send(res, { error: '用户名或密码错误' }, 401)
          }

          // POST /api/logout
          if (method === 'POST' && path === 'logout') {
            mockSession = false
            return sendWithCookie(res, { ok: true }, 'session=; Path=/; Max-Age=0')
          }

          // GET /api/me
          if (method === 'GET' && path === 'me') {
            if (mockSession && hasSession(req)) return send(res, { username: 'admin' })
            return send(res, { error: '未登录' }, 401)
          }

          // All other routes require session
          if (!mockSession || !hasSession(req)) {
            return send(res, { error: '未登录' }, 401)
          }

          // Audio routes — must come before hymn CRUD routes
          const hymnAudioMatch = path.match(/^hymns\/(\d+)\/audio$/)

          // PUT /api/hymns/:id/audio (mock: record audioKey without storing file)
          if (method === 'PUT' && hymnAudioMatch) {
            const id = Number(hymnAudioMatch[1])
            const key = `hymns/${id}.mp3`
            hymns = hymns.map(h => h.id === id ? { ...h, audioKey: key } : h)
            const updated = hymns.find(h => h.id === id)
            return updated ? send(res, { ...updated }) : send(res, { error: 'not found' }, 404)
          }

          // DELETE /api/hymns/:id/audio
          if (method === 'DELETE' && hymnAudioMatch) {
            const id = Number(hymnAudioMatch[1])
            hymns = hymns.map(h => h.id === id ? { ...h, audioKey: null } : h)
            return send(res, { ok: true })
          }

          // GET /api/hymns/:id/audio (mock: no real audio in dev)
          if (method === 'GET' && hymnAudioMatch) {
            return send(res, { error: 'dev 模式不提供音频文件' }, 404)
          }

          // GET /api/hymns
          if (method === 'GET' && path === 'hymns') {
            return send(res, hymns.map(h => ({ ...h })))
          }

          // POST /api/hymns
          if (method === 'POST' && path === 'hymns') {
            const hymn = {
              id: nextId++,
              title: data.title,
              tags: data.tags ?? [],
              theme: data.theme ?? '',
              lyrics: data.lyrics ?? '',
              lastSelectedDate: data.lastSelectedDate ?? '',
              createdAt: Math.floor(Date.now() / 1000),
            }
            hymns = [...hymns, hymn]
            return send(res, { ...hymn }, 201)
          }

          // PUT /api/hymns/:id  (title is intentionally excluded, matching production behaviour)
          const hymnMatch = path.match(/^hymns\/(\d+)$/)
          if (method === 'PUT' && hymnMatch) {
            const id = Number(hymnMatch[1])
            const existing = hymns.find(h => h.id === id)
            if (!existing) return send(res, { error: 'not found' }, 404)
            const updated = {
              ...existing,
              tags: data.tags ?? existing.tags,
              theme: data.theme ?? existing.theme,
              lyrics: data.lyrics ?? existing.lyrics,
              lastSelectedDate: data.lastSelectedDate ?? existing.lastSelectedDate,
            }
            hymns = hymns.map(h => h.id === id ? updated : h)
            return send(res, { ...updated })
          }

          // DELETE /api/hymns/:id
          if (method === 'DELETE' && hymnMatch) {
            hymns = hymns.filter(h => h.id !== Number(hymnMatch[1]))
            return send(res, { ok: true })
          }

          // GET /api/history
          if (method === 'GET' && path === 'history') {
            return send(res, { ...selectionHistory })
          }

          // PUT /api/history/:date
          const histMatch = path.match(/^history\/(\d{4}-\d{2}-\d{2})$/)
          if (method === 'PUT' && histMatch) {
            selectionHistory = { ...selectionHistory, [histMatch[1]]: [...data] }
            return send(res, { ok: true })
          }

          // POST /api/import
          if (method === 'POST' && path === 'import') {
            const { hymns: nh, selectionHistory: nsh } = data
            const idMap = {}
            hymns = nh.map((h, i) => {
              idMap[h.id] = i + 1
              return { ...h, id: i + 1 }
            })
            nextId = hymns.length + 1
            selectionHistory = {}
            for (const [date, ids] of Object.entries(nsh ?? {})) {
              const remapped = ids.map(oid => idMap[oid]).filter(Boolean)
              if (remapped.length > 0) selectionHistory[date] = remapped
            }
            return send(res, {
              hymns: hymns.map(h => ({ ...h })),
              selectionHistory: { ...selectionHistory },
            })
          }

          next()
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), ...(process.env.VITE_MOCK_API === 'true' ? [mockApiPlugin()] : [])],
})
