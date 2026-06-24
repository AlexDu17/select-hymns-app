import { useAudioPlayer, formatTime } from '../hooks/useAudioPlayer'
import { api } from '../api'

const PREDEFINED_TAGS = ['安静', '赞美', '恩典', '饼杯', '回应']

function formatDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

function AudioPlayer({ hymnId }) {
  const url = api.getAudioUrl(hymnId)
  const { isPlaying, isLoading, currentTime, duration, toggle, seek } = useAudioPlayer(url)
  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <div className="audio-player">
      <button
        type="button"
        className={`audio-player-btn${isPlaying ? ' playing' : ''}`}
        onClick={toggle}
        aria-label={isPlaying ? '暂停' : '播放'}
      >
        {isLoading ? <span className="play-loading" /> : isPlaying ? '⏸' : '▶'}
      </button>
      <div className="audio-player-progress">
        <input
          type="range"
          className="audio-player-range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={e => seek(Number(e.target.value))}
          aria-label="播放进度"
        />
        <div className="audio-player-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="audio-player-time">
        {formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ''}
      </span>
    </div>
  )
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

      {hymn.audioKey && (
        <div className="detail-section">
          <h3 className="detail-section-title">音频</h3>
          <AudioPlayer hymnId={hymn.id} />
        </div>
      )}

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
