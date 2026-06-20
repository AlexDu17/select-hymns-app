import { useState, useEffect } from 'react'
import HymnList from './components/HymnList'
import AddHymnForm from './components/AddHymnForm'
import HymnDetail from './components/HymnDetail'
import SelectionPage from './components/SelectionPage'
import './App.css'

const HYMNS_KEY = 'hymns-library'
const HISTORY_KEY = 'hymns-selection-history'

function App() {
  const [hymns, setHymns] = useState(() => {
    const saved = localStorage.getItem(HYMNS_KEY)
    return saved ? JSON.parse(saved) : []
  })
  const [selectionHistory, setSelectionHistory] = useState(() => {
    const saved = localStorage.getItem(HISTORY_KEY)
    return saved ? JSON.parse(saved) : {}
  })
  const [page, setPage] = useState('library')   // 'library' | 'selection'
  const [view, setView] = useState('list')       // 'list' | 'add' | 'edit' | 'detail'
  const [editingHymn, setEditingHymn] = useState(null)
  const [detailHymn, setDetailHymn] = useState(null)

  useEffect(() => {
    localStorage.setItem(HYMNS_KEY, JSON.stringify(hymns))
  }, [hymns])

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(selectionHistory))
  }, [selectionHistory])

  function handleSubmitForm(data) {
    if (view === 'edit' && editingHymn) {
      setHymns(prev => prev.map(h =>
        h.id === editingHymn.id ? { ...h, ...data } : h
      ))
      setEditingHymn(null)
    } else {
      setHymns(prev => [...prev, { ...data, id: Date.now() }])
    }
    setView('list')
  }

  function handleEdit(hymn) {
    setEditingHymn(hymn)
    setView('edit')
  }

  function handleDelete(id) {
    if (!window.confirm('确定要删除这首诗歌吗？')) return
    setHymns(prev => prev.filter(h => h.id !== id))
  }

  function handleCancel() {
    setEditingHymn(null)
    setView('list')
  }

  function handleViewDetail(hymn) {
    setDetailHymn(hymn)
    setView('detail')
  }

  function handleAddToQueue(hymnId, date) {
    setSelectionHistory(prev => {
      const existing = prev[date] ?? []
      if (existing.includes(hymnId)) return prev
      return { ...prev, [date]: [...existing, hymnId] }
    })
  }

  function handleSaveSelection(date, ids) {
    setSelectionHistory(prev => ({ ...prev, [date]: ids }))
  }

  function handleNavigate(newPage) {
    setPage(newPage)
    if (newPage === 'library') {
      setView('list')
      setEditingHymn(null)
    }
  }

  function handleExport() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      hymns,
      selectionHistory,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hymns-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!Array.isArray(data.hymns) || typeof data.selectionHistory !== 'object') {
          alert('文件格式不正确，请选择正确的备份文件。')
          return
        }
        if (!window.confirm(
          `导入后将替换现有的 ${hymns.length} 首诗歌和全部历史数据。\n备份文件包含 ${data.hymns.length} 首诗歌。\n\n确定继续吗？`
        )) return
        setHymns(data.hymns)
        setSelectionHistory(data.selectionHistory)
        setView('list')
        setPage('library')
      } catch {
        alert('文件解析失败，请确保选择了正确的 JSON 备份文件。')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-text">
          <h1 className="app-title">诗歌曲库</h1>
          <p className="app-subtitle">教会诗班敬拜赞美诗歌管理</p>
        </div>
        <div className="app-header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            导出备份
          </button>
          <label className="btn btn-secondary import-label" title="导入 JSON 备份文件">
            导入数据
            <input
              type="file"
              accept=".json,application/json"
              className="import-input"
              onChange={handleImport}
            />
          </label>
          {page === 'library' && view === 'list' && (
            <button className="btn btn-primary" onClick={() => setView('add')}>
              + 添加诗歌
            </button>
          )}
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn${page === 'library' ? ' active' : ''}`}
          onClick={() => handleNavigate('library')}
        >
          诗歌曲库
        </button>
        <button
          className={`nav-btn${page === 'selection' ? ' active' : ''}`}
          onClick={() => handleNavigate('selection')}
        >
          开始选歌
        </button>
      </nav>

      <main className="app-main">
        {page === 'library' ? (
          view === 'list' ? (
            <HymnList
              hymns={hymns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddToQueue={handleAddToQueue}
              onViewDetail={handleViewDetail}
            />
          ) : view === 'detail' ? (
            <HymnDetail
              hymn={hymns.find(h => h.id === detailHymn?.id) ?? detailHymn}
              onBack={() => setView('list')}
            />
          ) : (
            <AddHymnForm
              onSubmit={handleSubmitForm}
              onCancel={handleCancel}
              initialHymn={view === 'edit' ? editingHymn : null}
            />
          )
        ) : (
          <SelectionPage
            hymns={hymns}
            selectionHistory={selectionHistory}
            onSaveSelection={handleSaveSelection}
          />
        )}
      </main>
    </div>
  )
}

export default App
