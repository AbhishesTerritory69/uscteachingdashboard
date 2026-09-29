import { useEffect, useMemo, useState } from 'react'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import EntityModal from '../components/common/EntityModal.jsx'
import Pagination from '../components/common/Pagination.jsx'
import AsyncState from '../components/common/AsyncState.jsx'
import Table from '../components/common/Table.jsx'
import { eventsApi, galleryApi, noticesApi, pagesApi, usersApi } from '../api/content.js'
import { useAuth } from '../state/AuthContext.jsx'
import { useToast } from '../state/ToastContext.jsx'

const resourceDefinitions = {
  notices: {
    label: 'Notices', api: noticesApi,
    fields: [
      { name: 'title', label: 'Title', required: true }, { name: 'slug', label: 'Slug', required: true },
      { name: 'category', label: 'Category', type: 'select', defaultValue: 'general', options: ['general', 'admission', 'exam', 'result', 'scholarship', 'vacancy', 'event'].map((value) => ({ value, label: value })) },
      { name: 'description', label: 'Description', type: 'textarea' }, { name: 'content', label: 'Content', type: 'textarea' },
      { name: 'attachment', label: 'Attachment URL' }, { name: 'isPublished', label: 'Published', type: 'checkbox', defaultValue: true }, { name: 'isFeatured', label: 'Featured', type: 'checkbox' },
    ],
    columns: (row) => [row.category, row.isPublished ? 'Published' : 'Draft'],
  },
  events: {
    label: 'Events', api: eventsApi,
    fields: [
      { name: 'title', label: 'Title', required: true }, { name: 'slug', label: 'Slug', required: true },
      { name: 'startDate', label: 'Start date', type: 'date', required: true, getValue: (record) => record.startDate?.slice(0, 10) },
      { name: 'endDate', label: 'End date', type: 'date', getValue: (record) => record.endDate?.slice(0, 10) },
      { name: 'location', label: 'Location' }, { name: 'category', label: 'Category', type: 'select', defaultValue: 'other', options: ['academic', 'cultural', 'sports', 'seminar', 'workshop', 'other'].map((value) => ({ value, label: value })) },
      { name: 'description', label: 'Description', type: 'textarea' }, { name: 'image', label: 'Image URL' }, { name: 'isPublished', label: 'Published', type: 'checkbox', defaultValue: true },
    ],
    columns: (row) => [row.startDate ? new Date(row.startDate).toLocaleDateString() : '—', row.isPublished ? 'Published' : 'Draft'],
  },
  gallery: {
    label: 'Gallery', api: galleryApi,
    fields: [
      { name: 'title', label: 'Title', required: true }, { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'category', label: 'Category', type: 'select', defaultValue: 'other', options: ['campus', 'events', 'sports', 'cultural', 'academic', 'other'].map((value) => ({ value, label: value })) },
      { name: 'images', label: 'Images (JSON array of {url, caption})', type: 'json', defaultValue: [] }, { name: 'isPublished', label: 'Published', type: 'checkbox', defaultValue: true },
    ],
    columns: (row) => [`${row.images?.length || 0} images`, row.isPublished ? 'Published' : 'Draft'],
  },
  pages: {
    label: 'Pages', api: pagesApi,
    fields: [
      { name: 'title', label: 'Title', required: true }, { name: 'slug', label: 'Slug', required: true },
      { name: 'content', label: 'Content', type: 'textarea', required: true }, { name: 'featuredImage', label: 'Featured image URL' },
      { name: 'metaTitle', label: 'Meta title' }, { name: 'metaDescription', label: 'Meta description', type: 'textarea' }, { name: 'isPublished', label: 'Published', type: 'checkbox', defaultValue: true },
    ],
    columns: (row) => [row.slug, row.isPublished ? 'Published' : 'Draft'],
  },
}

export default function Administration() {
  const notify = useToast()
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState('notices')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [editor, setEditor] = useState(null)
  const [search, setSearch] = useState('')

  const definition = resourceDefinitions[tab]
  const isUserTab = tab === 'users'
  const activeApi = isUserTab ? usersApi : definition?.api
  const fields = useMemo(() => {
    if (!isUserTab) return definition?.fields || []
    return editor?.record?._id
      ? [
          { name: 'name', label: 'Name' }, { name: 'email', label: 'Email', type: 'email' },
          { name: 'role', label: 'Role', type: 'select', options: [{ value: 'admin', label: 'Admin' }, { value: 'editor', label: 'Editor' }] },
          { name: 'isActive', label: 'Active', type: 'checkbox' },
        ]
      : [
          { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'password', label: 'Temporary password', type: 'password', required: true },
          { name: 'role', label: 'Role', type: 'select', defaultValue: 'editor', options: [{ value: 'admin', label: 'Admin' }, { value: 'editor', label: 'Editor' }] },
          { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
        ]
  }, [definition, editor?.record?._id, isUserTab])

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    const query = isUserTab ? undefined : { page, limit: 20, search: search || undefined }
    activeApi.list(query).then((response) => {
      if (!current) return
      setRows(response.data || [])
      setPagination(response.pagination || null)
    }).catch((requestError) => {
      if (current) setError(requestError.message || `${isUserTab ? 'Users' : definition?.label} could not be loaded.`)
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [activeApi, definition?.label, isUserTab, page, reload, search])

  const save = async (body) => {
    if (editor?.record?._id) await activeApi.patch(editor.record._id, body)
    else await activeApi.create(body)
    notify(`${isUserTab ? 'User' : definition.label.slice(0, -1)} ${editor?.record?._id ? 'updated' : 'created'}.`)
    setEditor(null)
    setReload((value) => value + 1)
  }

  const remove = async (row) => {
    const label = isUserTab ? row.email : row.title || row.name
    if (!window.confirm(`Delete ${label}?`)) return
    try {
      await activeApi.remove(row._id)
      notify('Record deleted.')
      setReload((value) => value + 1)
    } catch (requestError) {
      notify(requestError.message, 'bad')
    }
  }

  const columns = isUserTab ? [
    { key: 'name', label: 'User' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' },
    { key: 'isActive', label: 'Status', render: (row) => <Badge tone={row.isActive ? 'good' : 'warn'}>{row.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="record-actions"><Button variant="secondary" onClick={() => setEditor({ record: row })}>Edit</Button><Button variant="secondary" disabled={row._id === JSON.parse(window.sessionStorage.getItem('sste-auth-user') || 'null')?.id} onClick={() => remove(row)}>Delete</Button></div> },
  ] : [
    { key: 'title', label: definition?.label.slice(0, -1), render: (row) => <><strong>{row.title || row.name}</strong><div className="subtle">{row.slug || row.category || row.degree}</div></> },
    { key: 'detail', label: 'Details', render: (row) => definition.columns(row)[0] },
    { key: 'status', label: 'Status', render: (row) => <Badge tone={(row.isPublished ?? row.isActive) ? 'good' : 'warn'}>{(row.isPublished ?? row.isActive) ? 'Published / active' : 'Draft / inactive'}</Badge> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="record-actions"><Button variant="secondary" onClick={() => setEditor({ record: row })}>Edit</Button><Button variant="secondary" onClick={() => remove(row)}>Delete</Button></div> },
  ]

  const tabs = ['notices', 'events', 'gallery', 'pages', ...(isAdmin ? ['users'] : [])]

  return (
    <>
      <div className="page-header"><div><h2>Administration</h2><p className="subtle">Manage published content and administrative accounts.</p></div><Button onClick={() => setEditor({ record: null })}>Add {isUserTab ? 'user' : definition?.label.slice(0, -1)}</Button></div>
      <div className="tab-list" role="tablist" aria-label="Administration resources">
        {tabs.map((key) => <button type="button" role="tab" aria-selected={tab === key} className="tab-button" key={key} onClick={() => { setTab(key); setPage(1); setSearch('') }}>{key[0].toUpperCase() + key.slice(1)}</button>)}
      </div>
      {!isUserTab && <div className="toolbar resource-filters"><label className="sr-only" htmlFor="admin-search">Search records</label><input id="admin-search" className="search" type="search" placeholder={`Search ${definition?.label.toLowerCase()}`} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></div>}
      <section className="section">
        <div className="section-head"><h2>{isUserTab ? 'User accounts' : definition?.label}</h2><span className="subtle">{pagination?.total ?? rows.length} records</span></div>
        <AsyncState loading={loading} error={error} onRetry={() => setReload((value) => value + 1)} empty={!rows.length} emptyMessage={`No ${isUserTab ? 'users' : definition?.label.toLowerCase()} found.`}>
          <Table columns={columns} rows={rows} caption={isUserTab ? 'User accounts' : definition?.label} />
        </AsyncState>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </section>
      <EntityModal open={Boolean(editor)} title={`${editor?.record?._id ? 'Edit' : 'Add'} ${isUserTab ? 'user' : definition?.label.slice(0, -1)}`} record={editor?.record} fields={fields} onClose={() => setEditor(null)} onSubmit={save} />
    </>
  )
}
