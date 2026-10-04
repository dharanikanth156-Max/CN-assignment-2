import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Send,
  Calendar,
  Clock,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-react';
import { announcementService } from '../api/services';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import { EmailPreviewModal } from '../components/EmailPreviewModal';

export const Announcements = () => {
  const { addToast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState({ subject: '', html: '' });

  // Form
  const [formData, setFormData] = useState({
    title: '',
    body_html: '<p>Dear Students,</p><p>Please note the following important academic update regarding...</p>',
    priority: 'normal',
    target_type: 'all',
    target_filter: '',
    scheduled_at: '',
    send_immediately: true
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await announcementService.list({ limit: 50 });
      setAnnouncements(res.data.items || []);
    } catch (e) {
      addToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        body_html: formData.body_html,
        priority: formData.priority,
        target_type: formData.target_type,
        target_filter: formData.target_type !== 'all' ? formData.target_filter : null,
        scheduled_at: (!formData.send_immediately && formData.scheduled_at) ? new Date(formData.scheduled_at).toISOString() : null
      };

      await announcementService.create(payload, formData.send_immediately);
      addToast(
        formData.send_immediately
          ? 'Announcement created and dispatched immediately!'
          : 'Announcement scheduled for automatic release!',
        'success'
      );
      setCreateModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to create announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNow = async (id, title) => {
    try {
      await announcementService.sendNow(id);
      addToast(`Dispatched announcement: '${title}'`, 'success');
      fetchAnnouncements();
    } catch (err) {
      addToast('Failed to dispatch announcement', 'error');
    }
  };

  const handleDeleteAnnouncement = async (id, title) => {
    if (!window.confirm(`Delete announcement "${title}"?`)) return;
    try {
      await announcementService.delete(id);
      addToast('Announcement deleted', 'success');
      fetchAnnouncements();
    } catch (err) {
      addToast('Failed to delete announcement', 'error');
    }
  };

  const openPreview = (a) => {
    setPreviewContent({
      subject: `[${a.priority.toUpperCase()}] ${a.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 24px; color: white; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 20px;">🏛️ Apex University</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #bfdbfe;">Office of Academic Affairs</p>
          </div>
          <div style="padding: 24px 0;">
            <span style="background: ${a.priority === 'urgent' ? '#fee2e2' : '#dbeafe'}; color: ${a.priority === 'urgent' ? '#991b1b' : '#1e40af'}; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              ${a.priority} ANNOUNCEMENT
            </span>
            <h2 style="margin: 12px 0; font-size: 20px;">${a.title}</h2>
            <div style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 16px;">
              ${a.body_html}
            </div>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #64748b;">
            <p>Sent to targeted cohort • Apex University Campus</p>
          </div>
        </div>
      `
    });
    setPreviewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">Academic Announcements</h2>
          <p className="text-xs text-slate-400 mt-1">
            Broadcast emergency circulars, event notifications, and department newsletters
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              title: '',
              body_html: '<p>Dear Students,</p><p>Please note the following important academic update...</p>',
              priority: 'normal',
              target_type: 'all',
              target_filter: '',
              scheduled_at: '',
              send_immediately: true
            });
            setCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Compose Announcement
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm rounded-2xl bg-slate-900/60 border border-slate-800">
            No announcements created yet. Click "Compose Announcement" to publish one.
          </div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-xl hover:border-slate-700 transition-all shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                    a.priority === 'urgent'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                  }`}>
                    {a.priority === 'urgent' ? '🔥 URGENT' : '📢 NORMAL'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Target: <strong className="text-slate-200">{a.target_type === 'all' ? 'All Students' : `${a.target_type.toUpperCase()}: ${a.target_filter}`}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    a.status === 'sent'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : a.status === 'scheduled'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    Status: {a.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-white font-outfit mb-2">{a.title}</h3>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-4">
                {a.body_text}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  Created {new Date(a.created_at).toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openPreview(a)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview Email
                  </button>
                  {a.status !== 'sent' && (
                    <button
                      onClick={() => handleSendNow(a.id, a.title)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" /> Send Now
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAnnouncement(a.id, a.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Compose Announcement Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Compose Academic Announcement"
        subtitle="Broadcast notices to all students or specific departments"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Announcement Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="E.g., End-Semester Hall Ticket Distribution Window Open"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="normal">Normal (General Notice)</option>
                <option value="urgent">Urgent (Mandatory Alert)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Target Audience</label>
              <select
                value={formData.target_type}
                onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="all">All Enrolled Students</option>
                <option value="department">Specific Department</option>
                <option value="year">Specific Academic Year</option>
              </select>
            </div>
            {formData.target_type !== 'all' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {formData.target_type === 'department' ? 'Department Code' : 'Year Number'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.target_filter}
                  onChange={(e) => setFormData({ ...formData, target_filter: e.target.value })}
                  placeholder={formData.target_type === 'department' ? 'CS, ECE, MECH' : '1, 2, 3, 4'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Email Content (HTML Body)
            </label>
            <textarea
              rows={6}
              required
              value={formData.body_html}
              onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono resize-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">HTML is automatically sanitized with Bleach to prevent script injection.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="dispatch_mode"
                  checked={formData.send_immediately}
                  onChange={() => setFormData({ ...formData, send_immediately: true })}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span>Send Immediately Now</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="dispatch_mode"
                  checked={!formData.send_immediately}
                  onChange={() => setFormData({ ...formData, send_immediately: false })}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span>Schedule for Future Date/Time</span>
              </label>
            </div>

            {!formData.send_immediately && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Scheduled Release Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  {formData.send_immediately ? 'Dispatch Announcement' : 'Set Scheduled Job'}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Live Email Preview Drawer */}
      <EmailPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        subject={previewContent.subject}
        htmlContent={previewContent.html}
        recipientName="Student Preview"
        recipientEmail="student@apex.edu"
      />
    </div>
  );
};
