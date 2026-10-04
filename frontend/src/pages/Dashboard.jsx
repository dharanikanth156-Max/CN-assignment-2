import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Send,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { analyticsService, campaignService, examService } from '../api/services';
import { StatCard } from '../components/StatCard';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

export const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [ovRes, campRes, examRes] = await Promise.all([
          analyticsService.getOverview(),
          campaignService.list({ limit: 5 }),
          examService.list({ limit: 4 })
        ]);
        setOverview(ovRes.data);
        setRecentCampaigns(campRes.data.items || []);
        setUpcomingExams(examRes.data.items || []);
      } catch (e) {
        console.error('Failed to load dashboard:', e);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
    const interval = setInterval(loadDashboard, 6000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-indigo-950 to-slate-900 border border-brand-500/20 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-300 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Autonomous SMTP Examination Notification Dispatcher
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white font-outfit tracking-tight">
            Academic Delivery Operations
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Multi-threaded SMTP session reuse engine running with APScheduler automatic reminder triggers at 7-day, 24-hour, and 2-hour pre-exam intervals.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/exams"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-lg shadow-brand-600/30 transition-all"
            >
              <CalendarDays className="w-4 h-4" />
              Manage & Dispatch Exam Schedules
            </Link>
            <Link
              to="/smtp-inspector"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all"
            >
              <Activity className="w-4 h-4 text-brand-400" />
              Open Live SMTP Inspector
            </Link>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-500/10 to-transparent pointer-events-none" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Students"
          value={overview?.total_students || 0}
          subtitle={`${overview?.subscribed_students || 0} Subscribed`}
          icon={Users}
          color="brand"
        />
        <StatCard
          title="Sent Today"
          value={overview?.emails_sent_today || 0}
          subtitle="Past 24 Hours"
          icon={Send}
          color="emerald"
        />
        <StatCard
          title="Success Rate"
          value={`${overview?.overall_success_rate || 100}%`}
          subtitle={`${overview?.total_sent || 0} Delivered / ${overview?.total_failed || 0} Failed`}
          icon={CheckCircle2}
          color="purple"
        />
        <StatCard
          title="Upcoming Exams"
          value={overview?.upcoming_exams_count || 0}
          subtitle="Scheduled this term"
          icon={CalendarDays}
          color="amber"
        />
        <StatCard
          title="SMTP State"
          value="Online"
          subtitle="Worker Pool Active"
          icon={Activity}
          color="emerald"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Volume Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white font-outfit">Email Dispatch Volume (7-Day Trend)</h3>
              <p className="text-xs text-slate-400">Total sent vs failed deliveries</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <TrendingUp className="w-3.5 h-3.5" /> Realtime Metrics
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.recent_sends_chart || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="sent" name="Delivered" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-outfit">Student Distribution</h3>
            <p className="text-xs text-slate-400 mb-4">By academic department</p>
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview?.department_distribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {(overview?.department_distribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-4 border-t border-slate-800">
            {(overview?.department_distribution || []).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-slate-300 font-medium">{d.name}:</span>
                <span className="text-slate-400">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent In-flight Campaigns & Upcoming Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white font-outfit">Recent Email Campaigns</h3>
              <p className="text-xs text-slate-400">Live progress and throughput stats</p>
            </div>
            <Link to="/campaigns" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentCampaigns.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No email campaigns sent yet. Send an exam schedule to begin!
              </div>
            ) : (
              recentCampaigns.map((c) => {
                const percent = c.total_recipients > 0 ? Math.round(((c.sent_count + c.failed_count) / c.total_recipients) * 100) : 0;
                return (
                  <div key={c.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200 truncate max-w-[240px]">{c.name}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : c.status === 'in_progress'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    {/* Progress */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${c.status === 'completed' ? 'bg-emerald-500' : 'bg-brand-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{c.sent_count} / {c.total_recipients} sent ({percent}%)</span>
                      <span>{c.throughput_eps} EPS • {c.duration_ms}ms</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Upcoming Examination Timetable */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white font-outfit">Upcoming Examination Timetable</h3>
              <p className="text-xs text-slate-400">Targeted student notification rosters</p>
            </div>
            <Link to="/exams" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium">
              Manage Exams <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-400 bg-brand-950/70 border border-brand-500/20 px-1.5 py-0.5 rounded">
                      {exam.course_code}
                    </span>
                    <h4 className="font-semibold text-xs text-slate-200">{exam.course_name}</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    📍 {exam.venue} • Dept: {exam.department} (Year {exam.year || 'All'})
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-300">
                    {new Date(exam.date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(exam.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
