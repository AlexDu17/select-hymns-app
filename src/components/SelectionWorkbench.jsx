import { useState, useMemo, useEffect } from 'react'
import HymnSearchBar from './HymnSearchBar'

const PREDEFINED_TAGS = ['安静', '赞美', '恩典', '饼杯', '回应']

function getTomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

export default function SelectionWorkbench({ hymns, selectionHistory, onSave }) {
  const tomorrow = getTomorrow()
  const [targetDate, setTargetDate] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [searchText, setSearchText] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [dragIndex, setDragIndex] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!targetDate) return
    setSelectedIds(selectionHistory[targetDate] ?? [])
    setSaved(false)
  }, [targetDate])

  const selectedHymns = useMemo(
    () => selectedIds.map(id => hymns.find(h => h.id === id)).filter(Boolean),
    [selectedIds, hymns]
  )

  const searchResults = useMemo(() => {
    const text = searchText.trim().toLowerCase()
    return hymns.filter(h => {
      if (selectedIds.includes(h.id)) return false
      const matchText = !text ||
        h.title.toLowerCase().includes(text) ||
        h.theme.toLowerCase().includes(text)
      const matchTags = activeTags.length === 0 || activeTags.some(t => h.tags.includes(t))
      return matchText && matchTags
    })
  }, [hymns, searchText, activeTags, selectedIds])

  function addHymn(id) {
    setSelectedIds(prev => [...prev, id])
    setSaved(false)
  }

  function removeHymn(id) {
    const hymn = hymns.find(h => h.id === id)
    if (!window.confirm(`确定要从已选列表中移除《${hymn?.title ?? '该诗歌'}》吗？`)) return
    setSelectedIds(prev => prev.filter(i => i !== id))
    setSaved(false)
  }

  function handleDragStart(index) {
    setDragIndex(index)
  }

  function handleDragOver(e, index) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const newIds = [...selectedIds]
    const [moved] = newIds.splice(dragIndex, 1)
    newIds.splice(index, 0, moved)
    setSelectedIds(newIds)
    setDragIndex(index)
  }

  function handleDragEnd() {
    setDragIndex(null)
  }

  function handleSave() {
    if (!targetDate || selectedIds.length === 0) return
    onSave(targetDate, selectedIds)
    setSaved(true)
  }

  return (
    <div className="workbench">
      <div className="workbench-date-row">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="wb-date">礼拜日期</label>
          <input
            id="wb-date"
            className="form-input form-input-date"
            type="date"
            min={tomorrow}
            value={targetDate}
            onChange={e => {
              setTargetDate(e.target.value)
              setSearchText('')
              setActiveTags([])
            }}
          />
        </div>
        {targetDate && (
          <span className="workbench-date-display">{formatDisplayDate(targetDate)}</span>
        )}
      </div>

      {targetDate && (
        <div className="workbench-body">
          {/* Left: search and pick */}
          <div className="workbench-panel workbench-search-panel">
            <h3 className="workbench-panel-title">从曲库选歌</h3>
            <HymnSearchBar
              searchText={searchText}
              activeTags={activeTags}
              onSearchChange={setSearchText}
              onTagToggle={tag => setActiveTags(prev =>
                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
              )}
            />
            <div className="pick-list">
              {searchResults.length === 0 ? (
                <p className="pick-hint">
                  {hymns.length === selectedIds.length
                    ? '所有诗歌都已加入'
                    : '没有找到匹配的诗歌'}
                </p>
              ) : (
                searchResults.map(h => (
                  <div key={h.id} className="pick-row">
                    <div className="pick-row-info">
                      <span className="pick-row-title">{h.title}</span>
                      <div className="pick-row-meta">
                        {h.tags.map(t => (
                          <span key={t} className={`tag ${PREDEFINED_TAGS.includes(t) ? `tag-${t}` : 'tag-other'}`}>{t}</span>
                        ))}
                        {h.theme && <span className="pick-row-theme">{h.theme}</span>}
                        {h.lastSelectedDate && (
                          <span className="pick-row-last-selected">上次挑选：{formatDisplayDate(h.lastSelectedDate)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary pick-add-btn"
                      onClick={() => addHymn(h.id)}
                    >
                      + 添加
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: selected list */}
          <div className="workbench-panel workbench-selected-panel">
            <h3 className="workbench-panel-title">
              已选曲目
              {selectedHymns.length > 0 && (
                <span className="workbench-count">{selectedHymns.length} 首</span>
              )}
            </h3>

            {selectedHymns.length === 0 ? (
              <p className="pick-hint">从左侧添加诗歌</p>
            ) : (
              <div className="selected-list">
                {selectedHymns.map((h, i) => (
                  <div
                    key={h.id}
                    className={`selected-item${dragIndex === i ? ' dragging' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="drag-handle" aria-hidden="true">⠿</span>
                    <span className="selected-index">{i + 1}</span>
                    <span className="selected-title">{h.title}</span>
                    <button
                      type="button"
                      className="selected-remove"
                      onClick={() => removeHymn(h.id)}
                      aria-label={`移除 ${h.title}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="workbench-save-row">
              {saved && <span className="save-success">✓ 已保存</span>}
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={selectedIds.length === 0}
              >
                保存选歌
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
