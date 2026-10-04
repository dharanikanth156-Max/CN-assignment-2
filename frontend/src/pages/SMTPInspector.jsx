import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  Server,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  ExternalLink,
  Code,
  Zap,
  ArrowRight,
  ShieldAlert,
  Layers,
  Lock,
  RefreshCw
} from 'lucide-react';
import { smtpService } from '../api/services';
import { useToast } from '../context/ToastContext';

export const SMTPInspector = () => {
  const { addToast } = useToast();
  const [config, setConfig] = useState({
    host: '127.0.0.1',
    port: 1025,
    security: 'none',
    username: '',
    password: '',
    sender_email: 'notifications@apex.edu',
    recipient_email: 'inspector.student@apex.edu',
    subject: 'Live SMTP Inspector Test Probe'
  });

  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState('IDLE');
  const [protocolEvents, setProtocolEvents] = useState([]);
  const [mailpitStatus, setMailpitStatus] = useState({ available: false, messages_count: 0, web_url: 'http://localhost:8025' });
  const [selectedTab, setSelectedTab] = useState('transcript'); // transcript | anatomy | security
  const terminalEndRef = useRef(null);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [cfgRes, mpRes] = await Promise.all([
          smtpService.getConfig(),
          smtpService.getMailpitStatus()
        ]);
        setConfig((prev) => ({
          ...prev,
          host: cfgRes.data.host,
          port: cfgRes.data.port,
          security: cfgRes.data.security,
          username: cfgRes.data.username,
          sender_email: cfgRes.data.sender_email
        }));
        setMailpitStatus(mpRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [protocolEvents]);

  const runInspectorProbe = () => {
    setLoading(true);
    setProtocolEvents([]);
    setActiveStep('CONNECT');

    const streamUrl = smtpService.getInspectorStreamUrl({
      host: config.host,
      port: config.port,
      security: config.security,
      username: config.username,
      password: config.password,
      sender_email: config.sender_email,
      recipient_email: config.recipient_email,
      subject: config.subject
    });

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setProtocolEvents((prev) => [...prev, data]);
        setActiveStep(data.step);

        if (data.status === 'error') {
          addToast(data.detail, 'error');
          eventSource.close();
          setLoading(false);
        } else if (data.step === 'SUMMARY') {
          addToast('SMTP Protocol dialogue completed successfully!', 'success');
          eventSource.close();
          setLoading(false);
          // Refresh Mailpit count
          smtpService.getMailpitStatus().then((r) => setMailpitStatus(r.data));
        }
      } catch (err) {
        console.error(err);
      }
    };

    eventSource.onerror = (err) => {
      eventSource.close();
      setLoading(false);
    };
  };

  const stepsList = [
    { id: 'CONNECT', label: '1. TCP Connect & Banner', icon: Server },
    { id: 'EHLO', label: '2. EHLO Handshake', icon: Activity },
    { id: 'STARTTLS', label: '3. STARTTLS Upgrade', icon: Lock },
    { id: 'AUTH', label: '4. AUTH Credentials', icon: Shield },
    { id: 'MAIL_FROM', label: '5. MAIL FROM Envelope', icon: Mail },
    { id: 'RCPT_TO', label: '6. RCPT TO Recipient', icon: ArrowRight },
    { id: 'DATA', label: '7. DATA & MIME Body', icon: Code },
    { id: 'QUIT', label: '8. QUIT Session', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white font-outfit">SMTP Live Inspector & Protocol Probe</h2>
            <span className="bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-mono px-2.5 py-0.5 rounded-full">
              RFC 5321 / RFC 2822
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time step-by-step SMTP socket dialogue streaming, latency measurement, and MIME structure analysis
          </p>
        </div>

        <a
          href={mailpitStatus.web_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 transition-all"
        >
          <Mail className="w-4 h-4" />
          Open Mailpit Web Inbox ({mailpitStatus.messages_count} msgs)
          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
        </a>
      </div>

      {/* Animated Flow Diagram */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">End-to-End SMTP Transport Pipeline</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 items-center">
          {/* Node 1: Sender */}
          <div className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center ${
            loading ? 'bg-brand-950/60 border-brand-500/50 shadow-xl shadow-brand-500/10' : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-3 text-xl">
              🏛️
            </div>
            <h4 className="font-bold text-sm text-white font-outfit">Apex University App</h4>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{config.sender_email}</p>
            <div className="mt-3 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono">
              Worker Pool Client
            </div>
          </div>

          {/* Node 2: SMTP Relay */}
          <div className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center ${
            ['CONNECT', 'EHLO', 'STARTTLS', 'AUTH', 'MAIL_FROM'].includes(activeStep)
              ? 'bg-indigo-950/60 border-indigo-500/50 shadow-xl shadow-indigo-500/20 animate-pulse'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
              <Server className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-white font-outfit">SMTP Relay Host</h4>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{config.host}:{config.port}</p>
            <div className="mt-3 flex items-center gap-1 text-[11px] text-brand-300 bg-brand-500/10 px-2.5 py-0.5 rounded-full border border-brand-500/20 font-mono">
              <Lock className="w-3 h-3" />
              Security: {config.security.toUpperCase()}
            </div>
          </div>

          {/* Node 3: Recipient Mailbox */}
          <div className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center ${
            ['DATA', 'QUIT', 'SUMMARY'].includes(activeStep)
              ? 'bg-emerald-950/60 border-emerald-500/50 shadow-xl shadow-emerald-500/20'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-white font-outfit">Student Mailbox</h4>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{config.recipient_email}</p>
            <div className="mt-3 text-[11px] text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-mono">
              RFC 2822 Inbox Delivered
            </div>
          </div>
        </div>

        {/* Realtime step pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-6 pt-6 border-t border-slate-800/80">
          {stepsList.map((st) => {
            const hasPassed = protocolEvents.some((e) => e.step === st.id && e.status === 'success');
            const isCurrent = activeStep === st.id;
            const hasError = protocolEvents.some((e) => e.step === st.id && e.status === 'error');

            return (
              <div
                key={st.id}
                className={`p-2 rounded-xl text-center border text-[11px] font-medium transition-all ${
                  hasError
                    ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                    : hasPassed
                    ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                    : isCurrent
                    ? 'bg-brand-600 text-white border-brand-400 shadow-md animate-pulse'
                    : 'bg-slate-950/50 border-slate-800 text-slate-500'
                }`}
              >
                <div className="truncate font-semibold">{st.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Console & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Probe Configuration Form */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-base font-bold text-white font-outfit mb-1">Probe Parameters</h3>
            <p className="text-xs text-slate-400 mb-4">Target server and probe payload</p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Port</label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Transport Security</label>
                <select
                  value={config.security}
                  onChange={(e) => setConfig({ ...config, security: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                >
                  <option value="none">Plain / None (Local Mock & Mailpit)</option>
                  <option value="starttls">STARTTLS (Port 587)</option>
                  <option value="ssl">SSL / TLS (Port 465)</option>
                </select>
                {config.security === 'none' && (
                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Plain SMTP (cleartext) — Recommended for local Mailpit testing.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Sender Email</label>
                <input
                  type="email"
                  value={config.sender_email}
                  onChange={(e) => setConfig({ ...config, sender_email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Recipient Email</label>
                <input
                  type="email"
                  value={config.recipient_email}
                  onChange={(e) => setConfig({ ...config, recipient_email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Probe Subject</label>
                <input
                  type="text"
                  value={config.subject}
                  onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800">
            <button
              onClick={runInspectorProbe}
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Streaming Protocol Dialogue...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Execute Live SMTP Probe
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Tabbed Output Panel (Transcript / RFC Anatomy / Security) */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl flex flex-col shadow-xl">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedTab('transcript')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedTab === 'transcript' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" /> Live Protocol Dialogue
              </button>
              <button
                onClick={() => setSelectedTab('anatomy')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedTab === 'anatomy' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" /> RFC 2822 Header Anatomy
              </button>
            </div>

            <span className="text-[11px] text-slate-500 font-mono">
              {protocolEvents.length} frames captured
            </span>
          </div>

          {/* Tab Content: Live Transcript */}
          {selectedTab === 'transcript' && (
            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800/80 p-4 font-mono text-xs overflow-y-auto max-h-[480px] space-y-2">
              {protocolEvents.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-600">
                  <Terminal className="w-8 h-8 mb-2 opacity-50" />
                  <p>Click "Execute Live SMTP Probe" to stream real-time socket dialogue.</p>
                </div>
              ) : (
                protocolEvents.map((ev, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-900 pb-0.5">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          ev.status === 'error' ? 'bg-rose-500' : ev.status === 'success' ? 'bg-emerald-400' : 'bg-brand-400 animate-pulse'
                        }`} />
                        <strong className="text-slate-300">[{ev.step}]</strong> {ev.detail}
                      </span>
                      <div className="flex items-center gap-2">
                        {ev.latency_ms > 0 && (
                          <span className="text-brand-400 bg-brand-950/80 px-1.5 rounded text-[10px]">
                            {ev.latency_ms.toFixed(1)}ms
                          </span>
                        )}
                        <span>{ev.timestamp}</span>
                      </div>
                    </div>

                    {ev.raw_out && (
                      <div className="text-sky-300 pl-3 border-l-2 border-sky-500/50 bg-sky-950/20 py-0.5">
                        <span className="text-slate-500 select-none">&gt;&gt; </span>{ev.raw_out}
                      </div>
                    )}

                    {ev.raw_in && (
                      <div className="text-emerald-300 pl-3 border-l-2 border-emerald-500/50 bg-emerald-950/20 py-0.5">
                        <span className="text-slate-500 select-none">&lt;&lt; </span>{ev.raw_in}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          )}

          {/* Tab Content: RFC 2822 Anatomy */}
          {selectedTab === 'anatomy' && (
            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-y-auto max-h-[480px] space-y-4">
              <div>
                <h4 className="text-brand-400 font-bold text-xs uppercase mb-2">RFC 2822 / 5322 Standard Headers</h4>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1 text-slate-300">
                  <div><strong className="text-slate-400">Date:</strong> Sun, 04 Oct 2026 16:30:00 +0000</div>
                  <div><strong className="text-slate-400">From:</strong> Apex University Academic Office &lt;{config.sender_email}&gt;</div>
                  <div><strong className="text-slate-400">To:</strong> Student Recipient &lt;{config.recipient_email}&gt;</div>
                  <div><strong className="text-slate-400">Subject:</strong> {config.subject}</div>
                  <div><strong className="text-slate-400">Message-ID:</strong> &lt;20261004163000.99827.apex@apex.edu&gt;</div>
                  <div><strong className="text-slate-400">MIME-Version:</strong> 1.0</div>
                  <div><strong className="text-slate-400">Content-Type:</strong> multipart/alternative; boundary="===============7283910=="</div>
                  <div><strong className="text-slate-400">Auto-Submitted:</strong> auto-generated</div>
                  <div><strong className="text-slate-400">List-Unsubscribe:</strong> &lt;http://localhost:5173/unsubscribe?token=...&gt;</div>
                </div>
              </div>

              <div>
                <h4 className="text-purple-400 font-bold text-xs uppercase mb-2">MIME Structure Layout</h4>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-slate-400 space-y-2">
                  <div className="pl-2 border-l-2 border-slate-700">
                    <span className="text-amber-400 font-semibold">Part 1 (Fallback):</span> text/plain; charset="utf-8"
                    <p className="text-[11px] text-slate-500 mt-0.5">Plain text timetable summary for text-only email clients.</p>
                  </div>
                  <div className="pl-2 border-l-2 border-emerald-500">
                    <span className="text-emerald-400 font-semibold">Part 2 (Preferred):</span> text/html; charset="utf-8"
                    <p className="text-[11px] text-slate-500 mt-0.5">Branded responsive HTML container with college logos and action buttons.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
