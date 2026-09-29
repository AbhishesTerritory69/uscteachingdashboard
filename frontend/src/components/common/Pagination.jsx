import Button from './Button.jsx'

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null
  return (
    <div className="pagination" aria-label="Pagination">
      <Button variant="secondary" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>Previous</Button>
      <span>Page {pagination.page} of {pagination.pages} · {pagination.total} records</span>
      <Button variant="secondary" disabled={pagination.page >= pagination.pages} onClick={() => onPageChange(pagination.page + 1)}>Next</Button>
    </div>
  )
}