const TOKEN_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

async function createToken(secret) {
  const payload = btoa(JSON.stringify({ u: 'admin', exp: Date.now() + TOKEN_MAX_AGE * 1000 }))
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return `${payload}.${sigB64}`
}

async function verifyToken(token, secret) {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const valid = await crypto.subtle.verify(
      'HMAC', key,
      Uint8Array.from(atob(sig), c => c.charCodeAt(0)),
      new TextEncoder().encode(payload)
    )
    if (!valid) return null
    const data = JSON.parse(atob(payload))
    if (data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

function getSessionToken(request) {
  const cookie = request.headers.get('Cookie') ?? ''
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/)
  return match ? match[1] : null
}

function rowToHymn(row) {
  return {
    id: row.id,
    title: row.title,
    tags: JSON.parse(row.tags || '[]'),
    theme: row.theme || '',
    lyrics: row.lyrics || '',
    lastSelectedDate: row.last_selected_date || '',
    audioKey: row.audio_key || null,
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function err(msg, status = 400) {
  return json({ error: msg }, status)
}

export async function onRequest({ request, env, params }) {
  const route = (params.route ?? []).join('/')
  const method = request.method.toUpperCase()
  const DB = env.DB
  const SECRET = env.ADMIN_PWD

  // POST /login — no auth required
  if (method === 'POST' && route === 'login') {
    const { username, password } = await request.json()
    if (!SECRET) return err('服务器未配置密码', 500)
    if (username !== 'admin' || password !== SECRET) return err('用户名或密码错误', 401)
    const token = await createToken(SECRET)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TOKEN_MAX_AGE}`,
      },
    })
  }

  // POST /logout — no auth required
  if (method === 'POST' && route === 'logout') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
      },
    })
  }

  // All other routes require a valid session
  const token = getSessionToken(request)
  const session = token && SECRET ? await verifyToken(token, SECRET) : null
  if (!session) return err('未登录', 401)

  // GET /me
  if (method === 'GET' && route === 'me') {
    return json({ username: session.u })
  }

  // GET /hymns
  if (method === 'GET' && route === 'hymns') {
    const { results } = await DB.prepare('SELECT * FROM hymns ORDER BY created_at ASC').all()
    return json(results.map(rowToHymn))
  }

  // POST /hymns
  if (method === 'POST' && route === 'hymns') {
    const body = await request.json()
    const { title, tags = [], theme = '', lyrics = '', lastSelectedDate = '' } = body
    if (!title) return err('title required')
    const stmt = DB.prepare(
      'INSERT INTO hymns (title, tags, theme, lyrics, last_selected_date) VALUES (?, ?, ?, ?, ?) RETURNING *'
    )
    const row = await stmt.bind(title, JSON.stringify(tags), theme, lyrics, lastSelectedDate).first()
    return json(rowToHymn(row), 201)
  }

  // Audio routes — must come before hymnMatch checks
  const hymnAudioMatch = route.match(/^hymns\/(\d+)\/audio$/)

  // PUT /hymns/:id/audio — upload MP3 to R2
  if (method === 'PUT' && hymnAudioMatch) {
    const id = Number(hymnAudioMatch[1])
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return err('no file', 400)
    const key = `hymns/${id}.mp3`
    await env.HYMNS_AUDIO.put(key, file.stream(), {
      httpMetadata: { contentType: 'audio/mpeg' },
    })
    await DB.prepare('UPDATE hymns SET audio_key=? WHERE id=?').bind(key, id).run()
    const row = await DB.prepare('SELECT * FROM hymns WHERE id=?').bind(id).first()
    if (!row) return err('not found', 404)
    return json(rowToHymn(row))
  }

  // DELETE /hymns/:id/audio — remove from R2, clear DB
  if (method === 'DELETE' && hymnAudioMatch) {
    const id = Number(hymnAudioMatch[1])
    const row = await DB.prepare('SELECT audio_key FROM hymns WHERE id=?').bind(id).first()
    if (row?.audio_key) await env.HYMNS_AUDIO.delete(row.audio_key)
    await DB.prepare('UPDATE hymns SET audio_key=NULL WHERE id=?').bind(id).run()
    return json({ ok: true })
  }

  // GET /hymns/:id/audio — stream from R2 with range support for seeking
  if (method === 'GET' && hymnAudioMatch) {
    const id = Number(hymnAudioMatch[1])
    const row = await DB.prepare('SELECT audio_key FROM hymns WHERE id=?').bind(id).first()
    if (!row?.audio_key) return err('no audio', 404)
    const rangeHeader = request.headers.get('Range')
    const obj = await env.HYMNS_AUDIO.get(row.audio_key, {
      range: rangeHeader ? request.headers : undefined,
    })
    if (!obj) return err('audio not found', 404)
    const headers = {
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Content-Length': String(obj.size),
      'Cache-Control': 'private, max-age=3600',
    }
    if (obj.range) {
      const { offset = 0 } = obj.range
      headers['Content-Range'] = `bytes ${offset}-${offset + obj.size - 1}/*`
      return new Response(obj.body, { status: 206, headers })
    }
    return new Response(obj.body, { status: 200, headers })
  }

  // PUT /hymns/:id
  const hymnMatch = route.match(/^hymns\/(\d+)$/)
  if (method === 'PUT' && hymnMatch) {
    const id = Number(hymnMatch[1])
    const body = await request.json()
    const { tags, theme, lyrics, lastSelectedDate } = body
    await DB.prepare(
      'UPDATE hymns SET tags=?, theme=?, lyrics=?, last_selected_date=? WHERE id=?'
    ).bind(JSON.stringify(tags ?? []), theme ?? '', lyrics ?? '', lastSelectedDate ?? '', id).run()
    const row = await DB.prepare('SELECT * FROM hymns WHERE id=?').bind(id).first()
    if (!row) return err('not found', 404)
    return json(rowToHymn(row))
  }

  // DELETE /hymns/:id
  if (method === 'DELETE' && hymnMatch) {
    const id = Number(hymnMatch[1])
    const row = await DB.prepare('SELECT audio_key FROM hymns WHERE id=?').bind(id).first()
    if (row?.audio_key) await env.HYMNS_AUDIO.delete(row.audio_key).catch(() => {})
    await DB.prepare('DELETE FROM hymns WHERE id=?').bind(id).run()
    return json({ ok: true })
  }

  // GET /history
  if (method === 'GET' && route === 'history') {
    const { results } = await DB.prepare(
      'SELECT target_date, hymn_id FROM selection_history ORDER BY target_date ASC, position ASC'
    ).all()
    const history = {}
    for (const row of results) {
      if (!history[row.target_date]) history[row.target_date] = []
      history[row.target_date].push(row.hymn_id)
    }
    return json(history)
  }

  // PUT /history/:date
  const historyMatch = route.match(/^history\/(\d{4}-\d{2}-\d{2})$/)
  if (method === 'PUT' && historyMatch) {
    const date = historyMatch[1]
    const ids = await request.json()
    await DB.prepare('DELETE FROM selection_history WHERE target_date=?').bind(date).run()
    if (ids.length > 0) {
      const placeholders = ids.map(() => '(?, ?, ?)').join(', ')
      const values = ids.flatMap((id, i) => [date, id, i])
      await DB.prepare(
        `INSERT INTO selection_history (target_date, hymn_id, position) VALUES ${placeholders}`
      ).bind(...values).run()
    }
    return json({ ok: true })
  }

  // POST /import — atomic replace all data
  if (method === 'POST' && route === 'import') {
    const { hymns, selectionHistory } = await request.json()

    await DB.prepare('DELETE FROM selection_history').run()
    await DB.prepare('DELETE FROM hymns').run()

    const idMap = {}
    for (const h of hymns) {
      const row = await DB.prepare(
        'INSERT INTO hymns (title, tags, theme, lyrics, last_selected_date) VALUES (?, ?, ?, ?, ?) RETURNING *'
      ).bind(h.title, JSON.stringify(h.tags ?? []), h.theme ?? '', h.lyrics ?? '', h.lastSelectedDate ?? '').first()
      idMap[h.id] = row.id
    }

    for (const [date, ids] of Object.entries(selectionHistory ?? {})) {
      const remapped = ids.map(oid => idMap[oid]).filter(Boolean)
      if (remapped.length === 0) continue
      const placeholders = remapped.map(() => '(?, ?, ?)').join(', ')
      const values = remapped.flatMap((id, i) => [date, id, i])
      await DB.prepare(
        `INSERT INTO selection_history (target_date, hymn_id, position) VALUES ${placeholders}`
      ).bind(...values).run()
    }

    const { results: hymnRows } = await DB.prepare('SELECT * FROM hymns ORDER BY created_at ASC').all()
    const { results: histRows } = await DB.prepare(
      'SELECT target_date, hymn_id FROM selection_history ORDER BY target_date ASC, position ASC'
    ).all()
    const newHistory = {}
    for (const row of histRows) {
      if (!newHistory[row.target_date]) newHistory[row.target_date] = []
      newHistory[row.target_date].push(row.hymn_id)
    }
    return json({ hymns: hymnRows.map(rowToHymn), selectionHistory: newHistory })
  }

  return err('not found', 404)
}
