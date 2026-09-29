import Badge from '../common/Badge.jsx'
import Card from '../common/Card.jsx'
import Table from '../common/Table.jsx'

const columns = [
  { key: 'course', label: 'Course', render: (row) => <><span className="course-code">{row.course?.code || 'Unlinked course'}</span><div className="subtle">{row.course?.name}</div></> },
  { key: 'activityType', label: 'Activity' },
  { key: 'academicPeriod', label: 'Period', render: (row) => `${row.academicYear} · ${row.academicPeriod}` },
  { key: 'faculty', label: 'Faculty', render: (row) => row.faculty?.name || 'Unassigned' },
  { key: 'teachingHours', label: 'Hours', render: (row) => `${row.teachingHours ?? 0} hrs` },
  { key: 'status', label: 'Status', render: (row) => <Badge tone={row.status === 'scheduled' ? 'good' : row.status === 'cancelled' ? 'bad' : 'warn'}>{row.status}</Badge> },
]

export default function ActivityTable({ rows }) {
  return (
    <Card className="panel">
      <div className="section-head">
        <h2>Recent teaching activities</h2>
        <span className="subtle">Backend records</span>
      </div>
      <Table columns={columns} rows={rows} caption="Current course allocations" />
    </Card>
  )
}