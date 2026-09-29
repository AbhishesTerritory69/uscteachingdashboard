import { api, toQuery } from './client.js'

export const facultyApi = {
  list: (filters) => api.get(`/faculty${toQuery(filters)}`),
  get: (id) => api.get(`/faculty/${encodeURIComponent(id)}`),
  create: (body) => api.post('/faculty', body),
  patch: (id, body) => api.patch(`/faculty/${encodeURIComponent(id)}`, body),
  put: (id, body) => api.put(`/faculty/${encodeURIComponent(id)}`, body),
  remove: (id) => api.delete(`/faculty/${encodeURIComponent(id)}`),
  workload: (id, filters) => api.get(`/faculty/${encodeURIComponent(id)}/workload${toQuery(filters)}`),
}