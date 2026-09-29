import { api, toQuery } from './client.js'

export const dataSourcesApi = {
  list: (filters) => api.get(`/data-sources${toQuery(filters)}`),
  get: (id) => api.get(`/data-sources/${encodeURIComponent(id)}`),
  create: (body) => api.post('/data-sources', body),
  patch: (id, body) => api.patch(`/data-sources/${encodeURIComponent(id)}`, body),
  put: (id, body) => api.put(`/data-sources/${encodeURIComponent(id)}`, body),
  remove: (id) => api.delete(`/data-sources/${encodeURIComponent(id)}`),
}