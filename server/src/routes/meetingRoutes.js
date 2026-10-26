import express from 'express';
import { meetingController } from '../controllers/meetingController.js';

const router = express.Router();

router.post('/', meetingController.createMeeting);
router.get('/recent', meetingController.getRecentMeetings);
router.get('/:meetingCode', meetingController.getMeeting);
router.post('/:meetingCode/verify-host', meetingController.verifyHost);
router.post('/:meetingCode/end', meetingController.endMeeting);

export default router;
