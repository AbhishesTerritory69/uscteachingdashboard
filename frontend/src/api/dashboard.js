import { api, toQuery } from './client.js'

export const dashboardApi = {
  summary: (filters) => api.get(`/dashboard/summary${toQuery(filters)}`),
  workload: (filters) => api.get(`/dashboard/workload${toQuery(filters)}`),
  departments: (filters) => api.get(`/dashboard/departments${toQuery(filters)}`),
  alerts: (filters) => api.get(`/dashboard/alerts${toQuery(filters)}`),
}