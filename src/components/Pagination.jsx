export default function Pagination({ total, currentPage, perPage, onChange }) {
  const pageCount = Math.ceil(total / perPage)
  if (pageCount <= 1) return null

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="上一页"
      >
        ‹
      </button>

      {pages.map(page => (
        <button
          key={page}
          className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
          onClick={() => onChange(page)}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      <button
        className="pagination-btn"
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === pageCount}
        aria-label="下一页"
      >
        ›
      </button>
    </div>
  )
}
