const STRIP_RE = /[\s\n\r。，、！？：；""''【】《》…—,.!?:;"']/g

function normalize(text) {
  return text.replace(STRIP_RE, '')
}

function uniqueBigrams(text) {
  const seen = new Set()
  for (let i = 0; i < text.length - 1; i++) {
    seen.add(text.slice(i, i + 2))
  }
  return seen
}

// Returns 0–1: fraction of query's bigrams found anywhere in lyrics.
// A single wrong character invalidates ~2 bigrams; most others still match.
export function scoreLyricsMatch(query, lyrics) {
  const q = normalize(query)
  const l = normalize(lyrics)
  if (!q || !l) return 0
  if (q.length === 1) return l.includes(q) ? 1 : 0

  const bigrams = uniqueBigrams(q)
  let hits = 0
  for (const bg of bigrams) {
    if (l.includes(bg)) hits++
  }
  return hits / bigrams.size
}

// Find the ~60-char window in lyrics with the densest bigram overlap,
// then return it with a small context pad (uses normalized/collapsed text).
export function findSnippet(query, lyrics, snippetLen = 60) {
  const q = normalize(query)
  const l = normalize(lyrics)
  if (!q || !l) return ''

  const bigrams = [...uniqueBigrams(q)]
  if (bigrams.length === 0) return l.slice(0, snippetLen)

  const win = Math.max(q.length + 6, 18)
  let bestScore = -1
  let bestStart = 0

  for (let i = 0; i <= l.length - win; i++) {
    const w = l.slice(i, i + win)
    let score = 0
    for (const bg of bigrams) if (w.includes(bg)) score++
    if (score > bestScore) { bestScore = score; bestStart = i }
  }

  const pad = Math.floor((snippetLen - win) / 2)
  const start = Math.max(0, bestStart - pad)
  const end = Math.min(l.length, bestStart + win + pad)
  return (start > 0 ? '…' : '') + l.slice(start, end) + (end < l.length ? '…' : '')
}

// Return top-N hymns sorted by score. Requires query ≥ 2 chars.
export function searchByLyrics(query, hymns, topN = 5) {
  if (normalize(query).length < 2) return []
  return hymns
    .map(h => ({ hymn: h, score: scoreLyricsMatch(query, h.lyrics) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}
