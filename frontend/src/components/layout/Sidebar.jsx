import { NavLink } from "react-router-dom";
import { useAuth } from "../../state/AuthContext.jsx";

const navClass = ({ isActive }) =>
  [
    "group flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5",
    "text-sm font-medium no-underline transition-colors duration-150",
    "focus:outline-none focus:ring-2 focus:ring-blue-500/30",
    isActive
      ? "bg-blue-50 text-blue-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");

const iconClass = ({ isActive }) =>
  [
    "flex h-5 w-5 shrink-0 items-center justify-center text-base",
    isActive ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700",
  ].join(" ");

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="flex h-screen w-[260px] min-w-[260px] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
          S
        </div>

        <div className="min-w-0">
          <div className="truncate text-base font-bold text-slate-900">
            Science
          </div>

          <div className="truncate text-xs text-slate-500">
            Teaching Allocation
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4"
        aria-label="Main navigation"
      >
        {/* Dashboard */}
        <NavLink to="/" end className={navClass}>
          {({ isActive }) => (
            <>
              <span className={iconClass({ isActive })} aria-hidden="true">
                ▦
              </span>

              <span className="min-w-0 flex-1 truncate">Dashboard</span>
            </>
          )}
        </NavLink>

        {/* Teaching */}
        <div className="px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Teaching
        </div>

        <div className="space-y-1">
          <NavLink to="/courses" className={navClass}>
            {({ isActive }) => (
              <>
                <span className={iconClass({ isActive })} aria-hidden="true">
                  ▤
                </span>
                <span className="min-w-0 flex-1 truncate">Courses</span>
              </>
            )}
          </NavLink>

          <NavLink to="/staff" className={navClass}>
            {({ isActive }) => (
              <>
                <span className={iconClass({ isActive })} aria-hidden="true">
                  ♙
                </span>
                <span className="min-w-0 flex-1 truncate">Staff</span>
              </>
            )}
          </NavLink>

          <NavLink to="/all-staff" className={navClass}>
            {({ isActive }) => (
              <>
                <span className={iconClass({ isActive })} aria-hidden="true">
                  ▥
                </span>
                <span className="min-w-0 flex-1 truncate">All Staff</span>
              </>
            )}
          </NavLink>

          <NavLink to="/activities" className={navClass}>
            {({ isActive }) => (
              <>
                <span className={iconClass({ isActive })} aria-hidden="true">
                  ◷
                </span>
                <span className="min-w-0 flex-1 truncate">
                  Teaching Activities
                </span>
              </>
            )}
          </NavLink>

          <NavLink to="/outlines" className={navClass}>
            {({ isActive }) => (
              <>
                <span className={iconClass({ isActive })} aria-hidden="true">
                  ▧
                </span>
                <span className="min-w-0 flex-1 truncate">Course Outlines</span>
              </>
            )}
          </NavLink>

          <NavLink to="/academics" className={navClass}>
            {({ isActive }) => (
              <>
                <span className={iconClass({ isActive })} aria-hidden="true">
                  ⌂
                </span>
                <span className="min-w-0 flex-1 truncate">
                  Departments &amp; Programs
                </span>
              </>
            )}
          </NavLink>
        </div>

        {/* Data */}
        <div className="px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Data
        </div>

        <div className="space-y-1">
          <NavLink to="/imports" className={navClass}>
            {({ isActive }) => (
              <>
                <span className={iconClass({ isActive })} aria-hidden="true">
                  ⇧
                </span>
                <span className="min-w-0 flex-1 truncate">Import Data</span>
              </>
            )}
          </NavLink>

          <NavLink to="/sources" className={navClass}>
            {({ isActive }) => (
              <>
                <span className={iconClass({ isActive })} aria-hidden="true">
                  ⌁
                </span>
                <span className="min-w-0 flex-1 truncate">Data Sources</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* User Footer */}
      <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-4 py-4">
        <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />

        <div className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-semibold text-slate-800">
            {user?.role === "admin" ? "Administrator" : "Editor"}
          </strong>

          <small
            className="block truncate text-xs text-slate-500"
            title={user?.email || ""}
          >
            {user?.email || "No email"}
          </small>
        </div>
      </div>
    </aside>
  );
}
