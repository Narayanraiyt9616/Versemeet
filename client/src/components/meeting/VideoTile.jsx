import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Crown, Pin, PinOff, Monitor, Hand } from 'lucide-react';

export default function VideoTile({
  stream,
  name = 'Participant',
  role = 'participant',
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  isSpeaking = false,
  isPinned = false,
  isScreenSharing = false,
  isHandRaised = false,
  onTogglePin
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const getInitials = (n) => {
    if (!n) return 'P';
    return n
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getGradient = (n) => {
    const gradients = [
      'from-indigo-600 to-blue-700',
      'from-teal-600 to-emerald-700',
      'from-purple-600 to-indigo-800',
      'from-blue-600 to-cyan-700',
      'from-rose-600 to-pink-700'
    ];
    let sum = 0;
    for (let i = 0; i < (n?.length || 0); i++) sum += n.charCodeAt(i);
    return gradients[sum % gradients.length];
  };

  return (
    <div
      className={`relative w-full h-full min-h-[160px] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden shadow-md shadow-slate-200/50 border transition-all duration-300 group select-none ${
        isSpeaking
          ? 'ring-4 ring-indigo-500/80 ring-offset-2 ring-offset-white border-indigo-500'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      {/* Video element */}
      {stream && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Mute local video to prevent audio feedback loop
          className={`w-full h-full ${
            isScreenSharing ? 'object-contain bg-slate-950' : 'object-cover'
          } ${isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* Camera Off Placeholder with modern light educational styling */
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 p-6">
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr ${getGradient(
              name
            )} flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold shadow-lg shadow-indigo-500/20 border-2 border-white select-none transition-transform group-hover:scale-105`}
          >
            {getInitials(name)}
          </div>
          <span className="mt-3 text-slate-800 text-sm font-bold truncate max-w-[200px]">
            {name} {isLocal && <span className="text-slate-500 font-normal">(You)</span>}
          </span>
          <span className="text-[11px] text-slate-400 font-semibold mt-0.5">Camera is off</span>
        </div>
      )}

      {/* Top Badges (Host & Screen Sharing & Pin) */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          {role === 'host' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50/95 text-amber-800 border border-amber-200/90 shadow-sm backdrop-blur-md">
              <Crown className="w-3.5 h-3.5 fill-current text-amber-600" />
              <span>Host</span>
            </span>
          )}
          {isHandRaised && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100/95 text-amber-900 border border-amber-300 shadow-sm backdrop-blur-md animate-bounce">
              <Hand className="w-3.5 h-3.5 fill-current text-amber-600" />
              <span>Hand Raised</span>
            </span>
          )}
          {isScreenSharing && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50/95 text-indigo-700 border border-indigo-200/90 shadow-sm backdrop-blur-md">
              <Monitor className="w-3.5 h-3.5 text-indigo-600" />
              <span>Presenter</span>
            </span>
          )}
        </div>

        {/* Pin to Spotlight on hover */}
        {onTogglePin && (
          <button
            type="button"
            onClick={onTogglePin}
            className={`pointer-events-auto p-1.5 rounded-xl backdrop-blur-md transition-all shadow-sm ${
              isPinned
                ? 'bg-indigo-600 text-white'
                : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 opacity-0 group-hover:opacity-100'
            }`}
            title={isPinned ? 'Unpin video' : 'Pin to spotlight'}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Bottom Name Badge & Mic Status */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-sm max-w-[85%]">
          {/* Speaking Indicator Dot */}
          <span
            className={`w-2 h-2 rounded-full transition-colors flex-shrink-0 ${
              isSpeaking ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'
            }`}
          />
          <span className="text-slate-900 text-xs font-bold truncate tracking-tight">
            {name} {isLocal && <span className="text-slate-500 font-normal">(You)</span>}
          </span>
        </div>

        {/* Mic status icon badge */}
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center backdrop-blur-md shadow-sm border ${
            isMuted
              ? 'bg-rose-50 text-rose-600 border-rose-200'
              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
          }`}
          title={isMuted ? 'Microphone Muted' : 'Microphone Active'}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  );
}
