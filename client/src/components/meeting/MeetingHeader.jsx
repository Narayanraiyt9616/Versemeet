import React, { useState, useEffect } from 'react';
import { Video, Copy, Check, Users, Clock, Shield, Bell } from 'lucide-react';

export default function MeetingHeader({
  meetingTitle = 'CampusVerse Meeting',
  meetingCode = '',
  participantCount = 1,
  pendingRequestCount = 0,
  notificationCount = 0,
  connectionQuality = 'good',
  rtt = 35,
  isHost = false,
  onOpenParticipants,
  onToggleNotifications,
  isNotificationsOpen = false
}) {
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live duration counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m
        .toString()
        .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/meeting/${meetingCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qualityConfig = {
    excellent: { label: 'HD Excellent', color: 'bg-emerald-500', text: 'text-emerald-700' },
    good: { label: 'Stable', color: 'bg-teal-500', text: 'text-teal-700' },
    poor: { label: 'Unstable', color: 'bg-amber-500', text: 'text-amber-700' }
  }[connectionQuality] || { label: 'Online', color: 'bg-teal-500', text: 'text-teal-700' };

  return (
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-5 flex items-center justify-between text-slate-800 select-none z-30 shadow-xs">
      {/* Brand & Meeting Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 truncate">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
          <Video className="w-4 h-4 stroke-[2.2]" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900 hidden sm:inline">
              CampusVerse Meet
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="font-bold text-xs sm:text-sm text-slate-750 truncate max-w-[120px] sm:max-w-[260px]">
              {meetingTitle}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-mono bg-slate-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded border border-slate-200 text-[10px]">
              {meetingCode}
            </span>
            {isHost && (
              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded text-[10px] font-bold flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-amber-600" /> Host
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Live Timer & Connection Quality (Hidden on small mobile) */}
      <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-xs">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-mono font-bold">{formatDuration(elapsedSeconds)}</span>
        </div>
        <span className="text-slate-300">•</span>
        <div className="flex items-center gap-1.5" title={`RTT: ${rtt}ms`}>
          <span className={`w-2 h-2 rounded-full ${qualityConfig.color}`} />
          <span className={`text-[11px] font-semibold ${qualityConfig.text}`}>
            {qualityConfig.label}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">({rtt}ms)</span>
        </div>
      </div>

      {/* Right Action buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Notification Bell Button */}
        <button
          type="button"
          onClick={onToggleNotifications}
          className={`relative p-2 rounded-xl transition-all border ${
            isNotificationsOpen
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
          }`}
          title="Notifications & Alerts"
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && !isNotificationsOpen && (
            <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-sm">
              {notificationCount}
            </span>
          )}
        </button>

        {/* Copy Meeting Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200/80"
          title="Copy meeting link to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Copy Link</span>
            </>
          )}
        </button>

        {/* Participants count button */}
        <button
          type="button"
          onClick={onOpenParticipants}
          className="relative flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200/80"
          title="View participants"
        >
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span>{participantCount}</span>
          {pendingRequestCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
              {pendingRequestCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
