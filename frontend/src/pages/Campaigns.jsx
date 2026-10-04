import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Activity,
  Zap,
  RefreshCw,
  Layers
} from 'lucide-react';
import { campaignService } from '../api/services';
import { useToast } from '../context/ToastContext';

export const Campaigns = () => {
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchCampaigns = async () => {
    try {
      const res = await campaignService.list({
        status: statusFilter || undefined,
        limit: 50
      });
      setCampaigns(res.data.items || []);
    } catch (e) {
      addToast('Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    // Poll every 3 seconds for live in-flight progress bar updates
    const interval = setInterval(fetchCampaigns, 3000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">Email Campaigns & In-Flight Queues</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time batch dispatch pipeline, connection reuse metrics, and throughput monitor
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
          </select>

          <button
            onClick={fetchCampaigns}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {loading && campaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm rounded-2xl bg-slate-900/60 border border-slate-800">
            No email campaigns found. Dispatch an exam schedule or run a test in the Test Lab to see live progress.
          </div>
        ) : (
          campaigns.map((c) => {
            const processed = c.sent_count + c.failed_count;
            const percent = c.total_recipients > 0 ? Math.round((processed / c.total_recipients) * 100) : 0;
            const isInProgress = c.status === 'in_progress' || c.status === 'queued';

            return (
              <div
                key={c.id}
                className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl hover:border-slate-700 transition-all shadow-xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white font-outfit">{c.name}</h3>
                        <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                          {c.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Created {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <span className={`self-start sm:self-auto text-xs uppercase font-bold px-3 py-1 rounded-full border ${
                    c.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : isInProgress
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {c.status}
                  </span>
                </div>

                {/* Live Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300 font-semibold">
                      {c.sent_count} / {c.total_recipients} Delivered ({percent}%)
                    </span>
                    {c.failed_count > 0 && (
                      <span className="text-rose-400 font-semibold">
                        {c.failed_count} Failed ({c.retry_count} retries)
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        c.status === 'completed'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : isInProgress
                          ? 'bg-gradient-to-r from-brand-600 to-indigo-500 animate-pulse'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Performance Metrics Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] uppercase text-slate-500 block">Throughput</span>
                    <span className="font-mono font-bold text-brand-400 flex items-center gap-1 mt-0.5">
                      <Zap className="w-3.5 h-3.5" />
                      {c.throughput_eps} Emails / sec
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] uppercase text-slate-500 block">Total Duration</span>
                    <span className="font-mono font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {c.duration_ms > 0 ? `${(c.duration_ms / 1000).toFixed(2)}s (${c.duration_ms}ms)` : 'In Flight...'}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] uppercase text-slate-500 block">Average Latency</span>
                    <span className="font-mono font-bold text-slate-200 mt-0.5 block">
                      {c.avg_latency_ms} ms / msg
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] uppercase text-slate-500 block">SMTP Strategy</span>
                    <span className="font-mono text-emerald-400 text-[11px] mt-0.5 block">
                      Batch Connection Reuse
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
