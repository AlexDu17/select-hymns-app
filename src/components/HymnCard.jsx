import { useState } from 'react'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { api } from '../api'

const PREDEFINED_TAGS = ['安静', '赞美', '恩典', '饼杯', '回应']

function getTomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

export default function HymnCard({ hymn, index, onEdit, onDelete, onAddToQueue, onViewDetail }) {
  const [showModal, setShowModal] = useState(false)
  const [queueDate, setQueueDate] = useState('')
  const tomorrow = getTomorrow()
  const audioUrl = hymn.audioKey ? api.getAudioUrl(hymn.id) : null
  const { isPlaying, isLoading, toggle } = useAudioPlayer(audioUrl)

  function handleConfirm() {
    if (!queueDate) return
    onAddToQueue(hymn.id, queueDate)
    setShowModal(false)
    setQueueDate('')
  }

  return (
    <>
      <div className="hymn-card">
        <span className="hymn-card-number">{index}</span>
        <div className="hymn-card-body">
          <button type="button" className="hymn-card-title-btn" onClick={() => onViewDetail(hymn)}>
          {hymn.title}
        </button>
          <div className="hymn-card-meta">
            {hymn.tags.map(tag => (
              <span
                key={tag}
                className={`tag ${PREDEFINED_TAGS.includes(tag) ? `tag-${tag}` : 'tag-other'}`}
              >
                {tag}
              </span>
            ))}
            {hymn.theme && (
              <span className="hymn-card-theme">{hymn.theme}</span>
            )}
            {hymn.lastSelectedDate && (
              <span className="hymn-card-last-selected">
                上次挑选：{formatDate(hymn.lastSelectedDate)}
              </span>
            )}
          </div>
        </div>
        <div className="hymn-card-actions">
          {audioUrl && (
            <button
              type="button"
              className={`action-btn action-btn-play${isPlaying ? ' playing' : ''}`}
              onClick={toggle}
              aria-label={isPlaying ? '暂停' : '播放'}
            >
              {isLoading ? <span className="play-loading" /> : isPlaying ? '⏸' : '▶'}
            </button>
          )}
          <button
            type="button"
            className="action-btn action-btn-queue"
            onClick={() => { setQueueDate(''); setShowModal(true) }}
            aria-label={`将 ${hymn.title} 加入备选`}
          >
            加入备选
          </button>
          <button
            type="button"
            className="action-btn"
            onClick={() => onEdit(hymn)}
            aria-label={`编辑 ${hymn.title}`}
          >
            编辑
          </button>
          <button
            type="button"
            className="action-btn action-btn-delete"
            onClick={() => onDelete(hymn.id)}
            aria-label={`删除 ${hymn.title}`}
          >
            删除
          </button>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">加入备选</h3>
            <p className="modal-hymn-name">《{hymn.title}》</p>
            <div className="form-group">
              <label className="form-label" htmlFor={`queue-date-${hymn.id}`}>
                选择礼拜日期
              </label>
              <input
                id={`queue-date-${hymn.id}`}
                className="form-input form-input-date"
                type="date"
                min={tomorrow}
                value={queueDate}
                onChange={e => setQueueDate(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={!queueDate}
              >
                确定
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
