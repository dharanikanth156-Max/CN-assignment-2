import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Mail, RotateCcw, ShieldCheck } from 'lucide-react';
import { unsubscribeService } from '../api/services';

export const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('processing'); // processing | success | error | resubscribed
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Missing security token in link.');
      setLoading(false);
      return;
    }

    const processUnsub = async () => {
      try {
        const res = await unsubscribeService.verify(token);
        if (res.data.success) {
          setStatus('success');
          setEmail(res.data.email);
        } else {
          setStatus('error');
          setErrorMessage('Invalid or expired unsubscribe link.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage(err.response?.data?.detail || 'Invalid or expired unsubscribe link.');
      } finally {
        setLoading(false);
      }
    };

    processUnsub();
  }, [token]);

  const handleResubscribe = async () => {
    setLoading(true);
    try {
      const res = await unsubscribeService.resubscribe(token);
      setStatus('resubscribed');
    } catch (e) {
      alert('Failed to re-subscribe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600/20 text-3xl mb-2">
          🏛️
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white font-outfit">Apex University</h2>
          <p className="text-xs text-slate-400 mt-1">Notification Preferences Portal</p>
        </div>

        {loading ? (
          <div className="py-8 space-y-3">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Verifying signed token...</p>
          </div>
        ) : status === 'success' ? (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Unsubscribed Successfully</h3>
              <p className="text-xs text-slate-400 mt-1">
                <strong>{email}</strong> has been unsubscribed from elective announcements and campus circulars.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
              <p>Note: Critical examination notices and mandatory hall timetables will still be delivered per university bylaws.</p>
            </div>
            <button
              onClick={handleResubscribe}
              className="inline-flex items-center gap-2 text-xs font-semibold text-brand-400 hover:text-brand-300 pt-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Did you do this by mistake? Re-subscribe
            </button>
          </div>
        ) : status === 'resubscribed' ? (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto text-brand-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Re-Subscribed!</h3>
              <p className="text-xs text-slate-400 mt-1">
                You are now subscribed again to all academic newsletters and announcements.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Verification Error</h3>
              <p className="text-xs text-rose-300 mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500">
          Apex University • Office of Academic Affairs
        </div>
      </div>
    </div>
  );
};
