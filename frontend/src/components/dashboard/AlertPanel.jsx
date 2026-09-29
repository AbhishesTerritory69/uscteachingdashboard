import Card from '../common/Card.jsx'

export default function AlertPanel({ alerts }) {
  return (
    <Card className="panel">
      <div className="section-head"><h2>Needs attention</h2></div>
      {alerts.map((alert) => (
        <div className="alert" key={`${alert.type}-${alert.resourceId}`}>
          <span aria-hidden="true">!</span>
          <div><strong>{alert.message}</strong><small>{alert.severity}</small></div>
        </div>
      ))}
    </Card>
  )
}