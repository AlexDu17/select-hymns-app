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

  function send(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }

  return {
    name: 'mock-api',
    configureServer(server) {
      console.log('\n  [mock-api] 使用本地 hymns-import.json 数据，共', hymns.length, '首诗歌\n')

      server.middlewares.use('/api', (req, res, next) => {
        const path = req.url.replace(/^\//, '')
        const method = req.method.toUpperCase()
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          const data = body ? JSON.parse(body) : null

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
