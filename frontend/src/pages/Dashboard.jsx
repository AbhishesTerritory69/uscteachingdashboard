import { useEffect, useState } from 'react'
import AlertPanel from '../components/dashboard/AlertPanel.jsx'
import ActivityTable from '../components/dashboard/ActivityTable.jsx'
import MetricCard from '../components/dashboard/MetricCard.jsx'
import Card from '../components/common/Card.jsx'
import AsyncState from '../components/common/AsyncState.jsx'
import { dashboardApi } from '../api/dashboard.js'
import { teachingActivitiesApi } from '../api/teachingActivities.js'

const periods = ['', 'Trimester 1', 'Trimester 2', 'Trimester 3']

export default function Dashboard() {
  const [filters, setFilters] = useState({ academicYear: '', academicPeriod: '' })
  const [snapshot, setSnapshot] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    Promise.all([
      dashboardApi.summary(filters),
      dashboardApi.workload(filters),
      dashboardApi.departments(filters),
      dashboardApi.alerts(filters),
      teachingActivitiesApi.list({ ...filters, page: 1, limit: 20, sort: '-createdAt' }),
    ]).then(([summary, workload, departments, alerts, activityList]) => {
      if (!current) return
      setSnapshot({ summary: summary.data, workload: workload.data, departments: departments.data, alerts: alerts.data })
      setActivities(activityList.data || [])
    }).catch((requestError) => {
      if (current) setError(requestError.message || 'Dashboard data could not be loaded.')
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [filters.academicYear, filters.academicPeriod, reload])

  const summary = snapshot?.summary
  const workload = snapshot?.workload || []
  const departmentRows = snapshot?.departments || []
  const maxHours = Math.max(1, ...workload.map((item) => item.teachingHours || 0))

  if (loading || error || !summary) {
    return <AsyncState loading={loading} error={error} onRetry={() => setReload((value) => value + 1)} />
  }

  const metrics = [
    { label: 'Active courses', value: summary.courses.active, foot: `${summary.courses.allocated} allocated` },
    { label: 'Active teaching staff', value: summary.faculty.active, foot: `${summary.faculty.withAllocation} with allocation` },
    { label: 'Teaching activities', value: summary.teaching.activities, foot: `${summary.courses.unallocated} active courses unallocated` },
    { label: 'Teaching hours', value: summary.teaching.hours, foot: 'Stored backend-calculated hours' },
  ]

  return (
    <>
      <div className="dashboard-filters toolbar" aria-label="Dashboard academic filters">
        <label className="sr-only" htmlFor="dashboard-year">Academic year</label>
        <select id="dashboard-year" className="select" value={filters.academicYear} onChange={(event) => setFilters({ ...filters, academicYear: event.target.value })}>
          <option value="">All academic years</option><option value="2026">2026</option><option value="2025">2025</option>
        </select>
        <label className="sr-only" htmlFor="dashboard-period">Academic period</label>
        <select id="dashboard-period" className="select" value={filters.academicPeriod} onChange={(event) => setFilters({ ...filters, academicPeriod: event.target.value })}>
          <option value="">All periods</option>{periods.slice(1).map((period) => <option key={period}>{period}</option>)}
        </select>
      </div>
      <div className="grid cards">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>
      <section className="section grid two-col">
        <ActivityTable rows={activities} />
        <AlertPanel alerts={snapshot.alerts} />
      </section>
      <section className="section grid two-col">
        <Card className="panel">
          <div className="section-head"><h2>Teaching hours by faculty</h2><span className="subtle">Stored activity totals</span></div>
          <div className="bar-list">
            {workload.map((item) => <div className="bar-row" key={item.faculty.id}>
              <span>{item.faculty.name}</span><div className="bar"><span style={{ width: `${Math.max(2, ((item.teachingHours || 0) / maxHours) * 100)}%` }} /></div><strong>{item.teachingHours || 0} h</strong>
            </div>)}
            {workload.length === 0 && <div className="empty">No faculty workload found for these filters.</div>}
          </div>
        </Card>
        <Card className="panel">
          <div className="section-head"><h2>Department activity</h2><span className="subtle">Current filter</span></div>
          {departmentRows.length === 0 ? <div className="empty">No department activity found.</div> : departmentRows.map((item) => (
            <div className="staff-card" key={item.department.id}>
              <div><div className="person-name">{item.department.name}</div><div className="person-meta">{item.activityCount} activities · {item.courseCount} courses</div></div>
              <strong>{item.teachingHours} hrs</strong>
            </div>
          ))}
        </Card>
      </section>
    </>
  )
}