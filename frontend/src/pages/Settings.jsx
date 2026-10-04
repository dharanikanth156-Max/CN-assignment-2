import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Server,
  Lock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Key,
  ShieldAlert,
  Activity,
  UserCheck,
  History
} from 'lucide-react';
import { smtpService, auditService } from '../api/services';
import { useToast } from '../context/ToastContext';

export const Settings = () => {
  const { addToast } = useToast();
  const [smtpConfig, setSmtpConfig] = useState({
    host: '127.0.0.1',
    port: 1025,
    security: 'none',
    username: '',
    password: '',
    sender_name: 'Apex University Academic Office',
    sender_email: 'notifications@apex.edu'
  });

  const [passwordSet, setPasswordSet] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [cfgRes, auditRes] = await Promise.all([
        smtpService.getConfig(),
        auditService.list({ limit: 15 })
      ]);
      setSmtpConfig({
        host: cfgRes.data.host,
        port: cfgRes.data.port,
        security: cfgRes.data.security,
        username: cfgRes.data.username,
        password: '',
        sender_name: cfgRes.data.sender_name,
        sender_email: cfgRes.data.sender_email
      });
      setPasswordSet(cfgRes.data.password_set);
      setAuditLogs(auditRes.data.items || []);
    } catch (e) {
      addToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        security: smtpConfig.security,
        username: smtpConfig.username,
        password: smtpConfig.password || undefined,
        sender_name: smtpConfig.sender_name,
        sender_email: smtpConfig.sender_email
      };
      await smtpService.updateConfig(payload);
      addToast('SMTP settings & Fernet-encrypted credentials updated!', 'success');
      fetchSettings();
    } catch (err) {
      addToast('Failed to update SMTP settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await smtpService.testConnection({
        host: smtpConfig.host,
        port: smtpConfig.port,
        security: smtpConfig.security,
        username: smtpConfig.username,
        password: smtpConfig.password
      });
      if (res.data.success) {
        addToast(res.data.message, 'success');
      } else {
        addToast(`Connection error: ${res.data.message}`, 'error');
      }
    } catch (err) {
      addToast('Connection test failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white font-outfit">Settings, Security & Audit Logs</h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure production SMTP credentials, cryptographic Fernet encryption, and review security audit logs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: SMTP Configuration Form */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-brand-400" />
              <h3 className="text-base font-bold text-white font-outfit">SMTP Relay Credentials</h3>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Shield className="w-3.5 h-3.5" /> Fernet 256-bit Encrypted
            </span>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">SMTP Server Host</label>
                <input
                  type="text"
                  required
                  value={smtpConfig.host}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  placeholder="smtp.gmail.com or 127.0.0.1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Port</label>
                <input
                  type="number"
                  required
                  value={smtpConfig.port}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Transport Security</label>
                <select
                  value={smtpConfig.security}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, security: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                >
                  <option value="none">None / Plain (Local Mailpit & Mock smtpd)</option>
                  <option value="starttls">STARTTLS (Recommended for Port 587)</option>
                  <option value="ssl">SSL / TLS (Direct TLS Port 465)</option>
                </select>
                {smtpConfig.security === 'none' && (
                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    Plaintext mode active. Use STARTTLS or SSL for production external relays.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">SMTP Username</label>
                <input
                  type="text"
                  value={smtpConfig.username}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                  placeholder="Optional username / API key"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                SMTP Password / App Secret {passwordSet && <span className="text-emerald-400 font-normal">(Encrypted password currently configured)</span>}
              </label>
              <input
                type="password"
                value={smtpConfig.password}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                placeholder={passwordSet ? "•••••••••••• (Leave blank to keep unchanged)" : "Enter SMTP Password or App Password"}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Sender Display Name</label>
                <input
                  type="text"
                  required
                  value={smtpConfig.sender_name}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, sender_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Sender Email Address</label>
                <input
                  type="email"
                  required
                  value={smtpConfig.sender_email}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, sender_email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Testing Handshake...
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5 text-brand-400" />
                    Test Connection
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving Settings...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Security Architecture & Quota Policies */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl shadow-xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-white font-outfit flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-400" /> Security Policies Active
            </h3>

            <div className="space-y-3 text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Header Injection Defense
                </span>
                <p className="text-[11px] text-slate-400">
                  Strict regex and CR/LF (\r, \n, %0A) filter on Subject, To, From, and Venue fields.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Idempotent Reminder Engine
                </span>
                <p className="text-[11px] text-slate-400">
                  Unique DB composite constraint on <code>(student_id, exam_id, reminder_type)</code> blocks duplicate reminders.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Rate Limiting & Quotas
                </span>
                <p className="text-[11px] text-slate-400">
                  Sliding window limiter: 120 emails / min and 5,000 emails / day to respect provider limits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Audit Log Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white font-outfit">Security & Operation Audit Logs</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Immutable Administrator Audit Trail</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Target Resource</th>
                <th className="px-5 py-3">Details</th>
                <th className="px-5 py-3">IP Address</th>
                <th className="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-500 text-xs">
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-2.5">
                      <span className="font-mono text-[10px] bg-brand-950/70 border border-brand-500/20 text-brand-300 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-slate-300 font-medium">{log.user_email}</td>
                    <td className="px-5 py-2.5 font-mono text-slate-400">{log.target_resource || '—'}</td>
                    <td className="px-5 py-2.5 text-slate-300 text-xs">{log.details}</td>
                    <td className="px-5 py-2.5 font-mono text-slate-500 text-[11px]">{log.ip_address || '127.0.0.1'}</td>
                    <td className="px-5 py-2.5 text-slate-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
