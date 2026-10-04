import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Megaphone,
  Send,
  FileText,
  Activity,
  FlaskConical,
  Settings,
  LogOut,
  Mail,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { smtpService } from '../api/services';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Students', path: '/students', icon: Users },
  { name: 'Exams & Schedules', path: '/exams', icon: CalendarDays },
  { name: 'Announcements', path: '/announcements', icon: Megaphone },
  { name: 'Campaigns', path: '/campaigns', icon: Send },
  { name: 'Delivery Logs', path: '/logs', icon: FileText },
  { name: 'SMTP Live Inspector', path: '/smtp-inspector', icon: Activity, highlight: true },
  { name: 'Test Lab & Benchmark', path: '/test-lab', icon: FlaskConical },
  { name: 'Settings & Security', path: '/settings', icon: Settings },
];

export const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mailpitInfo, setMailpitInfo] = useState({ available: false, messages_count: 0, web_url: 'http://localhost:8025' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMailpit = async () => {
      try {
        const res = await smtpService.getMailpitStatus();
        setMailpitInfo(res.data);
      } catch (e) {
        // ignore
      }
    };
    checkMailpit();
    const interval = setInterval(checkMailpit, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-xl flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-bold text-lg">
              🏛️
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white font-outfit">Apex University</h1>
              <p className="text-xs text-brand-400 font-medium">Notification Engine</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : item.highlight
                    ? 'text-brand-300 hover:bg-brand-950/50 hover:text-brand-200 border border-brand-500/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : item.highlight ? 'text-brand-400' : 'text-slate-400'
                }`} />
                <span className="flex-1">{item.name}</span>
                {item.highlight && !isActive && (
                  <span className="flex h-2 w-2 rounded-full bg-brand-400 animate-ping" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Mailpit Quick Link Widget */}
        <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${mailpitInfo.available ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              Local SMTP Inbox
            </span>
            <span className="bg-brand-500/20 text-brand-300 font-mono text-[10px] px-1.5 py-0.5 rounded">
              :8025
            </span>
          </div>
          <p className="text-slate-500 text-[11px] mb-2 leading-relaxed">
            {mailpitInfo.messages_count} messages captured in local test mailbox.
          </p>
          <a
            href={mailpitInfo.web_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Open Web Inbox
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>

        {/* Admin User Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@college.edu'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Portal</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-200 font-medium capitalize">
                {location.pathname === '/' ? 'Dashboard' : location.pathname.replace('/', '').replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-xs text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SMTP Worker Pool Active (4 Threads)
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 px-2.5 py-1 rounded-lg text-xs text-slate-300 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              STARTTLS / TLS Ready
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
