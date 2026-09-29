import { useEffect, useState } from 'react'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import EntityModal from '../components/common/EntityModal.jsx'
import AsyncState from '../components/common/AsyncState.jsx'
import Table from '../components/common/Table.jsx'
import { departmentsApi, programsApi } from '../api/catalog.js'
import { useToast } from '../state/ToastContext.jsx'

export default function Academics() {
  const notify = useToast()
  const [tab, setTab] = useState('departments')
  const [departments, setDepartments] = useState([])
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [editor, setEditor] = useState(null)

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    Promise.all([
      departmentsApi.list({ page: 1, limit: 100 }),
      programsApi.list({ page: 1, limit: 100 }),
    ]).then(([departmentResponse, programResponse]) => {
      if (!current) return
      setDepartments(departmentResponse.data || [])
      setPrograms(programResponse.data || [])
    }).catch((requestError) => {
      if (current) setError(requestError.message || 'Departments and programs could not be loaded.')
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [reload])

  const editingRecord = editor?.type === 'department'
    ? departments.find((item) => item._id === editor.id)
    : programs.find((item) => item._id === editor?.id)

  const save = async (body) => {
    if (editor.type === 'department') {
      if (editor.id) await departmentsApi.patch(editor.id, body)
      else await departmentsApi.create(body)
    } else if (editor.id) await programsApi.patch(editor.id, body)
    else await programsApi.create(body)
    notify(`${editor.type === 'department' ? 'Department' : 'Program'} ${editor.id ? 'updated' : 'created'}.`)
    setEditor(null)
    setReload((value) => value + 1)
  }

  const remove = async (type, item) => {
    const label = type === 'department' ? 'Department' : 'Program'
    const hasLinks = type === 'department' && programs.some((program) => program.department?._id === item._id)
    const suffix = hasLinks ? ' Existing Program references will not be cascaded.' : ''
    if (!window.confirm(`Delete ${label} ${item.name}?${suffix}`)) return
    try {
      if (type === 'department') await departmentsApi.remove(item._id)
      else await programsApi.remove(item._id)
      notify(`${label} deleted.`)
      setReload((value) => value + 1)
    } catch (requestError) {
      notify(requestError.message, 'bad')
    }
  }

  const departmentColumns = [
    { key: 'name', label: 'Department' },
    { key: 'slug', label: 'Slug' },
    { key: 'isActive', label: 'Status', render: (item) => <Badge tone={item.isActive ? 'good' : 'warn'}>{item.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', label: 'Actions', render: (item) => <div className="record-actions"><Button variant="secondary" onClick={() => setEditor({ type: 'department', id: item._id })}>Edit</Button><Button variant="secondary" onClick={() => remove('department', item)}>Delete</Button></div> },
  ]
  const programColumns = [
    { key: 'name', label: 'Program' },
    { key: 'degree', label: 'Degree' },
    { key: 'department', label: 'Department', render: (item) => item.department?.name || '—' },
    { key: 'slug', label: 'Slug' },
    { key: 'isActive', label: 'Status', render: (item) => <Badge tone={item.isActive ? 'good' : 'warn'}>{item.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', label: 'Actions', render: (item) => <div className="record-actions"><Button variant="secondary" onClick={() => setEditor({ type: 'program', id: item._id })}>Edit</Button><Button variant="secondary" onClick={() => remove('program', item)}>Delete</Button></div> },
  ]

  const fields = editor?.type === 'department' ? [
    { name: 'name', label: 'Department name', required: true },
    { name: 'slug', label: 'Slug', required: true },
    { name: 'shortDescription', label: 'Short description' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'image', label: 'Image URL' },
    { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
  ] : [
    { name: 'name', label: 'Program name', required: true },
    { name: 'slug', label: 'Slug', required: true },
    { name: 'degree', label: 'Degree', required: true },
    { name: 'duration', label: 'Duration' },
    { name: 'department', label: 'Department', type: 'select', required: true, getValue: (record) => record.department?._id, options: departments.map((item) => ({ value: item._id, label: item.name })) },
    { name: 'eligibility', label: 'Eligibility' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
  ]

  const activeRows = tab === 'departments' ? departments : programs

  return (
    <>
      <div className="page-header"><div><h2>Departments & Programs</h2><p className="subtle">Academic structure from the backend registry.</p></div></div>
      <div className="tab-list" role="tablist" aria-label="Academic data type">
        <button className="tab-button" type="button" role="tab" aria-selected={tab === 'departments'} onClick={() => setTab('departments')}>Departments ({departments.length})</button>
        <button className="tab-button" type="button" role="tab" aria-selected={tab === 'programs'} onClick={() => setTab('programs')}>Programs ({programs.length})</button>
      </div>
      <section className="section">
        <div className="section-head"><h2>{tab === 'departments' ? 'Departments' : 'Programs'}</h2><Button onClick={() => setEditor({ type: tab === 'departments' ? 'department' : 'program', id: null })}>Add {tab === 'departments' ? 'department' : 'program'}</Button></div>
        <AsyncState loading={loading} error={error} onRetry={() => setReload((value) => value + 1)} empty={!activeRows.length} emptyMessage={`No ${tab} found.`}>
          <Table columns={tab === 'departments' ? departmentColumns : programColumns} rows={activeRows} caption={`Backend ${tab}`} />
        </AsyncState>
        {(tab === 'departments' ? departments.length : programs.length) >= 100 && <p className="subtle">Showing up to 100 records.</p>}
      </section>
      <EntityModal open={Boolean(editor)} title={`${editor?.id ? 'Edit' : 'Add'} ${editor?.type}`} record={editingRecord} fields={fields} onClose={() => setEditor(null)} onSubmit={save} />
    </>
  )
}
