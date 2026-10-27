import { Meeting } from '../models/Meeting.js';
import { activeRoomService } from './activeRoomService.js';
import { generateMeetingCode, generateHostToken } from '../utils/meetingCode.js';
import { getDatabaseStatus } from '../config/db.js';
import { logger } from '../utils/logger.js';

// In-memory persistent store fallback if MongoDB isn't running locally
const memoryMeetings = new Map();

export const meetingService = {
  /**
   * Creates a new meeting with unique code and secure host token
   */
  async createMeeting({ title, hostName, settings = {} }) {
    const meetingCode = generateMeetingCode();
    const hostToken = generateHostToken();

    const meetingData = {
      meetingCode,
      title: title || 'CampusVerse Meeting',
      hostName: hostName || 'Meeting Host',
      hostToken,
      status: 'waiting',
      settings: {
        allowStudentScreenShare: settings.allowStudentScreenShare !== false,
        allowStudentChat: settings.allowStudentChat !== false,
        allowStudentAnnouncements: settings.allowStudentAnnouncements !== false,
        isWaitingRoomEnabled: settings.isWaitingRoomEnabled !== false
      },
      participants: [],
      announcements: [],
      createdAt: new Date()
    };

    const dbStatus = getDatabaseStatus();
    if (!dbStatus.isInMemoryFallback) {
      try {
        const doc = await Meeting.create(meetingData);
        logger.info(`Saved meeting ${meetingCode} to MongoDB`);
      } catch (err) {
        logger.warn(`Failed writing to MongoDB, using memory fallback: ${err.message}`);
        memoryMeetings.set(meetingCode, meetingData);
      }
    } else {
      memoryMeetings.set(meetingCode, meetingData);
    }

    // Initialize active room memory state
    activeRoomService.getOrCreateRoom(meetingCode, meetingData);

    return {
      meetingCode,
      title: meetingData.title,
      hostName: meetingData.hostName,
      hostToken,
      status: 'waiting',
      createdAt: meetingData.createdAt,
      settings: meetingData.settings
    };
  },

  /**
   * Retrieves a meeting by code
   */
  async getMeetingByCode(meetingCode) {
    const code = (meetingCode || '').trim().toLowerCase();
    // Check active memory room first
    const active = activeRoomService.getRoom(code);
    if (active) {
      return {
        meetingCode: active.meetingCode,
        title: active.title,
        hostName: active.hostName,
        status: active.status,
        createdAt: active.createdAt,
        startedAt: active.startedAt,
        endedAt: active.endedAt,
        settings: active.settings,
        participantCount: active.participants.size
      };
    }

    // Check memory store
    if (memoryMeetings.has(code)) {
      const data = memoryMeetings.get(code);
      return {
        meetingCode: data.meetingCode,
        title: data.title,
        hostName: data.hostName,
        status: data.status,
        createdAt: data.createdAt,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        settings: data.settings,
        participantCount: 0
      };
    }

    // Check MongoDB
    const dbStatus = getDatabaseStatus();
    if (!dbStatus.isInMemoryFallback) {
      try {
        const doc = await Meeting.findOne({ meetingCode: code });
        if (doc) {
          return {
            meetingCode: doc.meetingCode,
            title: doc.title,
            hostName: doc.hostName,
            status: doc.status,
            createdAt: doc.createdAt,
            startedAt: doc.startedAt,
            endedAt: doc.endedAt,
            settings: doc.settings,
            participantCount: doc.participants.length
          };
        }
      } catch (err) {
        logger.error(`Error querying meeting by code: ${err.message}`);
      }
    }

    return null;
  },

  /**
   * Validates if a meeting is available and not ended
   */
  async validateMeeting(meetingCode) {
    const code = (meetingCode || '').trim().toLowerCase();
    const meeting = await this.getMeetingByCode(code);
    if (!meeting) {
      return { valid: false, error: 'Meeting not found. Please check your meeting code or link.' };
    }
    if (meeting.status === 'ended') {
      return { valid: false, error: 'This meeting has already ended.' };
    }
    return { valid: true, meeting };
  },

  /**
   * Validates host token for a meeting
   */
  async verifyHost(meetingCode, hostToken) {
    if (!hostToken) return false;
    const code = (meetingCode || '').trim().toLowerCase();

    const active = activeRoomService.getRoom(code);
    if (active && active.hostToken) {
      return active.hostToken === hostToken;
    }

    if (memoryMeetings.has(code)) {
      const match = memoryMeetings.get(code).hostToken === hostToken;
      if (match && active && !active.hostToken) {
        active.hostToken = hostToken;
      }
      return match;
    }

    const dbStatus = getDatabaseStatus();
    if (!dbStatus.isInMemoryFallback) {
      try {
        const doc = await Meeting.findOne({ meetingCode: code, hostToken });
        if (doc) {
          if (active && !active.hostToken) {
            active.hostToken = hostToken;
          }
          return true;
        }
      } catch (err) {
        logger.error(`Host verification error: ${err.message}`);
      }
    }

    return false;
  },

  /**
   * Ends a meeting for everyone
   */
  async endMeeting(meetingCode, hostToken) {
    const code = (meetingCode || '').trim().toLowerCase();
    const isHost = await this.verifyHost(code, hostToken);
    if (!isHost) {
      throw new Error('Unauthorized: Only the host can end this meeting.');
    }

    // End active room in memory
    const result = activeRoomService.endMeeting(meetingCode);

    // Update memory meetings
    if (memoryMeetings.has(meetingCode)) {
      const m = memoryMeetings.get(meetingCode);
      m.status = 'ended';
      m.endedAt = new Date();
    }

    // Update MongoDB
    const dbStatus = getDatabaseStatus();
    if (!dbStatus.isInMemoryFallback) {
      try {
        await Meeting.findOneAndUpdate(
          { meetingCode },
          { status: 'ended', endedAt: new Date() }
        );
      } catch (err) {
        logger.error(`Error ending meeting in MongoDB: ${err.message}`);
      }
    }

    return result;
  },

  /**
   * Retrieves recent/active meetings for dashboards
   */
  async getRecentMeetings() {
    const list = [];

    // From memory meetings
    for (const m of memoryMeetings.values()) {
      list.push({
        meetingCode: m.meetingCode,
        title: m.title,
        hostName: m.hostName,
        status: m.status,
        createdAt: m.createdAt,
        participantCount: activeRoomService.hasRoom(m.meetingCode)
          ? activeRoomService.getRoom(m.meetingCode).participants.size
          : 0
      });
    }

    // From active rooms that might not be in memoryMeetings
    for (const [code, r] of activeRoomService.rooms.entries()) {
      if (!list.find(item => item.meetingCode === code)) {
        list.push({
          meetingCode: r.meetingCode,
          title: r.title,
          hostName: r.hostName,
          status: r.status,
          createdAt: r.createdAt,
          participantCount: r.participants.size
        });
      }
    }

    return list.slice(0, 10);
  }
};
