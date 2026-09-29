import { useEffect, useState } from "react";
import Badge from "../components/common/Badge.jsx";
import Button from "../components/common/Button.jsx";
import Modal from "../components/common/Modal.jsx";
import Pagination from "../components/common/Pagination.jsx";
import AsyncState from "../components/common/AsyncState.jsx";
import Table from "../components/common/Table.jsx";
import CourseOutlineForm from "../components/courseOutlines/CourseOutlineForm.jsx";
import { coursesApi } from "../api/catalog.js";
import { courseOutlinesApi } from "../api/courseOutlines.js";
import { useToast } from "../state/ToastContext.jsx";

const statuses = ["draft", "published", "archived"];
const periods = ["Trimester 1", "Trimester 2", "Trimester 3"];

export default function CourseOutlines() {
  const notify = useToast();
  const [outlines, setOutlines] = useState([]);
  const [courses, setCourses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    status: "",
    academicYear: "",
    academicPeriod: "",
    course: "",
    search: "",
    page: 1,
  });
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState(null);
  const [detail, setDetail] = useState(null);

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
    const query = { ...filters, limit: 20 };
    delete query.course;
    Promise.all([
      filters.course
        ? courseOutlinesApi.forCourse(filters.course, query)
        : courseOutlinesApi.list(query),
      coursesApi.list({ page: 1, limit: 100, sort: "code" }),
    ])
      .then(([outlineResponse, courseResponse]) => {
        if (!current) return;
        setOutlines(outlineResponse.data || []);
        setPagination(outlineResponse.pagination);
        setCourses(courseResponse.data || []);
      })
      .catch((requestError) => {
        if (current)
          setError(
            requestError.message || "Course outlines could not be loaded.",
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
    if (editor?._id) await courseOutlinesApi.patch(editor._id, body);
    else await courseOutlinesApi.create(body);
    notify(editor?._id ? "Course outline updated." : "Course outline created.");
    setEditor(null);
    setReload((value) => value + 1);
  };

  const view = async (outline) => {
    setDetail({ loading: true });
    try {
      const response = await courseOutlinesApi.get(outline._id);
      setDetail({ data: response.data });
    } catch (requestError) {
      setDetail({ error: requestError.message });
    }
  };

  const remove = async (outline) => {
    if (!window.confirm(`Delete outline “${outline.title}”?`)) return;
    try {
      await courseOutlinesApi.remove(outline._id);
      notify("Course outline deleted.");
      setReload((value) => value + 1);
    } catch (requestError) {
      notify(requestError.message, "bad");
    }
  };

  const columns = [
    {
      key: "title",
      label: "Outline",
      render: (row) => (
        <>
          <strong>{row.title}</strong>
          <div className="subtle">
            {row.course?.code} · {row.course?.name}
          </div>
        </>
      ),
    },
    {
      key: "academicYear",
      label: "Version",
      render: (row) =>
        `${row.academicYear || "General"} · ${row.academicPeriod || "All periods"}`,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge
          tone={
            row.status === "published"
              ? "good"
              : row.status === "archived"
                ? "warn"
                : "neutral"
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
          <Button variant="secondary" onClick={() => view(row)}>
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
          <h2>Course Outlines</h2>
          <p className="subtle">
            Syllabus versions and teaching content from the backend.
          </p>
        </div>
        <Button onClick={() => setEditor({})}>Add outline</Button>
      </div>
      <div className="toolbar resource-filters">
        <label className="sr-only" htmlFor="outline-search">
          Search outlines
        </label>
        <input
          className="search"
          id="outline-search"
          type="search"
          placeholder="Search title or description"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <label className="sr-only" htmlFor="outline-course">
          Course
        </label>
        <select
          className="select"
          id="outline-course"
          value={filters.course}
          onChange={(event) =>
            setFilters({ ...filters, course: event.target.value, page: 1 })
          }
        >
          <option value="">All courses</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.code} · {course.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="outline-year">
          Academic year
        </label>
        <select
          className="select"
          id="outline-year"
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
        <label className="sr-only" htmlFor="outline-period">
          Academic period
        </label>
        <select
          className="select"
          id="outline-period"
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
        <label className="sr-only" htmlFor="outline-status">
          Status
        </label>
        <select
          className="select"
          id="outline-status"
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
      <section className="section">
        <div className="section-head">
          <h2>Outline registry</h2>
          <span className="subtle">{pagination?.total ?? 0} records</span>
        </div>
        <AsyncState
          loading={loading}
          error={error}
          onRetry={() => setReload((value) => value + 1)}
          empty={!outlines.length}
          emptyMessage="No course outlines found."
        >
          <Table
            columns={columns}
            rows={outlines}
            caption="Course outline registry"
          />
        </AsyncState>
        <Pagination
          pagination={pagination}
          onPageChange={(page) => setFilters({ ...filters, page })}
        />
      </section>
      <CourseOutlineForm
        open={Boolean(editor)}
        outline={editor?._id ? editor : null}
        courses={courses}
        onClose={() => setEditor(null)}
        onSubmit={save}
      />
      <Modal
        open={Boolean(detail)}
        title="Course outline details"
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
            <div className="outline-detail">
              <p>
                <strong>
                  {detail.data.course?.code} · {detail.data.course?.name}
                </strong>
              </p>
              <p>{detail.data.description}</p>
              <p>
                {detail.data.academicYear || "General"} ·{" "}
                {detail.data.academicPeriod || "All periods"} ·{" "}
                {detail.data.status}
              </p>
              <h3>Learning outcomes</h3>
              {detail.data.learningOutcomes?.length ? <ul>{detail.data.learningOutcomes.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="subtle">No learning outcomes recorded.</p>}
              <h3>Prerequisites</h3>
              {detail.data.prerequisites?.length ? <ul>{detail.data.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="subtle">No prerequisites recorded.</p>}
              <h3>Assessment methods</h3>
              {detail.data.assessmentMethods?.length ? <ul className="outline-item-list">{detail.data.assessmentMethods.map((item, index) => <li key={`${item.name}-${index}`}><strong>{item.name}</strong> · {item.weight}%<div className="subtle">{item.description}</div></li>)}</ul> : <p className="subtle">No assessment methods recorded.</p>}
              <h3>Weekly topics</h3>
              {detail.data.weeklyTopics?.length ? <ol className="outline-item-list">{detail.data.weeklyTopics.map((item, index) => <li key={`${item.week}-${index}`}><strong>Week {item.week}: {item.title}</strong>{item.description && <div className="subtle">{item.description}</div>}</li>)}</ol> : <p className="subtle">No weekly topics recorded.</p>}
              <h3>Recommended readings</h3>
              {detail.data.recommendedReadings?.length ? <ul>{detail.data.recommendedReadings.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="subtle">No readings recorded.</p>}
              <h3>Teaching methods</h3>
              {detail.data.teachingMethods?.length ? <ul>{detail.data.teachingMethods.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="subtle">No teaching methods recorded.</p>}
              {detail.data.attendanceRequirements && <><h3>Attendance</h3><p>{detail.data.attendanceRequirements}</p></>}
              {detail.data.gradingPolicy && <><h3>Grading policy</h3><p>{detail.data.gradingPolicy}</p></>}
            </div>
          )
        )}
      </Modal>
    </>
  );
}
