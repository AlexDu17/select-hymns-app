import { useState, useMemo } from 'react'
import HymnCard from './HymnCard'
import Pagination from './Pagination'
import HymnSearchBar from './HymnSearchBar'
import { searchByLyrics, findSnippet, highlightSnippet } from '../utils/lyricsSearch'

const PER_PAGE = 10
const PREDEFINED_TAGS = ['安静', '赞美', '恩典', '饼杯', '回应']

export default function HymnList({ hymns, onEdit, onDelete, onAddToQueue, onViewDetail }) {
  const [searchMode, setSearchMode] = useState('text')  // 'text' | 'lyrics'
  const [currentPage, setCurrentPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [lyricsQuery, setLyricsQuery] = useState('')

  const filtered = useMemo(() => {
    const text = searchText.trim().toLowerCase()
    return hymns.filter(h => {
      const matchesText = !text ||
        h.title.toLowerCase().includes(text) ||
        h.theme.toLowerCase().includes(text)
      const matchesTags = activeTags.length === 0 ||
        activeTags.some(t => h.tags.includes(t))
      return matchesText && matchesTags
    })
  }, [hymns, searchText, activeTags])

  const lyricsResults = useMemo(
    () => searchByLyrics(lyricsQuery, hymns),
    [lyricsQuery, hymns]
  )

  function handleSearchChange(text) {
    setSearchText(text)
    setCurrentPage(1)
  }

  function handleTagToggle(tag) {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
    setCurrentPage(1)
  }

  function handleModeChange(mode) {
    setSearchMode(mode)
    setCurrentPage(1)
  }

  function clearFilters() {
    setSearchText('')
    setActiveTags([])
    setCurrentPage(1)
  }

  const hasFilter = searchText.trim() || activeTags.length > 0
  const start = (currentPage - 1) * PER_PAGE
  const pageHymns = filtered.slice(start, start + PER_PAGE)

  return (
    <div>
      <HymnSearchBar
        searchMode={searchMode}
        onModeChange={handleModeChange}
        searchText={searchText}
        activeTags={activeTags}
        onSearchChange={handleSearchChange}
        onTagToggle={handleTagToggle}
        lyricsQuery={lyricsQuery}
        onLyricsChange={setLyricsQuery}
      />

      {searchMode === 'lyrics' ? (
        <LyricsResults
          query={lyricsQuery}
          results={lyricsResults}
          onViewDetail={onViewDetail}
        />
      ) : (
        <>
          <div className="hymn-list-header">
            <span>
              {hasFilter
                ? `筛选结果：${filtered.length} 首（共 ${hymns.length} 首）`
                : `共 ${hymns.length} 首诗歌`}
            </span>
            {hasFilter && (
              <button type="button" className="clear-filter-btn" onClick={clearFilters}>
                清除筛选
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            hymns.length === 0 ? (
              <div className="hymn-list-empty">
                <div className="empty-icon">🎵</div>
                <h3>曲库还没有诗歌</h3>
                <p>点击右上角「添加诗歌」开始建立曲库</p>
              </div>
            ) : (
              <div className="hymn-list-empty">
                <div className="empty-icon">🔍</div>
                <h3>没有找到匹配的诗歌</h3>
                <p>试试其他关键词或标签</p>
              </div>
            )
          ) : (
            <>
              <div className="hymn-list">
                {pageHymns.map((hymn, i) => (
                  <HymnCard
                    key={hymn.id}
                    hymn={hymn}
                    index={start + i + 1}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddToQueue={onAddToQueue}
                    onViewDetail={onViewDetail}
                  />
                ))}
              </div>
              <Pagination
                total={filtered.length}
                currentPage={currentPage}
                perPage={PER_PAGE}
                onChange={page => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

function LyricsResults({ query, results, onViewDetail }) {
  const q = query.trim()

  if (!q || q.length < 2) {
    return (
      <div className="hymn-list-empty">
        <div className="empty-icon">🎵</div>
        <p>输入至少 2 个字开始搜索</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="hymn-list-empty">
        <div className="empty-icon">🔍</div>
        <h3>没有找到匹配的歌词</h3>
        <p>请尝试其他片段，或检查是否记错了</p>
      </div>
    )
  }

  return (
    <div className="lyrics-results">
      <p className="lyrics-results-hint">根据歌词匹配，最多显示 10 首</p>
      {results.map(({ hymn, score }, i) => {
        const snippet = findSnippet(query, hymn.lyrics)
        const pct = Math.round(score * 100)
        return (
          <div key={hymn.id} className="lyrics-result-item">
            <div className="lyrics-result-header">
              <span className="lyrics-result-rank">{i + 1}</span>
              <button
                type="button"
                className="hymn-card-title-btn lyrics-result-title"
                onClick={() => onViewDetail(hymn)}
              >
                {hymn.title}
              </button>
              <div className="lyrics-result-tags">
                {hymn.tags.map(tag => (
                  <span
                    key={tag}
                    className={`tag ${PREDEFINED_TAGS.includes(tag) ? `tag-${tag}` : 'tag-other'}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <span
                className="lyrics-result-score"
                title={`匹配度 ${pct}%`}
                style={{ '--score': pct / 100 }}
              >
                {pct}%
              </span>
            </div>
            {snippet && (
              <p className="lyrics-result-snippet">
                "
                {highlightSnippet(query, snippet).map((part, idx) =>
                  part.highlight
                    ? <mark key={idx} className="lyrics-highlight">{part.text}</mark>
                    : part.text
                )}
                "
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
