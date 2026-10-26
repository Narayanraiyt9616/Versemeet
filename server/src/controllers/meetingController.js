import { meetingService } from '../services/meetingService.js';
import { activeRoomService } from '../services/activeRoomService.js';
import { logger } from '../utils/logger.js';

export const meetingController = {
  /**
   * Create a new meeting
   */
  async createMeeting(req, res, next) {
    try {
      const { title, hostName, settings } = req.body;
      const meeting = await meetingService.createMeeting({
        title: title ? title.trim() : 'CampusVerse Meeting',
        hostName: hostName ? hostName.trim() : 'Meeting Host',
        settings
      });

      res.status(201).json({
        success: true,
        message: 'Meeting created successfully',
        data: meeting
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get meeting by code and validate status
   */
  async getMeeting(req, res, next) {
    try {
      const meetingCode = (req.params.meetingCode || '').trim().toLowerCase();
      const validation = await meetingService.validateMeeting(meetingCode);

      if (!validation.valid) {
        return res.status(404).json({
          success: false,
          error: validation.error
        });
      }

      res.json({
        success: true,
        data: validation.meeting
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Verify if the provided token belongs to the meeting's host
   */
  async verifyHost(req, res, next) {
    try {
      const meetingCode = (req.params.meetingCode || '').trim().toLowerCase();
      const hostToken = req.headers['x-host-token'] || req.body.hostToken;

      const isHost = await meetingService.verifyHost(meetingCode, hostToken);
      res.json({
        success: true,
        isHost
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * End meeting for everyone
   */
  async endMeeting(req, res, next) {
    try {
      const meetingCode = (req.params.meetingCode || '').trim().toLowerCase();
      const hostToken = req.headers['x-host-token'] || req.body.hostToken;

      await meetingService.endMeeting(meetingCode, hostToken);

      res.json({
        success: true,
        message: 'Meeting ended successfully for all participants'
      });
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        return res.status(403).json({ success: false, error: err.message });
      }
      next(err);
    }
  },

  /**
   * List recent meetings for dashboard
   */
  async getRecentMeetings(req, res, next) {
    try {
      const recent = await meetingService.getRecentMeetings();
      res.json({
        success: true,
        data: recent
      });
    } catch (err) {
      next(err);
    }
  }
};
