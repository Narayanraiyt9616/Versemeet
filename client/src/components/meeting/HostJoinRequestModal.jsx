import React from 'react';
import { UserCheck, UserX, Clock, Users } from 'lucide-react';

export default function HostJoinRequestModal({
  pendingRequests = [],
  onApprove,
  onReject
}) {
  if (!pendingRequests || pendingRequests.length === 0) return null;

  const latestRequest = pendingRequests[0];
  const additionalCount = pendingRequests.length - 1;

  const formatTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="fixed top-16 right-4 sm:right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-3 fade-in duration-200 select-none">
      <div className="bg-white/98 backdrop-blur-xl border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-slate-300/60 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">
              New Join Request
            </h4>
          </div>
          {additionalCount > 0 && (
            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
              +{additionalCount} more waiting
            </span>
          )}
        </div>

        {/* Content */}
        <div className="py-3">
          <p className="text-sm font-semibold text-slate-800 leading-relaxed">
            <strong className="text-indigo-600 font-bold">{latestRequest.name}</strong> wants to join your meeting.
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Requested at {formatTime(latestRequest.requestedAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onReject(latestRequest.socketId)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200"
          >
            <UserX className="w-3.5 h-3.5 text-slate-500" />
            <span>Decline</span>
          </button>
          <button
            type="button"
            onClick={() => onApprove(latestRequest.socketId)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Admit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
