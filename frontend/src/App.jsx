import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AsyncState from './components/common/AsyncState.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import Administration from './pages/Administration.jsx'
import Academics from './pages/Academics.jsx'
import AllStaff from './pages/AllStaff.jsx'
import CourseOutlines from './pages/CourseOutlines.jsx'
import Courses from './pages/Courses.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DataSources from './pages/DataSources.jsx'
import ImportData from './pages/ImportData.jsx'
import Login from './pages/Login.jsx'
import PublicContent from './pages/PublicContent.jsx'
import PublicSubmission from './pages/PublicSubmission.jsx'
import Register from './pages/Register.jsx'
import Staff from './pages/Staff.jsx'
import SubmissionInbox from './pages/SubmissionInbox.jsx'
import TeachingActivities from './pages/TeachingActivities.jsx'
import { AuthProvider, useAuth } from './state/AuthContext.jsx'
import { ToastProvider } from './state/ToastContext.jsx'

function RequireAuth({ children }) {
  const { ready, isAuthenticated, sessionError, retrySession } = useAuth()
  const location = useLocation()
  if (!ready) return <AsyncState loading />
  if (sessionError && window.sessionStorage.getItem('sste-auth-token')) {
    return <AsyncState error={sessionError} onRetry={retrySession} />
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <main className="async-state async-error" role="alert">You do not have permission to manage user accounts.</main>
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="public" element={<PublicContent />} />
          <Route path="apply" element={<PublicSubmission kind="admission" />} />
          <Route path="contact" element={<PublicSubmission kind="contact" />} />
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="courses" element={<Courses />} />
            <Route path="staff" element={<Staff />} />
            <Route path="all-staff" element={<AllStaff />} />
            <Route path="activities" element={<TeachingActivities />} />
            <Route path="outlines" element={<CourseOutlines />} />
            <Route path="academics" element={<Academics />} />
            <Route path="imports" element={<ImportData />} />
            <Route path="sources" element={<DataSources />} />
            <Route path="inbox" element={<SubmissionInbox />} />
            <Route path="administration" element={<RequireAdmin><Administration /></RequireAdmin>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
