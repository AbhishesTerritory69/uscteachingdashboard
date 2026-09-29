import { useEffect, useState } from 'react'
import AsyncState from '../components/common/AsyncState.jsx'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import { eventsApi, galleryApi, noticesApi, pagesApi } from '../api/content.js'

const sources = {
  notices: { label: 'Notices', api: noticesApi },
  events: { label: 'Events', api: eventsApi },
  gallery: { label: 'Gallery', api: galleryApi },
  pages: { label: 'Pages', api: pagesApi },
}

export default function PublicContent() {
  const [tab, setTab] = useState('notices')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const resource = sources[tab]

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    resource.api.list({ page: 1, limit: 20 }).then((response) => {
      if (current) setRows(response.data || [])
    }).catch((requestError) => {
      if (current) setError(requestError.message || `${resource.label} could not be loaded.`)
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [resource, reload, tab])

  return (
    <main className="public-shell">
      <header className="public-header"><div><div className="brand-title">Science</div><div className="brand-subtitle">School information</div></div><nav className="toolbar"><a href="/login">Staff sign in</a><a href="/apply">Admissions</a><a href="/contact">Contact</a></nav></header>
      <section className="public-content">
        <div className="page-header"><div><p className="eyebrow">School of Science, Technology and Engineering</p><h1>Updates and information</h1><p className="subtle">Published content from the college API.</p></div><Button variant="secondary" onClick={() => setReload((value) => value + 1)}>Refresh</Button></div>
        <div className="tab-list" role="tablist" aria-label="Published content">
          {Object.entries(sources).map(([key, item]) => <button className="tab-button" type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} key={key}>{item.label}</button>)}
        </div>
        <AsyncState loading={loading} error={error} onRetry={() => setReload((value) => value + 1)} empty={!rows.length} emptyMessage={`No published ${resource.label.toLowerCase()} are available.`}>
          <div className="public-list">
            {rows.map((row) => (
              <article className="public-entry" key={row._id}>
                <div className="section-head"><h2>{row.title}</h2>{row.category && <Badge>{row.category}</Badge>}</div>
                {row.startDate && <p className="person-meta">{new Date(row.startDate).toLocaleString()}{row.location ? ` · ${row.location}` : ''}</p>}
                {row.description && <p>{row.description}</p>}
                {tab === 'pages' && <div className="public-copy">{row.content}</div>}
                {tab === 'notices' && row.content && <div className="public-copy">{row.content}</div>}
                {tab === 'gallery' && <div className="public-gallery">{row.images?.map((image) => <figure key={image.url}><img src={image.url} alt={image.caption || row.title} /><figcaption>{image.caption}</figcaption></figure>)}</div>}
              </article>
            ))}
          </div>
        </AsyncState>
      </section>
    </main>
  )
}
