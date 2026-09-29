import { api, toQuery } from './client.js'

const upload = (path, file, type, dataSource) => {
  const body = new FormData()
  body.set('type', type)
  body.set('mode', path.endsWith('/validate') ? 'validate' : 'import')
  if (dataSource) body.set('dataSource', dataSource)
  body.set('file', file)
  return api.post(path, body)
}

export const importsApi = {
  validate: (file, type, dataSource) => upload('/imports/validate', file, type, dataSource),
  execute: (file, type, dataSource) => upload('/imports', file, type, dataSource),
  list: (filters) => api.get(`/imports${toQuery(filters)}`),
  get: (id) => api.get(`/imports/${encodeURIComponent(id)}`),
  errors: (id, filters) => api.get(`/imports/${encodeURIComponent(id)}/errors${toQuery(filters)}`),
  remove: (id) => api.delete(`/imports/${encodeURIComponent(id)}`),
}