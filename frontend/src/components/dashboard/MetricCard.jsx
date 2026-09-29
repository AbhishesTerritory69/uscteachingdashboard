import Card from '../common/Card.jsx'

export default function MetricCard({ label, value, foot }) {
  return (
    <Card className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">{foot}</div>
    </Card>
  )
}