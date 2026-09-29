export default function Badge({ children, tone = 'neutral' }) {
  return <span className={`pill${tone !== 'neutral' ? ` ${tone}` : ''}`}>{children}</span>
}