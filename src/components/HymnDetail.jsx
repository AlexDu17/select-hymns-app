const PREDEFINED_TAGS = ['安静', '赞美', '恩典', '饼杯', '回应']

function formatDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

export default function HymnDetail({ hymn, onBack }) {
  return (
    <div className="hymn-detail">
      <button type="button" className="detail-back-btn" onClick={onBack}>
        ← 返回曲库
      </button>

      <h2 className="detail-title">{hymn.title}</h2>

      <div className="detail-meta">
        <div className="detail-row">
          <span className="detail-label">标签</span>
          <div className="detail-tags">
            {hymn.tags.length > 0 ? hymn.tags.map(tag => (
              <span key={tag} className={`tag ${PREDEFINED_TAGS.includes(tag) ? `tag-${tag}` : 'tag-other'}`}>
                {tag}
              </span>
            )) : <span className="detail-empty">—</span>}
          </div>
        </div>

        <div className="detail-row">
          <span className="detail-label">主题</span>
          <span className="detail-value">{hymn.theme || <span className="detail-empty">—</span>}</span>
        </div>

        {hymn.lastSelectedDate && (
          <div className="detail-row">
            <span className="detail-label">上次挑选</span>
            <span className="detail-value">{formatDate(hymn.lastSelectedDate)}</span>
          </div>
        )}
      </div>

      {hymn.lyrics ? (
        <div className="detail-section">
          <h3 className="detail-section-title">歌词</h3>
          <pre className="detail-lyrics">{hymn.lyrics}</pre>
        </div>
      ) : (
        <div className="detail-section">
          <h3 className="detail-section-title">歌词</h3>
          <p className="detail-empty">暂无歌词</p>
        </div>
      )}
    </div>
  )
}
