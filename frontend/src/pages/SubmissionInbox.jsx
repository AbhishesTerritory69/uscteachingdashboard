import { useEffect, useState } from 'react'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import Modal from '../components/common/Modal.jsx'
import Pagination from '../components/common/Pagination.jsx'
import AsyncState from '../components/common/AsyncState.jsx'
import Table from '../components/common/Table.jsx'
import { admissionsApi, contactApi } from '../api/submissions.js'
import { useToast } from '../state/ToastContext.jsx'

const definitions = {
  admissions: { label: 'Admissions', api: admissionsApi, statuses: ['new', 'contacted', 'processing', 'approved', 'rejected'] },
  contact: { label: 'Contact', api: contactApi, statuses: ['unread', 'read', 'replied'] },
}

export default function SubmissionInbox() {
  const notify = useToast()
  const [tab, setTab] = useState('admissions')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [detail, setDetail] = useState(null)
  const definition = definitions[tab]

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    definition.api.list({ page, limit: 20, status: status || undefined }).then((response) => {
      if (!current) return
      setRows(response.data || [])
      setPagination(response.pagination)
    }).catch((requestError) => {
      if (current) setError(requestError.message || `${definition.label} submissions could not be loaded.`)
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [definition, page, reload, status, tab])

  const openDetail = async (row) => {
    setDetail({ loading: true })
    try {
      const response = await definition.api.get(row._id)
      setDetail({ data: response.data })
    } catch (requestError) {
      setDetail({ error: requestError.message })
    }
  }

  const updateStatus = async (row, nextStatus) => {
    try {
      await definition.api.setStatus(row._id, nextStatus)
      notify(`${definition.label.slice(0, -1)} status updated.`)
      setReload((value) => value + 1)
      if (detail?.data?._id === row._id) setDetail(null)
    } catch (requestError) {
      notify(requestError.message, 'bad')
    }
  }

  const columns = [
    { key: 'name', label: 'Submission', render: (row) => <><strong>{row.fullName || row.name}</strong><div className="subtle">{row.email}</div></> },
    { key: 'subject', label: 'Subject', render: (row) => row.subject || row.program?.name || '—' },
    { key: 'createdAt', label: 'Received', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '—' },
    { key: 'status', label: 'Status', render: (row) => <Badge tone={row.status === 'approved' || row.status === 'replied' ? 'good' : 'warn'}>{row.status}</Badge> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="record-actions"><Button variant="secondary" onClick={() => openDetail(row)}>View</Button><select aria-label={`Set status for ${row.fullName || row.name}`} className="select compact-select" value={row.status} onChange={(event) => updateStatus(row, event.target.value)}>{definition.statuses.map((value) => <option key={value}>{value}</option>)}</select></div> },
  ]

  return (
    <>
      <div className="page-header"><div><h2>Submission Inbox</h2><p className="subtle">Admissions and contact submissions from public forms.</p></div></div>
      <div className="tab-list" role="tablist" aria-label="Submission type">
        {Object.entries(definitions).map(([key, item]) => <button key={key} className="tab-button" type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setStatus(''); setPage(1) }}>{item.label}</button>)}
      </div>
      <div className="toolbar"><label className="sr-only" htmlFor="submission-status">Filter by status</label><select className="select" id="submission-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option>{definition.statuses.map((value) => <option key={value}>{value}</option>)}</select></div>
      <section className="section"><div className="section-head"><h2>{definition.label}</h2><span className="subtle">{pagination?.total ?? 0} records</span></div><AsyncState loading={loading} error={error} onRetry={() => setReload((value) => value + 1)} empty={!rows.length} emptyMessage={`No ${definition.label.toLowerCase()} submissions found.`}><Table columns={columns} rows={rows} caption={`${definition.label} submissions`} /></AsyncState><Pagination pagination={pagination} onPageChange={setPage} /></section>
      <Modal open={Boolean(detail)} title="Submission details" onClose={() => setDetail(null)}>
        {detail?.loading ? <AsyncState loading /> : detail?.error ? <div className="form-error" role="alert">{detail.error}</div> : detail?.data && <dl className="detail-grid"><dt>Name</dt><dd>{detail.data.fullName || detail.data.name}</dd><dt>Email</dt><dd>{detail.data.email}</dd><dt>Phone</dt><dd>{detail.data.phone || '—'}</dd><dt>Program</dt><dd>{detail.data.program?.name || '—'}</dd><dt>Subject</dt><dd>{detail.data.subject || '—'}</dd><dt>Message</dt><dd>{detail.data.message || '—'}</dd><dt>Status</dt><dd>{detail.data.status}</dd></dl>}
      </Modal>
    </>
  )
}
