import { useState } from 'react'
import SelectionWorkbench from './SelectionWorkbench'
import HistoryView from './HistoryView'

export default function SelectionPage({ hymns, selectionHistory, onSaveSelection }) {
  const [tab, setTab] = useState('workbench')

  return (
    <div className="selection-page">
      <div className="tabs">
        <button
          className={`tab-btn${tab === 'workbench' ? ' active' : ''}`}
          onClick={() => setTab('workbench')}
        >
          选歌工作台
        </button>
        <button
          className={`tab-btn${tab === 'history' ? ' active' : ''}`}
          onClick={() => setTab('history')}
        >
          历史数据
        </button>
      </div>

      {tab === 'workbench' ? (
        <SelectionWorkbench
          hymns={hymns}
          selectionHistory={selectionHistory}
          onSave={onSaveSelection}
        />
      ) : (
        <HistoryView
          hymns={hymns}
          selectionHistory={selectionHistory}
        />
      )}
    </div>
  )
}
