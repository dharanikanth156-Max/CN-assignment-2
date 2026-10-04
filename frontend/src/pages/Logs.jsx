import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Download,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { logService } from '../api/services';
import { useToast } from '../context/ToastContext';

export const Logs = () => {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [retrying, setRetrying] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await logService.list({
        page,
        limit: 25,
        status: statusFilter || undefined,
        search: search.trim() || undefined
      });
      setLogs(res.data.items || []);
      setTotal(res.data.total);
      setTotalPages(res.data.pages);
    } catch (e) {
      addToast('Failed to load logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      const res = await logService.retryFailed({ status: 'failed' });
      addToast(res.data.message, 'success');
      fetchLogs();
    } catch (e) {
      addToast('Failed to retry failed deliveries', 'error');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">SMTP Delivery Logs</h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit trail of every recipient delivery attempt, latency, status code, and retry backoff ({total} logs)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRetryFailed}
            disabled={retrying}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
            Retry All Failed
          </button>
          <a
            href={logService.exportCsvUrl({ status: statusFilter, search })}
            download
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-xl flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recipient email, name, or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="sent">Delivered (Sent)</option>
          <option value="failed">Failed</option>
          <option value="retrying">Retrying</option>
          <option value="queued">Queued</option>
        </select>

        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[11px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Recipient</th>
                <th className="px-5 py-3.5">Subject</th>
                <th className="px-5 py-3.5">Latency</th>
                <th className="px-5 py-3.5">Retries</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Diagnostic Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-500 font-sans">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      Loading delivery logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-500 font-sans">
                    No delivery log entries match your filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3">
                      {log.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> SENT
                        </span>
                      ) : log.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <XCircle className="w-3 h-3" /> FAILED
                        </span>
                      ) : log.status === 'retrying' ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                          <Clock className="w-3 h-3" /> RETRYING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          QUEUED
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-sans font-semibold text-white">{log.recipient_name}</div>
                      <div className="text-[11px] text-slate-400">{log.recipient_email}</div>
                    </td>
                    <td className="px-5 py-3 font-sans text-slate-300 truncate max-w-[220px]">
                      {log.subject}
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {log.latency_ms > 0 ? `${log.latency_ms.toFixed(1)} ms` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {log.retry_count > 0 ? (
                        <span className="text-amber-400 font-bold">{log.retry_count}x</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-slate-400 font-sans">
                      {log.sent_at ? new Date(log.sent_at).toLocaleTimeString() : new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3 font-sans text-xs">
                      {log.error_message ? (
                        <span className="text-rose-400 text-[11px] font-mono bg-rose-950/40 border border-rose-500/20 px-2 py-1 rounded inline-block max-w-[250px] truncate" title={log.error_message}>
                          {log.error_message}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">250 2.0.0 OK: Delivered</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing Page <span className="font-semibold text-white">{page}</span> of <span className="font-semibold text-white">{totalPages}</span> ({total} logs)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
