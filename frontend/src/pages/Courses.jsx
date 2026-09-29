import { useEffect, useState } from "react";
import Badge from "../components/common/Badge.jsx";
import Button from "../components/common/Button.jsx";
import EntityModal from "../components/common/EntityModal.jsx";
import Modal from "../components/common/Modal.jsx";
import Pagination from "../components/common/Pagination.jsx";
import AsyncState from "../components/common/AsyncState.jsx";
import Table from "../components/common/Table.jsx";
import { coursesApi, departmentsApi, programsApi } from "../api/catalog.js";
import { useToast } from "../state/ToastContext.jsx";

const baseColumns = [
  {
    key: "code",
    label: "Course code",
    render: (course) => <span className="course-code">{course.code}</span>,
  },
  { key: "name", label: "Course" },
  {
    key: "department",
    label: "Department",
    render: (course) => course.department?.name || "Unassigned",
  },
  {
    key: "program",
    label: "Program",
    render: (course) => course.program?.name || "—",
  },
  { key: "level", label: "Level", render: (course) => course.level || "—" },
  {
    key: "creditHours",
    label: "Credits",
    render: (course) => course.creditHours ?? "—",
  },
  {
    key: "status",
    label: "Status",
    render: (course) => (
      <Badge tone={course.status === "active" ? "good" : "warn"}>
        {course.status}
      </Badge>
    ),
  },
];

export default function Courses() {
  const notify = useToast();
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    department: "",
    status: "",
    page: 1,
  });
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setFilters((current) => ({ ...current, search: searchText, page: 1 })),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    Promise.all([
      coursesApi.list({
        page: filters.page,
        limit: 20,
        search: filters.search,
        department: filters.department,
        status: filters.status,
        sort: "code",
      }),
      departmentsApi.list({ page: 1, limit: 100, isActive: true }),
      programsApi.list({ page: 1, limit: 100, isActive: true }),
    ])
      .then(([courseResponse, departmentResponse, programResponse]) => {
        if (!current) return;
        setCourses(courseResponse.data || []);
        setPagination(courseResponse.pagination);
        setDepartments(departmentResponse.data || []);
        setPrograms(programResponse.data || []);
      })
      .catch((requestError) => {
        if (current)
          setError(requestError.message || "Courses could not be loaded.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [filters, reload]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (course) => {
    setEditing(course);
    setModalOpen(true);
  };

  const saveCourse = async (body) => {
    if (editing) await coursesApi.patch(editing._id, body);
    else await coursesApi.create(body);
    notify(editing ? "Course updated." : "Course created.");
    setModalOpen(false);
    setReload((value) => value + 1);
  };

  const viewCourse = async (course) => {
    setDetailError("");
    setDetail({ loading: true });
    try {
      const [response, allocationResponse] = await Promise.all([
        coursesApi.get(course._id),
        coursesApi.allocation(course._id),
      ]);
      setDetail({ data: response.data, allocation: allocationResponse.data });
    } catch (requestError) {
      setDetail(null);
      setDetailError(requestError.message);
    }
  };

  const deleteCourse = async (course) => {
    if (
      !window.confirm(
        `Delete ${course.code} · ${course.name}? Related activities and outlines will not be cascaded.`,
      )
    )
      return;
    try {
      await coursesApi.remove(course._id);
      notify("Course deleted.");
      if (courses.length === 1 && filters.page > 1)
        setFilters((current) => ({ ...current, page: current.page - 1 }));
      else setReload((value) => value + 1);
    } catch (requestError) {
      notify(requestError.message, "bad");
    }
  };

  const columns = [
    ...baseColumns,
    {
      key: "actions",
      label: "Actions",
      render: (course) => (
        <div className="record-actions">
          <Button variant="secondary" onClick={() => viewCourse(course)}>
            View
          </Button>
          <Button variant="secondary" onClick={() => openEdit(course)}>
            Edit
          </Button>
          <Button variant="secondary" onClick={() => deleteCourse(course)}>
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
          <h2>Courses</h2>
          <p className="subtle">Teaching units from the course catalogue.</p>
        </div>
        <div className="toolbar">
          <Button onClick={openCreate}>Add course</Button>
        </div>
      </div>
      <section className="hero-course">
        <div>
          <div className="hero-badges">
            <span>{pagination?.total ?? "—"} courses</span>
            <span>Live catalogue</span>
          </div>
          <h2>Course allocation</h2>
          <p>Review course identity, academic ownership, and active status.</p>
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <h2>All courses</h2>
          <span className="subtle">{pagination?.total ?? 0} records</span>
        </div>
        <div className="toolbar resource-filters">
          <label className="sr-only" htmlFor="course-search">
            Search courses
          </label>
          <input
            className="search"
            id="course-search"
            type="search"
            placeholder="Search code or name"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <label className="sr-only" htmlFor="course-department">
            Filter by department
          </label>
          <select
            className="select"
            id="course-department"
            value={filters.department}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                department: event.target.value,
                page: 1,
              }))
            }
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department._id} value={department._id}>
                {department.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="course-status">
            Filter by status
          </label>
          <select
            className="select"
            id="course-status"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value,
                page: 1,
              }))
            }
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <AsyncState
          loading={loading}
          error={error}
          onRetry={() => setReload((value) => value + 1)}
          empty={!courses.length}
          emptyMessage="No courses match these filters."
        >
          <Table
            columns={columns}
            rows={courses}
            caption="Courses from the backend catalogue"
          />
        </AsyncState>
        <Pagination
          pagination={pagination}
          onPageChange={(page) =>
            setFilters((current) => ({ ...current, page }))
          }
        />
      </section>
      <EntityModal
        open={modalOpen}
        title={editing ? "Edit course" : "Add course"}
        record={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={saveCourse}
        fields={[
          { name: "code", label: "Course code", required: true },
          { name: "name", label: "Course name", required: true },
          {
            name: "department",
            label: "Department",
            type: "select",
            getValue: (record) => record.department?._id,
            options: departments.map((item) => ({
              value: item._id,
              label: item.name,
            })),
          },
          {
            name: "program",
            label: "Program",
            type: "select",
            nullable: true,
            getValue: (record) => record.program?._id,
            options: programs.map((item) => ({
              value: item._id,
              label: item.name,
            })),
          },
          { name: "level", label: "Level" },
          {
            name: "creditHours",
            label: "Credit hours",
            type: "number",
            min: 0,
            step: "any",
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            required: true,
            defaultValue: "active",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
          { name: "description", label: "Description", type: "textarea" },
        ]}
      />
      <Modal
        open={Boolean(detail)}
        title="Course details"
        onClose={() => setDetail(null)}
      >
        {detail?.loading ? (
          <AsyncState loading />
        ) : detail?.data ? (
         <dl className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-2">
  {/* Code */}
  <div className="group bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Code
    </dt>
    <dd className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 font-mono text-sm font-semibold tracking-wide text-slate-700">
      {detail.data.code}
    </dd>
  </div>

  {/* Name */}
  <div className="group bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Name
    </dt>
    <dd className="text-[15px] font-semibold leading-6 text-slate-900">
      {detail.data.name}
    </dd>
  </div>

  {/* Department */}
  <div className="group bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Department
    </dt>
    <dd className="text-[15px] font-semibold leading-6 text-slate-800">
      {detail.data.department?.name || "—"}
    </dd>
  </div>

  {/* Program */}
  <div className="group bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Program
    </dt>
    <dd className="text-[15px] font-semibold leading-6 text-slate-800">
      {detail.data.program?.name || "—"}
    </dd>
  </div>

  {/* Status */}
  <div className="group bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Status
    </dt>
    <dd>
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
          detail.data.status?.toLowerCase() === "active"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-red-50 text-red-700"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            detail.data.status?.toLowerCase() === "active"
              ? "bg-emerald-500"
              : "bg-red-500"
          }`}
        />
        {detail.data.status}
      </span>
    </dd>
  </div>

  {/* Description */}
  <div className="group col-span-1 bg-white p-5 transition-colors hover:bg-slate-50 md:col-span-2">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Description
    </dt>
    <dd className="max-w-4xl text-sm font-normal leading-7 text-slate-600">
      {detail.data.description || "—"}
    </dd>
  </div>

  {/* Teaching Activities */}
  <div className="group bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Teaching Activities
    </dt>
    <dd className="text-2xl font-bold leading-tight text-slate-900">
      {detail.allocation?.activityCount ?? 0}
    </dd>
  </div>

  {/* Teaching Hours */}
  <div className="group bg-white p-5 transition-colors hover:bg-slate-50">
    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Allocated Teaching Hours
    </dt>
    <dd className="flex items-baseline gap-1.5 text-2xl font-bold leading-tight text-slate-900">
      {detail.allocation?.teachingHours ?? 0}
      <span className="text-xs font-medium text-slate-500">hrs</span>
    </dd>
  </div>

  {/* Assigned Faculty */}
  <div className="group col-span-1 bg-white p-5 transition-colors hover:bg-slate-50 md:col-span-2">
    <dt className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Assigned Faculty
    </dt>

    <dd>
      {detail.allocation?.faculty?.length ? (
        <div className="flex flex-wrap gap-2">
          {detail.allocation.faculty.map((person, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-1.5 pr-3 text-sm font-medium text-slate-700"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                {person.name?.charAt(0)?.toUpperCase()}
              </span>

              {person.name}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-sm text-slate-400">—</span>
      )}
    </dd>
  </div>
</dl>
        ) : (
          <div className="form-error" role="alert">
            {detailError}
          </div>
        )}
      </Modal>
    </>
  );
}
