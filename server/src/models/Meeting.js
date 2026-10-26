import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  participantId: { type: String, required: true },
  socketId: { type: String },
  name: { type: String, required: true },
  role: { type: String, enum: ['host', 'faculty', 'student'], default: 'student' },
  status: { type: String, enum: ['waiting', 'admitted', 'rejected', 'left', 'removed'], default: 'waiting' },
  isHandRaised: { type: Boolean, default: false },
  isMuted: { type: Boolean, default: false },
  isVideoOff: { type: Boolean, default: false },
  isScreenSharing: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date }
}, { _id: false });

const announcementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, default: 'faculty' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const meetingSchema = new mongoose.Schema({
  meetingCode: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, default: 'Classroom Lecture' },
  hostToken: { type: String, required: true },
  hostName: { type: String, required: true, default: 'Professor' },
  hostSocketId: { type: String },
  status: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
  settings: {
    allowStudentScreenShare: { type: Boolean, default: true },
    allowStudentChat: { type: Boolean, default: true },
    allowStudentAnnouncements: { type: Boolean, default: true },
    isWaitingRoomEnabled: { type: Boolean, default: true }
  },
  participants: [participantSchema],
  announcements: [announcementSchema],
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  endedAt: { type: Date }
}, { timestamps: true });

// Export Mongoose Model
export const Meeting = mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);
