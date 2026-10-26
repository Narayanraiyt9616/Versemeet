import React from 'react';
import { X, Settings, Activity, Video, Mic, ShieldCheck } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  statsData = {},
  connectionQuality = 'good',
  onChangeResolution
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/90 text-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/80">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Meeting Settings</h3>
              <p className="text-xs text-slate-500">Media quality & connection diagnostics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Video Quality Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-indigo-600" />
              Camera Resolution & Quality
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: '1080p', label: '1080p Full HD', desc: 'Best clarity for presentations' },
                { id: '720p', label: '720p HD (Default)', desc: 'Balanced quality & speed' },
                { id: '480p', label: '480p Standard', desc: 'Good for standard laptops' },
                { id: '360p', label: '360p Low Data', desc: 'Best on mobile/weak wifi' }
              ].map((res) => (
                <button
                  key={res.id}
                  onClick={() => onChangeResolution(res.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    statsData.resolution?.includes(res.id)
                      ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold">{res.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{res.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* WebRTC Diagnostics Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Live WebRTC Diagnostics
            </h4>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm">
                <p className="text-[10px] text-slate-500 font-medium">Latency (RTT)</p>
                <p className="text-base font-extrabold text-emerald-600 mt-0.5">
                  {statsData.rtt || 35} ms
                </p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm">
                <p className="text-[10px] text-slate-500 font-medium">Packet Loss</p>
                <p className="text-base font-extrabold text-indigo-600 mt-0.5">
                  {statsData.packetLoss || 0}%
                </p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm">
                <p className="text-[10px] text-slate-500 font-medium">Active Mode</p>
                <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                  {statsData.resolution || '720p HD'}
                </p>
              </div>
            </div>
          </div>

          {/* Audio Features */}
          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Echo cancellation, auto gain control, and noise suppression active.</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
