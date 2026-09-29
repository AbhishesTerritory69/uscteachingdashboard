import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import AsyncState from '../components/common/AsyncState.jsx'
import { programsApi } from '../api/catalog.js'
import { admissionsApi, contactApi } from '../api/submissions.js'
import { useToast } from '../state/ToastContext.jsx'

export default function PublicSubmission({ kind = 'contact' }) {
  const notify = useToast()
  const admission = kind === 'admission'
  const location = useLocation()
  const [programs, setPrograms] = useState([])
  const [programLoading, setProgramLoading] = useState(false)
  const [programError, setProgramError] = useState('')
  const [values, setValues] = useState(admission
    ? { fullName: '', email: '', phone: '', program: '', message: '' }
    : { name: '', email: '', phone: '', subject: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!admission) return undefined
    let current = true
    setProgramLoading(true)
    programsApi.list({ page: 1, limit: 100, isActive: true }).then((response) => {
      if (current) setPrograms(response.data || [])
    }).catch((requestError) => {
      if (current) setProgramError(requestError.message || 'Programs are temporarily unavailable.')
    }).finally(() => { if (current) setProgramLoading(false) })
    return () => { current = false }
  }, [admission])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const body = { ...values }
      if (!body.phone) delete body.phone
      if (!body.program) delete body.program
      if (admission) await admissionsApi.submit(body)
      else await contactApi.submit(body)
      setSubmitted(true)
      notify('Your message was submitted.')
    } catch (requestError) {
      const missing = Array.isArray(requestError.details) ? requestError.details.join(', ') : ''
      setError(missing ? `${requestError.message} ${missing}` : requestError.message || 'Unable to submit the form.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel public-form-panel">
        <div className="brand-mark">S</div>
        <p className="eyebrow">School of Science, Technology and Engineering</p>
        <h1>{admission ? 'Admissions enquiry' : 'Contact the school'}</h1>
        <p className="subtle">Send a message to the administration team.</p>
        {submitted ? <div className="notice" role="status"><strong>Submission received</strong><p>Thank you. Your message has been sent to the school.</p><Link to="/public">Browse published updates</Link></div> : (
          <form className="login-form" onSubmit={submit}>
            <div className="field"><label htmlFor="submission-name">{admission ? 'Full name' : 'Name'}</label><input id="submission-name" autoComplete="name" value={admission ? values.fullName : values.name} onChange={(event) => setValues({ ...values, [admission ? 'fullName' : 'name']: event.target.value })} required /></div>
            <div className="field"><label htmlFor="submission-email">Email</label><input id="submission-email" type="email" autoComplete="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} required /></div>
            <div className="field"><label htmlFor="submission-phone">Phone{admission ? '' : ' (optional)'}</label><input id="submission-phone" autoComplete="tel" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} required={admission} /></div>
            {admission ? (
              <div className="field"><label htmlFor="submission-program">Program (optional)</label><AsyncState loading={programLoading} error={programError} empty={false}><select id="submission-program" value={values.program} onChange={(event) => setValues({ ...values, program: event.target.value })}><option value="">Select a program</option>{programs.map((program) => <option key={program._id} value={program._id}>{program.name} · {program.degree}</option>)}</select></AsyncState></div>
            ) : (
              <div className="field"><label htmlFor="submission-subject">Subject</label><input id="submission-subject" value={values.subject} onChange={(event) => setValues({ ...values, subject: event.target.value })} required /></div>
            )}
            <div className="field"><label htmlFor="submission-message">Message</label><textarea id="submission-message" rows={4} value={values.message} onChange={(event) => setValues({ ...values, message: event.target.value })} required={false} /></div>
            {error && <div role="alert" className="form-error">{error}</div>}
            <Button type="submit" disabled={submitting || (admission && programLoading)}>{submitting ? 'Sending…' : 'Submit'}</Button>
          </form>
        )}
        <p className="subtle"><Link to="/public">Published information</Link> · <Link to="/login" state={{ from: location.pathname }}>Staff sign in</Link></p>
      </section>
    </main>
  )
}
