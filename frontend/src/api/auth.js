import { api } from './client.js'

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials, { auth: false, retries: 0 }),
  register: (account) => api.post('/auth/register', account, { auth: false, retries: 0 }),
  me: () => api.get('/auth/me'),
}