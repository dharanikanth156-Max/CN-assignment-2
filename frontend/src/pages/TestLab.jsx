import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Zap,
  Play,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  TrendingUp,
  BarChart3,
  Sliders,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { testLabService } from '../api/services';
import { useToast } from '../context/ToastContext';
import { StatCard } from '../components/StatCard';

export const TestLab = () => {
  const { addToast } = useToast();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Generator Config
  const [genCount, setGenCount] = useState(50);
  const [genDept, setGenDept] = useState('ALL');

  // Benchmark Config
  const [benchConfig, setBenchConfig] = useState({
    run_name: '200-Recipient Batch Benchmark',
    recipient_count: 50,
    batch_size: 25,
    reuse_connection: true,
    simulate_failure_rate: 0.05
  });

  const [latestRun, setLatestRun] = useState(null);

  const fetchRuns = async () => {
    try {
      const res = await testLabService.getRuns();
      setRuns(res.data || []);
      if (res.data && res.data.length > 0) {
        setLatestRun(res.data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleGenerateStudents = async () => {
    setGenerating(true);
    try {
      const res = await testLabService.generateStudents({
        count: genCount,
        department: genDept !== 'ALL' ? genDept : undefined
      });
      addToast(res.data.message, 'success');
    } catch (e) {
      addToast('Failed to generate dummy students', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleRunBenchmark = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await testLabService.runBenchmark(benchConfig);
      setLatestRun(res.data);
      addToast(`Benchmark '${res.data.run_name}' completed! Throughput: ${res.data.throughput_eps} emails/sec`, 'success');
      fetchRuns();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Benchmark failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart comparison data
  const chartData = runs.slice(0, 10).reverse().map((r, idx) => ({
    name: `#${r.id} ${r.run_name.slice(0, 14)}`,
    throughput: r.throughput_eps,
    latency: r.avg_latency_ms,
    recipients: r.recipient_count,
    reused: r.reuse_connection ? 'Reused' : 'Per-Message'
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white font-outfit">High-Throughput Test Lab & Benchmarking</h2>
            <span className="bg-purple-500/20 text-purple-300 text-xs font-mono px-2.5 py-0.5 rounded-full border border-purple-500/30">
              Stress Harness
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate massive cohorts (10 to 1,000 students), test connection reuse speedups, and inject packet drops
          </p>
        </div>
      </div>

      {/* Generator & Benchmark Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Synthetic Cohort Generator */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-brand-400" />
              <h3 className="text-base font-bold text-white font-outfit">Synthetic Student Generator</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Instantly generate realistic enrolled students with deduplicated roll numbers and official apex.edu addresses
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Cohort Batch Count</label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 50, 200, 1000].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setGenCount(cnt)}
                      className={`py-2 rounded-xl border text-xs font-semibold font-mono transition-all ${
                        genCount === cnt
                          ? 'bg-brand-600 text-white border-brand-500 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Target Department</label>
                <select
                  value={genDept}
                  onChange={(e) => setGenDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="ALL">Random Mixed Departments</option>
                  <option value="CS">Computer Science (CS)</option>
                  <option value="ECE">Electronics (ECE)</option>
                  <option value="MECH">Mechanical (MECH)</option>
                  <option value="CIVIL">Civil (CIVIL)</option>
                  <option value="MBA">Management (MBA)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800">
            <button
              onClick={handleGenerateStudents}
              disabled={generating}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Records...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  Generate {genCount} Synthetic Students
                </>
              )}
            </button>
          </div>
        </div>

        {/* Load Benchmark Runner */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white font-outfit">Run Stress & Throughput Benchmark</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Dispatches multi-recipient batches to local Mailpit / SMTP server with real-time throughput measurement
            </p>

            <form onSubmit={handleRunBenchmark} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">Benchmark Run Identifier</label>
                <input
                  type="text"
                  required
                  value={benchConfig.run_name}
                  onChange={(e) => setBenchConfig({ ...benchConfig, run_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Recipient Count: <span className="text-brand-400 font-mono font-bold">{benchConfig.recipient_count}</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={benchConfig.recipient_count}
                  onChange={(e) => setBenchConfig({ ...benchConfig, recipient_count: parseInt(e.target.value) })}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Batch Size: <span className="text-emerald-400 font-mono font-bold">{benchConfig.batch_size}</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={benchConfig.batch_size}
                  onChange={(e) => setBenchConfig({ ...benchConfig, batch_size: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-semibold block">SMTP Session Reuse</span>
                  <span className="text-[10px] text-slate-500">1 TCP session per batch vs fresh handshake per msg</span>
                </div>
                <input
                  type="checkbox"
                  checked={benchConfig.reuse_connection}
                  onChange={(e) => setBenchConfig({ ...benchConfig, reuse_connection: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-brand-600 focus:ring-brand-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-200 font-semibold">Simulate Failures</span>
                  <span className="font-mono text-rose-400 font-bold">{(benchConfig.simulate_failure_rate * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.25}
                  step={0.05}
                  value={benchConfig.simulate_failure_rate}
                  onChange={(e) => setBenchConfig({ ...benchConfig, simulate_failure_rate: parseFloat(e.target.value) })}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </form>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800">
            <button
              onClick={handleRunBenchmark}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Dispatching Benchmark Batch...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Launch Benchmark Run
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Latest Benchmark Results Summary */}
      {latestRun && (
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-2xl shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Benchmark Telemetry</span>
              <h3 className="text-lg font-bold text-white font-outfit">{latestRun.run_name}</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Completed at {new Date(latestRun.created_at).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <StatCard
              title="Throughput"
              value={`${latestRun.throughput_eps} EPS`}
              subtitle="Emails per second"
              icon={Zap}
              color="brand"
            />
            <StatCard
              title="Total Duration"
              value={`${(latestRun.total_time_ms / 1000).toFixed(2)}s`}
              subtitle={`${latestRun.total_time_ms} ms elapsed`}
              icon={Clock}
              color="purple"
            />
            <StatCard
              title="Average Latency"
              value={`${latestRun.avg_latency_ms} ms`}
              subtitle="Per message delivery"
              icon={TrendingUp}
              color="amber"
            />
            <StatCard
              title="Delivered"
              value={`${latestRun.success_count} / ${latestRun.recipient_count}`}
              subtitle={`${((latestRun.success_count / latestRun.recipient_count) * 100).toFixed(0)}% Success`}
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Failed & Retried"
              value={`${latestRun.fail_count} failed`}
              subtitle={`${latestRun.retry_count} retries executed`}
              icon={AlertTriangle}
              color="rose"
            />
          </div>
        </div>
      )}

      {/* Performance Comparison Charts */}
      {runs.length > 0 && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-outfit">Historical Benchmark Comparison</h3>
              <p className="text-xs text-slate-400">Comparing throughput (Emails/Sec) and message latency across test runs</p>
            </div>
            <span className="text-xs text-brand-400 font-mono font-medium">
              {runs.length} benchmark runs recorded
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                <Bar dataKey="throughput" name="Throughput (Emails/Sec)" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="latency" name="Avg Latency (ms)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
