import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Users,
  MessageSquare,
  Megaphone,
  Smile,
  Settings,
  PhoneOff,
  LogOut,
  Hand
} from 'lucide-react';

export default function ControlToolbar({
  isMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
  isHandRaised = false,
  isHost = false,
  unreadChatCount = 0,
  pendingRequestCount = 0,
  isParticipantsOpen = false,
  isChatOpen = false,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHand,
  onToggleParticipants,
  onToggleChat,
  onOpenAnnouncements,
  onToggleReactions,
  onOpenSettings,
  onLeaveMeeting,
  onEndMeeting
}) {
  const [showEndDialog, setShowEndDialog] = useState(false);

  return (
    <>
      <footer className="h-20 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-3 sm:px-4 flex items-center justify-center select-none z-30 shadow-lg shadow-slate-200/50">
        <div className="flex items-center gap-2 sm:gap-3 max-w-full overflow-x-auto py-2 scrollbar-none">
          {/* 1. Microphone Toggle */}
          <button
            type="button"
            onClick={onToggleMic}
            className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all shadow-xs active:scale-95 border ${
              isMuted
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 shadow-rose-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* 2. Camera Toggle */}
          <button
            type="button"
            onClick={onToggleVideo}
            className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all shadow-xs active:scale-95 border ${
              isVideoOff
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 shadow-rose-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* 3. Screen Sharing */}
          <button
            type="button"
            onClick={onToggleScreenShare}
            className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all shadow-xs active:scale-95 border ${
              isScreenSharing
                ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600 shadow-md shadow-teal-600/30 ring-2 ring-teal-400/40'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
            }`}
            title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          >
            <ScreenShare className="w-5 h-5" />
          </button>

          <div className="h-8 w-px bg-slate-200 mx-0.5 sm:mx-1 hidden sm:block" />

          {/* 4. Raise Hand */}
          <button
            type="button"
            onClick={onToggleHand}
            className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all shadow-xs active:scale-95 border ${
              isHandRaised
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-bold ring-2 ring-amber-300/50'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
            }`}
            title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* 5. Reactions Menu */}
          <button
            type="button"
            onClick={onToggleReactions}
            className="flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-all shadow-xs active:scale-95"
            title="Emoji Reactions"
          >
            <Smile className="w-5 h-5 text-amber-500" />
          </button>

          {/* 6. Announcement / Update Broadcast */}
          <button
            type="button"
            onClick={onOpenAnnouncements}
            className="flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-teal-600 hover:text-teal-700 border border-slate-200/80 transition-all shadow-xs active:scale-95"
            title="Share an update or link with the class"
          >
            <Megaphone className="w-5 h-5" />
          </button>

          {/* 7. Participants Drawer Toggle */}
          <button
            type="button"
            onClick={onToggleParticipants}
            className={`relative flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all shadow-xs active:scale-95 border ${
              isParticipantsOpen
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
            }`}
            title="Participants & Admission Requests"
          >
            <Users className="w-5 h-5" />
            {pendingRequestCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                {pendingRequestCount}
              </span>
            )}
          </button>

          {/* 8. Chat Drawer Toggle */}
          <button
            type="button"
            onClick={onToggleChat}
            className={`relative flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all shadow-xs active:scale-95 border ${
              isChatOpen
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
            }`}
            title="Meeting Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadChatCount > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* 9. Audio & Video Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-all shadow-xs active:scale-95"
            title="Audio & Video Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="h-8 w-px bg-slate-200 mx-0.5 sm:mx-1" />

          {/* 10. Leave Meeting */}
          <button
            type="button"
            onClick={onLeaveMeeting}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 h-11 sm:h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200/80 transition-all shadow-xs font-bold text-xs active:scale-95"
            title="Leave Meeting (Meeting remains active for other participants)"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">Leave</span>
          </button>

          {/* 11. End Meeting for Everyone (HOST ONLY) */}
          {isHost && (
            <button
              type="button"
              onClick={() => setShowEndDialog(true)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 h-11 sm:h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md shadow-rose-600/25 font-bold text-xs active:scale-95"
              title="End Meeting for all participants"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">End Meeting</span>
            </button>
          )}
        </div>
      </footer>

      {/* Host Confirmation Dialog for End Meeting */}
      {showEndDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200 shadow-sm">
              <PhoneOff className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-2">
              End meeting for everyone?
            </h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              This will immediately disconnect all participants, close the live room, and conclude the meeting session.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEndDialog(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEndDialog(false);
                  onEndMeeting();
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
              >
                End Meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
