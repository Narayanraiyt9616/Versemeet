import React, { useState, useEffect } from 'react';
import VideoTile from './VideoTile';
import { LayoutGrid, Monitor, PinOff } from 'lucide-react';

export default function VideoGrid({
  localStream,
  localParticipant,
  remoteStreams = {},
  participants = [],
  screenStream = null,
  activePresenterSocketId = null,
  isLocalScreenSharing = false,
  isMuted = false,
  isVideoOff = false,
  speakingParticipants = new Set(),
  onStopScreenShare,
  isHost = false
}) {
  const [pinnedSocketId, setPinnedSocketId] = useState(null);
  const [viewPreference, setViewPreference] = useState('presentation'); // 'presentation' or 'grid'

  // Determine if screen sharing is active anywhere in room
  const isScreenActive = isLocalScreenSharing || !!activePresenterSocketId;

  // Auto-switch to presentation view when someone starts screen sharing
  useEffect(() => {
    if (isScreenActive) {
      setViewPreference('presentation');
    }
  }, [isScreenActive, activePresenterSocketId, isLocalScreenSharing]);

  // Compile all participant tiles
  const allTiles = [];

  // 1. Local participant: ONLY the verified host gets 'host' role, all joiners are 'participant'
  allTiles.push({
    socketId: 'local',
    name: localParticipant?.name || 'You',
    role: isHost ? 'host' : 'participant',
    isLocal: true,
    stream: localStream,
    isMuted,
    isVideoOff,
    isSpeaking:
      speakingParticipants.has('local') ||
      speakingParticipants.has(localParticipant?.socketId),
    isScreenSharing: isLocalScreenSharing
  });

  // 2. Remote participants
  participants.forEach((p) => {
    if (p.socketId === localParticipant?.socketId || p.socketId === 'local') return;

    allTiles.push({
      socketId: p.socketId,
      name: p.name,
      role: p.role === 'host' ? 'host' : 'participant',
      isLocal: false,
      stream: remoteStreams[p.socketId] || null,
      isMuted: p.isMuted,
      isVideoOff: p.isVideoOff,
      isSpeaking: speakingParticipants.has(p.socketId),
      isScreenSharing: p.isScreenSharing || p.socketId === activePresenterSocketId
    });
  });

  // Presentation spotlight tile
  const presenterTile = isLocalScreenSharing
    ? {
        socketId: 'screen-local',
        name: `${localParticipant?.name || 'You'} (Shared Screen)`,
        role: isHost ? 'host' : 'participant',
        isLocal: true,
        stream: screenStream,
        isVideoOff: false,
        isMuted: true,
        isScreenSharing: true
      }
    : allTiles.find((t) => t.socketId === activePresenterSocketId) || {
        socketId: activePresenterSocketId || 'screen-remote',
        name: 'Shared Screen',
        role: 'participant',
        isLocal: false,
        stream: remoteStreams[activePresenterSocketId] || null,
        isVideoOff: false,
        isMuted: true,
        isScreenSharing: true
      };

  // Determine if spotlight mode should be active
  const isSpotlightActive =
    (isScreenActive && viewPreference === 'presentation') || !!pinnedSocketId;

  const currentSpotlightTile = isScreenActive && viewPreference === 'presentation'
    ? presenterTile
    : pinnedSocketId
    ? allTiles.find((t) => t.socketId === pinnedSocketId)
    : null;

  // Compute CSS layout classes for balanced responsive grid
  const getGridClasses = (count) => {
    if (count <= 1) return 'grid-cols-1 max-w-3xl max-h-[75vh]';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-5xl max-h-[75vh]';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl';
    if (count === 4) return 'grid-cols-1 sm:grid-cols-2 max-w-5xl';
    if (count <= 6) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl';
    if (count <= 9) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-7xl';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 max-w-7xl';
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* View Switcher Controls (When screen sharing or pinned tile is active) */}
      {(isScreenActive || pinnedSocketId) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-2xl border border-slate-200/90 shadow-md">
          <button
            type="button"
            onClick={() => setViewPreference('presentation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewPreference === 'presentation'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Presentation View</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewPreference('grid');
              setPinnedSocketId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewPreference === 'grid'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid View</span>
          </button>

          {pinnedSocketId && (
            <button
              type="button"
              onClick={() => setPinnedSocketId(null)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              title="Reset pinned view"
            >
              <PinOff className="w-3.5 h-3.5" />
              <span>Unpin</span>
            </button>
          )}
        </div>
      )}

      {/* 1. SPOTLIGHT PRESENTATION VIEW */}
      {isSpotlightActive && currentSpotlightTile ? (
        <div className="flex-1 w-full h-full flex flex-col lg:flex-row gap-3 sm:gap-4 p-3 sm:p-4 overflow-hidden pt-12 sm:pt-14">
          {/* Main Stage (Shared Screen / Spotlight Tile) */}
          <div className="flex-1 h-full min-h-[45vh] rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 shadow-xl border border-slate-200/90 relative">
            <VideoTile
              stream={currentSpotlightTile.stream}
              name={currentSpotlightTile.name}
              role={currentSpotlightTile.role}
              isLocal={currentSpotlightTile.isLocal}
              isMuted={currentSpotlightTile.isMuted}
              isVideoOff={currentSpotlightTile.isVideoOff}
              isSpeaking={currentSpotlightTile.isSpeaking}
              isScreenSharing={true}
              isPinned={true}
              onTogglePin={() => setPinnedSocketId(null)}
            />
          </div>

          {/* Filmstrip of Participants (Sidebar on desktop, bottom carousel on mobile) */}
          <div className="lg:w-72 xl:w-80 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto pb-1 lg:pb-0 scrollbar-thin flex-shrink-0 max-h-[22vh] lg:max-h-full">
            {allTiles
              .filter((t) => t.socketId !== currentSpotlightTile.socketId)
              .map((tile) => (
                <div
                  key={tile.socketId}
                  className="w-48 sm:w-56 lg:w-full h-32 sm:h-36 lg:h-44 flex-shrink-0"
                >
                  <VideoTile
                    {...tile}
                    isPinned={pinnedSocketId === tile.socketId}
                    onTogglePin={() =>
                      setPinnedSocketId(
                        pinnedSocketId === tile.socketId ? null : tile.socketId
                      )
                    }
                  />
                </div>
              ))}
          </div>
        </div>
      ) : (
        /* 2. AUTO-ADAPTIVE RESPONSIVE GRID VIEW */
        <div className="flex-1 w-full h-full flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div
            className={`grid w-full gap-3 sm:gap-4 md:gap-5 auto-rows-fr items-center justify-center ${getGridClasses(
              allTiles.length
            )}`}
          >
            {allTiles.map((tile, idx) => {
              // Center single tile on odd 3-participant layouts on medium screens
              const isCenteredThird =
                allTiles.length === 3 && idx === 2
                  ? 'sm:col-span-2 sm:max-w-[50%] sm:mx-auto lg:col-span-1 lg:max-w-none'
                  : '';

              return (
                <div
                  key={tile.socketId}
                  className={`aspect-video w-full flex items-center justify-center ${isCenteredThird}`}
                >
                  <VideoTile
                    {...tile}
                    isPinned={pinnedSocketId === tile.socketId}
                    onTogglePin={() => setPinnedSocketId(tile.socketId)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
