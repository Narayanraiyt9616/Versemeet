import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Video,
  Copy,
  Check,
  ArrowRight,
  Shield,
  Sparkles,
  Clock
} from 'lucide-react';

export default function CreateMeeting() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [hostName, setHostName] = useState('');
  const [settings, setSettings] = useState({
    allowStudentScreenShare: true,
    allowStudentChat: true,
    allowStudentAnnouncements: true,
    isWaitingRoomEnabled: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdMeeting, setCreatedMeeting] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHostLink, setCopiedHostLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.createMeeting({
        title: title.trim() || 'CampusVerse Meeting',
        hostName: hostName.trim() || 'Meeting Host',
        settings
      });

      const cleanCode = (data.meetingCode || '').trim().toLowerCase();
      // Store host credentials in sessionStorage (for this creator tab) and localStorage (persistence)
      sessionStorage.setItem(`hostToken_${cleanCode}`, data.hostToken);
      sessionStorage.setItem(`hostName_${cleanCode}`, data.hostName);
      localStorage.setItem(`hostToken_${cleanCode}`, data.hostToken);
      localStorage.setItem(`hostName_${cleanCode}`, data.hostName);

      setCreatedMeeting({ ...data, meetingCode: cleanCode });
    } catch (err) {
      setError(err.message || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const getMeetingUrl = () => {
    if (!createdMeeting) return '';
    const origin = import.meta.env.VITE_CLIENT_URL || window.location.origin;
    return `${origin}/meeting/${createdMeeting.meetingCode}`;
  };

  const getHostUrl = () => {
    if (!createdMeeting) return '';
    const origin = import.meta.env.VITE_CLIENT_URL || window.location.origin;
    return `${origin}/meeting/${createdMeeting.meetingCode}?hostToken=${encodeURIComponent(createdMeeting.hostToken)}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getMeetingUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyHostLink = () => {
    navigator.clipboard.writeText(getHostUrl());
    setCopiedHostLink(true);
    setTimeout(() => setCopiedHostLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(createdMeeting.meetingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleEnterAsHost = () => {
    navigate(`/meeting/${createdMeeting.meetingCode}`);
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full">
        {!createdMeeting ? (
          /* CREATE MEETING FORM */
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Video className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Create Meeting
                </h2>
                <p className="text-xs text-slate-500">
                  Generate a shareable link and meeting room
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Your Name (Host) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  required
                  maxLength={50}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Meeting Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Design Review & Planning"
                  maxLength={100}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              {/* Host Permissions */}
              <div className="pt-2">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700">
                      Enable Waiting Room (Host approves join requests)
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.isWaitingRoomEnabled}
                      onChange={(e) =>
                        setSettings({ ...settings, isWaitingRoomEnabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700">
                      Allow Participant Screen Sharing
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.allowStudentScreenShare}
                      onChange={(e) =>
                        setSettings({ ...settings, allowStudentScreenShare: e.target.checked })
                      }
                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700">
                      Allow In-Meeting Chat
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.allowStudentChat}
                      onChange={(e) =>
                        setSettings({ ...settings, allowStudentChat: e.target.checked })
                      }
                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !hostName.trim()}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <span>Creating Meeting Room...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Meeting</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* MEETING CREATED SUCCESS CARD */
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Meeting Room Ready!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Share this link or code with anyone you want to invite.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 mb-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Meeting Title
                </p>
                <p className="text-base font-bold text-slate-800 mt-0.5">
                  {createdMeeting.title}
                </p>
              </div>

              {/* Unique Meeting Code */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Meeting ID
                  </p>
                  <p className="text-sm font-mono font-bold text-indigo-600">
                    {createdMeeting.meetingCode}
                  </p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedCode ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>

              {/* Student Shareable URL */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Student Link (Share to Portal / Class)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Students will wait in the waiting room for your admission
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer flex-shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied Link!' : 'Copy Student Link'}</span>
                  </button>
                </div>
                <p className="text-xs font-mono text-slate-600 truncate bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1.5">
                  {getMeetingUrl()}
                </p>
              </div>

              {/* Faculty Host URL (Direct Access) */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-indigo-600" />
                      Faculty Host Direct Link
                    </p>
                    <p className="text-[11px] text-indigo-600/80">
                      Direct host entry from any browser or portal schedule
                    </p>
                  </div>
                  <button
                    onClick={handleCopyHostLink}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer flex-shrink-0"
                  >
                    {copiedHostLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHostLink ? 'Copied!' : 'Copy Host Link'}</span>
                  </button>
                </div>
                <p className="text-xs font-mono text-indigo-900/80 truncate bg-white p-2 rounded-lg border border-indigo-200/60 mt-1.5">
                  {getHostUrl()}
                </p>
              </div>

              {/* Status and Time */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Status: <strong>Active Waiting Room</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Created {new Date(createdMeeting.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleEnterAsHost}
                className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
              >
                <span>Start Meeting as Host</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
