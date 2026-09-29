import { api, toQuery } from './client.js'

const collectionApi = (resource) => ({
  list: (filters) => api.get(`/${resource}${toQuery(filters)}`),
  get: (id) => api.get(`/${resource}/${encodeURIComponent(id)}`),
  create: (body) => api.post(`/${resource}`, body),
  patch: (id, body) => api.patch(`/${resource}/${encodeURIComponent(id)}`, body),
  put: (id, body) => api.put(`/${resource}/${encodeURIComponent(id)}`, body),
  remove: (id) => api.delete(`/${resource}/${encodeURIComponent(id)}`),
})

export const departmentsApi = collectionApi('departments')
export const programsApi = collectionApi('programs')
export const coursesApi = {
  ...collectionApi('courses'),
  list: (filters) => api.get(`/courses${toQuery(filters)}`),
  allocation: (id, filters) => api.get(`/courses/${encodeURIComponent(id)}/allocation${toQuery(filters)}`),
}