import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import { ApiError } from '../api/client.js'
import { useAuth } from '../state/AuthContext.jsx'

export default function Login() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!values.email.trim() || !values.password) {
      setError('Enter your email and password.')
      return
    }
    setLoading(true)
    try {
      await login({ email: values.email.trim(), password: values.password })
      navigate(location.state?.from || '/', { replace: true })
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-mark">S</div>
        <p className="eyebrow">School of Science, Technology and Engineering</p>
        <h1>Teaching Allocation</h1>
        <p className="subtle">Sign in with your administrative account.</p>
        <form className="login-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" autoComplete="username" type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" autoComplete="current-password" type="password" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} required />
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <Button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <p className="subtle">Need editor access? <Link to="/register">Create an editor account</Link></p>
      </section>
    </main>
  )
}