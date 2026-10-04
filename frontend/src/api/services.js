import apiClient, { API_BASE_URL } from './client';

const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

// In-memory mock database for GitHub Pages live static preview
let mockStudents = [
  { id: 1, roll_no: "CS2023-001", name: "Alex Mercer", email: "alex.mercer@apex.edu", department: "CS", year: 4, subscribed: true, created_at: new Date().toISOString() },
  { id: 2, roll_no: "CS2023-002", name: "Elena Rostova", email: "elena.rostova@apex.edu", department: "CS", year: 4, subscribed: true, created_at: new Date().toISOString() },
  { id: 3, roll_no: "CS2023-003", name: "Liam Chen", email: "liam.chen@apex.edu", department: "CS", year: 4, subscribed: true, created_at: new Date().toISOString() },
  { id: 4, roll_no: "ECE2024-001", name: "Maya Lin", email: "maya.lin@apex.edu", department: "ECE", year: 3, subscribed: true, created_at: new Date().toISOString() },
  { id: 5, roll_no: "MECH2025-001", name: "Lucas Scott", email: "lucas.scott@apex.edu", department: "MECH", year: 2, subscribed: true, created_at: new Date().toISOString() },
  { id: 6, roll_no: "MBA2026-001", name: "Vikram Reddy", email: "vikram.reddy@apex.edu", department: "MBA", year: 1, subscribed: true, created_at: new Date().toISOString() },
];

let mockExams = [
  { id: 1, course_name: "Distributed Systems & Cloud Architecture", course_code: "CS401", date_time: new Date(Date.now() + 7 * 86400000).toISOString(), venue: "Auditorium Hall A", duration_minutes: 180, department: "CS", year: 4, instructions: "Scientific calculator allowed." },
  { id: 2, course_name: "Digital Signal Processing", course_code: "ECE302", date_time: new Date(Date.now() + 86400000).toISOString(), venue: "Seminar Hall 2", duration_minutes: 180, department: "ECE", year: 3, instructions: "Graph sheets provided." },
  { id: 3, course_name: "Thermodynamics & Heat Transfer", course_code: "MECH201", date_time: new Date(Date.now() + 2 * 3600000).toISOString(), venue: "Design Center", duration_minutes: 120, department: "MECH", year: 2, instructions: "Steam tables permitted." }
];

let mockAnnouncements = [
  { id: 1, title: "End-Semester Hall Tickets Download Window Open", body_text: "All students are advised to download and print their End-Semester Hall Tickets from the student portal before Friday.", body_html: "<p>All students are advised to download and print their <strong>End-Semester Hall Tickets</strong>.</p>", priority: "urgent", target_type: "all", status: "sent", created_at: new Date().toISOString() },
  { id: 2, title: "Guest Lecture on Fault-Tolerant SMTP Systems", body_text: "The CS Department invites all students to a masterclass on high-throughput SMTP architectures.", body_html: "<p>The CS Department invites all students to a masterclass on high-throughput SMTP architectures.</p>", priority: "normal", target_type: "department", target_filter: "CS", status: "draft", created_at: new Date().toISOString() }
];

let mockCampaigns = [
  { id: 101, name: "Exam Schedule: CS401 - Distributed Systems", type: "exam_schedule", status: "completed", total_recipients: 120, sent_count: 120, failed_count: 0, retry_count: 0, duration_ms: 1172.4, avg_latency_ms: 9.7, throughput_eps: 102.35, created_at: new Date().toISOString() }
];

let mockLogs = [
  { id: 1, campaign_id: 101, recipient_name: "Alex Mercer", recipient_email: "alex.mercer@apex.edu", subject: "Official Exam Schedule: CS401", status: "sent", retry_count: 0, latency_ms: 9.4, sent_at: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 2, campaign_id: 101, recipient_name: "Elena Rostova", recipient_email: "elena.rostova@apex.edu", subject: "Official Exam Schedule: CS401", status: "sent", retry_count: 0, latency_ms: 9.8, sent_at: new Date().toISOString(), created_at: new Date().toISOString() }
];

let mockTestRuns = [
  { id: 1, run_name: "200-Recipient Batch Benchmark", recipient_count: 200, batch_size: 25, reuse_connection: true, simulate_failure_rate: 0.0, total_time_ms: 1954.1, throughput_eps: 102.35, avg_latency_ms: 9.72, success_count: 200, fail_count: 0, retry_count: 0, created_at: new Date().toISOString() },
  { id: 2, run_name: "50-Recipient Per-Message Connection", recipient_count: 50, batch_size: 1, reuse_connection: false, simulate_failure_rate: 0.0, total_time_ms: 1145.0, throughput_eps: 43.67, avg_latency_ms: 22.90, success_count: 50, fail_count: 0, retry_count: 0, created_at: new Date().toISOString() }
];

const mockWrapper = async (fn, mockFallback) => {
  if (isGitHubPages) {
    return { data: await mockFallback() };
  }
  try {
    return await fn();
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return { data: await mockFallback() };
    }
    throw err;
  }
};

export const authService = {
  login: (email, password) => mockWrapper(
    () => apiClient.post('/auth/login', { email, password }),
    () => ({
      access_token: "mock-jwt-token-gh-pages",
      token_type: "bearer",
      user_name: "Prof. Sarah Jenkins (Dean of Exams)",
      user_email: email,
      user_role: "admin"
    })
  ),
  getMe: () => mockWrapper(
    () => apiClient.get('/auth/me'),
    () => ({ id: 1, email: "admin@college.edu", name: "Prof. Sarah Jenkins", role: "admin", is_active: true })
  ),
};

export const studentService = {
  list: (params) => mockWrapper(
    () => apiClient.get('/students', { params }),
    () => {
      let filtered = [...mockStudents];
      if (params?.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(st => st.name.toLowerCase().includes(s) || st.email.toLowerCase().includes(s) || st.roll_no.toLowerCase().includes(s));
      }
      if (params?.department && params.department !== 'ALL') {
        filtered = filtered.filter(st => st.department === params.department);
      }
      return { items: filtered, total: filtered.length, page: 1, limit: 50, pages: 1 };
    }
  ),
  create: (data) => mockWrapper(
    () => apiClient.post('/students', data),
    () => {
      const newS = { id: Date.now(), ...data, created_at: new Date().toISOString() };
      mockStudents.unshift(newS);
      return newS;
    }
  ),
  update: (id, data) => mockWrapper(
    () => apiClient.put(`/students/${id}`, data),
    () => {
      const idx = mockStudents.findIndex(s => s.id === id);
      if (idx !== -1) mockStudents[idx] = { ...mockStudents[idx], ...data };
      return mockStudents[idx];
    }
  ),
  delete: (id) => mockWrapper(
    () => apiClient.delete(`/students/${id}`),
    () => {
      mockStudents = mockStudents.filter(s => s.id !== id);
      return { success: true };
    }
  ),
  bulkImport: (formData) => mockWrapper(
    () => apiClient.post('/students/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    () => ({ total_processed: 5, imported_count: 5, duplicate_count: 0, invalid_count: 0, errors: [] })
  ),
  exportCsv: (params) => `${API_BASE_URL}/students/export/csv`,
};

export const examService = {
  list: (params) => mockWrapper(
    () => apiClient.get('/exams', { params }),
    () => ({ items: mockExams, total: mockExams.length, page: 1, limit: 50, pages: 1 })
  ),
  get: (id) => mockWrapper(
    () => apiClient.get(`/exams/${id}`),
    () => mockExams.find(e => e.id === id) || mockExams[0]
  ),
  create: (data) => mockWrapper(
    () => apiClient.post('/exams', data),
    () => {
      const newE = { id: Date.now(), ...data, created_at: new Date().toISOString() };
      mockExams.unshift(newE);
      return newE;
    }
  ),
  update: (id, data) => mockWrapper(
    () => apiClient.put(`/exams/${id}`, data),
    () => {
      const idx = mockExams.findIndex(e => e.id === id);
      if (idx !== -1) mockExams[idx] = { ...mockExams[idx], ...data };
      return mockExams[idx];
    }
  ),
  delete: (id) => mockWrapper(
    () => apiClient.delete(`/exams/${id}`),
    () => {
      mockExams = mockExams.filter(e => e.id !== id);
      return { success: true };
    }
  ),
  sendSchedule: (id, data) => mockWrapper(
    () => apiClient.post(`/exams/${id}/send-schedule`, data),
    () => {
      const exam = mockExams.find(e => e.id === id) || mockExams[0];
      const newCamp = {
        id: Date.now(),
        name: `Exam Schedule: ${exam.course_code} - ${exam.course_name}`,
        type: "exam_schedule",
        status: "completed",
        total_recipients: 50,
        sent_count: 50,
        failed_count: 0,
        retry_count: 0,
        duration_ms: 489.2,
        avg_latency_ms: 9.7,
        throughput_eps: 102.2,
        created_at: new Date().toISOString()
      };
      mockCampaigns.unshift(newCamp);
      return { success: true, message: "Campaign dispatched!", campaign_id: newCamp.id };
    }
  ),
};

export const announcementService = {
  list: (params) => mockWrapper(
    () => apiClient.get('/announcements', { params }),
    () => ({ items: mockAnnouncements, total: mockAnnouncements.length, page: 1, limit: 50, pages: 1 })
  ),
  create: (data, sendImmediately = false) => mockWrapper(
    () => apiClient.post(`/announcements?send_immediately=${sendImmediately}`, data),
    () => {
      const newA = { id: Date.now(), ...data, status: sendImmediately ? "sent" : "scheduled", created_at: new Date().toISOString() };
      mockAnnouncements.unshift(newA);
      return newA;
    }
  ),
  sendNow: (id) => mockWrapper(
    () => apiClient.post(`/announcements/${id}/send-now`),
    () => ({ success: true, campaign_id: Date.now() })
  ),
  delete: (id) => mockWrapper(
    () => apiClient.delete(`/announcements/${id}`),
    () => {
      mockAnnouncements = mockAnnouncements.filter(a => a.id !== id);
      return { success: true };
    }
  ),
};

export const campaignService = {
  list: (params) => mockWrapper(
    () => apiClient.get('/campaigns', { params }),
    () => ({ items: mockCampaigns, total: mockCampaigns.length, page: 1, limit: 50, pages: 1 })
  ),
  get: (id) => mockWrapper(
    () => apiClient.get(`/campaigns/${id}`),
    () => mockCampaigns.find(c => c.id === id) || mockCampaigns[0]
  ),
};

export const logService = {
  list: (params) => mockWrapper(
    () => apiClient.get('/logs', { params }),
    () => ({ items: mockLogs, total: mockLogs.length, page: 1, limit: 50, pages: 1 })
  ),
  retryFailed: (data) => mockWrapper(
    () => apiClient.post('/logs/retry-failed', data),
    () => ({ success: true, message: "Retried failed deliveries", retried_count: 0 })
  ),
  exportCsvUrl: (params) => `${API_BASE_URL}/logs/export/csv`,
};

export const smtpService = {
  getConfig: () => mockWrapper(
    () => apiClient.get('/smtp/config'),
    () => ({ id: 1, host: "127.0.0.1", port: 1025, security: "none", username: "", password_set: true, sender_name: "Apex University Academic Office", sender_email: "notifications@apex.edu", is_active: true, updated_at: new Date().toISOString() })
  ),
  updateConfig: (data) => mockWrapper(
    () => apiClient.put('/smtp/config', data),
    () => ({ id: 1, ...data, password_set: true, is_active: true, updated_at: new Date().toISOString() })
  ),
  testConnection: (data) => mockWrapper(
    () => apiClient.post('/smtp/test-connection', data),
    () => ({ success: true, message: "SMTP Handshake & Probe successful! Test message delivered.", latency_ms: 12.4, transcript: [] })
  ),
  getMailpitStatus: () => mockWrapper(
    () => apiClient.get('/smtp/mailpit-status'),
    () => ({ available: true, web_url: "http://localhost:8025", messages_count: 24 })
  ),
  getInspectorStreamUrl: (params) => {
    const q = new URLSearchParams(params).toString();
    return `${API_BASE_URL}/smtp/inspector/stream${q ? '?' + q : ''}`;
  }
};

export const analyticsService = {
  getOverview: () => mockWrapper(
    () => apiClient.get('/analytics/overview'),
    () => ({
      total_students: mockStudents.length + 150,
      subscribed_students: mockStudents.length + 142,
      total_exams: mockExams.length,
      emails_sent_today: 320,
      total_sent: 1840,
      total_failed: 12,
      overall_success_rate: 99.4,
      upcoming_exams_count: mockExams.length,
      recent_sends_chart: [
        { date: "Sep 28", sent: 120, failed: 2 },
        { date: "Sep 29", sent: 240, failed: 0 },
        { date: "Sep 30", sent: 180, failed: 1 },
        { date: "Oct 01", sent: 310, failed: 3 },
        { date: "Oct 02", sent: 420, failed: 2 },
        { date: "Oct 03", sent: 290, failed: 1 },
        { date: "Oct 04", sent: 320, failed: 0 }
      ],
      department_distribution: [
        { name: "CS", count: 85 },
        { name: "ECE", count: 42 },
        { name: "MECH", count: 35 },
        { name: "CIVIL", count: 28 },
        { name: "MBA", count: 20 }
      ]
    })
  ),
};

export const testLabService = {
  generateStudents: (data) => mockWrapper(
    () => apiClient.post('/test-lab/generate-dummy-students', data),
    () => {
      const count = data.count || 50;
      for (let i = 0; i < Math.min(count, 20); i++) {
        const num = Math.floor(1000 + Math.random() * 9000);
        mockStudents.unshift({
          id: Date.now() + i,
          roll_no: `CS2026-${num}`,
          name: `Student ${num}`,
          email: `student.${num}@apex.edu`,
          department: data.department || "CS",
          year: 3,
          subscribed: true,
          created_at: new Date().toISOString()
        });
      }
      return { success: true, message: `Successfully generated ${count} dummy students!`, generated_count: count };
    }
  ),
  runBenchmark: (data) => mockWrapper(
    () => apiClient.post('/test-lab/run-benchmark', data),
    () => {
      const newRun = {
        id: mockTestRuns.length + 1,
        run_name: data.run_name || "Benchmark Run",
        recipient_count: data.recipient_count || 50,
        batch_size: data.batch_size || 25,
        reuse_connection: data.reuse_connection !== false,
        simulate_failure_rate: data.simulate_failure_rate || 0.0,
        total_time_ms: data.reuse_connection !== false ? 492.5 : 1180.2,
        throughput_eps: data.reuse_connection !== false ? 101.52 : 42.36,
        avg_latency_ms: data.reuse_connection !== false ? 9.85 : 23.6,
        success_count: Math.round((data.recipient_count || 50) * (1 - (data.simulate_failure_rate || 0))),
        fail_count: Math.round((data.recipient_count || 50) * (data.simulate_failure_rate || 0)),
        retry_count: (data.simulate_failure_rate || 0) > 0 ? 6 : 0,
        created_at: new Date().toISOString()
      };
      mockTestRuns.unshift(newRun);
      return newRun;
    }
  ),
  getRuns: () => mockWrapper(
    () => apiClient.get('/test-lab/runs'),
    () => mockTestRuns
  ),
};

export const auditService = {
  list: (params) => mockWrapper(
    () => apiClient.get('/audit', { params }),
    () => ({
      items: [
        { id: 1, user_email: "admin@college.edu", action: "LOGIN", target_resource: "AUTH", details: "Admin user logged in", ip_address: "127.0.0.1", timestamp: new Date().toISOString() },
        { id: 2, user_email: "admin@college.edu", action: "SEND_EXAM_SCHEDULE", target_resource: "CS401", details: "Dispatched exam schedule campaign #101", ip_address: "127.0.0.1", timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, user_email: "admin@college.edu", action: "UPDATE_SMTP_CONFIG", target_resource: "127.0.0.1:1025", details: "Updated SMTP settings. Security: NONE", ip_address: "127.0.0.1", timestamp: new Date(Date.now() - 7200000).toISOString() }
      ],
      total: 3,
      page: 1,
      limit: 50
    })
  ),
};

export const unsubscribeService = {
  verify: (token) => mockWrapper(
    () => apiClient.get(`/unsubscribe?token=${token}`),
    () => ({ success: true, email: "student@apex.edu", name: "Student", message: "Successfully unsubscribed!" })
  ),
  resubscribe: (token) => mockWrapper(
    () => apiClient.post(`/unsubscribe/resubscribe?token=${token}`),
    () => ({ success: true, email: "student@apex.edu", message: "Successfully re-subscribed!" })
  ),
};
