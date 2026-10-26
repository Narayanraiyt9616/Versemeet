import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Video, PlusCircle, LogIn } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  // If in active meeting room, navbar is hidden to maximize video area
  if (location.pathname.startsWith('/meeting/') && !location.pathname.includes('/ended')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <Video className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-indigo-700 via-blue-700 to-teal-700 bg-clip-text text-transparent">
                CampusVerse
              </span>
              <span className="text-xl font-bold text-slate-800">
                Meet
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Connect. Learn. Collaborate.
            </p>
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/join"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/80 transition-all border border-slate-200"
          >
            <LogIn className="w-4 h-4 text-slate-500" />
            <span>Join Meeting</span>
          </Link>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-500/25 transition-all hover:shadow-lg hover:shadow-indigo-500/35 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Meeting</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
