# Controller Implementation

## API base

The backend runs on `http://localhost:5000`. JSON endpoints use the `/api` prefix. Authenticated requests use `Authorization: Bearer <token>` or the existing `token` cookie.

## Authentication

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/register` | Public; creates an editor account. Admin role cannot be self-assigned. |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated |

Register body:

```json
{"name":"Editor User","email":"editor@example.com","password":"secret123"}
```

Login response:

```json
{"success":true,"user":{"id":"...","name":"Editor User","email":"editor@example.com","role":"editor","isActive":true},"token":"..."}
```

## Content endpoints

The following resources support `GET /resource`, `GET /resource/:id`, `POST /resource`, `PATCH /resource/:id`, `PUT /resource/:id`, and `DELETE /resource/:id`:

- `/departments`: public reads; editor/admin writes; `headOfDepartment` must reference a faculty document.
- `/programs`: public reads; editor/admin writes; `department` is required and must exist.
- `/faculty`: public reads; editor/admin writes; optional `department` must exist.
- `/notices`: public reads only published notices; editor/admin writes. Categories are `general`, `admission`, `exam`, `result`, `scholarship`, `vacancy`, and `event`.
- `/events`: public reads only published events; editor/admin writes. `startDate` is required and `endDate` cannot precede it.
- `/gallery`: public reads only published galleries; editor/admin writes. `images` must be a non-empty array containing `{ "url": "...", "caption": "..." }` objects.
- `/pages`: public reads only published pages; editor/admin writes.
- `/users`: admin-only management. Passwords are accepted only on create and are never returned.

Example program body:

```json
{"name":"Computer Science","slug":"computer-science","degree":"BSc","department":"<department-id>","duration":"4 years","isActive":true}
```

List endpoints support `page`, `limit` (1-100), `sort`, and relevant schema filters such as `category`, `department`, `status`, `isActive`, and `isPublished`. Responses use `{ "success": true, "data": [...], "pagination": {...} }` for lists.

## Admissions and contact

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/admissions` | Public submission |
| GET | `/api/admissions` | Editor/admin |
| GET | `/api/admissions/:id` | Editor/admin |
| PATCH/PUT | `/api/admissions/:id/status` | Editor/admin |
| POST | `/api/contact` | Public submission |
| GET | `/api/contact` | Editor/admin |
| GET | `/api/contact/:id` | Editor/admin |
| PATCH/PUT | `/api/contact/:id/status` | Editor/admin |

Admission body: `{"fullName":"Applicant Name","email":"applicant@example.com","phone":"+123456789","program":"<program-id>","message":"Please contact me."}`

Contact body: `{"name":"Visitor","email":"visitor@example.com","phone":"+123456789","subject":"Question","message":"Please reply."}`

Admission statuses are `new`, `contacted`, `processing`, `approved`, and `rejected`. Contact statuses are `unread`, `read`, and `replied`. The schemas do not contain submitter ownership fields, so submitted records are restricted to editor/admin retrieval and cannot be filtered to an individual submitter.

## Validation and errors

Required fields, trimmed empty strings, email format, ObjectId references, enum values, date values, date ordering, gallery image structure, and duplicate unique fields are validated. Password hashes and internal auth fields are excluded from user responses.

Errors use this shape:

```json
{"success":false,"message":"Invalid request data.","details":{"field":"Reason"}}
```

HTTP status conventions are `201` for creation, `200` for successful reads/updates/deletes, `400` for invalid input, `401` for missing/invalid authentication, `403` for insufficient role or unpublished-resource bypass attempts, `404` for missing records, and `409` for duplicate unique values.

## Remaining backend work

No automated test suite exists in the current package. Production deployment should provide a strong `JWT_SECRET`, configure CORS from an environment variable, and add integration tests against a test MongoDB database. File upload handling is not part of the existing schemas; image and attachment fields currently accept stored URL/string values.
