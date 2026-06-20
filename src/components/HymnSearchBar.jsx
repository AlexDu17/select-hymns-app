const PREDEFINED_TAGS = ['安静', '赞美', '恩典', '饼杯', '回应']

export default function HymnSearchBar({ searchText, activeTags, onSearchChange, onTagToggle }) {
  return (
    <div className="filter-bar">
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
            className={`tag-filter-btn tag-${tag} ${activeTags.includes(tag) ? 'active' : ''}`}
            onClick={() => onTagToggle(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}
