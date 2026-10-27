import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, Home, PlusCircle, LogIn, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="min-h-[85vh] bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-sm">
          <AlertCircle className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
            Error 404
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            Page Not Found
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-1 break-all bg-slate-100 p-2 rounded-lg">
            {location.pathname}
          </p>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            The page or meeting link you are looking for doesn't exist, has expired, or may have been moved.
          </p>
        </div>

        {/* Quick Navigation Action Buttons */}
        <div className="space-y-3 pt-2">
          <Link
            to="/"
            className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-sm shadow-md shadow-indigo-600/25 active:scale-95"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/join"
              className="py-3 px-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 bg-slate-50 border border-slate-200 transition-all flex items-center justify-center gap-2 text-xs"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" />
              Join Meeting
            </Link>
            <Link
              to="/create"
              className="py-3 px-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 bg-slate-50 border border-slate-200 transition-all flex items-center justify-center gap-2 text-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
              New Meeting
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
