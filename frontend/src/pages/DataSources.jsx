import { useEffect, useState } from 'react'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import EntityModal from '../components/common/EntityModal.jsx'
import Modal from '../components/common/Modal.jsx'
import Pagination from '../components/common/Pagination.jsx'
import AsyncState from '../components/common/AsyncState.jsx'
import Table from '../components/common/Table.jsx'
import { dataSourcesApi } from '../api/dataSources.js'
import { useAuth } from '../state/AuthContext.jsx'
import { useToast } from '../state/ToastContext.jsx'

const types = ['manual', 'csv', 'xlsx', 'api', 'database', 'other']
const formats = ['csv', 'xlsx', 'json', 'api', 'database', 'manual', 'other']
const statuses = ['active', 'inactive', 'archived']

export default function DataSources() {
  const notify = useToast()
  const { isAdmin } = useAuth()
  const [sources, setSources] = useState([])
  const [pagination, setPagination] = useState(null)
  const [filters, setFilters] = useState({ search: '', type: '', format: '', status: '', isActive: '', page: 1 })
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [editor, setEditor] = useState(null)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((current) => ({ ...current, search: searchText, page: 1 })), 250)
    return () => window.clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    dataSourcesApi.list({ ...filters, limit: 20 }).then((response) => {
      if (!current) return
      setSources(response.data || [])
      setPagination(response.pagination)
    }).catch((requestError) => {
      if (current) setError(requestError.message || 'Data sources could not be loaded.')
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [filters, reload])

  const save = async (body) => {
    if (editor?._id) await dataSourcesApi.patch(editor._id, body)
    else await dataSourcesApi.create(body)
    notify(editor?._id ? 'Data source updated.' : 'Data source created.')
    setEditor(null)
    setReload((value) => value + 1)
  }

  const view = async (source) => {
    setDetail({ loading: true })
    try {
      const response = await dataSourcesApi.get(source._id)
      setDetail({ data: response.data })
    } catch (requestError) {
      setDetail({ error: requestError.message })
    }
  }

  const remove = async (source) => {
    if (!isAdmin || !window.confirm(`Delete data source “${source.name}”? Existing import history will remain.`)) return
    try {
      await dataSourcesApi.remove(source._id)
      notify('Data source deleted.')
      setReload((value) => value + 1)
    } catch (requestError) {
      notify(requestError.message, 'bad')
    }
  }

  const columns = [
    { key: 'name', label: 'Source', render: (source) => <><strong>{source.name}</strong><div className="subtle">{source.key}</div></> },
    { key: 'type', label: 'Type', render: (source) => `${source.type}${source.format ? ` · ${source.format}` : ''}` },
    { key: 'provider', label: 'Provider', render: (source) => source.provider || '—' },
    { key: 'status', label: 'Status', render: (source) => <Badge tone={source.status === 'active' && source.isActive ? 'good' : 'warn'}>{source.status}{source.isActive ? '' : ' · disabled'}</Badge> },
    { key: 'updatedBy', label: 'Updated by', render: (source) => source.updatedBy?.name || '—' },
    { key: 'actions', label: 'Actions', render: (source) => <div className="record-actions"><Button variant="secondary" onClick={() => view(source)}>View</Button><Button variant="secondary" onClick={() => setEditor(source)}>Edit</Button>{isAdmin && <Button variant="secondary" onClick={() => remove(source)}>Delete</Button>}</div> },
  ]

  return (
    <>
      <div className="page-header"><div><h2>Data Sources</h2><p className="subtle">Administrative registry for managed and imported academic data.</p></div><Button onClick={() => setEditor({})}>Add source</Button></div>
      <section className="section">
        <div className="section-head"><h2>Source registry</h2><span className="subtle">{pagination?.total ?? 0} records</span></div>
        <div className="toolbar resource-filters">
          <label className="sr-only" htmlFor="source-search">Search data sources</label>
          <input className="search" id="source-search" type="search" placeholder="Search name, key, provider" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
          <label className="sr-only" htmlFor="source-type">Type</label>
          <select className="select" id="source-type" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value, page: 1 })}><option value="">All types</option>{types.map((type) => <option key={type}>{type}</option>)}</select>
          <label className="sr-only" htmlFor="source-format">Format</label>
          <select className="select" id="source-format" value={filters.format} onChange={(event) => setFilters({ ...filters, format: event.target.value, page: 1 })}><option value="">All formats</option>{formats.map((format) => <option key={format}>{format}</option>)}</select>
          <label className="sr-only" htmlFor="source-status">Status</label>
          <select className="select" id="source-status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
          <label className="sr-only" htmlFor="source-active">Activity</label>
          <select className="select" id="source-active" value={filters.isActive} onChange={(event) => setFilters({ ...filters, isActive: event.target.value, page: 1 })}><option value="">All activity states</option><option value="true">Enabled</option><option value="false">Disabled</option></select>
        </div>
        <AsyncState loading={loading} error={error} onRetry={() => setReload((value) => value + 1)} empty={!sources.length} emptyMessage="No data sources found."><Table columns={columns} rows={sources} caption="Data source registry" /></AsyncState>
        <Pagination pagination={pagination} onPageChange={(page) => setFilters({ ...filters, page })} />
      </section>
      <EntityModal
        open={Boolean(editor)}
        title={editor?._id ? 'Edit data source' : 'Add data source'}
        record={editor?._id ? editor : null}
        onClose={() => setEditor(null)}
        onSubmit={save}
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'key', label: 'Stable key', required: true },
          { name: 'type', label: 'Source type', type: 'select', required: true, options: types.map((value) => ({ value, label: value })) },
          { name: 'format', label: 'Source format', type: 'select', options: formats.map((value) => ({ value, label: value })) },
          { name: 'provider', label: 'Provider' },
          { name: 'location', label: 'Location metadata' },
          { name: 'status', label: 'Status', type: 'select', defaultValue: 'active', options: statuses.map((value) => ({ value, label: value })) },
          { name: 'isActive', label: 'Enabled', type: 'checkbox', defaultValue: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'configuration', label: 'Safe metadata configuration (JSON)', type: 'json', defaultValue: {} },
        ]}
      />
      <Modal open={Boolean(detail)} title="Data source details" onClose={() => setDetail(null)}>
        {detail?.loading ? <AsyncState loading /> : detail?.error ? <div className="form-error" role="alert">{detail.error}</div> : detail?.data && (
          <dl className="detail-grid"><dt>Name</dt><dd>{detail.data.name}</dd><dt>Key</dt><dd>{detail.data.key}</dd><dt>Type / format</dt><dd>{detail.data.type} · {detail.data.format || 'unspecified'}</dd><dt>Location</dt><dd>{detail.data.location || '—'}</dd><dt>Last sync</dt><dd>{detail.data.lastSyncAt ? new Date(detail.data.lastSyncAt).toLocaleString() : 'Never recorded'}</dd><dt>Configuration metadata</dt><dd><pre>{JSON.stringify(detail.data.configuration || {}, null, 2)}</pre></dd></dl>
        )}
      </Modal>
    </>
  )
}
