# Backend API Testing Report

## 1. Project Information

- Project: College Teaching Allocation System backend
- Testing phase: Phase 8, Full Backend Testing and Security Validation
- Testing date: 2026-09-28
- Runtime: Node.js v24.13.0, npm 11.9.0
- Backend: Express 5.2.1, Mongoose 9.10.0, MongoDB Atlas
- Architecture: Express routes, middleware, MVC controllers, Mongoose models
- Backend URL: local ephemeral HTTP listeners used for the checks; no persistent server was left running
- Database environment: configured remote MongoDB Atlas; only read operations were issued
- Authentication: JWT bearer token or token cookie; no production/editor/admin credentials were used
- Tools: Node HTTP/fetch, `node --check`, Mongoose read-only queries, temporary OS files; Postman was not used

## 2. Testing Scope

Reviewed and tested, as far as safe and available: health/error handling, authentication and authorization, shared CRUD resources, Departments, Programs, Faculty, Courses, Teaching Activities, dashboard/workload, Course Outlines, Import System, Data Sources, upload handling, query validation, pagination, relationship reads, and regression behavior. Frontend and deployment behavior were excluded.

No records were created, changed, or deleted. Import validation and execution endpoints were not run because validation writes ImportJob history and import mode writes target records. No separate test database, test users, or credentials were created.

## 3. Test Environment

- The Express app was mounted on local ephemeral ports for HTTP checks.
- Safe collection and detail reads used the existing remote MongoDB configuration with Mongoose auto-index and auto-create disabled.
- Only status, response shape, pagination metadata, and relationship presence were printed; existing record contents were not included in test output.
- The current configured `JWT_SECRET` is present but only 8 bytes. The new startup guard correctly refuses to start the production server with this configuration. No secret value is recorded here.
- Health reports process/API status only, not MongoDB readiness. Mongo connectivity was exercised separately by the read-only queries.

### Safe Isolated Test Setup

Added `backend/scripts/seedPhase8TestData.js` as an opt-in setup utility. It requires a separate `PHASE8_TEST_MONGO_URI` whose database name contains `test`, refuses to use the exact configured `MONGO_URI`, and requires `PHASE8_ALLOW_REMOTE_TEST_DB=true` before accepting a non-loopback host. It also requires separate admin/editor email and password environment values. No password is hard-coded, printed, or committed. The script refuses to seed if any target collection already contains documents; it does not overwrite users, drop collections, or delete records.

The deterministic fixture defines two Departments, two Programs, three Faculty (one inactive), four Courses, six TeachingActivities across 2025/2026 and all three Trimester periods, multiple activities for one Course, scheduled/cancelled/completed statuses, three CourseOutlines, two DataSources, and disposable admin/editor users. All 24 documents passed in-memory Mongoose validation; the six expected derived teaching-hour values also matched duration × occurrences. The fixture was **not seeded**: no local `mongod`/`mongosh` is installed, and no isolated test URI or test credentials were provided. Its no-configuration and unsafe-URI guards were executed and refused to connect. The available `.env.example` contains placeholders only; `.env` and `.env.*` files are ignored except `.env.example`.

For an explicitly approved fresh test database, set these variables privately in the ignored local environment, then run `node scripts/seedPhase8TestData.js` from `backend`. To run the API against that test database, set `MONGO_URI` to the same test URI and configure a private `JWT_SECRET` of at least 32 bytes for that process. Never point the seed script at the configured production-like database. The seed operation is one-time and non-transactional; if interrupted, it will refuse to rerun once collections are non-empty. Use a fresh, explicitly disposable test database for each seed run.

## 4. Test Result Legend

- PASS: Executed and met the stated check.
- FAIL: Executed and did not meet the check; no unresolved runtime failures are counted as passing.
- BLOCKED: Requires credentials, records, or safe persistence testing that was unavailable.
- PARTIAL: Some parts were checked, but required coverage remains.
- N/A: Not applicable or no implementation exists for the tested capability.
- NOT TESTED: No evidence was collected for the behavior.

The BE ledger below records actual checks. Mocked and in-memory tests are identified as such and are not represented as authenticated HTTP or persisted database tests.

## Result Totals

| Result | Count |
| --- | ---: |
| PASS | 37 |
| FAIL | 0 unresolved |
| BLOCKED | 12 |
| PARTIAL | 1 |
| N/A | 2 |
| NOT TESTED | 0 |

Counts cover the 52 BE ledger entries only; they are not a claim of complete API coverage.

## 5. Authentication Tests

| ID | Endpoint / scenario | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| BE-008 | Register/login missing or invalid basic input | Controlled 400 JSON | Missing-field requests returned 400 before database access | PASS |
| BE-009 | Successful registration, duplicate registration, valid login | Persisted user/token behavior | Not run; registration mutates remote database and no credentials were provided | BLOCKED |
| BE-010 | `/api/auth/me` with no/malformed/expired token | 401 | In-memory middleware checks returned 401; expired token rejected before user lookup | PASS |
| BE-011 | Correctly signed token referencing nonexistent user | 401 | Mocked read returned no user; middleware returned 401 | PASS |
| BE-012 | Active/inactive existing user login and successful `/me` | Safe user response | No authorized credentials; no positive auth HTTP test | BLOCKED |
| BE-013 | Password hashing and response source review | Salted hash; never return password/hash | In-memory `scrypt` output contains salt/hash and no plaintext; user projections exclude `password` | PASS |
| BE-006 | Missing/short JWT secret | Fail closed; no known fallback | Server startup rejected the configured 8-byte secret; direct signer rejects missing/short values | PASS |

JWT signing uses HMAC-SHA256 and expiration checks. The server now requires at least 32 bytes of `JWT_SECRET`. Set a strong, private value in the local environment before restarting; do not send it through chat or commit it.

## 6. Authorization Tests

| ID | Endpoint / scenario | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| BE-014 | Anonymous requests across protected dashboard, imports, data sources, users, submissions, writes, and deletes | 401 | 26 protected/admin route probes returned 401 | PASS |
| BE-015 | Admin-only middleware with editor/admin roles | Editor 403; admin continues | In-memory middleware check confirmed both branches | PASS |
| BE-016 | Positive editor/admin HTTP requests and cross-role resource matrix | Route-specific authorization | No test credentials; not attempted | BLOCKED |
| BE-007 | Lower role | 403 | User role enum only has `admin` and `editor`; no lower role is defined | N/A |

Route review confirmed admin-only user management and ImportJob/DataSource deletion, and editor/admin protection for administrative writes, imports, dashboard, and workload endpoints. Public reads and public submissions remain public by design.

## 7. CRUD Tests

Ten public list endpoints returned HTTP 200 with the existing list wrapper and pagination: Departments, Programs, Faculty, Courses, Teaching Activities, Course Outlines, Notices, Events, Gallery, and Pages. Existing Department, Program, and Faculty detail reads returned 200. Their department/program references were populated where configured.

Valid create/update/delete, duplicate persistence, and post-mutation integrity checks are BLOCKED to avoid writes to the configured remote database. User, ImportJob, and DataSource positive CRUD is also BLOCKED by missing credentials and mutation safety. Anonymous protected writes were covered by the 26-route 401 matrix.

## 8. Validation Tests

- Malformed JSON returned generic JSON 400; unknown paths returned JSON 404.
- Null/array request bodies to shared CRUD and user create/update now return 400 rather than 500.
- Null, array, operator-shaped, and array-valued admission/contact status bodies return 400; mocked valid statuses preserve the existing 200 response shape.
- Malformed and valid-shaped nonexistent IDs returned 400 and 404 for Course, TeachingActivity, and CourseOutline reads.
- ObjectId reference persistence, duplicate keys, and invalid referenced documents on writes are BLOCKED because they require write credentials/data.

## 9. Security Tests

- Helmet is now mounted; local HTTP responses included security headers and did not include `X-Powered-By`.
- JWT known fallback removed; a weak/missing secret is rejected. Current `.env` configuration is too short, so `node server.js` exits before connecting to MongoDB.
- Shared controller errors return generic JSON 500. Unexpected errors are logged by class, not by full object/stack/message. Mongo connection logs now omit the raw error message.
- Notice `createdBy` spoofing was reproduced with mocked persistence and fixed: creation uses `req.user`; updates cannot change the creator. Page `updatedBy` behavior was regression-checked.
- CORS remains hard-coded to the localhost frontend origin. No rate limiter is installed. Review/configuration for deployment origins and rate limits remains operational work, not implemented in this phase.

## 10. Query Injection Tests

| ID | Scenario | Actual | Status |
| --- | --- | --- | --- |
| BE-020 | Object filter/sort passed to shared CRUD controller | Reproduced before fix; after fix non-scalars return 400 before model query | PASS |
| BE-021 | Repeated scalar keys create arrays | Shared CRUD filter/sort/page arrays return 400; read-only HTTP probes confirmed | PASS |
| BE-022 | Bracketed query such as `slug[$ne]` under Express simple parser | Bracket key is ignored as an unsupported query property; it does not become a Mongo operator | PASS |
| BE-023 | Operator/array values in dedicated academic filters | Dashboard/workload validators reject object/array values with 400 | PASS |

The generic CRUD list controller previously forwarded parsed object values in filters and sorting directly to Mongoose. This was reproduced with a mocked model and fixed by rejecting non-scalar values before building a query. No untrusted query object was sent to MongoDB during verification.

## 11. Pagination Tests

Read-only list responses from ten public endpoints had mathematically consistent `pages = ceil(total / limit)`, returned no more than `limit` rows, and respected the 100-row cap. `page=abc` normalized to page 1; negative page/limit normalized to the existing minimum; a limit above 100 was capped at 100. Repeated `page` keys are rejected by the shared CRUD list controller. The default normalization behavior is preserved rather than changed to a new API contract.

Pagination tests requiring populated datasets or authenticated list endpoints are BLOCKED. No unlimited query behavior was observed; the shared helper caps `limit` at 100.

## 12. Relationship Tests

Read-only existing Department, Program, and Faculty details returned 200; Program and Faculty department references were populated. Course, CourseOutline, and TeachingActivity missing/malformed ID behavior returned expected 404/400. TeachingActivity-to-Course/Faculty, Course-to-Department/Program write validation and dangling/deleted reference cases require records or writes and are BLOCKED. No relationship mutation was attempted.

## 13. Teaching Activity Tests

In-memory Mongoose validation confirmed backend calculation of `teachingHours = duration × occurrences`: duration 1.5 and 12 occurrences produced 18 despite a supplied client value of 999. Zero/negative duration, zero/fractional occurrences, invalid academic year/period, and invalid status were rejected. Persisted activity CRUD, relationship checks, and large-data behavior are BLOCKED.

## 14. Workload Tests

The existing `GET /api/faculty/:facultyId/workload` endpoint was retained. Read-only checks confirmed anonymous 401, malformed ID 400, missing Faculty 404, invalid academic filters 400, and an existing Faculty without activities returning 200 with zero totals and empty arrays. Mocked aggregation checks confirmed filters are applied before `$facet`, stored `teachingHours` are summed, Course IDs are grouped distinctly, and activity statuses are not excluded.

Non-empty course grouping, multiple academic contexts, cancelled/completed persisted activities, and actual nonzero totals are BLOCKED because the available dataset has no TeachingActivity rows. No workload records were created.

## 15. Course Outline Tests

In-memory model checks passed for defaults and the assessment total limit. Read-only list and malformed/missing ID checks passed. Create/update/delete persistence, duplicate version behavior, and public visibility against stored published/draft/archived records are BLOCKED by the remote database safety constraint and missing credentials.

## 16. Import Tests

Pure parser checks passed for quoted commas/quotes, valid and invalid headers, row parsing, non-finite numeric values, filename sanitization, and invalid UTF-8. The actual upload middleware accepted CSV into a UUID-named temporary file and cleaned it up; `.txt` was rejected with 400; a 1 MB test limit rejected an oversized file with 413.

Import validation/history writes, successful imports, transaction commit/rollback, relationship resolution against data, and ImportJob history CRUD are BLOCKED. Validation mode itself writes ImportJob metadata, so it was not called against the remote database.

## 17. Data Source Tests

Previously executed Phase 6 in-memory/controller checks cover schema defaults/enums, normalized keys, required/forged fields, safe configuration allow-list, oversized configuration, optional ImportJob linkage/backward compatibility, and mocked invalid/missing/inactive/XLSX import-source cases. Phase 8 confirmed route-level anonymous rejection. Persisted CRUD, duplicate-key persistence, history population, and positive admin/editor access remain BLOCKED.

## 18. Regression Tests

- Ten public collection list APIs retained their success wrapper and pagination contract.
- Twenty-six protected/admin route probes returned 401 anonymously.
- Public Department/Program/Faculty detail reads and relationship population passed.
- Invalid/missing Course, TeachingActivity, and CourseOutline IDs preserved 400/404 behavior.
- Page updater attribution remained intact after the generic prepare-hook change.
- No frontend files were modified.
- Authenticated success paths and all mutation regressions remain BLOCKED; no claim of complete regression certification is made.

## 19. Defects Found

| ID | Module | Problem / root cause | Fix | Verification |
| --- | --- | --- | --- | --- |
| BUG-003 | Shared CRUD query security | Parsed object filters/sort were forwarded to Mongoose | Reject non-scalar filters, sort, page, and limit before query construction | Mocked model plus repeated-key HTTP checks returned 400 before querying |
| BUG-004 | CRUD/user/submission validation | JSON `null` bodies caused TypeErrors and generic 500 responses | Make required-field validation null-safe and guard update/status handlers | Null/array/operator body checks returned 400; valid mocked status updates retained 200 |
| BUG-005 | Notice attribution | Authenticated caller could choose `createdBy` | Remove it from writable fields; assign from authenticated user on create only | Reproduced before fix; mocked create/update regression passed |
| BUG-006 | JWT configuration | Known `development-secret` fallback and an 8-byte configured secret | Remove fallback; require at least 32 bytes and fail server startup before DB connection | In-memory signer checks passed; actual startup correctly stopped on weak configuration |
| BUG-007 | HTTP security headers | Installed Helmet dependency was not mounted | Mount Helmet in the Express app | Local HTTP response contained Helmet headers and no `X-Powered-By` |
| BUG-008 | Error/connection logging | Full unexpected error objects/messages could include sensitive details | Log only error class; database connection log omits raw message | Synthetic URI/password error returned generic JSON and was absent from logs |

No database-backed defect fix verification was possible. Existing old report entries BUG-001/BUG-002 are historical fixes and were not re-counted as Phase 8 discoveries.

## 20. Blocked Tests

- Successful registration, duplicate registration, valid login, and authenticated `/me` for a real active account.
- Positive editor/admin HTTP matrix and protected CRUD success paths.
- All database-mutating CRUD, duplicate persistence, and post-write integrity checks.
- Relationship write validation and deleted/dangling reference behavior.
- Non-empty teaching activity/workload calculations, multiple-course grouping, and status behavior against stored rows.
- Course Outline create/update/delete, duplicate-version, and persisted visibility cases.
- Import validation history, import transactions, rollback, and ImportJob history operations.
- DataSource CRUD, duplicate key, source/history persistence, and admin-only delete using real credentials.
- Production CORS/rate-limit deployment verification.

Postman was not run. No automated test suite exists: the configured `npm test` script is a placeholder that prints `Error: no test specified` and exits 1. No separate database, credentials, or fake records were created.

### Manual Postman Request Templates

These are test templates only; none were sent through Postman. The current backend startup is also blocked until a private JWT secret of at least 32 bytes is configured. Do not send mutating requests to the configured remote Atlas database. No credentials or tokens are included.

Environment variables: `baseUrl` = `http://localhost:5000`; `editorToken`, `adminToken`, `editorEmail`, `editorPassword`, `facultyId`, `courseId`, `dataSourceId`, and `importId` are owner-supplied placeholders.

| Method | Request | Headers / body | Use |
| --- | --- | --- | --- |
| GET | `{{baseUrl}}/api/health` | None | Read-only health and JSON contract |
| GET | `{{baseUrl}}/api/departments?page=1&limit=10` | None | Read-only list/pagination |
| GET | `{{baseUrl}}/api/faculty/{{facultyId}}/workload?academicYear=2026&academicPeriod=Trimester%202` | Bearer `{{editorToken}}` | Read-only workload filters |
| GET | `{{baseUrl}}/api/dashboard/summary` | Bearer `{{editorToken}}` | Read-only protected endpoint |
| GET | `{{baseUrl}}/api/imports` | Bearer `{{editorToken}}` | Read-only history; data availability varies |
| GET | `{{baseUrl}}/api/data-sources` | Bearer `{{editorToken}}` | Read-only source registry |
| POST | `{{baseUrl}}/api/auth/login` | JSON `{"email":"{{editorEmail}}","password":"{{editorPassword}}"}` | Positive login; requires an existing owner-managed account |
| GET | `{{baseUrl}}/api/auth/me` | Bearer `{{editorToken}}` | Positive `/me` and safe user projection |
| POST | `{{baseUrl}}/api/data-sources` | Bearer `{{editorToken}}`; JSON `{"name":"Temporary test source","key":"phase8-test-source","type":"csv","format":"csv"}` | Mutating; do not run against configured remote DB |
| PATCH | `{{baseUrl}}/api/data-sources/{{dataSourceId}}` | Bearer `{{editorToken}}`; JSON `{"description":"Updated test metadata"}` | Mutating; only in an explicitly safe approved environment |
| DELETE | `{{baseUrl}}/api/data-sources/{{dataSourceId}}` | Bearer `{{adminToken}}` | Destructive; only against disposable approved test data |
| POST | `{{baseUrl}}/api/imports/validate` | Bearer `{{editorToken}}`; multipart `type=department`, `mode=validate`, `file=<CSV>` | Writes ImportJob history even in validation mode; do not run against configured remote DB |
| POST | `{{baseUrl}}/api/imports` | Bearer `{{editorToken}}`; multipart `type=course`, `mode=import`, `file=<CSV>` | Imports records transactionally; destructive/persistent test, not executed |

For blocked cases, record the actual HTTP status/body and database before/after state only after an approved safe target exists. Do not mark these templates as Postman PASS until they have actually been run.

## 21. Final Backend Status

- Implementation status: Existing backend modules remain in place; Phase 8 applied focused security/input fixes only.
- Testing status: PARTIAL/BLOCKED. Syntax, read-only API, mocked controller, model, auth, upload, and parser checks passed; persisted writes and positive auth paths remain unverified.
- Security status: Confirmed query forwarding, malformed-body, Notice attribution, weak JWT fallback/configuration, missing Helmet, and raw error logging issues were fixed and focused checks passed. Security review is not a penetration test or production certification.
- Known limitations: Current 8-byte JWT setting prevents `node server.js` from starting until changed; CORS is fixed to localhost; no rate limiting; no automated test suite; remote database prevents safe mutation testing.
- Remaining work: Configure a private JWT secret of at least 32 bytes; execute blocked Postman CRUD/import/role cases only in an approved safe environment; add a real test suite during the appropriate testing phase; resolve deployment CORS/rate-limit policy.
- Phase 8 must remain unchecked. Phase 9 must not begin until blocked Phase 8 gates are resolved.

### Phase 8 Gate

- [ ] JWT configuration is secure in the active environment (the current configured value is below the required length)
- [ ] Admin test account available in an isolated database
- [ ] Editor test account available in an isolated database
- [ ] Safe populated test data available
- [ ] Authentication positive paths tested
- [ ] Authorization HTTP matrix tested
- [ ] Persistent CRUD tested
- [ ] Teaching Activity persisted workflows tested
- [ ] Dashboard calculations tested against populated data
- [ ] Faculty Workload non-empty calculations tested
- [ ] Course Outline persistence/visibility tested
- [ ] Import validation/history/transaction paths tested
- [ ] Data Source persistence/role matrix tested
- [ ] Existing API regression suite completed
- [x] Focused security regression checks executed
- [x] `BACKEND_TEST_REPORT.md` updated
- [x] `PROJECT_PROGRESS.md` updated
- [x] Dependency audit completed (`npm audit`: zero reported vulnerabilities)

Phase 9 is gated until the outstanding checks above are completed with an approved isolated database and real test accounts.

## BE Test Ledger

| ID | Module | Scenario | Expected | Actual | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| BE-001 | Static | Syntax-check backend JavaScript | No syntax errors | 51 files passed `node --check` | PASS | Dependencies excluded |
| BE-002 | Testing | Existing `npm test` script | Automated suite runs | Placeholder exits 1: no test specified | N/A | No suite configured |
| BE-003 | Health/HTTP | Root and `/api/health`; Helmet headers | JSON 200, safe headers | Passed locally; no `X-Powered-By` | PASS | Health is process-only |
| BE-004 | Errors | Malformed JSON and unknown route | JSON 400/404; no stack response | Passed locally | PASS | Generic JSON errors |
| BE-005 | Disclosure | Scan tested responses for secrets/URI/stack | No sensitive values | No disclosure in tested responses | PASS | Values never printed |
| BE-006 | JWT config | Missing/short signing secret | Fail closed | Signer rejects; server refuses 8-byte environment value | PASS | Current config requires remediation |
| BE-007 | Health | Mongo readiness in health response | Expose if implemented | Not represented by current endpoint | N/A | DB tested separately by read-only queries |
| BE-008 | Auth | Missing/invalid registration/login fields | JSON 400 | Returned 400 before DB access | PASS | No registration writes |
| BE-009 | Auth | Successful register/login, duplicate email | Correct token/persistence/conflict | Not run | BLOCKED | Remote mutation and credentials unavailable |
| BE-010 | Auth | Missing/malformed/expired token | 401 | In-memory middleware checks returned 401 | PASS | Expired rejected before DB read |
| BE-011 | Auth | Signed token for nonexistent user | 401 | Mocked user lookup returned 401 | PASS | No user mutation |
| BE-012 | Auth | Valid active account and `/me` | Safe profile | No valid account token supplied | BLOCKED | No credentials |
| BE-013 | Auth | Password hashing and projections | Salted hash; no password response | In-memory scrypt shape and source projections checked | PASS | Persistence not inspected |
| BE-014 | Authorization | Anonymous protected/admin route matrix | 401 | 26 route probes returned 401 | PASS | Local app |
| BE-015 | Authorization | Editor/admin admin-only decision | 403/allowed | In-memory middleware branches passed | PASS | Not positive HTTP auth |
| BE-016 | Authorization | Positive editor/admin protected HTTP calls | Role-specific success | Not run | BLOCKED | Credentials unavailable |
| BE-017 | CRUD reads | Ten public resource lists | JSON list + pagination | All ten returned 200 and wrapper | PASS | Read-only remote data |
| BE-018 | Pagination | Pagination math/max | Correct pages; max 100 | Math consistent; limit capped | PASS | Current collection sizes |
| BE-019 | Pagination | Invalid numeric values | Bounded normalization | `abc`, negative, and over-max values stayed bounded | PASS | Existing normalization retained |
| BE-020 | Query security | Object filters/sort; repeated scalar arrays | Reject before Mongoose | Reproduction fixed; probes returned 400 | PASS | Shared CRUD paths |
| BE-021 | Query security | Bracketed operator syntax | Never reach query as operator | Express simple parser ignored bracketed unknown key | PASS | Safe ignore behavior |
| BE-022 | IDs | Malformed/nonexistent IDs | 400/404 JSON | Course, activity, outline, workload checks passed | PASS | Read-only/direct handler |
| BE-023 | Relationships | Department, Program, Faculty detail population | Safe relationship data | Existing details and populated department refs passed | PASS | Course data unavailable |
| BE-024 | CRUD writes | Create/update/delete/duplicate persistence | Expected write behavior | Not run | BLOCKED | No fake remote data |
| BE-025 | Validation | Null/array CRUD and User bodies | 400, not 500 | Reproductions fixed and returned 400 | PASS | Shared helper/handlers |
| BE-026 | Submissions | Null/operator/array status body | 400; valid enum accepted | Invalid bodies 400; mocked valid updates 200 | PASS | No collection writes |
| BE-027 | Relationships | Valid/missing references on writes | Correct validation | Not run | BLOCKED | Requires persisted relationships |
| BE-028 | Teaching Activity | Stored hours override client value | Server calculates product | 1.5 × 12 yielded 18, not supplied 999 | PASS | In-memory schema |
| BE-029 | Teaching Activity | Invalid duration/count/year/period/status | Reject invalid values | All listed invalid fixtures rejected | PASS | In-memory schema |
| BE-030 | Teaching Activity | Persisted CRUD/status integration | Correct stored records | Not run | BLOCKED | Remote mutation safety |
| BE-031 | Workload | Empty faculty, academic filters, status inclusion | Zero totals and correct filter | Read-only empty workload and mocked pipeline passed | PASS | No activities present |
| BE-032 | Workload | Nonzero hours/course grouping/status data | Correct calculated totals | No activity rows available | BLOCKED | Do not fabricate data |
| BE-033 | Course Outlines | Defaults and assessment limit | Valid default; total <=100 | In-memory model checks passed | PASS | Persistence blocked |
| BE-034 | Course Outlines | CRUD/version/visibility persistence | Existing policy preserved | Not run | BLOCKED | No auth/test database |
| BE-035 | Imports | CSV parser/schema validation | Strict parse and allow-list | Quoting, header, row, numeric, UTF-8 checks passed | PASS | Pure helpers/temp files |
| BE-036 | Imports | Upload type/size/name/temp cleanup | Reject unsafe files; clean temp | CSV UUID temp cleanup; `.txt` 400; oversize 413 | PASS | Local middleware harness |
| BE-037 | Imports | Validation mode/history | No target writes; history recorded | Endpoint not run | BLOCKED | History itself mutates DB |
| BE-038 | Imports | Import commit/rollback | Transaction integrity | Not run | BLOCKED | Requires write DB and token |
| BE-039 | Data Sources | Model/controller/config safety | Allow-list and optional backward compat | Prior Phase 6 in-memory/controller checks passed | PASS | Persisted CRUD not claimed |
| BE-040 | Data Sources | Persisted CRUD/duplicate/delete | Correct CRUD and roles | Not run | BLOCKED | Remote DB and credentials |
| BE-041 | Regression | Public lists, protected routes, details | Existing responses remain stable | Read-only API matrix passed | PASS | Does not cover authenticated writes |
| BE-042 | Regression | Authenticated write/import/data-source operations | Existing writes remain functional | Not run | BLOCKED | Safe environment unavailable |
| BE-043 | HTTP security | CORS/deployment policy | Production policy verified | Static localhost origin found | PARTIAL | Deployment origin not available |
| BE-044 | Safety | No remote database mutation | No writes during Phase 8 | Read-only queries and mocked writes only | PASS | No seed/test records |
| BE-045 | Authorization | Notice creator forgery | Server owns `createdBy` | Reproduced before fix; post-fix create/update passed | PASS | Page updater regression passed |
| BE-046 | Error handling | Null status update | Controlled 400 | Reproduced 500; fixed and retested 400 | PASS | Admission and Contact |
| BE-047 | Query security | Generic object filter/sort forwarding | Reject non-scalars | Reproduced and fixed; no model query after fix | PASS | Shared CRUD controller |
| BE-048 | Logging | Unexpected error with synthetic URI/password | No sensitive log/response | Generic JSON 500; log contained only error class | PASS | No real secrets used |
| BE-049 | Security headers | Helmet integration | Security headers present | Local health response confirmed headers | PASS | Installed dependency reused |
| BE-050 | Dependencies | Vulnerability/advisory audit | No known vulnerable dependencies | `npm audit --json`: 0 vulnerabilities across 107 dependencies | PASS | No dependency upgrades performed |
| BE-051 | Test setup | Missing isolated URI or credentials | Refuse before DB connection | Utility exited with a controlled missing-variable error; no connection/write | PASS | No local MongoDB executable or test URI available |
| BE-052 | Test setup | Validate deterministic fixtures in memory | All model validations and expected hour products pass | 24 documents validated; 6 teaching-hour products matched; no database connection/write | PASS | Credentials used only as temporary process values |
