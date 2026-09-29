# Project Progress — College Teaching Allocation System

## Project Overview

A college teaching-allocation application with a React administrative frontend and an Express/Mongoose REST API backed by MongoDB. The backend uses JWT authentication and role-based authorization.

## Architecture

```text
React Frontend
      |
      v
REST API
      |
      v
Express
      |
      v
Middleware
      |
      v
Controllers
      |
      v
Mongoose
      |
      v
MongoDB
```

The backend follows an MVC-style separation through models, controllers, and routes, with middleware for authentication and authorization. The React frontend is built with Vite and currently uses local mock data for teaching-allocation screens.

## Completed Phases

- [x] Phase 0 — Existing backend foundation
- [x] Phase 1 — Courses backend
- [ ] Phase 2 — Teaching Activities / Teaching Allocation
- [ ] Phase 3 — Dashboard and Workload
- [ ] Phase 4 — Course Outlines
- [ ] Phase 5 — Import System
- [ ] Phase 6 — Data Sources
- [ ] Phase 7 — Faculty Workload
- [ ] Phase 8 — Full Backend Testing and Security
- [ ] Phase 9 — Frontend Integration
- [ ] Phase 10 — Final Testing and Deployment

## Phase 0 — Existing Backend Foundation

**Status: COMPLETED**

Existing backend modules include authentication, Departments, Programs, Faculty, Notices, Events, Gallery, Pages, Admissions, Contact, Users/admin management, health, and authorization. JSON error handling is present. The existing role middleware allows editor/admin for CMS writes and submission management, while user management is admin-only. No books, children, parental-control, or reading-session modules are present.

Previously fixed defects:

1. Anonymous access to user-management routes was closed; all user CRUD methods now require admin authorization.
2. Malformed JSON and unknown routes now return controlled JSON errors instead of Express HTML responses.

## Phase 1 — Courses

**Status: COMPLETED; mutation testing remains blocked by the remote database safety constraint.**

Implemented `Course` model and controller with unique normalized course code, name, optional description, Department reference, optional Program reference, optional credit hours and level, active/inactive status, and timestamps. Department and Program references are populated on reads. Controller input is whitelisted. List behavior includes page/limit (maximum 100), search against code/name, Department/Program/status filters, and allow-listed sorting. Department/Program references are checked; duplicate code conflicts use the shared duplicate-key error handling.

Writes require editor or admin; reads are public. Safe GET, pagination, search/filter, ObjectId/not-found, pagination-cap, and anonymous-write checks passed. Create/update/delete, duplicate-code persistence, and authorized-role matrix were not executed because the configured MongoDB host is non-loopback and no isolated test database or test credentials were provided.

Implemented endpoints:

- `GET /api/courses`
- `GET /api/courses/:id`
- `POST /api/courses`
- `PATCH /api/courses/:id`
- `PUT /api/courses/:id`
- `DELETE /api/courses/:id`

## Phase 2 — Teaching Activities / Teaching Allocation

**Status: IN PROGRESS — implementation completed; testing PARTIAL/BLOCKED.** The Phase 2 checklist remains unchecked until isolated-database CRUD and authorized-role tests can be completed.

Initial schema proposal, based on the current Course/Faculty models and the teaching-allocation UI: Course and Faculty ObjectId references; academic year and period; activity type; weekday and start/end time; per-occurrence duration and occurrence count; backend-calculated teaching hours; optional room and section; scheduled/cancelled/completed status; timestamps. No source/import reference is proposed because no import model exists.

The frontend uses Trimester 2 context and displays course, assigned faculty, enrolment count, teaching hours, and allocation status. It does not define activity schedule details or persistence. Course enrolments are not modeled by the backend. Schedule conflict rules are not specified by existing project requirements, so faculty/room timetable conflict detection was not added.

Implemented `TeachingActivity` fields: required `course` → Course and `faculty` → Faculty ObjectId references; required `academicYear` (four-digit year or `YYYY-YYYY` range); required `academicPeriod` (`Trimester 1`, `Trimester 2`, `Trimester 3`); required activity type (`lecture`, `tutorial`, `practical`, `laboratory`, `seminar`); required weekday; required 24-hour `startTime`/`endTime`; required positive per-occurrence `duration`; required positive integer `occurrences`; stored `teachingHours`; optional `room` and `section`; and `status` (`scheduled`, `cancelled`, `completed`, default `scheduled`) with timestamps. No source/import reference was added because no import model exists.

`teachingHours` is calculated in a Mongoose pre-validation hook as `duration × occurrences`, rounded to two decimals. Controllers whitelist writable fields and do not accept client-supplied `teachingHours`; document-based updates run the same hook and recalculate. `duration` must match the `startTime`/`endTime` span; end must be later than start. Reads populate Course (including its Department/Program) and Faculty (including its Department).

The dedicated controller supports paginated/sorted lists and filters for faculty, course, Department (through the related Course), academic year, academic period, activity type, day, and status. Invalid IDs/filters return 400; valid-shaped missing referenced records return 404. No timetable conflict or duplicate-slot rule was inferred, so no scheduling conflict response is implemented.

API inventory:

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/teaching-activities` | No | Paginated/filterable activity list |
| GET | `/api/teaching-activities/:id` | No | Populated activity detail |
| GET | `/api/teaching-activities/faculty/:facultyId` | No | Faculty allocation list |
| GET | `/api/teaching-activities/course/:courseId` | No | Course allocation list |
| POST | `/api/teaching-activities` | Editor/admin | Create activity and calculate teaching hours |
| PATCH | `/api/teaching-activities/:id` | Editor/admin | Partially update and recalculate |
| PUT | `/api/teaching-activities/:id` | Editor/admin | Update supplied fields and recalculate |
| DELETE | `/api/teaching-activities/:id` | Editor/admin | Delete activity |

Safe verification passed: source syntax/diagnostics; in-memory schema validation for valid data, forged client teaching-hours override, invalid/missing academic year/period, type, day, times, negative duration, zero/fractional occurrences, invalid status, and end-before-start; API list/pagination (including max limit 100), faculty and Department filters, period filter, invalid filters/sort/IDs, missing activity/reference 404s, and anonymous POST/PATCH/PUT/DELETE returning 401. The live list has zero activities and the configured database has no Course documents, so successful allocation queries could not be exercised.

Blocked pending an isolated test database and valid test credentials: valid create, missing-field controller request, reference validation during writes, duplicate/conflict behavior, valid activity/detail, PATCH/PUT and persistence/recalculation, DELETE, and positive editor/admin authorization. The User role enum only permits `admin` and `editor`, so an insufficient-role 403 case cannot be set up without changing account/schema policy. No database mutations were performed.

Phase 2 test-case ledger (requests use `{{api}}`, normally `http://localhost:5000`; valid write bodies should use disposable IDs/data in an isolated database):

| ID | Request / case | Status | Evidence / expected result |
| --- | --- | --- | --- |
| TA-001 | `GET {{api}}/api/teaching-activities` | PASS | HTTP 200 list wrapper; current total 0 |
| TA-002 | `GET {{api}}/api/teaching-activities?page=2&limit=1` | PASS | HTTP 200; pagination values returned |
| TA-003 | `GET {{api}}/api/teaching-activities?faculty={{facultyId}}` | PASS | Existing Faculty filter HTTP 200; no activities |
| TA-004 | `GET {{api}}/api/teaching-activities?course={{courseId}}` | BLOCKED | No Course documents exist; valid-shaped absent ID returns 404 |
| TA-005 | `GET {{api}}/api/teaching-activities?academicPeriod=Trimester%202` | PASS | HTTP 200 |
| TA-006 | `GET {{api}}/api/teaching-activities/{{activityId}}` | BLOCKED | No activity exists for a successful detail response |
| TA-007 | `GET {{api}}/api/teaching-activities/not-an-object-id` | PASS | HTTP 400 JSON |
| TA-008 | `GET {{api}}/api/teaching-activities/000000000000000000000000` | PASS | HTTP 404 JSON |
| TA-009 | Authenticated POST with valid payload | BLOCKED | Requires isolated database and editor/admin test token |
| TA-010 | Authenticated POST with `{}` | BLOCKED | Controller route requires auth; valid token unavailable; schema required fields verified in memory |
| TA-011 | Authenticated POST with invalid/missing Course reference | BLOCKED | Write/reference check not exercised through API |
| TA-012 | Authenticated POST with invalid/missing Faculty reference | BLOCKED | Write/reference check not exercised through API |
| TA-013 | In-memory model validation with invalid `activityType` | PASS | Mongoose ValidationError |
| TA-014 | In-memory negative duration and schedule-span mismatch | PASS | Mongoose ValidationError |
| TA-015 | In-memory zero/fractional occurrences | PASS | Mongoose ValidationError |
| TA-016 | Authenticated PATCH of valid activity | BLOCKED | Requires existing test record and editor/admin token |
| TA-017 | Authenticated PUT of valid activity | BLOCKED | Requires existing test record and editor/admin token |
| TA-018 | Derived-hours calculation and forged client value | PASS | In-memory schema recalculates; persistence/update retest blocked |
| TA-019 | Authenticated DELETE and nonexistent delete | BLOCKED | No safe mutation test database or token |
| TA-020 | Anonymous POST/PATCH/PUT/DELETE | PASS | All four routes returned HTTP 401 JSON |
| TA-021 | Authenticated insufficient role | BLOCKED | No lower role exists in current User enum (`admin`, `editor`) and no test account is available |
| TA-022 | `GET {{api}}/api/teaching-activities/faculty/{{facultyId}}` | PASS | Existing Faculty returned HTTP 200; no activities |
| TA-023 | `GET {{api}}/api/teaching-activities/course/{{courseId}}` | BLOCKED | No existing Course; valid-shaped absent ID returned HTTP 404 |
| TA-024 | Invalid period/type/year/day/status/reference/sort filters | PASS | HTTP 400 JSON for invalid values |

For TA-009/TA-016/TA-017/TA-019 in a disposable database, use a body such as `{"course":"{{courseId}}","faculty":"{{facultyId}}","academicYear":"2026","academicPeriod":"Trimester 2","activityType":"lecture","day":"Monday","startTime":"09:00","endTime":"10:30","duration":1.5,"occurrences":12,"room":"SCI-101","section":"A"}`. Expected create is HTTP 201 with `teachingHours: 18`; PATCH/PUT are HTTP 200 and recalculate hours; DELETE is HTTP 200. Do not run these against the current remote database.

## Phase 3 — Dashboard and Workload

**Status: IMPLEMENTATION COMPLETED; TESTING PARTIAL/BLOCKED.** Phase 3 remains unchecked because non-empty aggregation cases and authenticated API calls could not be fully verified with the available data/credentials.

Implemented read-only aggregation endpoints:

| Method | Endpoint | Authorization | Purpose |
| --- | --- | --- | --- |
| GET | `/api/dashboard/summary` | Editor/admin | Faculty, active-course, activity and hour totals |
| GET | `/api/dashboard/workload` | Editor/admin | Workload grouped by Faculty |
| GET | `/api/dashboard/departments` | Editor/admin | Department-level Faculty/Course/activity totals |
| GET | `/api/dashboard/alerts` | Editor/admin | Deterministic unallocated Course/Faculty alerts |
| GET | `/api/faculty/:facultyId/workload` | Editor/admin | Faculty details, summary, course and activity breakdown |
| GET | `/api/courses/:courseId/allocation` | Editor/admin | Course details, assigned Faculty, activity count/hours and activity breakdown |

Dashboard endpoints are protected because they expose administrative workload information. They use the existing `protect` and `authorize("admin", "editor")` middleware. No separate authorization mechanism was added.

Aggregation and calculation rules:

- `academicYear` accepts the same `YYYY` or `YYYY-YYYY` format as TeachingActivity; `academicPeriod` accepts the existing Trimester 1/2/3 enum. Both filters are applied to TeachingActivity match stages before groups/lookups. Without either filter, results are all-time.
- Teaching activity counts include each matching stored record. Teaching hours sum the backend-maintained `TeachingActivity.teachingHours`; workload endpoints do not recalculate from duration or accept client-supplied totals. All activity statuses are included because the project has not defined an exclusion rule for cancelled/completed records.
- Workload `courseCount` is the number of distinct related Course IDs (`$addToSet`), so multiple activities for one Course count once. Faculty workload lists all Faculty, including inactive staff, and returns zero totals for a Faculty member with no matching activities.
- Summary `faculty.total` counts all Faculty; `active` counts `isActive: true`; `withAllocation` counts active Faculty with at least one activity in the selected context; `withoutAllocation` is active minus with-allocation.
- Summary `courses.total` counts all Courses; `active` counts `status: active`; `allocated` counts all existing Courses with at least one TeachingActivity in the selected context; `unallocated` counts active Courses with no TeachingActivity. These fields need not sum to `active` when an inactive Course has an allocation. Any persisted TeachingActivity status counts as an allocation, consistent with the specified existence rule.
- Department `facultyCount` and `courseCount` count all actual Faculty/Course references for that Department. Activity count and hours include TeachingActivities whose referenced Course belongs to that Department and match the requested academic context. No percentages are returned.
- Alerts are generated only for active Courses with no matching TeachingActivity (`unallocated_course`, warning) and active Faculty with no matching TeachingActivity (`faculty_without_allocation`, info). Any activity status counts as an allocation. Alerts are context-filtered and contain resource IDs from actual documents.
- Workload sorting supports `name` (default), `teachingHours`, and `courseCount`; a leading `-` reverses direction. Unsupported/non-scalar sort values return 400.

No model was added. The model definitions declare indexes for `TeachingActivity.academicYear + academicPeriod` (context-wide aggregation), the pre-existing faculty/course + academic context indexes, `Course.department`, `Faculty.department`, and `Faculty.isActive`. Read-only MongoDB index inspection confirmed these indexes are present. No teaching target/capacity fields exist, so no workload percentages or target alerts were invented.

Testing status: implementation syntax/diagnostics passed. Read-only controller aggregation checks passed with the current empty Course/TeachingActivity collections: summary and workload return zero activity/hour totals; an existing Faculty with no activities returns 200 and zero totals; missing/invalid Faculty/Course IDs return 404/400; department aggregation returns an actual Department row; active Faculty-without-allocation alerts are derived from current records; academic filters, workload sort options, and invalid query handling were exercised. HTTP requests confirmed anonymous dashboard/workload routes return 401. See the Phase 3 test ledger under Testing Status.

Testing remains partial/blocked: the database has no Course or TeachingActivity records, so non-empty distinct-course counts, sum accuracy, active-unallocated Course results, year/period filtering against records, and populated Course allocation are not verified. No valid editor/admin credential was available to exercise protected HTTP endpoints. No data was mutated. Direct controller invocation used read-only MongoDB access and is not counted as an authenticated HTTP pass.

## Phase 4 — Course Outlines

**Status: IMPLEMENTATION COMPLETED; TESTING PARTIAL/BLOCKED.** Phase 4 remains unchecked until isolated-database mutation, duplicate-version, and authenticated visibility cases can be verified.

Added a dedicated `CourseOutline` model; Course remains the referenced academic unit and is not duplicated. Required fields are `course`, `title`, and `description`. Optional content includes learning outcomes, prerequisites, embedded assessment methods (`name`, `description`, `weight`), weekly topics (`week`, `title`, optional `description`), recommended readings, additional resources, teaching methods, attendance requirements, grading policy, academic year, academic period, and status (`draft`, `published`, `archived`; default `draft`). Mongoose timestamps are server generated.

Outlines are versioned by the compound unique key `course + academicYear + academicPeriod`. This permits one general outline per Course when both version fields are absent, and separate versions for different years/periods. The schema does not force the year and period to be supplied together. A duplicate exact key follows shared Mongo duplicate handling (409).

Validation includes required nonblank title/description, scalar Course ObjectId and existing-Course checks, TeachingActivity-compatible year format and Trimester enum, status enum, string-only content arrays, strict assessment/week object keys, numeric assessment weights from 0 through 100, aggregate assessment weight no greater than 100, and positive integer week numbers. Total assessment weight need not equal 100. Input is whitelisted; unknown top-level fields such as `_id`, timestamps, role, and internal fields are ignored, while unknown nested assessment/topic fields are rejected. PATCH/PUT update documents and save through full Mongoose validation. Course reads populate Course, Department, and optional Program.

Public list/detail/Course-specific reads expose published outlines only. Draft/archived status filters are denied to public callers; unpublished detail behaves as not found. Requests carrying credentials reuse the existing `protect` and `authorize("admin", "editor")` middleware; editors/admins can read every status. All writes require editor/admin. Course-specific outlines return a paginated list so multiple academic versions are supported.

Endpoints:

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/course-outlines` | Public published; editor/admin all | Paginated/searchable/filterable outlines |
| GET | `/api/course-outlines/:id` | Public published; editor/admin all | Populated outline detail |
| GET | `/api/courses/:courseId/outline` | Public published; editor/admin all | Course-specific version list |
| POST | `/api/course-outlines` | Editor/admin | Create outline |
| PATCH | `/api/course-outlines/:id` | Editor/admin | Partially update outline |
| PUT | `/api/course-outlines/:id` | Editor/admin | Update supported outline fields |
| DELETE | `/api/course-outlines/:id` | Editor/admin | Delete outline without cascading |

List filters include course, academicYear, academicPeriod, status, and escaped title/description search; page/limit follows the shared maximum of 100. Sorting is allow-listed. Declared indexes are the unique Course/year/period compound index, status + updatedAt for visibility/default sorting, and academicYear + academicPeriod. The test server ran with Mongoose auto-index/auto-create disabled; Atlas index creation was not attempted.

Testing: syntax/model/controller checks passed. Safe HTTP checks passed for empty public list and pagination, published filter, public draft/archive filter denial, invalid and missing outline/Course IDs, invalid query values, anonymous write rejection, and route order. In-memory model checks passed for valid/default outline, version values, required fields, academic enums, weights and total limit, and topic week validation. Direct controller checks passed for missing required fields and missing Course (404). Actual outline documents, public published/draft/archive visibility against stored records, duplicate index behavior, authenticated writes/reads, and delete behavior are BLOCKED because MongoDB is remote and no isolated test database or credentials are available. No records, collections, or indexes were created during testing.

## Phase 5 — Import System

**Status: IMPLEMENTATION COMPLETED; TESTING PARTIAL/BLOCKED.** Phase 5 remains unchecked pending authorized import execution and persistence tests in an isolated database.

Added the `ImportJob` history model. It stores an allow-listed import type, random temporary filename token, sanitized original filename, CSV format, status/mode, row counts, bounded row errors and preview, creator reference, and timestamps. The internal issue array is named `rowErrors` because Mongoose warns that `errors` is a reserved schema pathname; API responses expose this as `errors`. Error count and truncation metadata preserve the total when the bounded history sample reaches 5,000 entries. Preview is capped at 100 rows; detail returns a bounded sample; the errors endpoint paginates.

CSV is the only supported format. Multer stores one CSV file under an OS temporary directory with a random UUID name; original paths are never used as filesystem paths and uploaded files are removed after processing. File size defaults to 10 MB (`MAX_IMPORT_FILE_SIZE_MB`, clamped to 1–50 MB); row count defaults to 5,000 (`MAX_IMPORT_ROWS`, clamped to 1–20,000). The schema registry allow-lists only Department, Program, Faculty, Course, TeachingActivity, and CourseOutline. Users/authentication, submissions, and CMS content are not importable.

Validation is: authenticate/authorize → validate multipart/type/mode/file → parse strict UTF-8 CSV → normalize and allow-list headers → reject missing/duplicate/unknown fields → skip empty rows and enforce row/cell limits → parse scalar values and explicitly JSON-encoded arrays → resolve references → detect in-file/database duplicates for existing unique keys → construct existing Mongoose models and run model validation → generate bounded preview/issues → create ImportJob history. Validation mode writes no target-model rows but does create ImportJob metadata/history. Import execution refuses any invalid row; it uses a MongoDB transaction to insert all target rows and update the ImportJob to completed atomically. A transaction failure aborts target writes and marks the job failed outside the aborted transaction. Atlas reported replica-set/session support. No partial import mode or rollback endpoint exists.

Relationship keys are explicit: Department/Program by slug (or ObjectId); Course by code (or ObjectId); Faculty by email only when exactly one match exists (or ObjectId); ID-only fields such as `headOfDepartment` require an ObjectId. Names are not assumed unique. Missing/ambiguous references are row validation errors; referenced entities are never implicitly created. Existing uniqueness is prechecked where available (Department/Program slug, Course code, CourseOutline Course/year/period) and model unique indexes remain authoritative during transactional insert. Faculty email is not unique in its current schema, so multiple email matches are rejected as ambiguous. No upsert behavior is used.

Import dependency order is Department → Program → Faculty → Course → TeachingActivity → CourseOutline. Jobs handle one type; no multi-file orchestration is implemented.

Endpoints (all require editor/admin except history deletion, which is admin-only):

| Method | Endpoint | Authorization | Purpose |
| --- | --- | --- | --- |
| POST | `/api/imports/validate` | Editor/admin | Validate CSV and save bounded validation history without target-row writes |
| POST | `/api/imports` | Editor/admin | Validate then transactionally import all rows |
| GET | `/api/imports` | Editor/admin | Paginated/filterable job history |
| GET | `/api/imports/:id` | Editor/admin | Job metadata, counts, bounded errors/warnings/preview |
| GET | `/api/imports/:id/errors` | Editor/admin | Paginated row-level errors |
| DELETE | `/api/imports/:id` | Admin only | Delete history only; imported records remain untouched |

History filters are allow-listed (`type`, `status`, `createdBy`, `createdFrom`, `createdTo`); sort is allow-listed and pagination maxes at 100. Temporary uploads are deleted on controller completion; Multer handles rejected/partial upload cleanup. No XLSX package was added. Dependencies added: `multer` and `csv-parse`.

Safe parser/model/row-validation fixtures and HTTP auth/error checks passed. No ImportJob or target data was created during verification. Transaction capability was verified by a read-only MongoDB handshake. Actual validation endpoint history writes, import transactions/rollback, authorized imports, history listing/detail/error pagination/deletion, and imported-data integrity remain BLOCKED because Atlas is remote and no isolated test database or editor/admin test credential is available.

## Phase 6 — Data Sources

**Status: IMPLEMENTATION COMPLETED; TESTING PARTIAL/BLOCKED.** Phase 6 remains unchecked until isolated-database CRUD, duplicate-key, and authenticated-role tests can be completed.

Added an administrative `DataSource` registry with required `name`, normalized unique `key`, and controlled `type`; optional description, provider, location, format, safe metadata configuration, and informational last-sync fields; active/inactive/archived status; `isActive`; creator/updater User references; and Mongoose timestamps. Source types are `manual`, `csv`, `xlsx`, `api`, `database`, and `other`. Formats are `csv`, `xlsx`, `json`, `api`, `database`, `manual`, and `other`; format describes origin metadata and does not add import support. Status defaults to `active`; sync status defaults to `never` and is not modified by registry or import operations.

The key is trimmed, lowercased, and normalized to a slug before saving. Name/key/description/provider/location/message lengths are bounded. Configuration is metadata-only, limited to 4 KB and the safe fields `delimiter`, `encoding`, and `hasHeader`; nested values, unknown keys (including credential-like names), Mongo operators, and dotted keys are rejected. Configuration is not a credential store. `createdBy` and `updatedBy` come from the authenticated user and populate only `name`, `email`, and `role`. Request-supplied actor fields and timestamps are rejected. List queries use scalar allow-listed parameters and allow-listed sorting; search is escaped and limited to name, key, description, and provider.

Indexes: unique `key`; `status`; `isActive`; `type`; and descending `createdAt`. No cascading delete behavior is implemented.

All DataSource endpoints require authentication. GET/POST/PATCH/PUT require editor/admin; DELETE requires admin. List uses the existing `{ success, data, pagination }` response wrapper with a maximum page size of 100. PUT follows the existing project convention and updates supplied writable fields, like PATCH.

Endpoints:

| Method | Endpoint | Authorization | Purpose |
| --- | --- | --- | --- |
| GET | `/api/data-sources` | Editor/admin | Paginated/searchable/filterable registry |
| GET | `/api/data-sources/:id` | Editor/admin | Source detail with safe actor projections |
| POST | `/api/data-sources` | Editor/admin | Create a registry entry |
| PATCH | `/api/data-sources/:id` | Editor/admin | Partially update supplied fields |
| PUT | `/api/data-sources/:id` | Editor/admin | Update supplied writable fields |
| DELETE | `/api/data-sources/:id` | Admin only | Delete only the registry entry |

Added optional `ImportJob.dataSource` → `DataSource`. Existing jobs remain valid without this field. Import multipart requests may supply a scalar source ID; empty/omitted IDs preserve the Phase 5 path. The source must exist and have both active indicators. Explicit XLSX sources are rejected by the CSV-only importer; other source types remain metadata and do not start synchronization or imply a new import format. Import history populates only source `_id`, `name`, `key`, and `type`; no configuration is returned. Imports do not update last-sync fields. Deleting a source does not delete ImportJobs or academic records; an existing history reference can subsequently populate as null.

Safe verification passed: JavaScript syntax/diagnostics, in-memory DataSource defaults/enums/key validation, optional ImportJob validation both with and without a source, controller validation for required/forged/configuration fields and key normalization, invalid ID and query-injection guards, oversized configuration rejection, all six anonymous-route 401 checks, and mocked import-source paths for invalid/missing/inactive/XLSX/active/omitted source values. No database writes were performed. Database-backed list/detail/CRUD, duplicate-key persistence, positive editor/admin authorization, populated history, and non-cascade effects remain blocked; see the Phase 6 test ledger.

No synchronization endpoint, scheduler, external API integration, frontend change, or Phase 7 workload work was added. Future external credentials require a separately designed secret-management mechanism.

Phase 6 test-case ledger:

| ID | Case | Status | Evidence / limitation |
| --- | --- | --- | --- |
| DS-001 | GET without authentication | PASS | Local HTTP request returned JSON 401 |
| DS-002 | POST without authentication | PASS | Local HTTP request returned JSON 401 |
| DS-003 | PATCH without authentication | PASS | Local HTTP request returned JSON 401 |
| DS-004 | PUT without authentication | PASS | Local HTTP request returned JSON 401 |
| DS-005 | DELETE without authentication | PASS | Local HTTP request returned JSON 401 |
| DS-006 | Invalid DataSource ObjectId | PASS | Direct controller guard returned 400 |
| DS-007 | Nonexistent DataSource | BLOCKED | Requires a database-backed lookup |
| DS-008 | Valid list response | BLOCKED | Requires database-backed list query |
| DS-009 | Pagination | PARTIAL | Scalar/overflow validation passed; persisted pagination response unavailable |
| DS-010 | Maximum pagination limit | PARTIAL | Existing helper caps limit at 100; database response not exercised |
| DS-011 | Search by name | BLOCKED | No isolated records/database |
| DS-012 | Search by key | BLOCKED | No isolated records/database |
| DS-013 | Type filter | BLOCKED | No isolated records/database |
| DS-014 | Status filter | BLOCKED | No isolated records/database |
| DS-015 | Format filter | BLOCKED | No isolated records/database |
| DS-016 | isActive filter | BLOCKED | No isolated records/database |
| DS-017 | Invalid query parameter | PASS | Unsupported sort/query and non-scalar queries return 400 |
| DS-018 | Array/object query injection | PASS | Array and operator-shaped sort/filter values rejected before querying |
| DS-019 | Valid create | PARTIAL | Mocked persistence verified normalization/actor fields; no database write |
| DS-020 | Missing required name | PASS | Controller validation returned 400 |
| DS-021 | Missing required key | PASS | Controller validation returned 400 |
| DS-022 | Missing required type | PASS | Controller validation returned 400 |
| DS-023 | Invalid type | PASS | In-memory Mongoose validation rejected the enum value |
| DS-024 | Invalid status | PASS | In-memory Mongoose validation rejected the enum value |
| DS-025 | Invalid format | PASS | In-memory Mongoose validation rejected the enum value |
| DS-026 | Invalid key pattern | PASS | In-memory schema validation rejected a non-slug value |
| DS-027 | Duplicate key | BLOCKED | Unique index declared; duplicate persistence not run |
| DS-028 | Unknown top-level fields | PASS | Controller rejected an unknown/forged field |
| DS-029 | Forged createdBy | PASS | Controller rejected request-supplied actor field |
| DS-030 | Forged updatedBy | PASS | Controller rejected request-supplied actor field |
| DS-031 | Forged timestamps | PASS | Controller rejected createdAt/updatedAt |
| DS-032 | Unsafe configuration keys | PASS | Operator-shaped configuration rejected |
| DS-033 | Configuration too large | PASS | 5 KB configuration rejected by controller |
| DS-034 | Valid PATCH | BLOCKED | Requires persisted source and authenticated editor/admin |
| DS-035 | PATCH duplicate key | BLOCKED | Requires database-backed duplicate check |
| DS-036 | PATCH invalid type | PARTIAL | Schema enum validation passed; authenticated update not run |
| DS-037 | Valid PUT | BLOCKED | Requires persisted source and authenticated editor/admin |
| DS-038 | PUT invalid payload | PARTIAL | Shared update validation is implemented; authenticated PUT body not exercised |
| DS-039 | Delete by editor | BLOCKED | No authenticated editor credential; route is admin-only |
| DS-040 | Delete by admin | BLOCKED | No authenticated admin credential/database |
| DS-041 | Delete nonexistent source | BLOCKED | Requires database-backed delete lookup |
| DS-042 | DataSource does not cascade delete | PARTIAL | Delete controller removes only DataSource; persistence effects not exercised |
| DS-043 | Create ImportJob without DataSource | PASS | Legacy ImportJob schema validation passed |
| DS-044 | Create ImportJob with valid DataSource | PASS | Optional ObjectId reference validation passed in memory |
| DS-045 | ImportJob with nonexistent DataSource | PASS | Mocked import lookup returned 404 |
| DS-046 | ImportJob with inactive DataSource | PASS | Mocked import lookup returned 409 |
| DS-047 | ImportJob backward compatibility | PASS | Existing-shaped ImportJob validates without a source |
| DS-048 | Safe DataSource metadata in history | PARTIAL | History population selects only name/key/type; persisted history not available |
| DS-049 | Configuration is not secret storage | PASS | Configuration allow-list rejects unsupported/operator keys |
| DS-050 | Response shape consistency | PARTIAL | Anonymous JSON errors and mocked create wrapper checked; DB-backed success lists unavailable |

## Phase 7 — Faculty Workload

**Status: IMPLEMENTATION COMPLETED; TESTING PARTIAL/BLOCKED.** Phase 7 remains unchecked pending authenticated positive-role tests and non-empty activity aggregation checks in an isolated database.

The existing `GET /api/faculty/:facultyId/workload` endpoint already provided the individual Faculty workload capability, so no duplicate endpoint or model was added. It remains protected by `protect` and `authorize("admin", "editor")`. This phase adds an applied `filters` object to its existing response and enriches Course references with Department (`name`, `slug`) and optional Program (`name`, `slug`, `degree`) details, retaining existing Course `id` fields and all existing response fields.

The endpoint returns the Faculty document with its Department populated as `name`/`slug`; summary totals for distinct courses, activity count, and teaching hours; a course-grouped breakdown; and an activity breakdown. Academic filters use the established four-digit year or year-range pattern and Trimester 1/2/3 enum. Filters are applied in the initial TeachingActivity match before the `$facet`. The summary counts distinct Course IDs and sums stored `TeachingActivity.teachingHours`; course rows group by Course ID and sum the same stored field. No controller-side hour recalculation occurs. The activity list retains all statuses and existing deterministic ordering. Starting from Faculty preserves inactive Faculty and returns zero totals/empty arrays when there are no activities. No capacity, target, threshold, utilization, or percentage fields were introduced.

Malformed Faculty IDs return 400; valid-shaped missing Faculty IDs return 404. Invalid/array/object academic filter values return 400. Unrelated scalar query parameters (including unsupported sort values) follow the existing behavior and are ignored; they are not passed into MongoDB filters or sorts. The endpoint is backed by existing indexes: `TeachingActivity` faculty + academic year + period, and Faculty department. No schema or index changes were needed. The faculty-wide Dashboard workload endpoint already supplies the all-Faculty aggregate, so the optional duplicate endpoint was not added.

Safe verification passed: syntax/diagnostics; mocked aggregation inspection for stored-hour sums, distinct-course grouping, course details, filters, status inclusion, and empty/inactive response behavior; read-only live checks for anonymous 401, malformed ID 400, nonexistent Faculty 404, invalid academic filters 400, and an existing Faculty without activities returning 200 with zero totals and valid combined filters. Separate mocked year-only, period-only, and combined filter checks passed. No database writes or frontend changes were made.

Blocked: non-empty course deduplication/hour accuracy, populated course breakdown against stored records, multiple academic contexts, dangling references, and authenticated editor/admin HTTP success cases. The configured database is remote, contains no TeachingActivity rows for a positive workload case, and no test credentials or isolated database are available. Direct controller checks do not count as authenticated HTTP authorization passes.

Phase 7 test-case ledger:

| ID | Case | Status | Evidence / limitation |
| --- | --- | --- | --- |
| FW-001 | Anonymous workload request | PASS | Local HTTP request returned 401 |
| FW-002 | Invalid Faculty ObjectId | PASS | Direct handler returned 400 |
| FW-003 | Nonexistent Faculty | PASS | Read-only lookup returned 404 |
| FW-004 | Existing Faculty with no activities | PASS | Read-only workload returned 200 with zero totals |
| FW-005 | Valid academicYear filter | PASS | Mocked handler accepted and applied year filter |
| FW-006 | Invalid academicYear | PASS | Read-only handler returned 400 |
| FW-007 | Valid academicPeriod filter | PASS | Mocked handler accepted and applied period filter |
| FW-008 | Invalid academicPeriod | PASS | Read-only handler returned 400 |
| FW-009 | Combined year + period filter | PASS | Read-only response returned 200 and echoed both filters |
| FW-010 | Array query injection | PASS | Mocked handler rejected array academic filter with 400 |
| FW-011 | Mongo operator query injection | PASS | Mocked handler rejected object/operator academic filter with 400 |
| FW-012 | Invalid sort | N/A | This endpoint has no sorting; unsupported sort is ignored and never reaches MongoDB |
| FW-013 | Faculty details populated safely | PASS | Department population is limited to name/slug; Faculty schema contains no auth secrets |
| FW-014 | Course grouping | BLOCKED | No TeachingActivity rows for persisted grouping verification |
| FW-015 | Same course multiple activities counts once | BLOCKED | Requires non-empty isolated activity data |
| FW-016 | Activity count accuracy | BLOCKED | No activity records available |
| FW-017 | Teaching-hours sum accuracy | BLOCKED | No activity records available for nonzero sum verification |
| FW-018 | Backend teachingHours used | PASS | Pipeline sums stored `teachingHours`; no controller recalculation |
| FW-019 | Cancelled activity handling | PASS | No status exclusion in pipeline; persisted case unavailable |
| FW-020 | Completed activity handling | PASS | No status exclusion in pipeline; persisted case unavailable |
| FW-021 | Inactive Faculty included | PASS | Mocked inactive Faculty returned; aggregate starts from Faculty |
| FW-022 | Faculty without allocation | PASS | Read-only live Faculty returned zero totals |
| FW-023 | Editor authorization | BLOCKED | No editor test credential; anonymous 401 verified |
| FW-024 | Admin authorization | BLOCKED | No admin test credential; anonymous 401 verified |
| FW-025 | Lower-role authorization | N/A | User role enum contains only editor/admin; no lower role exists |
| FW-026 | Response wrapper consistency | PASS | Existing `{ success, data }` wrapper retained in mocked/live checks |
| FW-027 | Sensitive fields excluded | PASS | Faculty schema has no auth fields; Department and Course-related projections are allow-listed |
| FW-028 | Unsupported query parameters | PASS | Unknown scalar is ignored; operator/array academic filters are rejected |
| FW-029 | Pagination if faculty-wide endpoint exists | N/A | No new faculty-wide endpoint; Dashboard workload already supplies the aggregate |
| FW-030 | Department filter if faculty-wide endpoint exists | N/A | No new faculty-wide endpoint added |
| FW-031 | Sorting if faculty-wide endpoint exists | N/A | No new faculty-wide endpoint added |
| FW-032 | Empty workload result | PASS | Read-only live request returned empty arrays and zero totals |
| FW-033 | Multiple academic contexts | BLOCKED | No activity records available |
| FW-034 | Multiple activities for one course | BLOCKED | No activity records available |
| FW-035 | Missing referenced Course | BLOCKED | No activity records available to exercise dangling Course lookup |
| FW-036 | Missing referenced Faculty | BLOCKED | No activity records available to exercise dangling Faculty reference |
| FW-037 | No database mutation during testing | PASS | Verification used reads and mocked calls only; no writes issued |
| FW-038 | Existing APIs remain functional | PARTIAL | Existing route registrations unchanged; no authenticated checks for protected endpoints |
| FW-039 | No frontend modifications | PASS | No frontend files modified |
| FW-040 | No duplicate workload model created | PASS | Existing Faculty, Course, and TeachingActivity models reused |

## Phase 8 — Full Backend Testing and Security

**Status: IMPLEMENTATION COMPLETED; TESTING PARTIAL/BLOCKED.** Phase 8 remains unchecked. Focused security and validation fixes were applied, but full API certification is blocked by remote-database write safety, missing test credentials, and unavailable non-empty workload/import data.

Created `BACKEND_TEST_REPORT.md` with environment/method, module coverage, security review, confirmed defects, blocked cases, unexecuted Postman request templates, and the BE-001–BE-052 ledger. The existing `BACKEND_API_TESTING_REPORT.md` is retained as prior history; the new report is the current Phase 8 record.

Safe verification: 51 backend JavaScript files passed `node --check`; read-only collection/detail and pagination checks passed for available records; 26 anonymous protected-route probes returned 401; in-memory auth/role, model, controller, workload, query-security, malformed-body, upload, and CSV-parser checks passed. Ten public list APIs preserved their response wrapper and pagination math. No frontend files or database records were changed.

BE ledger totals in `BACKEND_TEST_REPORT.md`: 37 PASS, 12 BLOCKED, 1 PARTIAL, 2 N/A, 0 NOT TESTED, and 0 unresolved FAIL entries (52 cases total).

Confirmed defects fixed: shared CRUD forwarded object filters/sorts; null bodies caused 500s in CRUD/user/submission status paths; Notice creation allowed forged `createdBy`; JWT used a known development fallback and the configured secret is only 8 bytes; Helmet was installed but unused; and raw controller/database errors could write sensitive details to logs. Focused regression checks passed for each fix. The current server now fails closed until `JWT_SECRET` is replaced with a private value of at least 32 bytes.

Blocked: successful registration/login and active-user `/me`; positive editor/admin HTTP role matrix; all persistent CRUD/duplicate/reference tests; non-empty TeachingActivity/workload calculations; CourseOutline persistence/visibility; ImportJob history and import transaction/rollback; DataSource persistence; and authenticated API regressions. No test credentials were supplied and fake records or mutations against Atlas were not created. `npm test` is only the package's placeholder (`Error: no test specified`); no Postman collection was executed and no automated test framework exists.

Added `backend/.env.example` with placeholders only and updated `.gitignore` to ignore `.env.*` except the example. Added `backend/scripts/seedPhase8TestData.js`, guarded by a separate test URI, a database name containing `test`, explicit test-account environment variables, remote-host opt-in, and empty-collection checks. Missing/unsafe URI guards passed; a validation-only run passed for all 24 fixture documents and confirmed expected teaching-hour values without connecting or writing. The fixture was not seeded because no local MongoDB executable, isolated URI, or test credentials are available.

Security limitations: the API health endpoint reports process health, not database readiness; CORS remains bound to the local Vite origin; rate limiting and deployment-specific policy were not tested. Phase 9 must wait until blocked Phase 8 gates and the JWT environment setting are resolved.

## Phase 9 — Frontend Integration

**Status: PLANNED**

Frontend layout and React routes exist, but they currently use mock/static data. No backend integration is completed.

## Phase 10 — Final Testing and Deployment

**Status: PLANNED**

Future work.

## API Inventory

### Auth

- `POST /api/auth/register` — public editor registration
- `POST /api/auth/login` — public login
- `GET /api/auth/me` — authenticated current user

### Departments

- `GET /api/departments`, `GET /api/departments/:id`
- `POST /api/departments`, `PATCH /api/departments/:id`, `PUT /api/departments/:id`, `DELETE /api/departments/:id` — editor/admin

### Programs

- `GET /api/programs`, `GET /api/programs/:id`
- `POST /api/programs`, `PATCH /api/programs/:id`, `PUT /api/programs/:id`, `DELETE /api/programs/:id` — editor/admin

### Faculty

- `GET /api/faculty`, `GET /api/faculty/:id`
- `POST /api/faculty`, `PATCH /api/faculty/:id`, `PUT /api/faculty/:id`, `DELETE /api/faculty/:id` — editor/admin
- `GET /api/faculty/:facultyId/workload` — editor/admin

### Courses

- `GET /api/courses`, `GET /api/courses/:id`
- `POST /api/courses`, `PATCH /api/courses/:id`, `PUT /api/courses/:id`, `DELETE /api/courses/:id` — editor/admin
- `GET /api/courses/:courseId/allocation` — editor/admin
- `GET /api/courses/:courseId/outline` — public published; editor/admin all statuses

### Course Outlines

- `GET /api/course-outlines`, `GET /api/course-outlines/:id` — public published; editor/admin all statuses
- `POST /api/course-outlines`, `PATCH /api/course-outlines/:id`, `PUT /api/course-outlines/:id`, `DELETE /api/course-outlines/:id` — editor/admin

### Teaching Activities

- `GET /api/teaching-activities`, `GET /api/teaching-activities/:id`
- `GET /api/teaching-activities/faculty/:facultyId`, `GET /api/teaching-activities/course/:courseId`
- `POST /api/teaching-activities`, `PATCH /api/teaching-activities/:id`, `PUT /api/teaching-activities/:id`, `DELETE /api/teaching-activities/:id` — editor/admin

### Dashboard

- `GET /api/dashboard/summary` — editor/admin
- `GET /api/dashboard/workload` — editor/admin
- `GET /api/dashboard/departments` — editor/admin
- `GET /api/dashboard/alerts` — editor/admin

### Imports

- `POST /api/imports/validate`, `POST /api/imports` — editor/admin
- `GET /api/imports`, `GET /api/imports/:id`, `GET /api/imports/:id/errors` — editor/admin
- `DELETE /api/imports/:id` — admin only; does not remove imported records

### Notices

- `GET /api/notices`, `GET /api/notices/:id`
- `POST /api/notices`, `PATCH /api/notices/:id`, `PUT /api/notices/:id`, `DELETE /api/notices/:id` — editor/admin

### Events

- `GET /api/events`, `GET /api/events/:id`
- `POST /api/events`, `PATCH /api/events/:id`, `PUT /api/events/:id`, `DELETE /api/events/:id` — editor/admin

### Gallery

- `GET /api/gallery`, `GET /api/gallery/:id`
- `POST /api/gallery`, `PATCH /api/gallery/:id`, `PUT /api/gallery/:id`, `DELETE /api/gallery/:id` — editor/admin

### Pages

- `GET /api/pages`, `GET /api/pages/:id`
- `POST /api/pages`, `PATCH /api/pages/:id`, `PUT /api/pages/:id`, `DELETE /api/pages/:id` — editor/admin

### Users

- `GET /api/users`, `GET /api/users/:id`, `POST /api/users`, `PATCH /api/users/:id`, `PUT /api/users/:id`, `DELETE /api/users/:id` — admin only

### Admissions

- `POST /api/admissions` — public submission
- `GET /api/admissions`, `GET /api/admissions/:id`, `PATCH /api/admissions/:id/status`, `PUT /api/admissions/:id/status` — editor/admin

### Contact

- `POST /api/contact` — public submission
- `GET /api/contact`, `GET /api/contact/:id`, `PATCH /api/contact/:id/status`, `PUT /api/contact/:id/status` — editor/admin

### System

- `GET /`
- `GET /api/health`

## Database Models

| Model | Main purpose | Relationships | Important fields |
| --- | --- | --- | --- |
| User | Admin/editor accounts | None | name, email, password hash, role, isActive |
| Department | Academic department | Optional headOfDepartment → Faculty | name, slug, descriptions, isActive |
| Program | Degree/program offering | Required department → Department | name, slug, degree, duration, department, isActive |
| Faculty | Academic staff | Optional department → Department | name, designation, qualifications, contact/profile fields, isActive, displayOrder |
| Course | Individual academic teaching unit | Required department → Department; optional program → Program | code, name, description, creditHours, level, status |
| TeachingActivity | Scheduled teaching and faculty allocation | Required course → Course; required faculty → Faculty | academicYear, academicPeriod, activityType, day, startTime, endTime, duration, occurrences, calculated teachingHours, room, section, status |
| CourseOutline | Versioned syllabus/learning outline | Required course → Course | title, description, learningOutcomes, assessmentMethods, weeklyTopics, academicYear, academicPeriod, status |
| ImportJob | Import validation/execution history | Required createdBy → User | type, format, status, mode, filenames, row counts, rowErrors, warnings, preview |
| Notice | Published notice | Optional createdBy → User | title, slug, content, category, publication fields |
| Event | Published event | None | title, slug, dates, location, category, isPublished |
| Gallery | Published image gallery | None | title, images, category, isPublished |
| Page | CMS page | Optional updatedBy → User | title, slug, content, publication and metadata fields |
| Admission | Public admission submission | Optional program → Program | applicant fields, message, status |
| ContactMessage | Public contact submission | None | name, email, phone, subject, message, status |

## Frontend Status

- React/Vite layout and component structure are implemented.
- Routes: `/`, `/courses`, `/staff`, `/all-staff`, `/imports`, `/sources`.
- Dashboard, course and staff views currently use local mock data; Import Data and Data Sources are visual/sample-only.
- Backend integrations completed: none.
- Backend integrations pending: all frontend API consumption, authentication UI/state, and real loading/error/empty states.
- Phases 2–4 are backend-first; no frontend API integration is completed or planned in the current phase.

## Testing Status

- **Completed:** Prior safe backend checks covered startup/database connection, health, public CMS reads, authentication rejection/validation, ObjectId handling, anonymous authorization rejection, and fixed JSON errors. Phase 8 additionally passed backend syntax, safe public list/detail/pagination checks, anonymous route guards, in-memory auth/role and model validation, upload/parser checks, workload construction, and focused regressions for six confirmed security/input defects. See `BACKEND_TEST_REPORT.md` and the Phase 8 section above.
- **Completed:** `npm audit --json` reported zero known vulnerabilities across 107 dependencies; no upgrades were made.
- **Blocked:** Earlier Phase 2–7 mutation/populated-data/authenticated tests remain blocked as recorded above. Phase 8 positive authenticated CRUD, registration/login persistence, duplicate/reference writes, import history/transactions, DataSource persistence, and non-empty workload calculations were not completed. The remote database was not mutated; no valid editor/admin credentials or isolated test database were provided.
- **Not performed:** No automated test suite or Postman collection is configured. Phase 5 success-response/history persistence and target-data non-mutation through the actual authenticated validate endpoint were not exercised; that endpoint intentionally writes ImportJob history metadata while avoiding target rows.
- **Known defects:** No confirmed Phase 5 runtime defect. Imports use one CSV per job, do not support XLSX, and do not implement partial imports, scheduled imports, or rollback. These are intentional scope limits.
- **Fixed defects:** (1) Anonymous user-management access; (2) HTML malformed-request/unknown-route responses.

Phase 3 test-case ledger:

| ID | Case | Status | Evidence / limitation |
| --- | --- | --- | --- |
| DB-001 | Dashboard summary with no activities | PASS | Direct controller/read-only DB check; activities and hours are zero |
| DB-002 | Dashboard workload with no activities | PASS | Read-only aggregate returned Faculty rows with zero allocation totals |
| DB-003 | Existing Faculty with no activities | PASS | Direct workload handler returned 200 and zero courses/activities/hours |
| DB-004 | Nonexistent Faculty | PASS | Valid ObjectId with no match returns 404 |
| DB-005 | Invalid Faculty ObjectId | PASS | Malformed ID returns 400 |
| DB-006 | Nonexistent Course | PASS | Valid ObjectId with no match returns 404 |
| DB-007 | Invalid Course ObjectId | PASS | Malformed ID returns 400 |
| DB-008 | Academic-year filter against matching/nonmatching activity data | BLOCKED | Filter query accepted; no activities exist to verify selection behavior |
| DB-009 | Academic-period filter against matching/nonmatching activity data | BLOCKED | Filter query accepted; no activities exist to verify selection behavior |
| DB-010 | Non-empty faculty workload aggregation | BLOCKED | Zero-activity case passed; no activity rows exist to verify grouped nonzero totals |
| DB-011 | Course-count deduplication across multiple activities | BLOCKED | No Course/TeachingActivity records available |
| DB-012 | Nonzero stored teaching-hours sum | BLOCKED | Zero-hours case passed; no stored activity totals available |
| DB-013 | Active Course allocated/unallocated calculation | BLOCKED | Course collection is empty; positive active/unallocated case unavailable |
| DB-014 | Active Faculty without allocation | PASS | Current active Faculty records generated deterministic no-allocation alerts |
| DB-015 | Department aggregation | PASS | Existing Department appears with actual related Faculty count; no Course/activity relations to verify positive totals |
| DB-016 | Alert generation | PASS | Two active-Faculty alerts derived from current records; Course-alert positive case blocked by empty Course collection |
| DB-017 | Unauthorized dashboard request | PASS | HTTP requests to all new protected route groups returned 401 JSON |
| DB-018 | Insufficient-role request | NOT TESTED | Current role enum contains only `admin` and `editor`, both authorized; no lower role is defined |
| DB-019 | Invalid academic/filter/sort query parameters | PASS | Invalid period, year shape, and sort return 400; array-valued query inputs return 400 |
| DB-020 | Completely empty database behavior | BLOCKED | The database has existing Department/Faculty data; empty Course/TeachingActivity behavior was tested instead |

Phase 4 CourseOutline test-case ledger:

| ID | Case | Status | Evidence / limitation |
| --- | --- | --- | --- |
| CO-001 | GET course outlines | PASS | HTTP 200 JSON list wrapper; collection currently has no outlines |
| CO-002 | Pagination and maximum limit | PASS | HTTP 200; limit is capped at 100 |
| CO-003 | Search title/description | BLOCKED | Query accepted with empty collection; positive matching result unavailable |
| CO-004 | Course filter | BLOCKED | Malformed ID returns 400; no Course documents for a positive filter |
| CO-005 | Academic year filter | BLOCKED | Valid filter accepted; no outline records to verify selection |
| CO-006 | Academic period filter | BLOCKED | Valid filter accepted; no outline records to verify selection |
| CO-007 | Status filter | PASS | Published filter returns 200; draft/archived public filters are denied |
| CO-008 | Invalid outline ObjectId | PASS | HTTP 400 JSON |
| CO-009 | Nonexistent outline | PASS | Valid-shaped absent ID returns HTTP 404 |
| CO-010 | Nonexistent Course | PASS | Course-specific lookup returns HTTP 404 |
| CO-011 | Public published outline | BLOCKED | No published outline exists to retrieve |
| CO-012 | Public draft not exposed | PASS | Public draft status filter returns 403; stored draft detail case unavailable |
| CO-013 | Public archived not exposed | PASS | Public archived status filter returns 403; stored archived detail case unavailable |
| CO-014 | Valid authenticated create | BLOCKED | No isolated database or editor/admin token; no mutation performed |
| CO-015 | Create with missing required fields | PASS | Direct controller validation returns 400; authenticated HTTP create not run |
| CO-016 | Invalid/nonexistent Course reference | PASS | Malformed reference returns 400; valid-shaped missing Course returns 404 via read-only controller check |
| CO-017 | Invalid academicYear | PASS | Controller/model validation returns 400/ValidationError |
| CO-018 | Invalid academicPeriod | PASS | Controller/model validation returns 400/ValidationError |
| CO-019 | Invalid assessment weight | PASS | Nonnumeric and out-of-range weights return 400 |
| CO-020 | Assessment total greater than 100 | PASS | Controller/model validation returns 400 |
| CO-021 | Invalid weekly topic | PASS | Nonpositive/fractional week and unknown nested keys rejected |
| CO-022 | Forged `_id`/timestamps/internal fields | BLOCKED | Whitelist is implemented; persisted create response cannot be tested without a safe Course/test database |
| CO-023 | Duplicate outline version | BLOCKED | Unique compound index declared; duplicate write not run against remote DB |
| CO-024 | PATCH valid outline | BLOCKED | Requires a persisted test outline and authorized token |
| CO-025 | PATCH nested/version validation | BLOCKED | Controller validates supplied payload; persisted update test unavailable |
| CO-026 | PUT valid outline | BLOCKED | Requires a persisted test outline and authorized token |
| CO-027 | DELETE valid outline | BLOCKED | Destructive mutation not run against remote DB |
| CO-028 | DELETE nonexistent outline | BLOCKED | Delete request not sent; no safe test DB |
| CO-029 | Anonymous create | PASS | HTTP 401 JSON |
| CO-030 | Anonymous update | PASS | Anonymous PATCH and PUT return HTTP 401 JSON |
| CO-031 | Anonymous delete | PASS | HTTP 401 JSON |
| CO-032 | Authenticated editor access | BLOCKED | No editor test credential supplied |
| CO-033 | Authenticated admin access | BLOCKED | No admin test credential supplied |
| CO-034 | Invalid query parameters | PASS | Invalid year, period, status, sort, and course ID return 400 |
| CO-035 | Course-specific outline endpoint | PASS | Invalid Course ID returns 400; missing valid-shaped Course returns 404 |
| CO-036 | Course-specific academic context | BLOCKED | No Course/outline documents to verify context selection |
| CO-037 | Draft visibility for editor/admin | BLOCKED | No stored draft or authorized credentials |
| CO-038 | Published visibility for public | BLOCKED | No stored published outline; published list filter shape was checked |
| CO-039 | Archived visibility for editor/admin | BLOCKED | No stored archived outline or authorized credentials |
| CO-040 | Response shape consistency | PASS | List/error responses use existing JSON success/message/data/pagination conventions |

Phase 5 Import System test-case ledger:

| ID | Case | Status | Evidence / limitation |
| --- | --- | --- | --- |
| IM-001 | GET imports without authentication | PASS | HTTP 401 JSON |
| IM-002 | POST validate without authentication | PASS | HTTP 401 before upload parsing |
| IM-003 | POST import without authentication | PASS | Multipart request returned HTTP 401 before file handling |
| IM-004 | GET import detail without authentication | PASS | HTTP 401 JSON |
| IM-005 | Invalid import ID | PASS | Direct controller guard returns 400 |
| IM-006 | Empty/missing file | PASS | Direct validate/import controller guards return 400 |
| IM-007 | Unsupported file type | PASS | Local Multer harness rejected `.exe` with HTTP 400 |
| IM-008 | File exceeding size limit | PASS | Local harness with 1 MB test limit returned HTTP 413 |
| IM-009 | CSV missing required headers | PASS | Pure header-map fixture reported missing headers |
| IM-010 | CSV with valid headers | PASS | Normalized aliases mapped correctly |
| IM-011 | CSV malformed rows | PASS | Inconsistent field count rejected with parser-specific error |
| IM-012 | Quoted commas | PASS | Commas and escaped quotes preserved |
| IM-013 | Empty rows | PASS | Blank rows skipped while preserving nonempty records |
| IM-014 | Unknown import type | PASS | Direct controller guard returns 400; only six fixed types accepted |
| IM-015 | Unknown CSV field | PASS | Unknown header and duplicate normalized aliases rejected |
| IM-016 | Department validation | PASS | Valid Department row passed model/preflight checks |
| IM-017 | Program relationship validation | PASS | Existing Department slug resolved read-only |
| IM-018 | Faculty relationship validation | PASS | Faculty schema passed; missing Department produced a row error |
| IM-019 | Course department reference | PASS | Existing Department slug resolved read-only |
| IM-020 | Course duplicate detection | PASS | Duplicate Course code in one CSV rejected before import |
| IM-021 | TeachingActivity Course reference | PASS | Missing Course reported as a row-level error |
| IM-022 | TeachingActivity Faculty reference | PASS | Missing/ambiguous Faculty email is reported as a row error |
| IM-023 | CourseOutline Course reference | PASS | Missing Course reported as a row-level error |
| IM-024 | CourseOutline model validation | PASS | Invalid assessment total rejected in model validation |
| IM-025 | TeachingActivity model validation | PASS | Existing model calculated teachingHours from duration × occurrences |
| IM-026 | Validation mode does not mutate target data | BLOCKED | Actual authenticated endpoint not run; pipeline preflight itself performs reads only, while endpoint persists ImportJob history metadata |
| IM-027 | Valid Course import | BLOCKED | Import execution is a database mutation; no isolated DB/token |
| IM-028 | Invalid Course import | PASS | Preflight rejected missing Department; execution/no-write behavior not exercised |
| IM-029 | Valid Faculty import | BLOCKED | Import execution not run against remote DB |
| IM-030 | Valid Program import | BLOCKED | Import execution not run against remote DB |
| IM-031 | Valid Department import | BLOCKED | Import execution not run against remote DB |
| IM-032 | Valid TeachingActivity import | BLOCKED | Import execution not run against remote DB |
| IM-033 | Valid CourseOutline import | BLOCKED | Import execution not run against remote DB |
| IM-034 | All-or-nothing validation failure | BLOCKED | Transactional import execution was not invoked |
| IM-035 | Import history creation | BLOCKED | Would write ImportJob metadata; no isolated DB/auth token |
| IM-036 | Import history pagination | BLOCKED | No authorized history request/job record |
| IM-037 | Import detail | BLOCKED | No authorized history request/job record |
| IM-038 | Import error pagination | BLOCKED | No authorized history request/job record |
| IM-039 | Admin-only history deletion | BLOCKED | Destructive history mutation not run |
| IM-040 | Editor cannot delete history | BLOCKED | No editor credential supplied |
| IM-041 | Temporary file cleanup | PASS | Local Multer harness verified temp file removal after processing |
| IM-042 | Mongo operator injection | PASS | `$where` header rejected; operator-like value stayed a string in the whitelisted field |
| IM-043 | Path traversal filename | PASS | Path-like name reduced to safe basename; stored temp name is random UUID |
| IM-044 | Executable file attempt | PASS | `.exe` extension/MIME rejected |
| IM-045 | Oversized row count | PASS | 5,001-row fixture rejected at configured default cap before relationship resolution |
| IM-046 | Malformed JSON/multipart | PASS | App returned JSON 400 for malformed JSON; Multer harness returned JSON 400 for malformed boundary |
| IM-047 | Success response shape consistency | NOT TESTED | Protected successful import/history responses require auth and persisted test data |
| IM-048 | Authenticated editor import | BLOCKED | No editor test token or isolated DB |
| IM-049 | Authenticated admin import | BLOCKED | No admin test token or isolated DB |
| IM-050 | Duplicate import prevention/handling | PASS | Unique-key preflight detected duplicate rows and existing Department slug; transactional race handling remains untested |

## Current Development Status

Current Phase: Phase 8 — Full Backend Testing and Security
Current Status: Focused implementation fixes completed; testing PARTIAL/BLOCKED; phase not marked complete
Last Completed Feature: Focused query, body-validation, attribution, JWT, HTTP-header, and error-log security fixes
Next Feature: Phase 9 — Frontend Integration (blocked until Phase 8 testing gates and JWT configuration are resolved)
Backend Status: Existing modules plus Courses, Teaching Activities, Dashboard/Workload, Course Outlines, Import System, Data Sources, and Faculty Workload
Frontend Status: Layout complete; mock data; no backend integration
Testing Status: See `BACKEND_TEST_REPORT.md`; safe API/security/model checks passed, while persistent CRUD/import/DataSource tests and positive authenticated-role checks remain blocked
