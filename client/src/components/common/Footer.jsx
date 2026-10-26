import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Video, ShieldCheck } from 'lucide-react';

export default function Footer() {
  const location = useLocation();

  // Hide footer inside active meeting room
  if (location.pathname.startsWith('/meeting/') && !location.pathname.includes('/ended')) {
    return null;
  }

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
          {/* Brand Info */}
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-md">
                <Video className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-white">
                CampusVerse <span className="text-indigo-400">Meet</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs max-w-sm">
              Connect. Learn. Collaborate. Simple, modern, and reliable video conferencing.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex items-center gap-6 text-sm text-slate-300 font-semibold">
            <Link to="/create" className="hover:text-indigo-400 transition-colors">
              Create Meeting
            </Link>
            <Link to="/join" className="hover:text-indigo-400 transition-colors">
              Join Meeting
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3 text-center sm:text-left">
          <p>© {new Date().getFullYear()} CampusVerse Meet. All rights reserved.</p>
          <div className="flex items-center gap-4 text-teal-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-teal-400 inline" />
            <span>Encrypted WebRTC Audio & Video with Host Approval</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
