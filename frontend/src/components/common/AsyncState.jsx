import Button from './Button.jsx'

export default function AsyncState({ loading, error, empty, onRetry, children, emptyMessage = 'No records found.' }) {
  if (loading) return <div className="async-state" role="status">Loading…</div>
  if (error) {
    return (
      <div className="async-state async-error" role="alert">
        <p>{error}</p>
        {onRetry && <Button variant="secondary" onClick={onRetry}>Retry</Button>}
      </div>
    )
  }
  if (empty) return <div className="async-state">{emptyMessage}</div>
  return children
}