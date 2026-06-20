import { useState, useMemo } from 'react'
import HymnCard from './HymnCard'
import Pagination from './Pagination'
import HymnSearchBar from './HymnSearchBar'

const PER_PAGE = 10

export default function HymnList({ hymns, onEdit, onDelete, onAddToQueue, onViewDetail }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [activeTags, setActiveTags] = useState([])

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
        searchText={searchText}
        activeTags={activeTags}
        onSearchChange={handleSearchChange}
        onTagToggle={handleTagToggle}
      />

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
    </div>
  )
}
