import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket, disconnectSocket } from '../services/socket';
import { useWebRTC } from '../hooks/useWebRTC';
import { audioAlert } from '../utils/audioAlert';

import MeetingHeader from '../components/meeting/MeetingHeader';
import VideoGrid from '../components/meeting/VideoGrid';
import ControlToolbar from '../components/meeting/ControlToolbar';
import HostJoinRequestModal from '../components/meeting/HostJoinRequestModal';
import ParticipantDrawer from '../components/participants/ParticipantDrawer';
import ChatDrawer from '../components/chat/ChatDrawer';
import AnnouncementModal from '../components/meeting/AnnouncementModal';
import AnnouncementBanner from '../components/meeting/AnnouncementBanner';
import ReactionsMenu from '../components/meeting/ReactionsMenu';
import SettingsModal from '../components/meeting/SettingsModal';
import NotificationPanel from '../components/meeting/NotificationPanel';

export default function MeetingRoom() {
  const { meetingCode } = useParams();
  const cleanCode = (meetingCode || '').trim().toLowerCase();
  const navigate = useNavigate();

  // Meeting & Identity State
  const [meeting, setMeeting] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [localParticipant, setLocalParticipant] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [settings, setSettings] = useState({
    allowStudentScreenShare: true,
    allowStudentChat: true,
    allowStudentAnnouncements: true
  });

  // UI Panels State
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isReactionsMenuOpen, setIsReactionsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Notifications & Screen Share State
  const [notifications, setNotifications] = useState([]);
  const [activePresenterSocketId, setActivePresenterSocketId] = useState(null);

  // Communication State
  const [messages, setMessages] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [isHandRaised, setIsHandRaised] = useState(false);

  const socketRef = useRef(null);
  const isChatOpenRef = useRef(isChatOpen);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  // Notification Dispatchers
  const addNotification = useCallback((notif) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setNotifications(prev => [
      { id, timestamp: new Date(), ...notif },
      ...prev.slice(0, 49) // Keep recent 50 notifications
    ]);
  }, []);

  const handleClearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleDismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Initialize WebRTC hook
  const {
    localStream,
    screenStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    isScreenSharing,
    connectionQuality,
    statsData,
    speakingParticipants,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    muteAudio,
    startScreenShare,
    stopScreenShare,
    changeResolution,
    createPeerConnection,
    cleanupMedia,
    setIsMuted,
    setIsVideoOff
  } = useWebRTC({
    socket: socketRef.current || getSocket(),
    meetingCode: cleanCode,
    isHost
  });

  // 1. Initial Authentication & Verification
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const socket = getSocket();
        socketRef.current = socket;

        // Check if user is Host:
        // Priority 1: URL search params (?hostToken=... or ?token=...)
        const urlParams = new URLSearchParams(window.location.search);
        const urlHostToken = urlParams.get('hostToken') || urlParams.get('token');

        // Priority 2: sessionStorage (creator tab) or localStorage (persistent on creator device)
        let hostToken = urlHostToken || sessionStorage.getItem(`hostToken_${cleanCode}`) || localStorage.getItem(`hostToken_${cleanCode}`);
        let hostName = sessionStorage.getItem(`hostName_${cleanCode}`) || localStorage.getItem(`hostName_${cleanCode}`) || 'Meeting Host';

        let userIsHost = false;
        if (hostToken) {
          userIsHost = await api.verifyHost(cleanCode, hostToken);
        }

        const meetingData = await api.getMeeting(cleanCode);
        if (!mounted) return;
        setMeeting(meetingData);
        if (meetingData.settings) {
          setSettings(meetingData.settings);
        }

        if (userIsHost) {
          // Store verified host credentials in both sessionStorage and localStorage
          sessionStorage.setItem(`hostToken_${cleanCode}`, hostToken);
          sessionStorage.setItem(`hostName_${cleanCode}`, hostName);
          localStorage.setItem(`hostToken_${cleanCode}`, hostToken);
          localStorage.setItem(`hostName_${cleanCode}`, hostName);

          // Clear any stale participant flags so this tab is cleanly recognized as Host
          sessionStorage.removeItem(`versemeet_participant_${cleanCode}`);
          sessionStorage.removeItem('versemeet_name_preset');

          setIsHost(true);
          const hostPart = {
            socketId: socket.id,
            participantId: `host-${socket.id?.slice(0, 5)}`,
            name: hostName || meetingData.hostName || 'Meeting Host',
            role: 'host',
            isMuted: false,
            isVideoOff: false
          };
          setLocalParticipant(hostPart);

          // Initialize local media
          await initializeMedia(true, true);

          // Authenticate host via socket
          socket.emit('host:join', {
            meetingCode: cleanCode,
            hostToken,
            hostName: hostPart.name
          });
        } else {
          // Regular participant
          setIsHost(false);
          const rawPart = sessionStorage.getItem(`versemeet_participant_${cleanCode}`);
          if (!rawPart) {
            navigate(`/waiting/${cleanCode}`);
            return;
          }

          const parsedPart = JSON.parse(rawPart);
          if (!parsedPart.admitted) {
            navigate(`/waiting/${cleanCode}`);
            return;
          }

          const studentPart = {
            socketId: socket.id,
            participantId: parsedPart.participantId,
            name: parsedPart.name,
            role: 'participant', // STRICT: Joiners are always 'participant'
            isMuted: !!parsedPart.isMuted,
            isVideoOff: !!parsedPart.isVideoOff
          };
          setLocalParticipant(studentPart);

          // Initialize media based on waiting room choices
          await initializeMedia(!parsedPart.isVideoOff, !parsedPart.isMuted);

          // Enter live room as admitted participant
          socket.emit('participant:enter-room', {
            meetingCode: cleanCode,
            participantId: studentPart.participantId,
            name: studentPart.name,
            role: 'participant',
            isMuted: studentPart.isMuted,
            isVideoOff: studentPart.isVideoOff
          });
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        navigate(`/waiting/${cleanCode}`);
      }
    }

    initSession();

    return () => {
      mounted = false;
    };
  }, [cleanCode, navigate, initializeMedia]);

  // 2. Socket Event Listeners for Live Meeting
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Host confirmed joined
    const handleHostJoinedSuccess = ({ participant, participants: existingList, pendingRequests: reqs, settings: s }) => {
      setLocalParticipant(participant);
      setParticipants(existingList || []);
      setPendingRequests(reqs || []);
      if (s) setSettings(s);

      // Create peer connections for existing participants (Host as initiator)
      existingList?.forEach(p => {
        if (p.socketId !== socket.id) {
          createPeerConnection(p.socketId, true);
        }
      });
    };

    // Participant admitted and synced into live room
    const handleRoomSyncAdmitted = ({ participant, participants: existingList, settings: s }) => {
      setLocalParticipant(participant);
      setParticipants(existingList || []);
      if (s) setSettings(s);

      // Connect to existing peers (newcomer initiates WebRTC offers to existing peers)
      existingList?.forEach(p => {
        if (p.socketId !== socket.id) {
          createPeerConnection(p.socketId, true);
        }
      });
    };

    // Fallback if approved while already on MeetingRoom
    const handleJoinApproved = ({ participant, participants: existingList, settings: s }) => {
      setLocalParticipant(participant);
      setParticipants(existingList || []);
      if (s) setSettings(s);

      existingList?.forEach(p => {
        if (p.socketId !== socket.id) {
          createPeerConnection(p.socketId, true);
        }
      });
    };

    const handleNotAdmitted = ({ reason }) => {
      sessionStorage.removeItem(`versemeet_participant_${cleanCode}`);
      navigate(`/waiting/${cleanCode}?reason=${encodeURIComponent(reason || 'Waiting for host admission')}`);
    };

    // Screen presenter changed
    const handlePresenterChanged = ({ presenterSocketId, presenterName }) => {
      setActivePresenterSocketId(presenterSocketId || null);
      if (presenterSocketId) {
        const isSelf = presenterSocketId === socket.id;
        addNotification({
          type: 'screen-share',
          title: isSelf ? 'Sharing Your Screen' : 'Screen Share Active',
          message: isSelf
            ? 'You are presenting your screen to the meeting.'
            : `${presenterName || 'A participant'} started sharing their screen.`
        });
      } else {
        addNotification({
          type: 'info',
          title: 'Presentation Stopped',
          message: 'Screen sharing presentation has ended.'
        });
      }
    };

    // New participant joined the room
    const handleParticipantJoined = ({ participant }) => {
      setParticipants(prev => {
        if (prev.some(p => p.socketId === participant.socketId)) return prev;
        return [...prev, participant];
      });

      // Establish WebRTC connection with incoming participant
      createPeerConnection(participant.socketId, false);

      addNotification({
        type: 'join',
        title: 'Participant Joined',
        message: `${participant.name || 'A participant'} joined the meeting.`
      });
    };

    // Participant left
    const handleParticipantLeft = ({ socketId, name }) => {
      setParticipants(prev => {
        const p = prev.find(item => item.socketId === socketId);
        const partName = name || p?.name || 'A participant';
        addNotification({
          type: 'leave',
          title: 'Participant Left',
          message: `${partName} left the meeting.`
        });
        return prev.filter(item => item.socketId !== socketId);
      });
    };

    // Host incoming join request notification
    const handleHostJoinRequest = ({ request }) => {
      audioAlert.playJoinRequestChime();
      setPendingRequests(prev => {
        if (prev.some(r => r.socketId === request.socketId)) return prev;
        return [...prev, request];
      });

      addNotification({
        type: 'join-request',
        title: 'Waiting Room Request',
        message: `${request.name} is waiting to join the classroom.`,
        socketId: request.socketId,
        name: request.name
      });
    };

    // Host pending requests update
    const handleRequestsUpdated = ({ pendingRequests: updatedReqs }) => {
      setPendingRequests(updatedReqs || []);
    };

    // Participant media updated
    const handleParticipantMediaUpdated = ({ socketId, isMuted: m, isVideoOff: v }) => {
      setParticipants(prev =>
        prev.map(p => (p.socketId === socketId ? { ...p, isMuted: m, isVideoOff: v } : p))
      );
      if (socketRef.current?.id === socketId) {
        setLocalParticipant(prev => prev ? { ...prev, isMuted: m, isVideoOff: v } : prev);
      }
    };

    // Force mute from host
    const handleForceMute = () => {
      muteAudio(true);
      addNotification({
        type: 'info',
        title: 'Microphone Muted',
        message: 'The host has muted your microphone.'
      });
    };

    // Participant removed by host
    const handleParticipantRemoved = ({ reason }) => {
      sessionStorage.removeItem(`versemeet_participant_${cleanCode}`);
      sessionStorage.removeItem(`versemeet_part_id_${cleanCode}`);
      sessionStorage.removeItem(`versemeet_part_name_${cleanCode}`);
      sessionStorage.removeItem('versemeet_name_preset');
      cleanupMedia();
      disconnectSocket();
      navigate(`/meeting/${cleanCode}/ended?reason=removed&msg=${encodeURIComponent(reason || 'You were removed from the meeting by the host.')}`);
    };

    // Host ended meeting for all
    const handleMeetingEndedByHost = () => {
      cleanupMedia();
      disconnectSocket();
      navigate(`/meeting/${cleanCode}/ended?reason=host-ended`);
    };

    // Chat received
    const handleChatReceived = (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!isChatOpenRef.current) {
        setUnreadChatCount(prev => prev + 1);
      }
    };

    // Classroom announcement broadcast
    const handleAnnouncementBroadcast = (announcement) => {
      audioAlert.playAnnouncementChime();
      setCurrentAnnouncement(announcement);

      addNotification({
        type: 'announcement',
        title: announcement.title || 'Classroom Notice',
        message: announcement.message,
        link: announcement.link
      });
    };

    // Hand toggled
    const handleHandToggled = ({ socketId, isHandRaised: raised, name }) => {
      if (socket.id === socketId) {
        setIsHandRaised(!!raised);
        setLocalParticipant(prev => prev ? { ...prev, isHandRaised: !!raised } : prev);
      }
      if (raised) {
        audioAlert.playHandRaisedChime();
        setParticipants(prev => {
          const p = prev.find(part => part.socketId === socketId);
          const partName = name || p?.name || 'A participant';
          if (p && socketId !== socket.id) {
            addNotification({
              type: 'hand',
              title: 'Hand Raised',
              message: `${partName} raised their hand.`
            });
          }
          return prev.map(part => (part.socketId === socketId ? { ...part, isHandRaised: raised } : part));
        });
      } else {
        setParticipants(prev =>
          prev.map(p => (p.socketId === socketId ? { ...p, isHandRaised: raised } : p))
        );
      }
    };

    // Reaction received (floating emoji)
    const handleReactionReceived = ({ id, emoji, senderName }) => {
      const leftPercent = 20 + Math.random() * 60;
      const reactionItem = { id, emoji, senderName, left: leftPercent };

      setFloatingReactions(prev => [...prev, reactionItem]);

      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
      }, 2400);
    };

    // Settings updated by host
    const handleSettingsUpdated = ({ settings: newSettings }) => {
      setSettings(newSettings);
    };

    socket.on('host:joined-success', handleHostJoinedSuccess);
    socket.on('room:sync-admitted', handleRoomSyncAdmitted);
    socket.on('participant:not-admitted', handleNotAdmitted);
    socket.on('join:approved', handleJoinApproved);
    socket.on('participant:joined', handleParticipantJoined);
    socket.on('participant:left', handleParticipantLeft);
    socket.on('host:join-request', handleHostJoinRequest);
    socket.on('host:requests-updated', handleRequestsUpdated);
    socket.on('participant:media-updated', handleParticipantMediaUpdated);
    socket.on('media:force-mute', handleForceMute);
    socket.on('participant:removed', handleParticipantRemoved);
    socket.on('meeting:ended-by-host', handleMeetingEndedByHost);
    socket.on('chat:received', handleChatReceived);
    socket.on('announcement:broadcast', handleAnnouncementBroadcast);
    socket.on('participant:hand-toggled', handleHandToggled);
    socket.on('reaction:received', handleReactionReceived);
    socket.on('meeting:settings-updated', handleSettingsUpdated);
    socket.on('screen:presenter-changed', handlePresenterChanged);

    return () => {
      socket.off('host:joined-success', handleHostJoinedSuccess);
      socket.off('room:sync-admitted', handleRoomSyncAdmitted);
      socket.off('participant:not-admitted', handleNotAdmitted);
      socket.off('join:approved', handleJoinApproved);
      socket.off('participant:joined', handleParticipantJoined);
      socket.off('participant:left', handleParticipantLeft);
      socket.off('host:join-request', handleHostJoinRequest);
      socket.off('host:requests-updated', handleRequestsUpdated);
      socket.off('participant:media-updated', handleParticipantMediaUpdated);
      socket.off('media:force-mute', handleForceMute);
      socket.off('participant:removed', handleParticipantRemoved);
      socket.off('meeting:ended-by-host', handleMeetingEndedByHost);
      socket.off('chat:received', handleChatReceived);
      socket.off('announcement:broadcast', handleAnnouncementBroadcast);
      socket.off('participant:hand-toggled', handleHandToggled);
      socket.off('reaction:received', handleReactionReceived);
      socket.off('meeting:settings-updated', handleSettingsUpdated);
      socket.off('screen:presenter-changed', handlePresenterChanged);
    };
  }, [cleanCode, navigate, cleanupMedia, createPeerConnection, muteAudio, addNotification]);

  // Host Actions
  const handleApproveRequest = useCallback((targetSocketId) => {
    socketRef.current?.emit('host:approve-request', {
      meetingCode: cleanCode,
      socketId: targetSocketId
    });
    setPendingRequests(prev => prev.filter(r => r.socketId !== targetSocketId));
  }, [cleanCode]);

  const handleRejectRequest = useCallback((targetSocketId) => {
    socketRef.current?.emit('host:reject-request', {
      meetingCode: cleanCode,
      socketId: targetSocketId,
      reason: 'The meeting host declined your request to join.'
    });
    setPendingRequests(prev => prev.filter(r => r.socketId !== targetSocketId));
  }, [cleanCode]);

  const handleMuteParticipant = useCallback((targetSocketId) => {
    socketRef.current?.emit('host:mute-participant', {
      meetingCode: cleanCode,
      targetSocketId
    });
  }, [cleanCode]);

  const handleKickParticipant = useCallback((targetSocketId) => {
    socketRef.current?.emit('host:kick-participant', {
      meetingCode: cleanCode,
      targetSocketId
    });
  }, [cleanCode]);

  const handleUpdateSettings = useCallback((newSettings) => {
    socketRef.current?.emit('host:update-settings', {
      meetingCode: cleanCode,
      settings: newSettings
    });
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, [cleanCode]);

  // General Participant Actions
  const handleSendMessage = useCallback((text) => {
    socketRef.current?.emit('chat:message', {
      meetingCode: cleanCode,
      text
    });
  }, [cleanCode]);

  const handleSendAnnouncement = useCallback((data) => {
    socketRef.current?.emit('announcement:send', {
      meetingCode: cleanCode,
      ...data
    });
  }, [cleanCode]);

  const handleToggleHand = useCallback(() => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    setLocalParticipant(prev => prev ? { ...prev, isHandRaised: nextState } : prev);
    socketRef.current?.emit('hand:toggle', {
      meetingCode: cleanCode,
      isRaised: nextState
    });
  }, [cleanCode, isHandRaised]);

  const handleSendReaction = useCallback((emoji) => {
    socketRef.current?.emit('reaction:send', {
      meetingCode: cleanCode,
      emoji
    });
  }, [cleanCode]);

  const handleToggleNotifications = useCallback(() => {
    setIsNotificationsOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsChatOpen(false);
        setIsParticipantsOpen(false);
      }
      return next;
    });
  }, []);

  const handleToggleParticipants = useCallback(() => {
    setIsParticipantsOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsNotificationsOpen(false);
        setIsChatOpen(false);
      }
      return next;
    });
  }, []);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      const next = !prev;
      if (next) {
        setUnreadChatCount(0);
        setIsNotificationsOpen(false);
        setIsParticipantsOpen(false);
      }
      return next;
    });
  }, []);

  const handleLeaveMeeting = useCallback(() => {
    socketRef.current?.emit('meeting:leave', { meetingCode: cleanCode });
    cleanupMedia();
    disconnectSocket();
    navigate(`/meeting/${cleanCode}/ended?reason=left`);
  }, [cleanCode, cleanupMedia, navigate]);

  const handleEndMeeting = useCallback(() => {
    const hostToken = sessionStorage.getItem(`hostToken_${cleanCode}`) || localStorage.getItem(`hostToken_${cleanCode}`);
    socketRef.current?.emit('meeting:end-all', {
      meetingCode: cleanCode,
      hostToken
    });
    cleanupMedia();
    disconnectSocket();
    navigate(`/meeting/${cleanCode}/ended?reason=ended`);
  }, [cleanCode, cleanupMedia, navigate]);

  return (
    <div className="relative w-screen h-screen bg-slate-50 text-slate-900 flex flex-col overflow-hidden select-none">
      {/* 1. COMPACT MEETING HEADER */}
      <MeetingHeader
        meetingTitle={meeting?.title || 'CampusVerse Meeting'}
        meetingCode={cleanCode}
        participantCount={participants.length + (localParticipant ? 1 : 0)}
        pendingRequestCount={pendingRequests.length}
        notificationCount={notifications.length}
        connectionQuality={connectionQuality}
        rtt={statsData.rtt}
        isHost={isHost}
        onOpenParticipants={handleToggleParticipants}
        onToggleNotifications={handleToggleNotifications}
        isNotificationsOpen={isNotificationsOpen}
      />

      {/* 2. REAL-TIME HOST JOIN REQUEST FLOATING ALERT */}
      {isHost && (
        <HostJoinRequestModal
          pendingRequests={pendingRequests}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
        />
      )}

      {/* 3. TEMPORARY ANNOUNCEMENT BROADCAST BANNER */}
      <AnnouncementBanner
        announcement={currentAnnouncement}
        onDismiss={() => setCurrentAnnouncement(null)}
      />

      {/* 4. MAIN VIDEO GRID (AUTO-ADAPTIVE & RESPONSIVE WITH ZERO OVERLAP) */}
      <main
        className={`flex-1 w-full h-full relative overflow-hidden flex items-center justify-center transition-all duration-300 ${
          isNotificationsOpen
            ? 'md:pr-[310px] lg:pr-[330px]'
            : isParticipantsOpen || isChatOpen
            ? 'sm:pr-[384px]'
            : ''
        }`}
      >
        <VideoGrid
          localStream={localStream}
          localParticipant={localParticipant}
          remoteStreams={remoteStreams}
          participants={participants}
          screenStream={screenStream}
          activePresenterSocketId={activePresenterSocketId}
          isLocalScreenSharing={isScreenSharing}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isHandRaised={isHandRaised}
          speakingParticipants={speakingParticipants}
          onStopScreenShare={stopScreenShare}
          isHost={isHost}
        />

        {/* 5. FLOATING EMOJI REACTIONS OVERLAY */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {floatingReactions.map((r) => (
            <div
              key={r.id}
              className="absolute bottom-20 reaction-float flex flex-col items-center"
              style={{ left: `${r.left}%` }}
            >
              <span className="text-4xl filter drop-shadow-md">{r.emoji}</span>
              <span className="text-[10px] font-semibold bg-white/95 text-slate-800 px-2.5 py-0.5 rounded-full mt-1 border border-slate-200 shadow-md">
                {r.senderName}
              </span>
            </div>
          ))}
        </div>
      </main>

      {/* 6. BOTTOM CONTROL TOOLBAR */}
      <ControlToolbar
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isHost={isHost}
        unreadChatCount={unreadChatCount}
        pendingRequestCount={pendingRequests.length}
        isParticipantsOpen={isParticipantsOpen}
        isChatOpen={isChatOpen}
        onToggleMic={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
        onToggleHand={handleToggleHand}
        onToggleParticipants={handleToggleParticipants}
        onToggleChat={handleToggleChat}
        onOpenAnnouncements={() => setIsAnnouncementModalOpen(true)}
        onToggleReactions={() => setIsReactionsMenuOpen(!isReactionsMenuOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLeaveMeeting={handleLeaveMeeting}
        onEndMeeting={handleEndMeeting}
      />

      {/* 7. POPUP MODALS & SIDE DRAWERS */}
      <ParticipantDrawer
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        participants={[
          ...(localParticipant ? [localParticipant] : []),
          ...participants
        ]}
        pendingRequests={pendingRequests}
        isHost={isHost}
        settings={settings}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
        onMuteParticipant={handleMuteParticipant}
        onKickParticipant={handleKickParticipant}
        onUpdateSettings={handleUpdateSettings}
      />

      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        isChatAllowed={settings.allowStudentChat}
        isHost={isHost}
        currentSocketId={socketRef.current?.id}
      />

      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        onSendAnnouncement={handleSendAnnouncement}
        isAllowed={settings.allowStudentAnnouncements}
        isHost={isHost}
      />

      <ReactionsMenu
        isOpen={isReactionsMenuOpen}
        onClose={() => setIsReactionsMenuOpen(false)}
        onSendReaction={handleSendReaction}
        isHandRaised={isHandRaised}
        onToggleHand={handleToggleHand}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        statsData={statsData}
        connectionQuality={connectionQuality}
        onChangeResolution={changeResolution}
      />

      <NotificationPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onClearAll={handleClearAllNotifications}
        onDismissNotification={handleDismissNotification}
        onApproveJoinRequest={handleApproveRequest}
        onRejectJoinRequest={handleRejectRequest}
        isHost={isHost}
      />
    </div>
  );
}
