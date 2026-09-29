import { api, toQuery } from './client.js'

const resource = (name) => ({
  list: (filters) => api.get(`/${name}${toQuery(filters)}`),
  get: (id) => api.get(`/${name}/${encodeURIComponent(id)}`),
  create: (body) => api.post(`/${name}`, body),
  patch: (id, body) => api.patch(`/${name}/${encodeURIComponent(id)}`, body),
  put: (id, body) => api.put(`/${name}/${encodeURIComponent(id)}`, body),
  remove: (id) => api.delete(`/${name}/${encodeURIComponent(id)}`),
})

export const noticesApi = resource('notices')
export const eventsApi = resource('events')
export const galleryApi = resource('gallery')
export const pagesApi = resource('pages')

export const usersApi = {
  list: () => api.get('/users'),
  get: (id) => api.get(`/users/${encodeURIComponent(id)}`),
  create: (body) => api.post('/users', body),
  patch: (id, body) => api.patch(`/users/${encodeURIComponent(id)}`, body),
  put: (id, body) => api.put(`/users/${encodeURIComponent(id)}`, body),
  remove: (id) => api.delete(`/users/${encodeURIComponent(id)}`),
}