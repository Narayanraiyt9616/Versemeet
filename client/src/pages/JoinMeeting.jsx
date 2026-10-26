import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { parseMeetingCode } from '../utils/meetingCodeParser';

export default function JoinMeeting() {
  const navigate = useNavigate();
  const [inputVal, setInputVal] = useState('');
  const [nameVal, setNameVal] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || !nameVal.trim()) return;

    const code = parseMeetingCode(inputVal);

    if (!code) {
      setError('Please enter a valid meeting code or link.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.getMeeting(code);
      if (data.status === 'ended') {
        setError('This meeting has already ended.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('versemeet_name_preset', nameVal.trim());
      navigate(`/waiting/${code}?name=${encodeURIComponent(nameVal.trim())}`);
    } catch (err) {
      setError(err.message || 'Meeting not found. Please check your meeting link or code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4 border border-teal-200 shadow-sm">
            <LogIn className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Join Meeting
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter the meeting link or ID to connect
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Meeting ID or Link
            </label>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setError('');
              }}
              placeholder="e.g. vm-205-3432-346 or meeting link"
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Your Display Name
            </label>
            <input
              type="text"
              value={nameVal}
              onChange={(e) => {
                setNameVal(e.target.value);
                setError('');
              }}
              placeholder="e.g. Jordan Lee"
              required
              maxLength={50}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !inputVal.trim() || !nameVal.trim()}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-sm"
          >
            <span>{loading ? 'Verifying...' : 'Proceed to Waiting Room'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <span>
            You will preview your camera and microphone in the waiting room before requesting admission from the host.
          </span>
        </div>
      </div>
    </div>
  );
}
