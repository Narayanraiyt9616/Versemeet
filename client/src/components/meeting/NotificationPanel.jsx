import React from 'react';
import {
  Bell,
  Trash2,
  X,
  UserPlus,
  Users,
  Megaphone,
  Hand,
  Monitor,
  ExternalLink,
  CheckCheck,
  Check,
  Clock
} from 'lucide-react';

export default function NotificationPanel({
  isOpen = false,
  onClose,
  notifications = [],
  onClearAll,
  onDismissNotification,
  onApproveJoinRequest,
  onRejectJoinRequest,
  isHost = false
}) {
  if (!isOpen) return null;

  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    try {
      const date = new Date(ts);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'join-request':
        return <UserPlus className="w-3.5 h-3.5 text-amber-600" />;
      case 'announcement':
        return <Megaphone className="w-3.5 h-3.5 text-teal-600" />;
      case 'hand':
        return <Hand className="w-3.5 h-3.5 text-amber-600" />;
      case 'screen-share':
      case 'screen':
        return <Monitor className="w-3.5 h-3.5 text-indigo-600" />;
      case 'join':
      case 'participant-joined':
        return <Users className="w-3.5 h-3.5 text-emerald-600" />;
      case 'leave':
      case 'participant-left':
        return <Users className="w-3.5 h-3.5 text-slate-500" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  const getBadgeBg = (type) => {
    switch (type) {
      case 'join-request':
        return 'bg-amber-50 border-amber-200/80';
      case 'announcement':
        return 'bg-teal-50 border-teal-200/80';
      case 'hand':
        return 'bg-amber-50 border-amber-200/80';
      case 'screen-share':
      case 'screen':
        return 'bg-indigo-50 border-indigo-200/80';
      case 'join':
      case 'participant-joined':
        return 'bg-emerald-50 border-emerald-200/80';
      case 'leave':
      case 'participant-left':
        return 'bg-slate-100 border-slate-200/80';
      default:
        return 'bg-indigo-50 border-indigo-200/80';
    }
  };

  return (
    <>
      {/* Click-away backdrop to cleanly dismiss on click-outside */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/5 md:bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Compact Notification Panel anchored neatly below the header */}
      <div className="fixed top-[58px] right-2 sm:right-4 z-50 w-[300px] sm:w-[320px] max-w-[calc(100vw-1rem)] select-none animate-in fade-in slide-in-from-top-2 duration-150">
        <div className="bg-white/98 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-300/40 overflow-hidden flex flex-col">
          {/* Header Bar */}
          <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-xs text-slate-800 tracking-tight flex items-center gap-1.5">
                Notifications
                {notifications.length > 0 && (
                  <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full border border-indigo-200">
                    {notifications.length}
                  </span>
                )}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Functional Clear All Button */}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200/70 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Remove all notifications"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                title="Close panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Compact Scrollable Notifications Area */}
          <div className="p-2 max-h-[300px] overflow-y-auto space-y-1.5 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-6 px-3 flex flex-col items-center justify-center text-center">
                <div className="w-9 h-9 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-1.5">
                  <CheckCheck className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs text-slate-800">All Caught Up!</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug max-w-[210px]">
                  No new notifications. Alerts and updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 transition-all shadow-2xs flex items-start gap-2 relative group"
                >
                  {/* Type Icon Badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0 mt-0.5 ${getBadgeBg(
                      item.type
                    )}`}
                  >
                    {getIcon(item.type)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-[11px] text-slate-900 truncate">
                        {item.title}
                      </span>
                      <span className="text-[9px] text-slate-400 flex items-center gap-0.5 flex-shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug break-words font-normal line-clamp-3">
                      {item.message}
                    </p>

                    {/* Resource Link if attached */}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>Open Link</span>
                      </a>
                    )}

                    {/* Host Quick Actions for Join Requests */}
                    {item.type === 'join-request' && isHost && item.socketId && (
                      <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => {
                            onRejectJoinRequest?.(item.socketId);
                            onDismissNotification?.(item.id);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onApproveJoinRequest?.(item.socketId);
                            onDismissNotification?.(item.id);
                          }}
                          className="px-2.5 py-0.5 rounded text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all flex items-center gap-0.5 active:scale-95"
                        >
                          <Check className="w-2.5 h-2.5" />
                          <span>Admit</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Individual Dismiss Button */}
                  <button
                    type="button"
                    onClick={() => onDismissNotification?.(item.id)}
                    className="absolute top-2 right-2 p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors opacity-70 group-hover:opacity-100"
                    title="Dismiss notification"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Compact Footer when notifications are present */}
          {notifications.length > 0 && (
            <div className="px-3 py-1 bg-slate-50/60 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
              {notifications.length} notification{notifications.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
