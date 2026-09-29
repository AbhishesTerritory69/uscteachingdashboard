import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import { ApiError } from '../api/client.js'
import { useAuth } from '../state/AuthContext.jsx'

export default function Register() {
  const { isAuthenticated, register } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!values.name.trim() || !values.email.trim() || values.password.length < 6) {
      setError('Enter your name, a valid email, and a password of at least six characters.')
      return
    }
    setLoading(true)
    try {
      await register({ name: values.name.trim(), email: values.email.trim(), password: values.password })
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to create the account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-mark">S</div>
        <p className="eyebrow">School of Science, Technology and Engineering</p>
        <h1>Create editor account</h1>
        <p className="subtle">Public registration creates an editor account. Admin accounts are managed by an administrator.</p>
        <form className="login-form" onSubmit={submit}>
          <div className="field"><label htmlFor="register-name">Name</label><input id="register-name" autoComplete="name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required /></div>
          <div className="field"><label htmlFor="register-email">Email</label><input id="register-email" type="email" autoComplete="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} required /></div>
          <div className="field"><label htmlFor="register-password">Password</label><input id="register-password" type="password" minLength={6} autoComplete="new-password" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} required /></div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <Button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</Button>
        </form>
        <p className="subtle">Already registered? <Link to="/login">Sign in</Link></p>
      </section>
    </main>
  )
}