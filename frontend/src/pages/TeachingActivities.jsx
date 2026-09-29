import { useEffect, useState } from "react";
import Badge from "../components/common/Badge.jsx";
import Button from "../components/common/Button.jsx";
import EntityModal from "../components/common/EntityModal.jsx";
import Modal from "../components/common/Modal.jsx";
import Pagination from "../components/common/Pagination.jsx";
import AsyncState from "../components/common/AsyncState.jsx";
import Table from "../components/common/Table.jsx";
import { coursesApi } from "../api/catalog.js";
import { facultyApi } from "../api/faculty.js";
import { teachingActivitiesApi } from "../api/teachingActivities.js";
import { useToast } from "../state/ToastContext.jsx";

const periods = ["Trimester 1", "Trimester 2", "Trimester 3"];
const statuses = ["scheduled", "cancelled", "completed"];

export default function TeachingActivities() {
  const notify = useToast();
  const [activities, setActivities] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    academicYear: "",
    academicPeriod: "",
    status: "",
    page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    Promise.all([
      teachingActivitiesApi.list({ ...filters, limit: 20, sort: "-createdAt" }),
      coursesApi.list({ page: 1, limit: 100, sort: "code" }),
      facultyApi.list({ page: 1, limit: 100, isActive: true }),
    ])
      .then(([activityResponse, courseResponse, facultyResponse]) => {
        if (!current) return;
        setActivities(activityResponse.data || []);
        setPagination(activityResponse.pagination);
        setCourses(courseResponse.data || []);
        setFaculty(facultyResponse.data || []);
      })
      .catch((requestError) => {
        if (current)
          setError(
            requestError.message || "Teaching activities could not be loaded.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [filters, reload]);

  const save = async (body) => {
    if (editor?._id) await teachingActivitiesApi.patch(editor._id, body);
    else await teachingActivitiesApi.create(body);
    notify(
      editor?._id ? "Teaching activity updated." : "Teaching activity created.",
    );
    setEditor(null);
    setReload((value) => value + 1);
  };

  const showDetails = async (activity) => {
    setDetail({ loading: true });
    try {
      const response = await teachingActivitiesApi.get(activity._id);
      setDetail({ data: response.data });
    } catch (requestError) {
      setDetail({ error: requestError.message });
    }
  };

  const remove = async (activity) => {
    if (
      !window.confirm(
        `Delete ${activity.course?.code || "this"} ${activity.activityType} activity?`,
      )
    )
      return;
    try {
      await teachingActivitiesApi.remove(activity._id);
      notify("Teaching activity deleted.");
      setReload((value) => value + 1);
    } catch (requestError) {
      notify(requestError.message, "bad");
    }
  };

  const columns = [
    {
      key: "course",
      label: "Course",
      render: (row) => (
        <>
          <strong>{row.course?.code || "Unlinked"}</strong>
          <div className="subtle">{row.course?.name}</div>
        </>
      ),
    },
    {
      key: "faculty",
      label: "Faculty",
      render: (row) => row.faculty?.name || "Unassigned",
    },
    { key: "activityType", label: "Activity" },
    {
      key: "academicPeriod",
      label: "Academic context",
      render: (row) => `${row.academicYear} · ${row.academicPeriod}`,
    },
    {
      key: "teachingHours",
      label: "Teaching hours",
      render: (row) => `${row.teachingHours} hrs`,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge
          tone={
            row.status === "scheduled"
              ? "good"
              : row.status === "cancelled"
                ? "bad"
                : "warn"
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="record-actions">
          <Button variant="secondary" onClick={() => showDetails(row)}>
            View
          </Button>
          <Button variant="secondary" onClick={() => setEditor(row)}>
            Edit
          </Button>
          <Button variant="secondary" onClick={() => remove(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Teaching Activities</h2>
          <p className="subtle">
            Assignments and schedules from the allocation API.
          </p>
        </div>
        <Button onClick={() => setEditor({})}>Add activity</Button>
      </div>
      <section className="section">
        <div className="section-head">
          <h2>Activity records</h2>
          <span className="subtle">{pagination?.total ?? 0} total</span>
        </div>
        <div className="toolbar resource-filters">
          <label className="sr-only" htmlFor="activity-year">
            Academic year
          </label>
          <select
            className="select"
            id="activity-year"
            value={filters.academicYear}
            onChange={(event) =>
              setFilters({
                ...filters,
                academicYear: event.target.value,
                page: 1,
              })
            }
          >
            <option value="">All years</option>
            <option>2026</option>
            <option>2025</option>
          </select>
          <label className="sr-only" htmlFor="activity-period">
            Academic period
          </label>
          <select
            className="select"
            id="activity-period"
            value={filters.academicPeriod}
            onChange={(event) =>
              setFilters({
                ...filters,
                academicPeriod: event.target.value,
                page: 1,
              })
            }
          >
            <option value="">All periods</option>
            {periods.map((period) => (
              <option key={period}>{period}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="activity-status">
            Status
          </label>
          <select
            className="select"
            id="activity-status"
            value={filters.status}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value, page: 1 })
            }
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        <AsyncState
          loading={loading}
          error={error}
          onRetry={() => setReload((value) => value + 1)}
          empty={!activities.length}
          emptyMessage="No teaching activities found."
        >
          <Table
            columns={columns}
            rows={activities}
            caption="Teaching activities"
          />
        </AsyncState>
        <Pagination
          pagination={pagination}
          onPageChange={(page) => setFilters({ ...filters, page })}
        />
      </section>
      <EntityModal
        open={Boolean(editor)}
        title={editor?._id ? "Edit teaching activity" : "Add teaching activity"}
        record={editor?._id ? editor : null}
        onClose={() => setEditor(null)}
        onSubmit={save}
        fields={[
          {
            name: "course",
            label: "Course",
            type: "select",
            // required: true,  
            getValue: (record) => record.course?._id,
            options: courses.map((course) => ({
              value: course._id,
              label: `${course.code} · ${course.name}`,
            })),
          },
          {
            name: "faculty",
            label: "Faculty",
            type: "select",
            required: true,
            getValue: (record) => record.faculty?._id,
            options: faculty.map((person) => ({
              value: person._id,
              label: person.name,
            })),
          },
          {
            name: "academicYear",
            label: "Academic year",
            required: true,
            placeholder: "2026 or 2025-2026",
          },
          {
            name: "academicPeriod",
            label: "Academic period",
            type: "select",
            required: true,
            options: periods.map((period) => ({
              value: period,
              label: period,
            })),
          },
          {
            name: "activityType",
            label: "Activity type",
            type: "select",
            required: true,
            options: [
              "lecture",
              "tutorial",
              "practical",
              "laboratory",
              "seminar",
            ].map((value) => ({ value, label: value })),
          },
          {
            name: "day",
            label: "Day",
            type: "select",
            required: true,
            options: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((value) => ({ value, label: value })),
          },
          {
            name: "startTime",
            label: "Start time",
            required: true,
            placeholder: "09:00",
          },
          {
            name: "endTime",
            label: "End time",
            required: true,
            placeholder: "10:30",
          },
          {
            name: "duration",
            label: "Duration (hours)",
            type: "number",
            required: true,
            min: 0,
            step: "any",
          },
          {
            name: "occurrences",
            label: "Occurrences",
            type: "number",
            required: true,
            min: 1,
            step: 1,
          },
          { name: "room", label: "Room" },
          { name: "section", label: "Section" },
          {
            name: "status",
            label: "Status",
            type: "select",
            defaultValue: "scheduled",
            options: statuses.map((value) => ({ value, label: value })),
          },
        ]}
      />
      <Modal
        open={Boolean(detail)}
        title="Teaching activity"
        onClose={() => setDetail(null)}
      >
        {detail?.loading ? (
          <AsyncState loading />
        ) : detail?.error ? (
          <div className="form-error" role="alert">
            {detail.error}
          </div>
        ) : (
          detail?.data && (
            <dl className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm md:grid-cols-2">

  {/* Course */}
  <div className="bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Course
    </dt>

    <dd className="flex flex-col gap-1">
      <span className="w-fit rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">
        {detail.data.course?.code || "—"}
      </span>

      <span className="text-[15px] font-semibold leading-6 text-slate-900">
        {detail.data.course?.name || "—"}
      </span>
    </dd>
  </div>

  {/* Faculty */}
  <div className="bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Faculty
    </dt>

    <dd className="flex items-center gap-3">
      {detail.data.faculty?.name ? (
        <>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
            {detail.data.faculty.name.charAt(0).toUpperCase()}
          </span>

          <span className="text-[15px] font-semibold text-slate-900">
            {detail.data.faculty.name}
          </span>
        </>
      ) : (
        <span className="text-sm text-slate-400">—</span>
      )}
    </dd>
  </div>

  {/* Academic Context */}
  <div className="bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Academic Context
    </dt>

    <dd className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-slate-800">
      <span>{detail.data.academicYear || "—"}</span>

      <span className="text-slate-300">•</span>

      <span>{detail.data.academicPeriod || "—"}</span>
    </dd>
  </div>

  {/* Schedule */}
  <div className="bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Schedule
    </dt>

    <dd className="flex flex-col gap-1">
      <span className="text-[15px] font-semibold text-slate-900">
        {detail.data.day || "—"}
      </span>

      <span className="text-sm text-slate-500">
        {detail.data.startTime || "—"}{" "}
        <span className="mx-1 text-slate-300">→</span>{" "}
        {detail.data.endTime || "—"}
      </span>
    </dd>
  </div>

  {/* Duration × Occurrences */}
  <div className="bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Duration × Occurrences
    </dt>

    <dd className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-slate-900">
        {detail.data.duration ?? 0}
      </span>

      <span className="text-slate-400">×</span>

      <span className="text-2xl font-bold text-slate-900">
        {detail.data.occurrences ?? 0}
      </span>
    </dd>
  </div>

  {/* Teaching Hours */}
  <div className="bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Teaching Hours
    </dt>

    <dd className="flex items-baseline gap-2">
      <span className="text-3xl font-bold tracking-tight text-slate-900">
        {detail.data.teachingHours ?? 0}
      </span>

      <span className="text-sm font-medium text-slate-500">
        hours
      </span>
    </dd>
  </div>

  {/* Status */}
  <div className="col-span-1 bg-white p-5 transition-colors hover:bg-slate-50 md:col-span-2">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Status
    </dt>

    <dd>
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
          detail.data.status?.toLowerCase() === "active"
            ? "bg-emerald-50 text-emerald-700"
            : detail.data.status?.toLowerCase() === "pending"
            ? "bg-amber-50 text-amber-700"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            detail.data.status?.toLowerCase() === "active"
              ? "bg-emerald-500"
              : detail.data.status?.toLowerCase() === "pending"
              ? "bg-amber-500"
              : "bg-slate-400"
          }`}
        />

        {detail.data.status || "Unknown"}
      </span>
    </dd>
  </div>

</dl>
          )
        )}
      </Modal>
    </>
  );
}
