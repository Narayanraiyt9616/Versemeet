import { logger } from '../utils/logger.js';

/**
 * In-memory state store for active meeting rooms, real-time participant tracking,
 * pending waiting-room requests, temporary announcements, and permissions.
 */
class ActiveRoomService {
  constructor() {
    // Map of meetingCode -> RoomState
    this.rooms = new Map();
  }

  _normCode(meetingCode) {
    return (meetingCode || '').trim().toLowerCase();
  }

  /**
   * Initializes or gets an active room state
   */
  getOrCreateRoom(meetingCode, meetingData = {}) {
    const code = this._normCode(meetingCode);
    if (!this.rooms.has(code)) {
      this.rooms.set(code, {
        meetingCode: code,
        title: meetingData.title || 'CampusVerse Meeting',
        hostToken: meetingData.hostToken || null,
        hostSocketId: null,
        hostName: meetingData.hostName || 'Host',
        status: meetingData.status || 'waiting', // waiting, active, ended
        createdAt: meetingData.createdAt || new Date(),
        startedAt: null,
        endedAt: null,
        participants: new Map(), // socketId -> participant
        pendingRequests: new Map(), // socketId -> request
        admittedParticipants: new Map(), // participantId -> participant
        announcements: [],
        settings: {
          allowStudentScreenShare: true,
          allowStudentChat: true,
          allowStudentAnnouncements: true,
          isWaitingRoomEnabled: true,
          ...(meetingData.settings || {})
        },
        activePresenterSocketId: null
      });
      logger.info(`Active room initialized for meeting: ${code}`);
    }
    return this.rooms.get(code);
  }

  getRoom(meetingCode) {
    return this.rooms.get(this._normCode(meetingCode));
  }

  hasRoom(meetingCode) {
    return this.rooms.has(this._normCode(meetingCode));
  }

  setHostSocket(meetingCode, socketId, hostToken) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return false;
    if (room.hostToken && room.hostToken !== hostToken) {
      return false; // Unauthorized host attempt
    }
    room.hostSocketId = socketId;
    room.status = 'active';
    if (!room.startedAt) room.startedAt = new Date();
    return true;
  }

  isHost(meetingCode, socketId, hostToken = null) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return false;
    if (hostToken && room.hostToken === hostToken) return true;
    return room.hostSocketId === socketId;
  }

  // Waiting Room / Join Request methods
  addPendingRequest(meetingCode, socketId, participantData) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;

    const request = {
      socketId,
      participantId: participantData.participantId,
      name: participantData.name || 'Guest',
      role: participantData.role || 'participant',
      requestedAt: new Date(),
      status: 'pending'
    };

    room.pendingRequests.set(socketId, request);
    return request;
  }

  getPendingRequests(meetingCode) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return [];
    return Array.from(room.pendingRequests.values());
  }

  removePendingRequest(meetingCode, socketId) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;
    const req = room.pendingRequests.get(socketId);
    room.pendingRequests.delete(socketId);
    return req;
  }

  approveParticipant(meetingCode, socketId) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;

    const pending = room.pendingRequests.get(socketId);
    if (!pending) return null;

    room.pendingRequests.delete(socketId);

    const participant = {
      socketId,
      participantId: pending.participantId,
      name: pending.name,
      role: pending.role,
      isMuted: false,
      isVideoOff: false,
      isHandRaised: false,
      isScreenSharing: false,
      joinedAt: new Date(),
      status: 'admitted'
    };

    room.participants.set(socketId, participant);
    room.admittedParticipants.set(pending.participantId, participant);
    return participant;
  }

  rejectParticipant(meetingCode, socketId) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;

    const pending = room.pendingRequests.get(socketId);
    if (!pending) return null;

    room.pendingRequests.delete(socketId);
    return pending;
  }

  isParticipantAdmitted(meetingCode, participantId) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return false;
    if (!room.settings.isWaitingRoomEnabled) return true;
    return room.admittedParticipants.has(participantId);
  }

  // Active Participants methods
  addAdmittedParticipant(meetingCode, socketId, participantData) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;

    const participant = {
      socketId,
      participantId: participantData.participantId,
      name: participantData.name,
      role: participantData.role || 'participant',
      isMuted: !!participantData.isMuted,
      isVideoOff: !!participantData.isVideoOff,
      isHandRaised: false,
      isScreenSharing: false,
      joinedAt: new Date(),
      status: 'admitted'
    };

    room.participants.set(socketId, participant);
    room.admittedParticipants.set(participantData.participantId, participant);
    return participant;
  }

  admitOrSyncParticipant(meetingCode, socketId, participantData) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;

    const isAdmitted =
      !room.settings.isWaitingRoomEnabled ||
      room.admittedParticipants.has(participantData.participantId) ||
      participantData.role === 'host';

    if (!isAdmitted) return null;

    // Clean any prior socket association for this participantId
    for (const [sId, p] of room.participants.entries()) {
      if (p.participantId === participantData.participantId && sId !== socketId) {
        room.participants.delete(sId);
      }
    }

    const participant = {
      socketId,
      participantId: participantData.participantId,
      name: participantData.name || 'Participant',
      role: participantData.role || 'participant',
      isMuted: !!participantData.isMuted,
      isVideoOff: !!participantData.isVideoOff,
      isHandRaised: false,
      isScreenSharing: false,
      joinedAt: new Date(),
      status: 'admitted'
    };

    room.participants.set(socketId, participant);
    room.admittedParticipants.set(participantData.participantId, participant);
    return participant;
  }

  getParticipant(meetingCode, socketId) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;
    return room.participants.get(socketId);
  }

  getAllParticipants(meetingCode) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return [];
    return Array.from(room.participants.values());
  }

  removeParticipant(meetingCode, socketId) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;

    const participant = room.participants.get(socketId);
    if (participant) {
      room.participants.delete(socketId);
      if (room.activePresenterSocketId === socketId) {
        room.activePresenterSocketId = null;
      }
    }
    room.pendingRequests.delete(socketId);
    return participant;
  }

  kickParticipant(meetingCode, targetSocketId) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;

    const participant = room.participants.get(targetSocketId);
    if (participant) {
      room.participants.delete(targetSocketId);
      room.admittedParticipants.delete(participant.participantId);
      if (room.activePresenterSocketId === targetSocketId) {
        room.activePresenterSocketId = null;
      }
    }
    room.pendingRequests.delete(targetSocketId);
    return participant;
  }

  updateParticipantState(meetingCode, socketId, updates) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;

    const participant = room.participants.get(socketId);
    if (!participant) return null;

    Object.assign(participant, updates);
    return participant;
  }

  // Announcements
  addAnnouncement(meetingCode, announcement) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;

    const item = {
      id: announcement.id || `ann-${Date.now()}`,
      senderName: announcement.senderName || 'Anonymous',
      senderRole: announcement.senderRole || 'participant',
      title: announcement.title || 'Announcement',
      message: announcement.message || '',
      link: announcement.link || '',
      createdAt: new Date()
    };

    room.announcements.push(item);
    if (room.announcements.length > 20) {
      room.announcements.shift();
    }
    return item;
  }

  // Screen Sharing
  setActivePresenter(meetingCode, socketId) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return false;
    room.activePresenterSocketId = socketId;
    return true;
  }

  clearActivePresenter(meetingCode) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return;
    room.activePresenterSocketId = null;
  }

  // Settings & Permissions
  updateSettings(meetingCode, newSettings) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;
    room.settings = { ...room.settings, ...newSettings };
    return room.settings;
  }

  // Cleanup on meeting end
  endMeeting(meetingCode) {
    const code = this._normCode(meetingCode);
    const room = this.rooms.get(code);
    if (!room) return null;

    room.status = 'ended';
    room.endedAt = new Date();

    const result = {
      meetingCode: code,
      participants: Array.from(room.participants.values()),
      pendingRequests: Array.from(room.pendingRequests.values())
    };

    // Keep tombstone for a short period so late joiners see "Ended"
    setTimeout(() => {
      this.rooms.delete(code);
      logger.info(`Purged ended room state for ${code}`);
    }, 10 * 60 * 1000);

    return result;
  }
}

export const activeRoomService = new ActiveRoomService();
