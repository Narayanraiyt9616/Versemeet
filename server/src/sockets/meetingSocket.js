import { activeRoomService } from '../services/activeRoomService.js';
import { meetingService } from '../services/meetingService.js';
import { logger } from '../utils/logger.js';

export function setupMeetingSockets(io) {
  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    let currentMeetingCode = null;
    let currentParticipantId = null;
    let isHostSession = false;

    // Helper to normalize meeting codes
    const norm = (code) => (code || '').trim().toLowerCase();

    // ---------------------------------------------------------
    // 1. HOST AUTHENTICATION & INITIALIZATION
    // ---------------------------------------------------------
    socket.on('host:join', async ({ meetingCode, hostToken, hostName }) => {
      try {
        const code = norm(meetingCode);
        currentMeetingCode = code;

        // Strictly verify host authorization with meetingService database/in-memory store
        const isHostAuthorized = await meetingService.verifyHost(code, hostToken);
        if (!isHostAuthorized) {
          logger.warn(`Unauthorized host join attempt for meeting ${code} with token: ${hostToken}`);
          socket.emit('error:unauthorized', { message: 'Invalid host credentials. You are not authorized as host.' });
          return;
        }

        const room = activeRoomService.getOrCreateRoom(code, {
          title: 'CampusVerse Meeting',
          hostToken,
          hostName
        });

        if (!room.hostToken && isHostAuthorized) {
          room.hostToken = hostToken;
        }

        // Verify host authorization matches active room
        if (room.hostToken && room.hostToken !== hostToken) {
          socket.emit('error:unauthorized', { message: 'Invalid host credentials for this meeting.' });
          return;
        }

        isHostSession = true;
        currentParticipantId = `host-${socket.id.slice(0, 6)}`;
        activeRoomService.setHostSocket(code, socket.id, hostToken);

        // Add host as admitted participant
        const hostParticipant = activeRoomService.addAdmittedParticipant(code, socket.id, {
          participantId: currentParticipantId,
          name: hostName || room.hostName || 'Meeting Host',
          role: 'host',
          isMuted: false,
          isVideoOff: false
        });

        socket.join(`meeting:${code}`);
        socket.join(`host:${code}`);

        // Send confirmation and room state to host
        socket.emit('host:joined-success', {
          meetingCode: code,
          participant: hostParticipant,
          participants: activeRoomService.getAllParticipants(code),
          pendingRequests: activeRoomService.getPendingRequests(code),
          settings: room.settings
        });

        logger.info(`Host joined meeting ${code} on socket ${socket.id}`);
      } catch (err) {
        logger.error(`Error in host:join: ${err.message}`);
        socket.emit('error:general', { message: 'Failed to initialize host session' });
      }
    });

    // ---------------------------------------------------------
    // 2. PARTICIPANT JOIN REQUEST & WAITING ROOM
    // ---------------------------------------------------------
    socket.on('join:request', async ({ meetingCode, participantId, name }) => {
      try {
        const code = norm(meetingCode);
        currentMeetingCode = code;
        currentParticipantId = participantId;

        // Check if meeting exists and is active
        const validation = await meetingService.validateMeeting(code);
        if (!validation.valid) {
          socket.emit('join:rejected', { reason: validation.error });
          return;
        }

        const room = activeRoomService.getOrCreateRoom(code, validation.meeting);

        if (room.status === 'ended') {
          socket.emit('join:rejected', { reason: 'This meeting has ended.' });
          return;
        }

        // Check if participant was removed/banned by host
        if (activeRoomService.isParticipantBanned(code, participantId, socket.id)) {
          socket.emit('join:rejected', {
            reason: 'You were removed from this meeting by the host and cannot rejoin without permission.'
          });
          return;
        }

        // Place participant in waiting room - MANDATORY for all joiners!
        const request = activeRoomService.addPendingRequest(code, socket.id, {
          participantId,
          name: name ? name.trim() : 'Guest',
          role: 'participant'
        });

        socket.join(`waiting:${code}`);

        socket.emit('waiting:enqueued', {
          meetingCode: code,
          title: room.title,
          hostName: room.hostName,
          status: 'waiting',
          message: 'Your request has been sent. Please wait for the host to admit you.'
        });

        // Notify host immediately
        io.to(`host:${code}`).emit('host:join-request', {
          request,
          pendingCount: room.pendingRequests.size
        });

        logger.info(`Join request from ${request.name} for meeting ${code}`);
      } catch (err) {
        logger.error(`Error in join:request: ${err.message}`);
        socket.emit('join:rejected', { reason: 'Failed to process join request' });
      }
    });

    // ---------------------------------------------------------
    // 3. PARTICIPANT ENTER ROOM (AFTER WAITING ROOM APPROVAL)
    // ---------------------------------------------------------
    socket.on('participant:enter-room', async ({ meetingCode, participantId, name, isMuted = false, isVideoOff = false }) => {
      try {
        const code = norm(meetingCode);
        currentMeetingCode = code;
        currentParticipantId = participantId;

        const validation = await meetingService.validateMeeting(code);
        if (!validation.valid) {
          socket.emit('participant:not-admitted', { reason: validation.error });
          return;
        }

        const room = activeRoomService.getOrCreateRoom(code, validation.meeting);
        if (room.status === 'ended') {
          socket.emit('participant:not-admitted', { reason: 'This meeting has ended.' });
          return;
        }

        // Check if participant was removed/banned by host
        if (activeRoomService.isParticipantBanned(code, participantId, socket.id)) {
          socket.emit('participant:not-admitted', {
            reason: 'You were removed from this meeting by the host and cannot rejoin.'
          });
          return;
        }

        // Strict check: Participant MUST be admitted by the host
        const isAdmitted = activeRoomService.isParticipantAdmitted(code, participantId);
        if (!isAdmitted) {
          logger.warn(`Unauthorized enter-room attempt by ${participantId} for meeting ${code}`);
          socket.emit('participant:not-admitted', { reason: 'Please wait in the waiting room for host admission.' });
          return;
        }

        // Admit/sync participant in room state - ALWAYS role: 'participant'
        const participant = activeRoomService.admitOrSyncParticipant(code, socket.id, {
          participantId,
          name: name ? name.trim() : 'Guest',
          role: 'participant',
          isMuted,
          isVideoOff
        });

        socket.leave(`waiting:${code}`);
        socket.join(`meeting:${code}`);

        const allParticipants = activeRoomService.getAllParticipants(code);

        // Send full room state & peer list back to the entering participant
        socket.emit('room:sync-admitted', {
          meetingCode: code,
          participant,
          participants: allParticipants,
          settings: room.settings
        });

        // Broadcast to existing room members so they can establish WebRTC
        socket.to(`meeting:${code}`).emit('participant:joined', {
          participant
        });

        logger.info(`Participant ${participant.name} entered live room ${code} on socket ${socket.id}`);
      } catch (err) {
        logger.error(`Error in participant:enter-room: ${err.message}`);
        socket.emit('participant:not-admitted', { reason: 'Failed to enter room' });
      }
    });

    // ---------------------------------------------------------
    // 4. HOST APPROVAL & REJECTION
    // ---------------------------------------------------------
    socket.on('host:approve-request', ({ meetingCode, socketId }) => {
      const code = norm(meetingCode);
      if (!isHostSession && !activeRoomService.isHost(code, socket.id)) {
        socket.emit('error:unauthorized', { message: 'Only the host can admit participants.' });
        return;
      }

      const participant = activeRoomService.approveParticipant(code, socketId);
      if (!participant) {
        socket.emit('error:not-found', { message: 'Participant request not found.' });
        return;
      }

      const targetSocket = io.sockets.sockets.get(socketId);
      if (targetSocket) {
        targetSocket.leave(`waiting:${code}`);
        targetSocket.join(`meeting:${code}`);

        const allParticipants = activeRoomService.getAllParticipants(code);
        const room = activeRoomService.getRoom(code);

        // Notify participant they are approved and provide existing peer list
        targetSocket.emit('join:approved', {
          meetingCode: code,
          participant,
          participants: allParticipants,
          settings: room.settings
        });

        // Notify existing room members of the new participant
        socket.to(`meeting:${code}`).emit('participant:joined', {
          participant
        });

        // Update host with latest pending requests
        socket.emit('host:requests-updated', {
          pendingRequests: activeRoomService.getPendingRequests(code)
        });

        logger.info(`Participant ${participant.name} approved for meeting ${code}`);
      }
    });

    socket.on('host:reject-request', ({ meetingCode, socketId, reason }) => {
      const code = norm(meetingCode);
      if (!isHostSession && !activeRoomService.isHost(code, socket.id)) {
        socket.emit('error:unauthorized', { message: 'Only the host can reject participants.' });
        return;
      }

      const rejected = activeRoomService.rejectParticipant(code, socketId);
      if (rejected) {
        io.to(socketId).emit('join:rejected', {
          reason: reason || 'The host did not admit you to this meeting.'
        });

        socket.emit('host:requests-updated', {
          pendingRequests: activeRoomService.getPendingRequests(code)
        });

        logger.info(`Participant ${rejected.name} rejected from meeting ${code}`);
      }
    });

    // ---------------------------------------------------------
    // 5. WEBRTC P2P SIGNALING (OFFER, ANSWER, ICE CANDIDATES)
    // ---------------------------------------------------------
    socket.on('signal:offer', ({ targetSocketId, sdp }) => {
      io.to(targetSocketId).emit('signal:offer', {
        senderSocketId: socket.id,
        sdp
      });
    });

    socket.on('signal:answer', ({ targetSocketId, sdp }) => {
      io.to(targetSocketId).emit('signal:answer', {
        senderSocketId: socket.id,
        sdp
      });
    });

    socket.on('signal:ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('signal:ice-candidate', {
        senderSocketId: socket.id,
        candidate
      });
    });

    // ---------------------------------------------------------
    // 6. MEDIA CONTROLS & STATE SYNCHRONIZATION
    // ---------------------------------------------------------
    socket.on('media:state-update', ({ meetingCode, isMuted, isVideoOff }) => {
      const code = norm(meetingCode);
      if (!code) return;

      activeRoomService.updateParticipantState(code, socket.id, {
        isMuted: !!isMuted,
        isVideoOff: !!isVideoOff
      });

      socket.to(`meeting:${code}`).emit('participant:media-updated', {
        socketId: socket.id,
        isMuted: !!isMuted,
        isVideoOff: !!isVideoOff
      });
    });

    socket.on('media:active-speaker', ({ meetingCode, isSpeaking }) => {
      const code = norm(meetingCode);
      if (!code) return;

      socket.to(`meeting:${code}`).emit('participant:speaking', {
        socketId: socket.id,
        isSpeaking: !!isSpeaking
      });
    });

    // ---------------------------------------------------------
    // 7. SCREEN SHARING
    // ---------------------------------------------------------
    socket.on('screen:start', ({ meetingCode }) => {
      const code = norm(meetingCode);
      const room = activeRoomService.getRoom(code);
      if (!room) return;

      const participant = activeRoomService.getParticipant(code, socket.id);
      if (participant?.role === 'participant' && !room.settings.allowStudentScreenShare) {
        socket.emit('error:action-restricted', { message: 'Screen sharing is currently restricted by the host.' });
        return;
      }

      activeRoomService.setActivePresenter(code, socket.id);
      activeRoomService.updateParticipantState(code, socket.id, { isScreenSharing: true });

      io.to(`meeting:${code}`).emit('screen:presenter-changed', {
        presenterSocketId: socket.id,
        presenterName: participant?.name || 'A participant'
      });
    });

    socket.on('screen:stop', ({ meetingCode }) => {
      const code = norm(meetingCode);
      activeRoomService.clearActivePresenter(code);
      activeRoomService.updateParticipantState(code, socket.id, { isScreenSharing: false });

      io.to(`meeting:${code}`).emit('screen:presenter-changed', {
        presenterSocketId: null,
        presenterName: null
      });
    });

    // ---------------------------------------------------------
    // 8. IN-MEETING CHAT
    // ---------------------------------------------------------
    socket.on('chat:message', ({ meetingCode, text }) => {
      const code = norm(meetingCode);
      if (!code || !text || !text.trim()) return;

      const room = activeRoomService.getRoom(code);
      const participant = activeRoomService.getParticipant(code, socket.id);

      if (!room || !participant) return;

      if (participant.role === 'participant' && !room.settings.allowStudentChat) {
        socket.emit('error:action-restricted', { message: 'Meeting chat has been disabled by the host.' });
        return;
      }

      const cleanText = text.trim().slice(0, 1000);

      const messageObj = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        senderSocketId: socket.id,
        senderName: participant.name,
        senderRole: participant.role,
        text: cleanText,
        timestamp: new Date().toISOString()
      };

      io.to(`meeting:${code}`).emit('chat:received', messageObj);
    });

    // ---------------------------------------------------------
    // 9. ANNOUNCEMENTS
    // ---------------------------------------------------------
    socket.on('announcement:send', ({ meetingCode, title, message, link }) => {
      const code = norm(meetingCode);
      const room = activeRoomService.getRoom(code);
      const participant = activeRoomService.getParticipant(code, socket.id);

      if (!room || !participant) return;

      if (participant.role === 'participant' && !room.settings.allowStudentAnnouncements) {
        socket.emit('error:action-restricted', { message: 'Announcements are currently disabled by the host.' });
        return;
      }

      const announcement = activeRoomService.addAnnouncement(code, {
        senderName: participant.name,
        senderRole: participant.role,
        title: (title || 'Announcement').slice(0, 100),
        message: (message || '').slice(0, 500),
        link: (link || '').slice(0, 300)
      });

      io.to(`meeting:${code}`).emit('announcement:broadcast', announcement);
    });

    // ---------------------------------------------------------
    // 10. RAISE HAND & EMOJI REACTIONS
    // ---------------------------------------------------------
    socket.on('hand:toggle', ({ meetingCode, isRaised }) => {
      const code = norm(meetingCode);
      if (!code) return;

      activeRoomService.updateParticipantState(code, socket.id, {
        isHandRaised: !!isRaised
      });

      const participant = activeRoomService.getParticipant(code, socket.id);

      io.to(`meeting:${code}`).emit('participant:hand-toggled', {
        socketId: socket.id,
        name: participant?.name || 'Participant',
        isHandRaised: !!isRaised
      });
    });

    socket.on('reaction:send', ({ meetingCode, emoji }) => {
      const code = norm(meetingCode);
      if (!code || !emoji) return;

      const participant = activeRoomService.getParticipant(code, socket.id);

      io.to(`meeting:${code}`).emit('reaction:received', {
        id: `react-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        emoji,
        senderName: participant?.name || 'Participant',
        socketId: socket.id
      });
    });

    // ---------------------------------------------------------
    // 11. HOST PARTICIPANT MANAGEMENT
    // ---------------------------------------------------------
    socket.on('host:mute-participant', ({ meetingCode, targetSocketId }) => {
      const code = norm(meetingCode);
      if (!isHostSession && !activeRoomService.isHost(code, socket.id)) {
        socket.emit('error:unauthorized', { message: 'Only the host can mute participants.' });
        return;
      }

      activeRoomService.updateParticipantState(code, targetSocketId, { isMuted: true });

      io.to(targetSocketId).emit('media:force-mute');

      io.to(`meeting:${code}`).emit('participant:media-updated', {
        socketId: targetSocketId,
        isMuted: true
      });

      logger.info(`Host muted participant on socket ${targetSocketId} in meeting ${code}`);
    });

    socket.on('host:kick-participant', ({ meetingCode, targetSocketId }) => {
      const code = norm(meetingCode);
      if (!isHostSession && !activeRoomService.isHost(code, socket.id)) {
        socket.emit('error:unauthorized', { message: 'Only the host can remove participants.' });
        return;
      }

      const removed = activeRoomService.kickParticipant(code, targetSocketId);
      if (removed) {
        io.to(targetSocketId).emit('participant:removed', {
          reason: 'You were removed from the meeting by the host.'
        });

        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.leave(`meeting:${code}`);
          targetSocket.disconnect(true);
        }

        io.to(`meeting:${code}`).emit('participant:left', {
          socketId: targetSocketId,
          name: removed.name
        });

        logger.info(`Host removed participant ${removed.name} (${targetSocketId}) from meeting ${code}`);
      }
    });

    socket.on('host:update-settings', ({ meetingCode, settings }) => {
      const code = norm(meetingCode);
      if (!isHostSession && !activeRoomService.isHost(code, socket.id)) return;

      const updated = activeRoomService.updateSettings(code, settings);
      io.to(`meeting:${code}`).emit('meeting:settings-updated', {
        settings: updated
      });
    });

    // ---------------------------------------------------------
    // 12. LEAVE & END MEETING
    // ---------------------------------------------------------
    socket.on('meeting:leave', ({ meetingCode }) => {
      const code = norm(meetingCode || currentMeetingCode);
      handleParticipantLeave(socket, code);
    });

    socket.on('meeting:end-all', async ({ meetingCode, hostToken }) => {
      try {
        const code = norm(meetingCode);
        if (!isHostSession && !activeRoomService.isHost(code, socket.id, hostToken)) {
          socket.emit('error:unauthorized', { message: 'Only host can end meeting for everyone' });
          return;
        }

        logger.info(`Host ended meeting ${code} for all participants`);

        io.to(`meeting:${code}`).emit('meeting:ended-by-host', {
          message: 'The host has ended this meeting for all participants.'
        });

        io.to(`waiting:${code}`).emit('meeting:ended-by-host', {
          message: 'This meeting was ended by the host.'
        });

        await meetingService.endMeeting(code, hostToken || activeRoomService.getRoom(code)?.hostToken);
      } catch (err) {
        logger.error(`Error ending meeting: ${err.message}`);
      }
    });

    // ---------------------------------------------------------
    // 13. DISCONNECT HANDLING
    // ---------------------------------------------------------
    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
      if (currentMeetingCode) {
        handleParticipantLeave(socket, currentMeetingCode);
      }
    });

    function handleParticipantLeave(sock, code) {
      if (!code) return;

      // Check if was in waiting room
      const pending = activeRoomService.removePendingRequest(code, sock.id);
      if (pending) {
        io.to(`host:${code}`).emit('host:requests-updated', {
          pendingRequests: activeRoomService.getPendingRequests(code)
        });
      }

      // Check if was in active meeting
      const participant = activeRoomService.removeParticipant(code, sock.id);
      if (participant) {
        sock.leave(`meeting:${code}`);
        sock.leave(`host:${code}`);

        if (participant.isScreenSharing) {
          io.to(`meeting:${code}`).emit('screen:presenter-changed', {
            presenterSocketId: null,
            presenterName: null
          });
        }

        io.to(`meeting:${code}`).emit('participant:left', {
          socketId: sock.id,
          name: participant.name
        });

        logger.info(`Participant ${participant.name} left meeting ${code}`);
      }
    }
  });
}
