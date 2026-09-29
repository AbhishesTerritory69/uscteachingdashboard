import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext.jsx'
import Button from '../common/Button.jsx'

const pageTitles = {
  '/': 'Teaching Dashboard',
  '/courses': 'Courses',
  '/staff': 'Staff',
  '/all-staff': 'All Staff',
  '/activities': 'Teaching Activities',
  '/outlines': 'Course Outlines',
  '/academics': 'Departments & Programs',
  '/imports': 'Import Data',
  '/sources': 'Data Sources',
}

export default function Topbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">School of Science, Technology and Engineering</div>
        <h1>{pageTitles[pathname] ?? 'Teaching Dashboard'}</h1>
      </div>
      <div className="topbar-actions">
        <div className="topbar-user">
          <div><strong>{user?.name}</strong><small>{user?.role}</small></div>
          <div className="avatar" aria-hidden="true">{user?.name?.slice(0, 1)?.toUpperCase() || '?'}</div>
        </div>
        <Button variant="secondary" onClick={() => { logout(); navigate('/login', { replace: true }) }}>Sign out</Button>
      </div>
    </header>
  )
}