import { useEffect, useMemo, useState } from 'react'
import Badge from '../common/Badge.jsx'
import Button from '../common/Button.jsx'
import Card from '../common/Card.jsx'
import EntityModal from '../common/EntityModal.jsx'
import Modal from '../common/Modal.jsx'
import Pagination from '../common/Pagination.jsx'
import AsyncState from '../common/AsyncState.jsx'
import Table from '../common/Table.jsx'
import { departmentsApi } from '../../api/catalog.js'
import { facultyApi } from '../../api/faculty.js'
import { useToast } from '../../state/ToastContext.jsx'

const emptyWorkload = {
  summary: { courseCount: 0, activityCount: 0, teachingHours: 0 },
  courses: [],
  activities: [],
}

export default function FacultyDirectory({ activeOnly = false }) {
  const notify = useToast()
  const [faculty, setFaculty] = useState([])
  const [departments, setDepartments] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [facultyDetail, setFacultyDetail] = useState(null)
  const [workload, setWorkload] = useState(emptyWorkload)
  const [workloadFilters, setWorkloadFilters] = useState({ academicYear: '', academicPeriod: '' })
  const [workloadLoading, setWorkloadLoading] = useState(false)
  const [workloadError, setWorkloadError] = useState('')

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    Promise.all([
      facultyApi.list({ page, limit: 20, department: departmentFilter, ...(activeOnly ? { isActive: true } : {}) }),
      departmentsApi.list({ page: 1, limit: 100, isActive: true }),
    ]).then(([facultyResponse, departmentResponse]) => {
      if (!current) return
      setFaculty(facultyResponse.data || [])
      setPagination(facultyResponse.pagination)
      setDepartments(departmentResponse.data || [])
    }).catch((requestError) => {
      if (current) setError(requestError.message || 'Faculty could not be loaded.')
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [activeOnly, departmentFilter, page, reload])

  useEffect(() => {
    if (!selected) return undefined
    let current = true
    setWorkloadLoading(true)
    setWorkloadError('')
    facultyApi.workload(selected._id, workloadFilters).then((response) => {
      if (current) setWorkload(response.data || emptyWorkload)
    }).catch((requestError) => {
      if (current) setWorkloadError(requestError.message || 'Workload could not be loaded.')
    }).finally(() => { if (current) setWorkloadLoading(false) })
    return () => { current = false }
  }, [selected?._id, workloadFilters.academicYear, workloadFilters.academicPeriod])

  const visibleFaculty = useMemo(() => faculty.filter((person) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [person.name, person.email, person.designation].some((value) => value?.toLowerCase().includes(query))
    return matchesSearch
  }), [faculty, search])

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (person) => { setEditing(person); setModalOpen(true) }

  const saveFaculty = async (body) => {
    if (editing) await facultyApi.patch(editing._id, body)
    else await facultyApi.create(body)
    notify(editing ? 'Faculty member updated.' : 'Faculty member added.')
    setModalOpen(false)
    setReload((value) => value + 1)
  }

  const deleteFaculty = async (person) => {
    if (!window.confirm(`Delete ${person.name}? Existing teaching activity references will not be cascaded.`)) return
    try {
      await facultyApi.remove(person._id)
      notify('Faculty member deleted.')
      setReload((value) => value + 1)
    } catch (requestError) {
      notify(requestError.message, 'bad')
    }
  }

  const viewFaculty = async (person) => {
    setFacultyDetail({ loading: true })
    try {
      const response = await facultyApi.get(person._id)
      setFacultyDetail({ data: response.data })
    } catch (requestError) {
      setFacultyDetail({ error: requestError.message })
    }
  }

  const columns = [
    { key: 'name', label: 'Staff member', render: (person) => <div className="person"><span className="person-icon">{person.name?.slice(0, 1)?.toUpperCase() || '?'}</span><span><span className="person-name">{person.name}</span><span className="person-meta">{person.email || 'No email'}</span></span></div> },
    { key: 'designation', label: 'Position' },
    { key: 'department', label: 'Department', render: (person) => person.department?.name || '—' },
    { key: 'isActive', label: 'Status', render: (person) => <Badge tone={person.isActive ? 'good' : 'warn'}>{person.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', label: 'Actions', render: (person) => (
      <div className="record-actions">
        <Button variant="secondary" onClick={() => viewFaculty(person)}>View</Button>
        <Button variant="secondary" onClick={() => { setSelected(person); setWorkloadFilters({ academicYear: '', academicPeriod: '' }) }}>Workload</Button>
        <Button variant="secondary" onClick={() => openEdit(person)}>Edit</Button>
        <Button variant="secondary" onClick={() => deleteFaculty(person)}>Delete</Button>
      </div>
    ) },
  ]

  const activeCount = faculty.filter((person) => person.isActive).length
  const inactiveCount = faculty.length - activeCount

  return (
    <>
      <div className="page-header">
        <div><h2>{activeOnly ? 'Staff' : 'All Staff'}</h2><p className="subtle">Faculty directory and backend workload details.</p></div>
        <Button onClick={openCreate}>Add faculty</Button>
      </div>
      <div className="grid cards">
        <Card className="metric"><div className="metric-label">Loaded Faculty</div><div className="metric-value">{pagination?.total ?? faculty.length}</div><div className="metric-foot">Up to 100 records per request</div></Card>
        <Card className="metric"><div className="metric-label">Active</div><div className="metric-value">{activeCount}</div><div className="metric-foot">In the loaded directory page</div></Card>
        {!activeOnly && <Card className="metric"><div className="metric-label">Inactive</div><div className="metric-value">{inactiveCount}</div><div className="metric-foot">Inactive Faculty remain visible</div></Card>}
        <Card className="metric"><div className="metric-label">Departments</div><div className="metric-value">{departments.length}</div><div className="metric-foot">Loaded from the API</div></Card>
      </div>
      <section className="section">
        <div className="section-head"><h2>{activeOnly ? 'Teaching staff' : 'Faculty directory'}</h2><span className="subtle">{visibleFaculty.length} shown · {pagination?.total ?? 0} total</span></div>
        <div className="toolbar staff-tools">
          <label className="sr-only" htmlFor="faculty-search">Search loaded faculty</label>
          <input className="search" id="faculty-search" type="search" placeholder="Search loaded faculty" value={search} onChange={(event) => setSearch(event.target.value)} />
          <label className="sr-only" htmlFor="faculty-department">Filter by department</label>
          <select className="select" id="faculty-department" value={departmentFilter} onChange={(event) => { setDepartmentFilter(event.target.value); setPage(1) }}>
            <option value="">All departments</option>{departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
          </select>
          <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>Refresh</Button>
        </div>
        <AsyncState loading={loading} error={error} onRetry={() => setReload((value) => value + 1)} empty={!visibleFaculty.length} emptyMessage="No faculty match this filter.">
          <Table columns={columns} rows={visibleFaculty} caption="Faculty directory from the backend" />
        </AsyncState>
        {pagination?.total > 0 && <Pagination pagination={pagination} onPageChange={setPage} />}
      </section>
      <EntityModal
        open={modalOpen}
        title={editing ? 'Edit faculty member' : 'Add faculty member'}
        record={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={saveFaculty}
        fields={[
          { name: 'name', label: 'Full name', required: true },
          { name: 'designation', label: 'Designation', required: true },
          { name: 'department', label: 'Department', type: 'select', getValue: (record) => record.department?._id, options: departments.map((item) => ({ value: item._id, label: item.name })) },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'qualification', label: 'Qualification' },
          { name: 'specialization', label: 'Specialization' },
          { name: 'phone', label: 'Phone' },
          { name: 'displayOrder', label: 'Display order', type: 'number', step: 1 },
          { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
          { name: 'bio', label: 'Biography', type: 'textarea' },
        ]}
      />
      <Modal open={Boolean(selected)} title={`${selected?.name ?? 'Faculty'} · Workload`} onClose={() => setSelected(null)}>
        <div className="toolbar workload-filters">
          <label className="sr-only" htmlFor="workload-year">Academic year</label>
          <select className="select" id="workload-year" value={workloadFilters.academicYear} onChange={(event) => setWorkloadFilters({ ...workloadFilters, academicYear: event.target.value })}>
            <option value="">All years</option><option value="2026">2026</option><option value="2025">2025</option>
          </select>
          <label className="sr-only" htmlFor="workload-period">Academic period</label>
          <select className="select" id="workload-period" value={workloadFilters.academicPeriod} onChange={(event) => setWorkloadFilters({ ...workloadFilters, academicPeriod: event.target.value })}>
            <option value="">All periods</option><option>Trimester 1</option><option>Trimester 2</option><option>Trimester 3</option>
          </select>
        </div>
        {workloadLoading ? <AsyncState loading /> : workloadError ? <AsyncState error={workloadError} /> : (
          <>
          <div className="grid cards workload-metrics">
            <Card className="metric"><div className="metric-label">Distinct courses</div><div className="metric-value">{workload.summary.courseCount}</div></Card>
            <Card className="metric"><div className="metric-label">Activities</div><div className="metric-value">{workload.summary.activityCount}</div></Card>
            <Card className="metric"><div className="metric-label">Teaching hours</div><div className="metric-value">{workload.summary.teachingHours}</div></Card>
          </div>
          {workload.summary.activityCount === 0 ? <div className="empty">No teaching activities for this Faculty and academic context.</div> : (
            <>
              <h3 className="section">Course breakdown</h3>
              <Table columns={[{ key: 'course', label: 'Course', render: (row) => <><strong>{row.course?.code}</strong><div className="subtle">{row.course?.name}</div><div className="person-meta">{row.course?.department?.name || '—'} · {row.course?.program?.name || '—'}</div></> }, { key: 'activityCount', label: 'Activities' }, { key: 'teachingHours', label: 'Hours' }]} rows={workload.courses} caption="Workload grouped by course" />
              <h3 className="section">Activity breakdown</h3>
              <Table columns={[{ key: 'activityType', label: 'Activity' }, { key: 'course', label: 'Course', render: (row) => row.course?.code || 'Unlinked' }, { key: 'academicYear', label: 'Academic context', render: (row) => `${row.academicYear} · ${row.academicPeriod}` }, { key: 'teachingHours', label: 'Hours' }, { key: 'status', label: 'Status' }]} rows={workload.activities} caption="Workload activities" />
            </>
          )}
          </>
        )}
      </Modal>
      <Modal open={Boolean(facultyDetail)} title="Faculty details" onClose={() => setFacultyDetail(null)}>
        {facultyDetail?.loading ? <AsyncState loading /> : facultyDetail?.error ? <div className="form-error" role="alert">{facultyDetail.error}</div> : facultyDetail?.data && <dl className="detail-grid"><dt>Name</dt><dd>{facultyDetail.data.name}</dd><dt>Designation</dt><dd>{facultyDetail.data.designation}</dd><dt>Department</dt><dd>{facultyDetail.data.department?.name || '—'}</dd><dt>Email</dt><dd>{facultyDetail.data.email || '—'}</dd><dt>Status</dt><dd>{facultyDetail.data.isActive ? 'Active' : 'Inactive'}</dd><dt>Bio</dt><dd>{facultyDetail.data.bio || '—'}</dd></dl>}
      </Modal>
    </>
  )
}
