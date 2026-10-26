import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Star, Home, PlusCircle, LogIn, Video, Clock } from 'lucide-react';

export default function MeetingEnded() {
  const { meetingCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reason = searchParams.get('reason') || 'ended';
  const customMsg = searchParams.get('msg');

  const [rating, setRating] = useState(5);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const getReasonMessage = () => {
    if (customMsg) return customMsg;
    if (reason === 'host-ended' || reason === 'ended') {
      return 'The host has ended this meeting for all participants.';
    }
    if (reason === 'removed') {
      return 'You were removed from the meeting by the host.';
    }
    return 'You have left the meeting.';
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-sm">
          <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Meeting Concluded
          </h2>
          <p className="text-xs font-mono font-bold text-indigo-600 mt-1">
            Session Code: {meetingCode}
          </p>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            {getReasonMessage()}
          </p>
        </div>

        {/* Classroom Experience Rating */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            How was the audio & video clarity?
          </p>
          {!feedbackSubmitted ? (
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => {
                    setRating(star);
                    setFeedbackSubmitted(true);
                  }}
                  className="p-1 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs font-bold text-emerald-600">
              Thank you for your feedback!
            </p>
          )}
        </div>

        {/* Navigation Action Buttons */}
        <div className="space-y-3 pt-2">
          <Link
            to="/create"
            className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-sm shadow-md shadow-indigo-600/25 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Create Another Meeting
          </Link>

          <Link
            to="/"
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 bg-slate-50 border border-slate-200 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Home className="w-4 h-4 text-slate-500" />
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
