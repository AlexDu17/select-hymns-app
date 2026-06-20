const PREDEFINED_TAGS = ['安静', '赞美', '恩典', '饼杯', '回应']

export default function HymnSearchBar({
  searchMode, onModeChange,
  searchText, activeTags, onSearchChange, onTagToggle,
  lyricsQuery, onLyricsChange,
}) {
  return (
    <div className="filter-bar">
      <div className="search-mode-tabs">
        <button
          type="button"
          className={`search-mode-btn${searchMode === 'text' ? ' active' : ''}`}
          onClick={() => onModeChange('text')}
        >
          曲名 / 主题
        </button>
        <button
          type="button"
          className={`search-mode-btn${searchMode === 'lyrics' ? ' active' : ''}`}
          onClick={() => onModeChange('lyrics')}
        >
          歌词
        </button>
      </div>

      {searchMode === 'text' ? (
        <>
          <input
            className="form-input search-input"
            type="search"
            placeholder="搜索歌名或主题…"
            value={searchText}
            onChange={e => onSearchChange(e.target.value)}
          />
          <div className="filter-tags">
            {PREDEFINED_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                className={`tag-filter-btn tag-${tag}${activeTags.includes(tag) ? ' active' : ''}`}
                onClick={() => onTagToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </>
      ) : (
        <input
          className="form-input search-input"
          type="search"
          placeholder="输入您记得的歌词片段，支持模糊匹配…"
          value={lyricsQuery}
          onChange={e => onLyricsChange(e.target.value)}
          autoFocus
        />
      )}
    </div>
  )
}
