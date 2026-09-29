import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Fixed Topbar */}
        <div className="shrink-0">
          <Topbar />
        </div>

        {/* Only this area scrolls */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="view-root">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}