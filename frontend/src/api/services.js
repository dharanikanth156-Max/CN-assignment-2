import apiClient, { API_BASE_URL } from './client';

export const authService = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  getMe: () => apiClient.get('/auth/me'),
};

export const studentService = {
  list: (params) => apiClient.get('/students', { params }),
  create: (data) => apiClient.post('/students', data),
  update: (id, data) => apiClient.put(`/students/${id}`, data),
  delete: (id) => apiClient.delete(`/students/${id}`),
  bulkImport: (formData) => apiClient.post('/students/bulk-import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  exportCsv: (params) => `${API_BASE_URL}/students/export/csv`,
};

export const examService = {
  list: (params) => apiClient.get('/exams', { params }),
  get: (id) => apiClient.get(`/exams/${id}`),
  create: (data) => apiClient.post('/exams', data),
  update: (id, data) => apiClient.put(`/exams/${id}`, data),
  delete: (id) => apiClient.delete(`/exams/${id}`),
  sendSchedule: (id, data) => apiClient.post(`/exams/${id}/send-schedule`, data),
};

export const announcementService = {
  list: (params) => apiClient.get('/announcements', { params }),
  create: (data, sendImmediately = false) => apiClient.post(`/announcements?send_immediately=${sendImmediately}`, data),
  sendNow: (id) => apiClient.post(`/announcements/${id}/send-now`),
  delete: (id) => apiClient.delete(`/announcements/${id}`),
};

export const campaignService = {
  list: (params) => apiClient.get('/campaigns', { params }),
  get: (id) => apiClient.get(`/campaigns/${id}`),
};

export const logService = {
  list: (params) => apiClient.get('/logs', { params }),
  retryFailed: (data) => apiClient.post('/logs/retry-failed', data),
  exportCsvUrl: (params) => {
    const q = new URLSearchParams(params).toString();
    return `${API_BASE_URL}/logs/export/csv${q ? '?' + q : ''}`;
  }
};

export const smtpService = {
  getConfig: () => apiClient.get('/smtp/config'),
  updateConfig: (data) => apiClient.put('/smtp/config', data),
  testConnection: (data) => apiClient.post('/smtp/test-connection', data),
  getMailpitStatus: () => apiClient.get('/smtp/mailpit-status'),
  getInspectorStreamUrl: (params) => {
    const q = new URLSearchParams(params).toString();
    return `${API_BASE_URL}/smtp/inspector/stream${q ? '?' + q : ''}`;
  }
};

export const analyticsService = {
  getOverview: () => apiClient.get('/analytics/overview'),
};

export const testLabService = {
  generateStudents: (data) => apiClient.post('/test-lab/generate-dummy-students', data),
  runBenchmark: (data) => apiClient.post('/test-lab/run-benchmark', data),
  getRuns: () => apiClient.get('/test-lab/runs'),
};

export const auditService = {
  list: (params) => apiClient.get('/audit', { params }),
};

export const unsubscribeService = {
  verify: (token) => apiClient.get(`/unsubscribe?token=${token}`),
  resubscribe: (token) => apiClient.post(`/unsubscribe/resubscribe?token=${token}`),
};
