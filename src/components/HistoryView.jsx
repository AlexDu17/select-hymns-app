const PREDEFINED_TAGS = ['安静', '赞美', '恩典', '饼杯', '回应']

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

export default function HistoryView({ hymns, selectionHistory }) {
  const entries = Object.entries(selectionHistory)
    .sort(([a], [b]) => b.localeCompare(a))

  if (entries.length === 0) {
    return (
      <div className="hymn-list-empty">
        <div className="empty-icon">📅</div>
        <h3>还没有历史数据</h3>
        <p>在「选歌工作台」保存选歌后，历史记录会显示在这里</p>
      </div>
    )
  }

  return (
    <div className="history-list">
      {entries.map(([date, ids]) => (
        <div key={date} className="history-entry">
          <div className="history-date">{formatDate(date)}</div>
          <div className="history-hymns">
            {ids.map((id, i) => {
              const hymn = hymns.find(h => h.id === id)
              if (!hymn) {
                return (
                  <div key={id} className="history-hymn-row">
                    <span className="history-hymn-index">{i + 1}</span>
                    <span className="history-hymn-deleted">已删除</span>
                  </div>
                )
              }
              return (
                <div key={id} className="history-hymn-row">
                  <span className="history-hymn-index">{i + 1}</span>
                  <span className="history-hymn-title">{hymn.title}</span>
                  <div className="history-hymn-tags">
                    {hymn.tags.map(t => (
                      <span key={t} className={`tag ${PREDEFINED_TAGS.includes(t) ? `tag-${t}` : 'tag-other'}`}>{t}</span>
                    ))}
                  </div>
                  {hymn.theme && <span className="history-hymn-theme">{hymn.theme}</span>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
