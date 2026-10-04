import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  Send,
  Plus,
  Edit2,
  Trash2,
  Search,
  BellRing,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { examService } from '../api/services';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';

export const Exams = () => {
  const { addToast } = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);

  // Forms
  const [formData, setFormData] = useState({
    course_name: '',
    course_code: '',
    date_time: '',
    venue: '',
    duration_minutes: 180,
    department: 'CS',
    year: 4,
    instructions: 'Bring Physical College ID Card and Non-programmable Calculator.'
  });
  const [customMessage, setCustomMessage] = useState('');
  const [sendingSchedule, setSendingSchedule] = useState(false);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await examService.list({
        search: search.trim() || undefined,
        department: department !== 'ALL' ? department : undefined,
        limit: 50
      });
      setExams(res.data.items || []);
    } catch (e) {
      addToast('Failed to load exams', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [department]);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      await examService.create(formData);
      addToast(`Exam ${formData.course_code} created successfully!`, 'success');
      setCreateModalOpen(false);
      fetchExams();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to create exam', 'error');
    }
  };

  const handleUpdateExam = async (e) => {
    e.preventDefault();
    if (!selectedExam) return;
    try {
      await examService.update(selectedExam.id, formData);
      addToast(`Exam ${formData.course_code} updated successfully!`, 'success');
      setEditModalOpen(false);
      fetchExams();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update exam', 'error');
    }
  };

  const handleDeleteExam = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete exam ${code}?`)) return;
    try {
      await examService.delete(id);
      addToast(`Exam ${code} removed`, 'success');
      fetchExams();
    } catch (err) {
      addToast('Failed to delete exam', 'error');
    }
  };

  const openEditModal = (exam) => {
    setSelectedExam(exam);
    // Format date for datetime-local input
    const d = new Date(exam.date_time);
    const dateStr = d.toISOString().slice(0, 16);
    setFormData({
      course_name: exam.course_name,
      course_code: exam.course_code,
      date_time: dateStr,
      venue: exam.venue,
      duration_minutes: exam.duration_minutes,
      department: exam.department,
      year: exam.year,
      instructions: exam.instructions || ''
    });
    setEditModalOpen(true);
  };

  const openSendModal = (exam) => {
    setSelectedExam(exam);
    setCustomMessage('Please arrive 15 minutes before scheduled start time.');
    setSendModalOpen(true);
  };

  const handleSendSchedule = async (e) => {
    e.preventDefault();
    if (!selectedExam) return;
    setSendingSchedule(true);
    try {
      const res = await examService.sendSchedule(selectedExam.id, {
        exam_id: selectedExam.id,
        custom_message: customMessage
      });
      addToast(`Campaign #${res.data.campaign_id} created! Dispatched via background SMTP worker pool.`, 'success');
      setSendModalOpen(false);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to send schedule', 'error');
    } finally {
      setSendingSchedule(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">Exam Schedules & Reminders</h2>
          <p className="text-xs text-slate-400 mt-1">
            Publish examination schedules and manage automatic 7-day, 24-hr & 2-hr reminder triggers
          </p>
        </div>
        <button
          onClick={() => {
            const now = new Date();
            now.setDate(now.getDate() + 7);
            setFormData({
              course_name: '',
              course_code: '',
              date_time: now.toISOString().slice(0, 16),
              venue: 'Examination Hall 1, Academic Complex',
              duration_minutes: 180,
              department: 'CS',
              year: 4,
              instructions: 'Bring Physical College ID Card and Non-programmable Calculator.'
            });
            setCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Schedule New Exam
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-xl flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search course title or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchExams()}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">All Departments</option>
          <option value="CS">Computer Science (CS)</option>
          <option value="ECE">Electronics (ECE)</option>
          <option value="MECH">Mechanical (MECH)</option>
          <option value="CIVIL">Civil (CIVIL)</option>
          <option value="MBA">Management (MBA)</option>
        </select>
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-slate-500 text-sm">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading exam schedules...
          </div>
        ) : exams.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-500 text-sm">
            No exam schedules found. Click "Schedule New Exam" to create one.
          </div>
        ) : (
          exams.map((exam) => {
            const examDate = new Date(exam.date_time);
            const isFuture = examDate > new Date();

            return (
              <div
                key={exam.id}
                className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-xl flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-brand-400 bg-brand-950/80 border border-brand-500/30 px-2 py-0.5 rounded-md">
                        {exam.course_code}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1.5 font-outfit">{exam.course_name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(exam)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Exam"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExam(exam.id, exam.course_code)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete Exam"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 py-2 border-y border-slate-800/80 my-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-400 shrink-0" />
                      <span>
                        <strong>{examDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong> at {examDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({exam.duration_minutes} mins)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{exam.venue}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="font-semibold text-slate-300">Audience:</span>
                      <span>{exam.department} • Year {exam.year || 'All Years'}</span>
                    </div>
                  </div>

                  {exam.instructions && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
                      📝 {exam.instructions}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <BellRing className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>Auto-Reminders Active</span>
                  </div>

                  <button
                    onClick={() => openSendModal(exam)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/20 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Schedule Now
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Exam Modal */}
      <Modal
        isOpen={createModalOpen || editModalOpen}
        onClose={() => { setCreateModalOpen(false); setEditModalOpen(false); }}
        title={createModalOpen ? "Schedule New Examination" : `Edit Exam: ${formData.course_code}`}
        subtitle="Specify timetable, venue, duration, and targeted student cohort"
      >
        <form onSubmit={createModalOpen ? handleCreateExam : handleUpdateExam} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Course Code</label>
              <input
                type="text"
                required
                value={formData.course_code}
                onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                placeholder="CS401"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Course Title</label>
              <input
                type="text"
                required
                value={formData.course_name}
                onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                placeholder="Distributed Systems & Cloud Architecture"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Exam Date & Time</label>
              <input
                type="datetime-local"
                required
                value={formData.date_time}
                onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Duration (Minutes)</label>
              <input
                type="number"
                required
                min={30}
                max={360}
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Venue / Examination Hall</label>
            <input
              type="text"
              required
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              placeholder="Main Examination Hall A, Science Block"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Department Target</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="ALL">All Departments</option>
                <option value="CS">Computer Science (CS)</option>
                <option value="ECE">Electronics (ECE)</option>
                <option value="MECH">Mechanical (MECH)</option>
                <option value="CIVIL">Civil (CIVIL)</option>
                <option value="MBA">Management (MBA)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Academic Year</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value={0}>All Years</option>
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Hall Instructions</label>
            <textarea
              rows={3}
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Instructions to display on email and student timetable..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => { setCreateModalOpen(false); setEditModalOpen(false); }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30"
            >
              {createModalOpen ? "Publish Schedule" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Send Schedule Confirmation Modal */}
      <Modal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        title={`Dispatch Exam Schedule: ${selectedExam?.course_code}`}
        subtitle="This will immediately dispatch personalized timetable emails to all targeted students"
      >
        {selectedExam && (
          <form onSubmit={handleSendSchedule} className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Course:</span>
                <span className="font-semibold text-white">{selectedExam.course_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Cohort:</span>
                <span className="font-mono text-brand-400">{selectedExam.department} (Year {selectedExam.year || 'All'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Scheduled Date:</span>
                <span className="text-slate-200">{new Date(selectedExam.date_time).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Custom Note from Dean's Office (Optional)
              </label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="E.g., Please report 15 minutes before exam start time..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSendModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendingSchedule}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 flex items-center gap-2 disabled:opacity-50"
              >
                {sendingSchedule ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Confirm & Send to Cohort
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
