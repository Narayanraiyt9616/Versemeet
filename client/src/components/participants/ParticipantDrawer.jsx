import React, { useState } from 'react';
import {
  X,
  Users,
  Clock,
  Mic,
  MicOff,
  Crown,
  Hand,
  UserX,
  VolumeX,
  Shield,
  CheckCheck,
  Check
} from 'lucide-react';

export default function ParticipantDrawer({
  isOpen = false,
  onClose,
  participants = [],
  pendingRequests = [],
  isHost = false,
  settings = {},
  onApproveRequest,
  onRejectRequest,
  onMuteParticipant,
  onKickParticipant,
  onUpdateSettings
}) {
  const [activeTab, setActiveTab] = useState('admitted'); // admitted, requests, settings

  const uniqueParticipants = React.useMemo(() => {
    return Array.from(
      new Map((participants || []).filter(Boolean).map(p => [p.socketId, p])).values()
    );
  }, [participants]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white/98 backdrop-blur-2xl border-l border-slate-200 text-slate-900 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 select-none">
      {/* Drawer Header */}
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              Participants
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {uniqueParticipants.length}
              </span>
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs (Admitted vs Waiting Room Requests vs Permissions) */}
      <div className="flex border-b border-slate-200 px-4 pt-2 gap-2 text-xs font-bold bg-slate-50/40">
        <button
          type="button"
          onClick={() => setActiveTab('admitted')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'admitted'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          In Meeting ({uniqueParticipants.length})
        </button>

        {isHost && (
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`pb-2.5 px-3 border-b-2 transition-all relative cursor-pointer ${
              activeTab === 'requests'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Waiting Room
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px]">
                {pendingRequests.length}
              </span>
            )}
          </button>
        )}

        {isHost && (
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Permissions
          </button>
        )}
      </div>

      {/* Tab 1: Admitted Participants */}
      {activeTab === 'admitted' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin bg-white">
          {uniqueParticipants.map((p) => (
            <div
              key={p.socketId}
              className="p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/80 flex items-center justify-between group transition-all shadow-xs"
            >
              <div className="flex items-center gap-3 truncate">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0 shadow-sm">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">{p.name}</span>
                    {p.role === 'host' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        <Crown className="w-2.5 h-2.5 fill-current text-amber-600" /> Host
                      </span>
                    )}
                  </div>
                  {p.isHandRaised && (
                    <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1 mt-0.5">
                      <Hand className="w-3 h-3 text-amber-500" /> Hand Raised
                    </span>
                  )}
                </div>
              </div>

              {/* Status Icons & Host Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Hand icon if raised */}
                {p.isHandRaised && (
                  <div className="p-1 rounded-lg bg-amber-100 text-amber-700" title="Hand Raised">
                    <Hand className="w-3.5 h-3.5 fill-current" />
                  </div>
                )}

                {/* Mic Status */}
                <div
                  className={`p-1.5 rounded-xl border ${
                    p.isMuted
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}
                  title={p.isMuted ? 'Muted' : 'Mic Active'}
                >
                  {p.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </div>

                {/* Host Moderation Controls */}
                {isHost && p.role !== 'host' && (
                  <div className="flex items-center gap-1 ml-1 opacity-90 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onMuteParticipant(p.socketId)}
                      className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors shadow-xs"
                      title="Mute participant"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onKickParticipant(p.socketId)}
                      className="p-1.5 rounded-xl bg-white hover:bg-rose-600 text-slate-500 hover:text-white border border-slate-200 hover:border-rose-600 transition-colors shadow-xs"
                      title="Remove from meeting"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Waiting Room Requests (Host Only) */}
      {activeTab === 'requests' && isHost && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-white">
          {pendingRequests.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200/60">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Waiting Room is Empty</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-[220px] leading-relaxed">
                People requesting to join will appear here for your admission.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">
                  {pendingRequests.length} pending request{pendingRequests.length > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    pendingRequests.forEach((r) => onApproveRequest(r.socketId));
                  }}
                  className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Admit All
                </button>
              </div>

              {pendingRequests.map((req) => (
                <div
                  key={req.socketId}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col gap-2.5 shadow-xs"
                >
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900">{req.name}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Requesting admission</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => onRejectRequest(req.socketId)}
                      className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => onApproveRequest(req.socketId)}
                      className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Admit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Permissions & Moderation Settings (Host Only) */}
      {activeTab === 'settings' && isHost && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-4 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-600" /> Meeting Permissions
            </h4>

            {/* Toggle Screen Share */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">Participant Screen Sharing</p>
                <p className="text-[11px] text-slate-500">Allow participants to share screens</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowStudentScreenShare !== false}
                onChange={(e) =>
                  onUpdateSettings({ allowStudentScreenShare: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Toggle Chat */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">In-Meeting Chat</p>
                <p className="text-[11px] text-slate-500">Allow participants to send chat messages</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowStudentChat !== false}
                onChange={(e) =>
                  onUpdateSettings({ allowStudentChat: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Toggle Announcements */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">Participant Announcements</p>
                <p className="text-[11px] text-slate-500">Allow participants to broadcast updates</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowStudentAnnouncements !== false}
                onChange={(e) =>
                  onUpdateSettings({ allowStudentAnnouncements: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
