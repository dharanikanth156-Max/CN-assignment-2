import React, { useState } from 'react';
import { Modal } from './Modal';
import { Smartphone, Monitor } from 'lucide-react';

export const EmailPreviewModal = ({ isOpen, onClose, subject, htmlContent, recipientName, recipientEmail }) => {
  const [viewMode, setViewMode] = useState('desktop'); // desktop | mobile

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Live Email Preview (HTML / MIME)"
      subtitle={`Previewing as rendered in student mailbox: ${recipientEmail || 'student@apex.edu'}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Email Header Info */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-1">
          <div className="flex gap-2 text-slate-400">
            <span className="font-semibold text-slate-300 w-16">Subject:</span>
            <span className="text-brand-300 font-medium">{subject || 'No Subject'}</span>
          </div>
          <div className="flex gap-2 text-slate-400">
            <span className="font-semibold text-slate-300 w-16">From:</span>
            <span className="text-slate-200">Apex University Academic Office &lt;notifications@apex.edu&gt;</span>
          </div>
          <div className="flex gap-2 text-slate-400">
            <span className="font-semibold text-slate-300 w-16">To:</span>
            <span className="text-slate-200">{recipientName || 'Student'} &lt;{recipientEmail || 'student@apex.edu'}&gt;</span>
          </div>
        </div>

        {/* Viewport switcher */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Responsive Email Template (Jinja2 Rendered)</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'desktop' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'mobile' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile (375px)
            </button>
          </div>
        </div>

        {/* Render Frame */}
        <div className="flex justify-center bg-slate-950/90 p-4 rounded-xl border border-slate-800 min-h-[450px]">
          <div
            className={`transition-all duration-300 bg-white rounded-lg shadow-2xl overflow-hidden ${
              viewMode === 'mobile' ? 'w-[375px] h-[550px]' : 'w-full h-[550px]'
            }`}
          >
            <iframe
              title="Email Render"
              srcDoc={htmlContent}
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
