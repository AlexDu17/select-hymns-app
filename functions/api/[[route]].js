function rowToHymn(row) {
  return {
    id: row.id,
    title: row.title,
    tags: JSON.parse(row.tags || '[]'),
    theme: row.theme || '',
    lyrics: row.lyrics || '',
    lastSelectedDate: row.last_selected_date || '',
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

    // Insert hymns and build oldId → newId map
    const idMap = {}
    for (const h of hymns) {
      const row = await DB.prepare(
        'INSERT INTO hymns (title, tags, theme, lyrics, last_selected_date) VALUES (?, ?, ?, ?, ?) RETURNING *'
      ).bind(h.title, JSON.stringify(h.tags ?? []), h.theme ?? '', h.lyrics ?? '', h.lastSelectedDate ?? '').first()
      idMap[h.id] = row.id
    }

    // Insert history with remapped IDs
    for (const [date, ids] of Object.entries(selectionHistory ?? {})) {
      const remapped = ids.map(oid => idMap[oid]).filter(Boolean)
      if (remapped.length === 0) continue
      const placeholders = remapped.map(() => '(?, ?, ?)').join(', ')
      const values = remapped.flatMap((id, i) => [date, id, i])
      await DB.prepare(
        `INSERT INTO selection_history (target_date, hymn_id, position) VALUES ${placeholders}`
      ).bind(...values).run()
    }

    // Return new state
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
