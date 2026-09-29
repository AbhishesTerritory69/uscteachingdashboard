# Backend API Testing Report

**Report date:** 2026-09-27  
**Result:** Partial backend validation; two defects found and fixed during this run.

## 1. Project Information

| Item | Observed value |
| --- | --- |
| Project | Campus Site / College Website API |
| Application | Backend REST API; the supplied Book Reading Platform description does not match this repository |
| Runtime | Node.js v24.13.0; npm 11.9.0 |
| Framework/database | Express 5.2.1; Mongoose 9.10.0; MongoDB |
| Architecture | Express routes, middleware, controllers, Mongoose models |
| Test environment | Windows 10 (OS reported as 10.0.26200); local API with configured remote Atlas MongoDB |
| API base URL | `http://localhost:5000` |
| Tools | Node built-in `fetch`, PowerShell, `node --check`, npm; Postman version not verified |
| Test data | Existing data was read only; no records were created, changed, or deleted |

The `.env` file defines `PORT`, `MONGO_URI`, `JWT_SECRET`, and `NODE_ENV`. Values are intentionally omitted. MongoDB connected to a remote Atlas host; its URI and hostname are not included.

## 2. Testing Scope

This testing phase covers the backend only. Frontend testing is excluded because frontend development has not yet been completed.

Testing followed the actual campus CMS/API source, not the attached reading-platform feature list. No books, children, student-child relationships, parental controls, or reading-session endpoints/models exist in this repository. API requests were issued locally with Node's HTTP client, not Postman. No Postman collection was found in the inspected workspace. No mutating API calls were made because the configured database is remote and no isolated test database or authorized test account was provided.

## 3. Backend Architecture

The source uses the following request path:

```text
Client / HTTP test client
          |
          v
  Express app and routes
          |
          v
 Authentication / role middleware
          |
          v
      Controllers
          |
          v
 Mongoose models and queries
          |
          v
       MongoDB
```

- **Model:** Mongoose schemas define documents, references, defaults, enums, timestamps, and some required/unique constraints.
- **View:** No frontend/view layer is present in the backend being tested. REST JSON responses are the interface for future clients.
- **Controller:** Auth, CRUD, resource-specific, and submission controllers process requests and database operations.
- **Routes:** `authRoutes.js` and `resourceRoutes.js` register methods, paths, middleware, and controller handlers.
- **Middleware:** `protect` verifies bearer tokens or the `token` cookie; `authorize` checks roles. JSON parsing, URL-encoded parsing, cookies, and CORS are configured in `app.js`. There is no separate validation, centralized error, or service directory in the inspected tree; JSON 404/error handling was added during this run.

## 4. Testing Methodology

The backend was started using the package's `npm start` script. The run verified startup, MongoDB connection, API reachability, safe public reads, authentication rejection, validation/error responses, malformed and expired token rejection, ObjectId handling, and response content types. Source review covered route policy, password handling, models, whitelisted controller fields, and environment-variable names.

Only non-mutating requests were executed. Database writes, authenticated role tests, Postman runs, full faculty update regression, and direct database verification were not performed. The counts below distinguish executed checks from coverage gaps; the pass rate applies only to completed test records, not to complete feature coverage.

## 5. Environment

| Check | Result / evidence |
| --- | --- |
| Server command | `npm start` (`node server.js`) |
| Server startup | PASS; logged `Server running on http://localhost:5000` |
| Database connection | PASS; Mongoose logged a successful connection to Atlas (host redacted) |
| API root | PASS; `GET /` returned HTTP 200 JSON with `success: true` |
| Node / npm | Node v24.13.0 / npm 11.9.0 |
| Express / Mongoose | 5.2.1 / 9.10.0 |
| Environment file | Present; required key names exist; secret values not read into the report |
| Postman | NOT TESTED; Postman was not used and its installed version was not verified |
| Automated tests | NOT TESTED; no suite is configured. `npm test` is the default placeholder and exits 1 with `Error: no test specified` |

## 6. API Inventory

All paths below are mounted under `/api`, except `/` and `/api/health`. `PATCH` and `PUT` are separate registered verbs where both are listed. The CMS collection pattern is repeated for departments, programs, faculty, notices, events, gallery, pages, and users.

| ID | Module | Method | Endpoint | Auth required | Purpose |
| --- | --- | --- | --- | --- | --- |
| API-001 | Auth | POST | `/api/auth/register` | No | Register editor account |
| API-002 | Auth | POST | `/api/auth/login` | No | Authenticate and issue token |
| API-003 | Auth | GET | `/api/auth/me` | Yes | Return current user |
| API-004 | Departments | GET | `/api/departments` | No | List departments |
| API-005 | Departments | GET | `/api/departments/:id` | No | Get department |
| API-006 | Departments | POST | `/api/departments` | Editor/admin | Create department |
| API-007 | Departments | PATCH, PUT | `/api/departments/:id` | Editor/admin | Update department |
| API-008 | Departments | DELETE | `/api/departments/:id` | Editor/admin | Delete department |
| API-009 | Programs | GET | `/api/programs` | No | List programs |
| API-010 | Programs | GET | `/api/programs/:id` | No | Get program |
| API-011 | Programs | POST | `/api/programs` | Editor/admin | Create program |
| API-012 | Programs | PATCH, PUT | `/api/programs/:id` | Editor/admin | Update program |
| API-013 | Programs | DELETE | `/api/programs/:id` | Editor/admin | Delete program |
| API-014 | Faculty | GET | `/api/faculty` | No | List faculty |
| API-015 | Faculty | GET | `/api/faculty/:id` | No | Get faculty member |
| API-016 | Faculty | POST | `/api/faculty` | Editor/admin | Create faculty member |
| API-017 | Faculty | PATCH, PUT | `/api/faculty/:id` | Editor/admin | Update faculty member |
| API-018 | Faculty | DELETE | `/api/faculty/:id` | Editor/admin | Delete faculty member |
| API-019 | Notices | GET | `/api/notices` | No | List published notices publicly |
| API-020 | Notices | GET | `/api/notices/:id` | No | Get notice |
| API-021 | Notices | POST | `/api/notices` | Editor/admin | Create notice |
| API-022 | Notices | PATCH, PUT | `/api/notices/:id` | Editor/admin | Update notice |
| API-023 | Notices | DELETE | `/api/notices/:id` | Editor/admin | Delete notice |
| API-024 | Events | GET | `/api/events` | No | List published events publicly |
| API-025 | Events | GET | `/api/events/:id` | No | Get event |
| API-026 | Events | POST | `/api/events` | Editor/admin | Create event |
| API-027 | Events | PATCH, PUT | `/api/events/:id` | Editor/admin | Update event |
| API-028 | Events | DELETE | `/api/events/:id` | Editor/admin | Delete event |
| API-029 | Gallery | GET | `/api/gallery` | No | List published galleries publicly |
| API-030 | Gallery | GET | `/api/gallery/:id` | No | Get gallery |
| API-031 | Gallery | POST | `/api/gallery` | Editor/admin | Create gallery |
| API-032 | Gallery | PATCH, PUT | `/api/gallery/:id` | Editor/admin | Update gallery |
| API-033 | Gallery | DELETE | `/api/gallery/:id` | Editor/admin | Delete gallery |
| API-034 | Pages | GET | `/api/pages` | No | List published pages |
| API-035 | Pages | GET | `/api/pages/:id` | No | Get page |
| API-036 | Pages | POST | `/api/pages` | Editor/admin | Create page |
| API-037 | Pages | PATCH, PUT | `/api/pages/:id` | Editor/admin | Update page |
| API-038 | Pages | DELETE | `/api/pages/:id` | Editor/admin | Delete page |
| API-039 | Users | GET | `/api/users` | Admin | List users |
| API-040 | Users | GET | `/api/users/:id` | Admin | Get user |
| API-041 | Users | POST | `/api/users` | Admin | Create user |
| API-042 | Users | PATCH, PUT | `/api/users/:id` | Admin | Update user |
| API-043 | Users | DELETE | `/api/users/:id` | Admin | Delete user |
| API-044 | Admissions | POST | `/api/admissions` | No | Submit admission inquiry |
| API-045 | Admissions | GET | `/api/admissions` | Editor/admin | List submissions |
| API-046 | Admissions | GET | `/api/admissions/:id` | Editor/admin | Get submission |
| API-047 | Admissions | PATCH, PUT | `/api/admissions/:id/status` | Editor/admin | Change status |
| API-048 | Contact | POST | `/api/contact` | No | Submit contact message |
| API-049 | Contact | GET | `/api/contact` | Editor/admin | List messages |
| API-050 | Contact | GET | `/api/contact/:id` | Editor/admin | Get message |
| API-051 | Contact | PATCH, PUT | `/api/contact/:id/status` | Editor/admin | Change status |
| API-052 | System | GET | `/` | No | API root status |
| API-053 | System | GET | `/api/health` | No | Basic server health |

No admin dashboard/test endpoint, logout endpoint, books, children, parental-control, or reading-session route was found.

## 7. Authentication Testing

| Test ID | Request / case | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| AUTH-001 | POST register with missing fields | Controlled 400 JSON | HTTP 400; `Required fields are missing.` | PASS |
| AUTH-002 | POST register with invalid email | Controlled 400 JSON | HTTP 400; `A valid email address is required.` | PASS |
| AUTH-003 | POST register with short password | Controlled 400 JSON | HTTP 400; minimum-length message | PASS |
| AUTH-004 | POST login with missing fields | Controlled 400 JSON | HTTP 400; credentials required | PASS |
| AUTH-005 | POST login with invalid email | Controlled 400 JSON | HTTP 400; valid email required | PASS |
| AUTH-006 | POST login with random nonexistent email | Authentication rejected | HTTP 401; generic invalid email/password message | PASS |
| AUTH-007 | GET `/api/auth/me` without token | Authentication rejected | HTTP 401 JSON | PASS |
| AUTH-008 | GET me with malformed token | Authentication rejected | HTTP 401 JSON | PASS |
| AUTH-009 | GET me with invalid-signature token | Authentication rejected | HTTP 401 JSON | PASS |
| AUTH-010 | GET me with correctly signed expired token | Authentication rejected | HTTP 401; `Invalid or expired token.` | PASS |
| AUTH-011 | Successful registration/login and password persistence | Verify created account and stored hash | Not run; would mutate remote database | BLOCKED |
| AUTH-012 | Successful `/me` with active valid account | Return safe user profile | No test credential supplied | BLOCKED |
| AUTH-013 | Duplicate registration/email behavior | HTTP 409 and DB unchanged | Not run; would mutate remote database | BLOCKED |
| AUTH-014 | Logout/token invalidation | No logout route exists | No implemented endpoint | NOT TESTED |

Source review found passwords are hashed with Node `scrypt` using a random salt and excluded from public user projections/auth responses. Secure persistence was not independently queried in MongoDB during this run.

## 8. Authorization Testing

| Test ID | Request / case | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| AUTHZ-001 | Anonymous GET `/api/users` | 401 | Before fix: HTTP 200 and two user records; after fix: HTTP 401 JSON | PASS (regression retest) |
| AUTHZ-002 | Anonymous GET `/api/users/:id` | 401 | HTTP 401 JSON | PASS |
| AUTHZ-003 | Anonymous POST `/api/users` | 401 | HTTP 401 JSON | PASS |
| AUTHZ-004 | Anonymous PATCH `/api/users/:id` | 401 | HTTP 401 JSON | PASS |
| AUTHZ-005 | Anonymous DELETE `/api/users/:id` | 401 | HTTP 401 JSON | PASS |
| AUTHZ-006 | Anonymous POST `/api/faculty` | 401 | HTTP 401 JSON | PASS |
| AUTHZ-007 | Anonymous GET `/api/admissions` | 401 | HTTP 401 JSON | PASS |
| AUTHZ-008 | Valid editor/admin role matrix and cross-user access | Role-appropriate 403/200 | No test accounts/token supplied | BLOCKED |

## 9. Admin API Testing

There is no dedicated `/admin`, dashboard, or admin-test route. Admin-only user management and editor/admin admission/contact management are present. The anonymous admission-list check returned 401 (AUTHZ-007). An authorized admin request and normal authenticated editor-vs-admin matrix were not tested because no authorized test credentials were supplied. Result: **PARTIAL**.

## 10. Faculty API Testing

The request states that prior manual testing reached Update Faculty, but no prior Postman collection/results were present to reproduce. Safe regression checks were performed for reads and unauthenticated writes; update behavior itself was not re-run.

| Test ID | Request / case | Actual | Status |
| --- | --- | --- | --- |
| FAC-001 | GET all faculty, `limit=1` | HTTP 200 JSON; total 2; one returned | PASS |
| FAC-002 | GET one existing faculty ID obtained from public list | HTTP 200 JSON; record returned | PASS |
| FAC-003 | GET malformed ID `invalid-id` | HTTP 400 JSON; invalid resource ID | PASS |
| FAC-004 | GET valid-format absent ID `000000000000000000000000` | HTTP 404 JSON; resource not found | PASS |
| FAC-005 | POST without authentication | HTTP 401 JSON | PASS |
| FAC-006 | Valid create/update/delete and MongoDB state verification | Not run; remote DB mutation is unsafe without isolated test DB | BLOCKED |
| FAC-007 | Partial update, invalid fields, duplicate data, valid-role update regression | Not run; no authorized account and remote DB | BLOCKED |

## 11. Book API Testing

No book model or route exists in the repository. List/create/get/update/archive/activate/deactivate tests are **NOT TESTED — feature not implemented in this backend**.

## 12. Children API Testing

No child model or route exists. Child create/read/update/delete, ownership checks, and related-record tests are **NOT TESTED — feature not implemented in this backend**.

## 13. Child-Student Relationship Testing

No child or student model/route, default student role, or parent/student relationship was found. The relationship is **NOT TESTED — feature not implemented in this backend**; no behavior is inferred from the supplied requirement.

## 14. Parental Control Testing

No parental-control model or route exists. All parental-control cases are **NOT TESTED — feature not implemented in this backend**.

## 15. Reading Session Testing

No reading-session model or route exists. All reading-session cases are **NOT TESTED — feature not implemented in this backend**.

## 16. Health API Testing

| Test ID | Request | Actual | Status |
| --- | --- | --- | --- |
| HEALTH-001 | GET `/api/health` | HTTP 200 JSON; `success: true`, `Server is healthy` | PASS |

This endpoint reports server health only; it does not report MongoDB readiness. Database readiness was separately evidenced by successful startup connection logs.

## 17. Validation Testing

| Test ID | Input | Actual | Status |
| --- | --- | --- | --- |
| VAL-001 | Missing registration fields | HTTP 400 JSON | PASS |
| VAL-002 | Invalid registration/login email | HTTP 400 JSON | PASS |
| VAL-003 | Password shorter than six characters | HTTP 400 JSON | PASS |
| VAL-004 | Missing login credentials | HTTP 400 JSON | PASS |
| VAL-005 | Malformed JSON body to login | Before fix: HTML error; after fix: HTTP 400 JSON, generic message | PASS (regression retest) |
| VAL-006 | Malformed and valid-but-absent faculty ObjectIds | HTTP 400 and HTTP 404 JSON respectively | PASS |
| VAL-007 | Nulls, whitespace, wrong types, extreme lengths, unexpected fields, invalid dates, and all resource-specific validators | Not exhaustively exercised | NOT TESTED |

## 18. Error Handling Testing

| Test ID | Case | Actual | Status |
| --- | --- | --- | --- |
| ERR-001 | Unknown route | Before fix: Express HTML 404; after fix: HTTP 404 JSON `{success:false,message:...}` | PASS (regression retest) |
| ERR-002 | Malformed JSON | Before fix: HTML error and parser stack logged; after fix: HTTP 400 JSON and no parser stack response | PASS (regression retest) |
| ERR-003 | Missing resource with valid-format ID | HTTP 404 JSON | PASS |
| ERR-004 | Duplicate-key, database outage, and unexpected controller exception | Not induced against remote DB | NOT TESTED |

## 19. Database Integrity Testing

MongoDB connected successfully at server startup. Safe list reads confirmed the existence/count of records in departments (1), programs (1), and faculty (2); notices, events, gallery, and pages returned zero. Record contents are omitted.

Direct database inspection, relationship/orphan checks, and verification after create/update/delete/archive operations were not performed. No mutation was issued. Database integrity beyond connectivity and read responses is **BLOCKED — configured MongoDB is remote and no isolated test database was provided**.

## 20. Security Testing

- **Authentication/authorization:** Anonymous requests to protected user, admission, and faculty-write paths were rejected after the fix. Invalid, malformed, and expired tokens were rejected.
- **Passwords:** Source review found salted `scrypt` hashes and exclusion from user response projections. Runtime persistence was not checked.
- **JWT:** Source review found HMAC-SHA256 signing and expiration checks. The implementation has a `development-secret` fallback if `JWT_SECRET` is missing; production must ensure a strong secret is configured and fail startup if absent.
- **User management:** Before the fix, anonymous `/api/users` GET exposed a list. All `/api/users` verbs are now guarded by admin authentication/authorization. Authenticated editor/admin matrix was not tested.
- **Mass assignment:** Controllers select explicit writable fields. User role/active state are writable by user-management handlers, now admin-only. Admin-only behavior with a valid account was not tested.
- **Injection/IDOR:** Source inspection found Mongoose model operations with selected fields and reference checks. No adversarial injection or cross-user IDOR tests were possible because the reading-platform ownership model does not exist and no test account was available.
- **Security headers/deployment:** `helmet` is installed but not mounted in `app.js`; CORS allows a hard-coded localhost origin. Header policy, production CORS, rate limiting, and deployment configuration were not dynamically tested. Configure these before production.
- **Secret exposure:** Environment values, credentials, and tokens were not printed or included in this report.

## 21. Regression Testing

| Defect | Original result | Fix applied | Retest result | Regression result |
| --- | --- | --- | --- | --- |
| Admin user route exposure | Anonymous `GET /api/users` returned HTTP 200 and two records | Applied the admin-only middleware to every `/users` CRUD verb, including list/detail reads | Anonymous GET/list/detail/create/update/delete each returned HTTP 401 JSON | PASS; public faculty list, faculty write guard, and health also retained expected behavior |
| Non-JSON parser/unknown-route errors | Malformed JSON and unknown paths returned Express HTML; malformed JSON emitted a parser stack to logs | Added JSON 404 and terminal error middleware in `app.js` | Malformed JSON returned HTTP 400 JSON; unknown path returned HTTP 404 JSON | PASS; faculty 404 response remains JSON |

The user-referenced faculty update was **not** repeated: no prior test artifact or authorized account was available, and writing to the configured remote database was avoided.

## 22. Bugs / Defects

| Bug ID | Module | Description | Severity | Root cause | Fix | Retest |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | Authorization / Users | Anonymous list access exposed existing user records; other user CRUD routes also lacked the documented admin-only policy | High | Shared CRUD route registration left reads public and used editor/admin for writes | Apply admin-only middleware to all user routes | PASS; all five user verbs tested anonymously returned 401 |
| BUG-002 | API errors | Malformed JSON and unknown routes returned HTML instead of controlled JSON; parser stack was logged | Medium | No terminal 404/error middleware | Added JSON 404 and generic error response handling | PASS; malformed JSON 400 and unknown path 404 returned JSON |

No other runtime defect was confirmed. Static deployment risks are listed under Security Testing/Recommendations rather than represented as reproduced bugs.

## 23. Overall Test Summary

The detailed authentication, authorization, faculty, health, validation, and error tables contain **41 module-level test records**. Some underlying HTTP observations are cross-referenced by more than one module. Of these records, 32 passed, 0 remain failed, 6 are blocked, and 3 are not tested.

| Result | Count |
| --- | ---: |
| Tracked module-level test records | 41 |
| Passed | 32 |
| Failed after fixes | 0 |
| Blocked | 6 |
| Not Tested | 3 |

The pass percentage uses completed cases only: $32 / (32 + 0) \times 100 = 100\%$. This percentage does not imply full endpoint coverage or production readiness. Two pre-fix failures are documented in the regression and defect tables and are not counted as remaining failures.

## 24. Module Summary

The module table may overlap: a single HTTP observation can support more than one module's evidence. Counts reflect actual test records in the sections above; absent product areas are marked not tested, not passed.

| Module | Total | Passed | Failed | Blocked | Not Tested |
| --- | ---: | ---: | ---: | ---: | ---: |
| Environment / database connection | 3 | 3 | 0 | 0 | 0 |
| Authentication | 14 | 10 | 0 | 3 | 1 |
| Authorization | 8 | 7 | 0 | 1 | 0 |
| Admin | 2 | 1 | 0 | 1 | 0 |
| Faculty | 7 | 5 | 0 | 2 | 0 |
| Books | 1 | 0 | 0 | 0 | 1 |
| Children | 1 | 0 | 0 | 0 | 1 |
| Child-student relationship | 1 | 0 | 0 | 0 | 1 |
| Parental controls | 1 | 0 | 0 | 0 | 1 |
| Reading sessions | 1 | 0 | 0 | 0 | 1 |
| Validation | 7 | 6 | 0 | 0 | 1 |
| Error handling | 4 | 3 | 0 | 0 | 1 |
| Security | 4 | 3 | 0 | 1 | 0 |
| Database integrity | 1 | 0 | 0 | 1 | 0 |

## 25. Known Limitations

- The repository implements a college website CMS, not the specified Book Reading Platform.
- The configured database is remote. Only safe reads were sent; write-path tests and post-mutation database checks were withheld.
- No authorized admin/editor test account was provided, so successful auth, role matrix, and authorized CRUD behavior remain unverified.
- Postman was not used; no Postman collection was found in the inspected workspace.
- No automated test suite is configured; `npm test` is a placeholder.
- Health reports server status, not database readiness.
- Database relationships and integrity were not directly inspected.
- The faculty Update operation mentioned as the prior manual checkpoint could not be repeated safely.

## 26. Recommendations

1. Add an isolated MongoDB test database and disposable admin/editor fixtures; run integration tests for positive and negative CRUD cases, database persistence, references, and cleanup.
2. Add a real test script using the existing project conventions and cover auth, role authorization, ObjectId handling, and error responses.
3. Remove the development JWT secret fallback and require a strong production `JWT_SECRET` at startup.
4. Enable Helmet and configure CORS from deployment environment settings rather than a fixed localhost origin; consider rate limits on authentication and public submissions.
5. Add a documented Postman collection/environment only with placeholders, never real credentials or tokens.
6. If the reading-platform requirements remain in scope, implement and test those backend models/routes separately; none are present today.

## 27. Final Conclusion

The server started successfully, connected to MongoDB, and returned reachable JSON API responses. Safe checks passed after two reproduced defects were fixed: admin-only user management was exposed, and malformed/unknown requests returned HTML errors. Public CMS reads and faculty ID handling passed their limited checks.

This is a partial backend validation, not a complete API certification. Authenticated CRUD, successful registration/login persistence, faculty update regression, mutations, and database integrity remain blocked by the remote database safety constraint and missing test credentials. The requested books/children/parental-control/reading-session functionality is absent. Backend readiness for a next development phase is reasonable for continued local development, but production readiness and reading-platform readiness are not established.

## Terminal Summary

```text
========================================
BACKEND TESTING COMPLETE
========================================

Environment: PASS
Database: PASS (connection only)
Authentication: PARTIAL
Authorization: PARTIAL
Admin: PARTIAL
Faculty: PARTIAL
Books: NOT TESTED
Children: NOT TESTED
Child-Student Relationship: NOT TESTED
Parental Controls: NOT TESTED
Reading Sessions: NOT TESTED
Validation: PARTIAL
Error Handling: PARTIAL
Security: PARTIAL
Database Integrity: BLOCKED

Total Tests: 41 tracked module-level records
Passed: 32
Failed: 0 after fixes
Blocked: 6
Not Tested: 3

Pass Percentage: 100% of completed test records only

Critical Bugs: 0
High Bugs: 1 (fixed)
Medium Bugs: 1 (fixed)
Low Bugs: 0

Fixed Bugs: 2
Remaining Issues: No safe mutation/authorized-role/database-integrity coverage; requested reading-platform APIs absent; no automated suite or Postman execution.

Report: BACKEND_API_TESTING_REPORT.md
========================================
```