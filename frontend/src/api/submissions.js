import { api, toQuery } from './client.js'

const submission = (name) => ({
  submit: (body) => api.post(`/${name}`, body, { auth: false, retries: 0 }),
  list: (filters) => api.get(`/${name}${toQuery(filters)}`),
  get: (id) => api.get(`/${name}/${encodeURIComponent(id)}`),
  setStatus: (id, status) => api.patch(`/${name}/${encodeURIComponent(id)}/status`, { status }),
})

export const admissionsApi = submission('admissions')
export const contactApi = submission('contact')