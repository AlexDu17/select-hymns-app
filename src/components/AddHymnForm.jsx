import { useState } from 'react'

const PREDEFINED_TAGS = ['安静', '赞美', '恩典', '饼杯', '回应']

export default function AddHymnForm({ onSubmit, onCancel, initialHymn = null }) {
  const isEdit = initialHymn !== null
  const [title, setTitle] = useState(initialHymn?.title ?? '')
  const [tags, setTags] = useState(initialHymn?.tags ?? [])
  const [theme, setTheme] = useState(initialHymn?.theme ?? '')
  const [lyrics, setLyrics] = useState(initialHymn?.lyrics ?? '')
  const [lastSelectedDate, setLastSelectedDate] = useState(initialHymn?.lastSelectedDate ?? '')
  const [titleError, setTitleError] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [audioDuration, setAudioDuration] = useState(null)
  const [removeAudio, setRemoveAudio] = useState(false)
  const hasExistingAudio = !!initialHymn?.audioKey && !removeAudio

  function pickAudioFile(file) {
    setAudioFile(file)
    setAudioDuration(null)
    if (!file) return
    const url = URL.createObjectURL(file)
    const a = new Audio()
    a.onloadedmetadata = () => { setAudioDuration(Math.round(a.duration)); URL.revokeObjectURL(url) }
    a.onerror = () => URL.revokeObjectURL(url)
    a.src = url
  }

  function toggleTag(tag) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!isEdit && !title.trim()) {
      setTitleError('请填写歌名')
      return
    }
    onSubmit({ title: title.trim(), tags, theme: theme.trim(), lyrics: lyrics.trim(), lastSelectedDate, audioFile, audioDuration, removeAudio })
  }

  return (
    <form className="add-hymn-form" onSubmit={handleSubmit} noValidate>
      <div className="form-header">
        <h2>{isEdit ? '编辑诗歌' : '添加诗歌'}</h2>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          返回曲库
        </button>
      </div>

      <div className="form-group">
        <span className="form-label">
          歌名{!isEdit && <span className="form-required">*</span>}
        </span>
        {isEdit ? (
          <p className="form-readonly">{initialHymn.title}</p>
        ) : (
          <>
            <input
              id="hymn-title"
              className="form-input"
              type="text"
              placeholder="请输入诗歌名称"
              value={title}
              onChange={e => {
                setTitle(e.target.value)
                if (e.target.value.trim()) setTitleError('')
              }}
            />
            {titleError && <p className="form-error">{titleError}</p>}
          </>
        )}
      </div>

      <div className="form-group">
        <span className="form-label">标签</span>
        <div className="tag-checkbox-group">
          {PREDEFINED_TAGS.map(tag => (
            <label key={tag} className="tag-checkbox-label">
              <span className={`tag tag-${tag}`}>{tag}</span>
              <input
                type="checkbox"
                checked={tags.includes(tag)}
                onChange={() => toggleTag(tag)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="hymn-theme">主题</label>
        <input
          id="hymn-theme"
          className="form-input"
          type="text"
          placeholder="例如：感恩、悔改、信心…"
          value={theme}
          onChange={e => setTheme(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="hymn-lyrics">歌词</label>
        <textarea
          id="hymn-lyrics"
          className="form-textarea"
          placeholder="请输入歌词内容…"
          value={lyrics}
          onChange={e => setLyrics(e.target.value)}
          rows={6}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="hymn-last-selected">
          上次挑选日期
          <span className="form-optional">（选填）</span>
        </label>
        <input
          id="hymn-last-selected"
          className="form-input form-input-date"
          type="date"
          value={lastSelectedDate}
          onChange={e => setLastSelectedDate(e.target.value)}
        />
      </div>

      <div className="form-group">
        <span className="form-label">
          音频
          <span className="form-optional">（MP3，选填）</span>
        </span>

        {hasExistingAudio && !audioFile && (
          <div className="audio-existing">
            <span className="audio-existing-label">已上传音频文件</span>
            <div className="audio-existing-actions">
              <label className="btn btn-secondary btn-sm audio-replace-label">
                更换
                <input
                  type="file"
                  accept="audio/mpeg,.mp3"
                  className="audio-file-input"
                  onChange={e => { pickAudioFile(e.target.files?.[0] ?? null); e.target.value = '' }}
                />
              </label>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => setRemoveAudio(true)}
              >
                删除
              </button>
            </div>
          </div>
        )}

        {removeAudio && !audioFile && (
          <div className="audio-pending-remove">
            <span>保存后将删除音频文件</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRemoveAudio(false)}>
              撤销
            </button>
          </div>
        )}

        {audioFile ? (
          <div className="audio-selected">
            <span className="audio-selected-name" title={audioFile.name}>{audioFile.name}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => pickAudioFile(null)}>
              取消
            </button>
          </div>
        ) : !hasExistingAudio && !removeAudio && (
          <label className="btn btn-secondary audio-pick-label">
            选择 MP3 文件
            <input
              type="file"
              accept="audio/mpeg,.mp3"
              className="audio-file-input"
              onChange={e => { pickAudioFile(e.target.files?.[0] ?? null); e.target.value = '' }}
            />
          </label>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {isEdit ? '保存修改' : '保存诗歌'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}
