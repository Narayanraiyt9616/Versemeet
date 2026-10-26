import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { parseMeetingCode } from '../utils/meetingCodeParser';
import {
  Video,
  PlusCircle,
  LogIn,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Headphones,
  Laptop,
  Users,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  // Create Meeting state
  const [createHostName, setCreateHostName] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdData, setCreatedData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Join Meeting state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinNameInput, setJoinNameInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Handle Create Meeting
  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError('');

    try {
      const data = await api.createMeeting({
        title: createTitle.trim() || 'CampusVerse Meeting',
        hostName: createHostName.trim() || 'Meeting Host',
        settings: {
          isWaitingRoomEnabled: true,
          allowStudentScreenShare: true,
          allowStudentChat: true,
          allowStudentAnnouncements: true
        }
      });

      const cleanCode = (data.meetingCode || '').trim().toLowerCase();
      // Save host token and host name in localStorage for authorization
      localStorage.setItem(`hostToken_${cleanCode}`, data.hostToken);
      localStorage.setItem(`hostName_${cleanCode}`, data.hostName);

      setCreatedData({ ...data, meetingCode: cleanCode });
    } catch (err) {
      setCreateError(err.message || 'Failed to create meeting room');
    } finally {
      setIsCreating(false);
    }
  };

  const getMeetingUrl = (code) => {
    const origin = import.meta.env.VITE_CLIENT_URL || window.location.origin;
    return `${origin}/meeting/${code}`;
  };

  const handleCopyLink = () => {
    if (!createdData) return;
    navigator.clipboard.writeText(getMeetingUrl(createdData.meetingCode));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!createdData) return;
    navigator.clipboard.writeText(createdData.meetingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleStartMeeting = () => {
    if (!createdData) return;
    navigate(`/meeting/${createdData.meetingCode}`);
  };

  // Handle Join Meeting
  const handleJoinMeeting = async (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim() || !joinNameInput.trim()) return;

    setIsJoining(true);
    setJoinError('');

    try {
      const code = parseMeetingCode(joinCodeInput);
      if (!code) {
        setJoinError('Please enter a valid meeting code or link.');
        setIsJoining(false);
        return;
      }

      // Verify meeting exists on backend
      const validation = await api.getMeeting(code);
      if (validation.status === 'ended') {
        setJoinError('This meeting has already ended.');
        setIsJoining(false);
        return;
      }

      // Store initial pre-fill for waiting room
      sessionStorage.setItem(`versemeet_name_preset`, joinNameInput.trim());

      // Navigate to waiting room
      navigate(`/waiting/${code}?name=${encodeURIComponent(joinNameInput.trim())}`);
    } catch (err) {
      setJoinError(err.message || 'Invalid meeting link or code. Please check and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[85vh] bg-slate-50">
      {/* HERO SECTION */}
      <section className="relative pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-200/80 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* CampusVerse Meet Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-5 shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>CampusVerse Meet</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Connect. Learn.{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 bg-clip-text text-transparent">
                Collaborate.
              </span>
            </h1>

            {/* Description */}
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Create a meeting, share your link, and connect with others through seamless video communication.
            </p>
          </div>

          {/* DUAL ACTION CARDS: CREATE MEETING & JOIN MEETING */}
          <div className="mt-12 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* CARD 1: CREATE MEETING */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
                    <Video className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Create Meeting</h2>
                    <p className="text-xs text-slate-500">Generate a new meeting room instantly</p>
                  </div>
                </div>

                {createError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                {!createdData ? (
                  <form onSubmit={handleCreateMeeting} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Your Name (Host)
                      </label>
                      <input
                        type="text"
                        value={createHostName}
                        onChange={(e) => setCreateHostName(e.target.value)}
                        placeholder="e.g. Alex Rivera"
                        required
                        maxLength={50}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Meeting Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={createTitle}
                        onChange={(e) => setCreateTitle(e.target.value)}
                        placeholder="e.g. Project Discussion"
                        maxLength={80}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isCreating}
                      className="w-full py-3.5 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{isCreating ? 'Creating Room...' : 'Create Meeting'}</span>
                    </button>
                  </form>
                ) : (
                  /* CREATED ROOM DETAILS */
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-1">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Meeting Room Created!</span>
                      </div>
                      <p className="text-xs text-slate-600 truncate">
                        Title: <strong>{createdData.title}</strong>
                      </p>
                    </div>

                    {/* Meeting Code */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Meeting ID
                        </p>
                        <p className="text-sm font-mono font-bold text-indigo-600">
                          {createdData.meetingCode}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? 'Copied' : 'Copy ID'}</span>
                      </button>
                    </div>

                    {/* Shareable Link */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Shareable Link
                        </p>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
                        </button>
                      </div>
                      <p className="text-xs font-mono text-slate-600 truncate bg-white p-2 rounded-lg border border-slate-200">
                        {getMeetingUrl(createdData.meetingCode)}
                      </p>
                    </div>

                    {/* Action: Start Meeting */}
                    <button
                      type="button"
                      onClick={handleStartMeeting}
                      className="w-full py-3.5 px-6 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
                    >
                      <span>Start Meeting</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: JOIN MEETING */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shadow-sm">
                    <LogIn className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Join Meeting</h2>
                    <p className="text-xs text-slate-500">Enter a meeting using code or shared link</p>
                  </div>
                </div>

                {joinError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}

                <form onSubmit={handleJoinMeeting} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Meeting Link or ID
                    </label>
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => {
                        setJoinCodeInput(e.target.value);
                        setJoinError('');
                      }}
                      placeholder="e.g. vm-205-3432-346 or meeting link"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Your Display Name
                    </label>
                    <input
                      type="text"
                      value={joinNameInput}
                      onChange={(e) => {
                        setJoinNameInput(e.target.value);
                        setJoinError('');
                      }}
                      placeholder="e.g. Jordan Lee"
                      required
                      maxLength={50}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isJoining || !joinCodeInput.trim() || !joinNameInput.trim()}
                    className="w-full py-3.5 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md shadow-teal-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-sm"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isJoining ? 'Joining Meeting...' : 'Join Meeting'}</span>
                  </button>
                </form>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>Host will approve your request before you enter.</span>
              </div>
            </div>

          </div>

          {/* SIMPLIFIED FEATURE HIGHLIGHTS */}
          <div className="mt-14 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <ShieldCheck className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
              <h3 className="font-bold text-xs text-slate-800">Host Approval</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Secure admission control</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <Headphones className="w-6 h-6 text-teal-600 mx-auto mb-2" />
              <h3 className="font-bold text-xs text-slate-800">Clear Audio</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Echo cancellation & speaker glow</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <Laptop className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <h3 className="font-bold text-xs text-slate-800">Screen Sharing</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Spotlight presentations</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <h3 className="font-bold text-xs text-slate-800">Responsive Grid</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Auto-adjusts for all peers</p>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
