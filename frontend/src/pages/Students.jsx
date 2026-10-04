import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { studentService } from '../api/services';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';

export const Students = () => {
  const { addToast } = useToast();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [year, setYear] = useState('0');
  const [subscribed, setSubscribed] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Forms
  const [formData, setFormData] = useState({
    roll_no: '',
    name: '',
    email: '',
    department: 'CS',
    year: 1,
    subscribed: true
  });
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        department: department !== 'ALL' ? department : undefined,
        year: parseInt(year) > 0 ? parseInt(year) : undefined,
        subscribed: subscribed !== '' ? subscribed === 'true' : undefined
      };
      const res = await studentService.list(params);
      setStudents(res.data.items || []);
      setTotal(res.data.total);
      setTotalPages(res.data.pages);
    } catch (e) {
      addToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, department, year, subscribed]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      await studentService.create(formData);
      addToast(`Student ${formData.name} added successfully!`, 'success');
      setCreateModalOpen(false);
      setFormData({ roll_no: '', name: '', email: '', department: 'CS', year: 1, subscribed: true });
      fetchStudents();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to add student', 'error');
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      await studentService.update(selectedStudent.id, formData);
      addToast(`Student ${formData.name} updated successfully!`, 'success');
      setEditModalOpen(false);
      fetchStudents();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update student', 'error');
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await studentService.delete(id);
      addToast(`Student ${name} removed`, 'success');
      fetchStudents();
    } catch (err) {
      addToast('Failed to delete student', 'error');
    }
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      roll_no: student.roll_no,
      name: student.name,
      email: student.email,
      department: student.department,
      year: student.year,
      subscribed: student.subscribed
    });
    setEditModalOpen(true);
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);

    const fd = new FormData();
    fd.append('file', importFile);

    try {
      const res = await studentService.bulkImport(fd);
      setImportResult(res.data);
      addToast(`Imported ${res.data.imported_count} students successfully!`, 'success');
      fetchStudents();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = "roll_no,name,email,department,year,subscribed\nCS2026-901,Aarav Patel,aarav.patel@apex.edu,CS,3,true\nECE2026-902,Sanya Rao,sanya.rao@apex.edu,ECE,2,true\nMECH2026-903,John Doe,john.doe@apex.edu,MECH,4,true";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_students_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">Student Directory</h2>
          <p className="text-xs text-slate-400 mt-1">Manage enrollments, academic rosters, and notification subscriptions ({total} total)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-brand-400" />
            Bulk CSV Import
          </button>
          <a
            href={studentService.exportCsv()}
            download
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </a>
          <button
            onClick={() => {
              setFormData({ roll_no: '', name: '', email: '', department: 'CS', year: 1, subscribed: true });
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-xl flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, roll no, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </form>

        <select
          value={department}
          onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
          className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">All Departments</option>
          <option value="CS">Computer Science (CS)</option>
          <option value="ECE">Electronics (ECE)</option>
          <option value="MECH">Mechanical (MECH)</option>
          <option value="CIVIL">Civil (CIVIL)</option>
          <option value="MBA">Management (MBA)</option>
        </select>

        <select
          value={year}
          onChange={(e) => { setYear(e.target.value); setPage(1); }}
          className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
        >
          <option value="0">All Years</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </select>

        <select
          value={subscribed}
          onChange={(e) => { setSubscribed(e.target.value); setPage(1); }}
          className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Subscription Status</option>
          <option value="true">Subscribed Only</option>
          <option value="false">Unsubscribed Only</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[11px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Roll Number</th>
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-5 py-3.5">Email Address</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Year</th>
                <th className="px-5 py-3.5">Subscribed</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      Loading student roster...
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-500">
                    No students match your search filter criteria.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-brand-400">{s.roll_no}</td>
                    <td className="px-5 py-3 font-semibold text-white">{s.name}</td>
                    <td className="px-5 py-3 font-mono text-slate-400">{s.email}</td>
                    <td className="px-5 py-3">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-[11px]">
                        {s.department}
                      </span>
                    </td>
                    <td className="px-5 py-3">Year {s.year}</td>
                    <td className="px-5 py-3">
                      {s.subscribed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium">
                          <CheckCircle className="w-3 h-3" /> Subscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium">
                          <XCircle className="w-3 h-3" /> Unsubscribed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.id, s.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
            Showing Page <span className="font-semibold text-white">{page}</span> of <span className="font-semibold text-white">{totalPages}</span> ({total} records)
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={createModalOpen || editModalOpen}
        onClose={() => { setCreateModalOpen(false); setEditModalOpen(false); }}
        title={createModalOpen ? "Add New Student" : `Edit Student: ${formData.name}`}
        subtitle="Individual student details and email subscription preference"
      >
        <form onSubmit={createModalOpen ? handleCreateStudent : handleUpdateStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Roll Number</label>
              <input
                type="text"
                required
                value={formData.roll_no}
                onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                placeholder="CS2026-001"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Official Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jane.doe@apex.edu"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
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
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="sub_check"
              checked={formData.subscribed}
              onChange={(e) => setFormData({ ...formData, subscribed: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="sub_check" className="text-xs text-slate-300">
              Subscribed to elective academic announcements & reminders
            </label>
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
              {createModalOpen ? "Create Student" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk CSV Import Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => { setImportModalOpen(false); setImportResult(null); setImportFile(null); }}
        title="Bulk Student Import via CSV"
        subtitle="Upload a CSV file containing roll_no, name, email, department, year"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <span>Need the required format structure?</span>
            </div>
            <button
              onClick={downloadSampleCsv}
              className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-semibold"
            >
              <Download className="w-3.5 h-3.5" /> Download Template CSV
            </button>
          </div>

          <form onSubmit={handleBulkImport} className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <input
                type="file"
                accept=".csv,.txt"
                required
                onChange={(e) => setImportFile(e.target.files[0])}
                className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-2">Deduplication and email regex format validations run automatically.</p>
            </div>

            {importResult && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-white">Import Summary:</span>
                  <span className="text-emerald-400">{importResult.imported_count} imported</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-slate-400 font-mono text-[11px]">
                  <div>Total: {importResult.total_processed}</div>
                  <div>Duplicates Skipped: {importResult.duplicate_count}</div>
                  <div>Invalid: {importResult.invalid_count}</div>
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2 text-rose-400 text-[10px] space-y-0.5 max-h-24 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={importing || !importFile}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 disabled:opacity-50"
              >
                {importing ? "Processing CSV..." : "Start Import"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
