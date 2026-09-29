import { useEffect, useState } from 'react'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import Modal from '../components/common/Modal.jsx'
import Pagination from '../components/common/Pagination.jsx'
import AsyncState from '../components/common/AsyncState.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import { dataSourcesApi } from '../api/dataSources.js'
import { importsApi } from '../api/imports.js'
import { useAuth } from '../state/AuthContext.jsx'
import { useToast } from '../state/ToastContext.jsx'

const importTypes = [
  ['department', 'Departments'],
  ['program', 'Programs'],
  ['faculty', 'Faculty'],
  ['course', 'Courses'],
  ['teachingActivity', 'Teaching activities'],
  ['courseOutline', 'Course outlines'],
]

export default function ImportData() {
  const notify = useToast()
  const { isAdmin } = useAuth()
  const [type, setType] = useState('course')
  const [file, setFile] = useState(null)
  const [sourceId, setSourceId] = useState('')
  const [sources, setSources] = useState([])
  const [history, setHistory] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [validation, setValidation] = useState(null)
  const [detail, setDetail] = useState(null)
  const [errorPage, setErrorPage] = useState({ data: [], pagination: null, page: 1 })

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    Promise.all([
      importsApi.list({ page, limit: 10, sort: '-createdAt' }),
      dataSourcesApi.list({ page: 1, limit: 100, status: 'active', isActive: true }),
    ]).then(([historyResponse, sourceResponse]) => {
      if (!current) return
      setHistory(historyResponse.data || [])
      setPagination(historyResponse.pagination)
      setSources(sourceResponse.data || [])
    }).catch((requestError) => {
      if (current) setError(requestError.message || 'Import history could not be loaded.')
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [page, reload])

  const runUpload = async (mode) => {
    if (!file) {
      notify('Choose a CSV file first.', 'bad')
      return
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      notify('Only CSV files are supported.', 'bad')
      return
    }
    if (mode === 'import' && !window.confirm(`Import this ${type} CSV? Valid rows will be written to the database.`)) return
    setBusy(true)
    setValidation(null)
    try {
      const response = mode === 'validate'
        ? await importsApi.validate(file, type, sourceId)
        : await importsApi.execute(file, type, sourceId)
      setValidation(response.data)
      notify(mode === 'validate' ? 'CSV validation finished.' : 'CSV import finished.')
      setReload((value) => value + 1)
    } catch (requestError) {
      setValidation(requestError.details ? { errors: requestError.details.errors || [], status: 'failed' } : null)
      notify(requestError.message, 'bad')
      setReload((value) => value + 1)
    } finally {
      setBusy(false)
    }
  }

  const openDetail = async (job) => {
    setDetail({ loading: true })
    setErrorPage({ data: [], pagination: null, page: 1 })
    try {
      const response = await importsApi.get(job._id)
      setDetail({ data: response.data })
    } catch (requestError) {
      setDetail({ error: requestError.message })
    }
  }

  const loadErrors = async (pageNumber = 1) => {
    if (!detail?.data?._id) return
    try {
      const response = await importsApi.errors(detail.data._id, { page: pageNumber, limit: 20 })
      setErrorPage({ data: response.data || [], pagination: response.pagination, page: pageNumber })
    } catch (requestError) {
      notify(requestError.message, 'bad')
    }
  }

  const removeJob = async (job) => {
    if (!isAdmin || !window.confirm(`Delete import history for ${job.originalFilename}? Imported records are not changed.`)) return
    try {
      await importsApi.remove(job._id)
      notify('Import history deleted.')
      setReload((value) => value + 1)
    } catch (requestError) {
      notify(requestError.message, 'bad')
    }
  }

  return (
    <>
      <PageHeader title="Import Data" description="Validate CSV files and review import history." />
      <div className="notice"><strong>CSV only</strong><div>Validation records import history. Import mode writes valid rows and should only be used with reviewed data.</div></div>
      <section className="section grid two-col">
        <Card className="panel">
          <div className="section-head"><h2>Upload CSV</h2></div>
          <label className="upload-area" htmlFor="data-file">
            <span className="upload-icon" aria-hidden="true">⇧</span>
            <strong>{file?.name || 'Choose a CSV file'}</strong>
            <span className="subtle">CSV only · backend size limit applies</span>
            <input id="data-file" type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>
          <div className="field import-select">
            <label htmlFor="import-type">Data type</label>
            <select className="select" id="import-type" value={type} onChange={(event) => setType(event.target.value)}>{importTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </div>
          <div className="field import-select">
            <label htmlFor="import-source">Data source (optional)</label>
            <select className="select" id="import-source" value={sourceId} onChange={(event) => setSourceId(event.target.value)}><option value="">No source association</option>{sources.map((source) => <option key={source._id} value={source._id}>{source.name}</option>)}</select>
          </div>
          <div className="modal-foot import-foot"><Button variant="secondary" disabled={busy || !file} onClick={() => runUpload('validate')}>{busy ? 'Working…' : 'Validate CSV'}</Button><Button disabled={busy || !file} onClick={() => runUpload('import')}>{busy ? 'Working…' : 'Import rows'}</Button></div>
        </Card>
        <Card className="panel">
          <div className="section-head"><h2>Validation result</h2></div>
          {!validation ? <div className="empty">Validate a CSV to review its preview and row issues.</div> : (
            <>
              <p><Badge tone={validation.status === 'validated' || validation.status === 'completed' ? 'good' : 'warn'}>{validation.status || 'failed'}</Badge> <span className="subtle">{validation.validRows ?? 0} valid · {validation.invalidRows ?? validation.errors?.length ?? 0} invalid</span></p>
              {validation.preview?.length > 0 && <pre className="data-preview">{JSON.stringify(validation.preview.slice(0, 5), null, 2)}</pre>}
              {validation.errors?.length > 0 && <div className="issue-list" role="alert">{validation.errors.slice(0, 10).map((issue, index) => <div className="alert" key={`${issue.row}-${issue.field}-${index}`}><strong>Row {issue.row || '—'} · {issue.field || 'file'}</strong><small>{issue.message}</small></div>)}</div>}
              {validation.errorsTruncated && <p className="subtle">Additional errors are available in import history.</p>}
            </>
          )}
        </Card>
      </section>
      <section className="section">
        <div className="section-head"><h2>Import history</h2><span className="subtle">{pagination?.total ?? 0} jobs</span></div>
        <AsyncState loading={loading} error={error} onRetry={() => setReload((value) => value + 1)} empty={!history.length} emptyMessage="No import history found.">
          <div className="table-wrap"><table><thead><tr><th>File</th><th>Type</th><th>Mode</th><th>Status</th><th>Rows</th><th>Created</th><th>Actions</th></tr></thead><tbody>
            {history.map((job) => <tr key={job._id}><td>{job.originalFilename}</td><td>{job.type}</td><td>{job.mode}</td><td><Badge tone={job.status === 'completed' || job.status === 'validated' ? 'good' : 'warn'}>{job.status}</Badge></td><td>{job.validRows ?? 0}/{job.totalRows ?? 0}</td><td>{new Date(job.createdAt).toLocaleDateString()}</td><td><div className="record-actions"><Button variant="secondary" onClick={() => openDetail(job)}>Details</Button>{isAdmin && <Button variant="secondary" onClick={() => removeJob(job)}>Delete history</Button>}</div></td></tr>)}
          </tbody></table></div>
        </AsyncState>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </section>
      <Modal open={Boolean(detail)} title="Import job details" onClose={() => setDetail(null)}>
        {detail?.loading ? <AsyncState loading /> : detail?.error ? <div className="form-error" role="alert">{detail.error}</div> : detail?.data && (
          <div>
            <dl className="detail-grid"><dt>File</dt><dd>{detail.data.originalFilename}</dd><dt>Type / mode</dt><dd>{detail.data.type} · {detail.data.mode}</dd><dt>Status</dt><dd>{detail.data.status}</dd><dt>Counts</dt><dd>{detail.data.validRows} valid · {detail.data.invalidRows} invalid · {detail.data.importedRows} imported</dd><dt>Data source</dt><dd>{detail.data.dataSource?.name || 'None'}</dd></dl>
            {detail.data.preview?.length > 0 && <pre className="data-preview">{JSON.stringify(detail.data.preview.slice(0, 10), null, 2)}</pre>}
            {detail.data.errors?.length > 0 && <><h3>Errors</h3><div className="issue-list">{detail.data.errors.map((issue, index) => <div className="alert" key={`${issue.row}-${index}`}><strong>Row {issue.row || '—'} · {issue.field || 'file'}</strong><small>{issue.message}</small></div>)}</div></>}
            {(detail.data.errorCount > 20 || detail.data.errorSampleTruncated) && <><Button variant="secondary" onClick={() => loadErrors(1)}>Load all errors</Button><Table columns={[{ key: 'row', label: 'Row' }, { key: 'field', label: 'Field' }, { key: 'message', label: 'Issue' }]} rows={errorPage.data} caption="Import error page" /><Pagination pagination={errorPage.pagination} onPageChange={loadErrors} /></>}
          </div>
        )}
      </Modal>
    </>
  )
}
