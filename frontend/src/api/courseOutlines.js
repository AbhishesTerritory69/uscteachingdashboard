import { api, toQuery } from './client.js'

export const courseOutlinesApi = {
  list: (filters) => api.get(`/course-outlines${toQuery(filters)}`),
  get: (id) => api.get(`/course-outlines/${encodeURIComponent(id)}`),
  forCourse: (id, filters) => api.get(`/courses/${encodeURIComponent(id)}/outline${toQuery(filters)}`),
  create: (body) => api.post('/course-outlines', body),
  patch: (id, body) => api.patch(`/course-outlines/${encodeURIComponent(id)}`, body),
  put: (id, body) => api.put(`/course-outlines/${encodeURIComponent(id)}`, body),
  remove: (id) => api.delete(`/course-outlines/${encodeURIComponent(id)}`),
}