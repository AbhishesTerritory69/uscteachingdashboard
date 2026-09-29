import { api, toQuery } from './client.js'

export const teachingActivitiesApi = {
  list: (filters) => api.get(`/teaching-activities${toQuery(filters)}`),
  get: (id) => api.get(`/teaching-activities/${encodeURIComponent(id)}`),
  forFaculty: (id, filters) => api.get(`/teaching-activities/faculty/${encodeURIComponent(id)}${toQuery(filters)}`),
  forCourse: (id, filters) => api.get(`/teaching-activities/course/${encodeURIComponent(id)}${toQuery(filters)}`),
  create: (body) => api.post('/teaching-activities', body),
  patch: (id, body) => api.patch(`/teaching-activities/${encodeURIComponent(id)}`, body),
  put: (id, body) => api.put(`/teaching-activities/${encodeURIComponent(id)}`, body),
  remove: (id) => api.delete(`/teaching-activities/${encodeURIComponent(id)}`),
}