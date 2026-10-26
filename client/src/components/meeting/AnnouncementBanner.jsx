import React, { useEffect } from 'react';
import { Megaphone, X, ExternalLink } from 'lucide-react';

export default function AnnouncementBanner({
  announcement,
  onDismiss
}) {
  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 8000); // 8 second auto-dismiss
    return () => clearTimeout(timer);
  }, [announcement, onDismiss]);

  if (!announcement) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 max-w-lg w-full px-4 animate-in slide-in-from-top-4 duration-300 select-none">
      <div className="bg-white/98 backdrop-blur-2xl border border-teal-200/90 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-teal-900/10 text-slate-900 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 border border-teal-200">
          <Megaphone className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
              {announcement.senderName} ({announcement.senderRole})
            </span>
            <button
              type="button"
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              title="Dismiss announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="text-sm font-bold text-slate-900 mt-0.5 truncate">
            {announcement.title}
          </h4>

          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {announcement.message}
          </p>

          {announcement.link && (
            <a
              href={announcement.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Shared Resource</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
