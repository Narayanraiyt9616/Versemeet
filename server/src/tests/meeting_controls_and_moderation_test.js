import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import { setupMeetingSockets } from '../sockets/meetingSocket.js';

async function runControlsAndModerationTest() {
  console.log('========================================================================');
  console.log('  Testing Meeting Controls: Hand Raise, Reactions, Chat, Announcements, ');
  console.log('  Real-time Mute, Host Moderation, Disconnect & Ban Prevention          ');
  console.log('========================================================================\n');

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Start server on test port 5056
  await connectDB();
  const server = http.createServer(app);
  const ioServer = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling']
  });
  setupMeetingSockets(ioServer);

  const TEST_PORT = 5056;
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  const BASE_URL = `http://localhost:${TEST_PORT}`;
  console.log(`Test server running on ${BASE_URL}\n`);

  let hostSocket, studentSocket;

  try {
    // 2. Create meeting
    console.log('Step 1: Creating meeting via API...');
    const createRes = await fetch(`${BASE_URL}/api/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Advanced Distributed Systems Seminar',
        hostName: 'Prof. Miller',
        settings: {
          isWaitingRoomEnabled: true,
          allowStudentChat: true,
          allowStudentAnnouncements: true
        }
      })
    });
    const createData = await createRes.json();
    assert(createData.success, 'Meeting created successfully');
    const { meetingCode, hostToken } = createData.data;

    // 3. Connect Host Socket
    console.log('\nStep 2: Connecting Host socket and authenticating...');
    hostSocket = ClientIO(BASE_URL, { transports: ['websocket'] });
    await new Promise((resolve) => hostSocket.on('connect', resolve));

    const hostJoinedPromise = new Promise((resolve) => {
      hostSocket.on('host:joined-success', (data) => resolve(data));
    });
    hostSocket.emit('host:join', {
      meetingCode,
      hostToken,
      hostName: 'Prof. Miller'
    });
    const hostJoinedData = await hostJoinedPromise;
    assert(hostJoinedData.participant.role === 'host', 'Host joined and authenticated with role host');

    // 4. Connect Student Socket & Request to Join
    console.log('\nStep 3: Student requests admission into meeting...');
    studentSocket = ClientIO(BASE_URL, { transports: ['websocket'] });
    await new Promise((resolve) => studentSocket.on('connect', resolve));

    const studentId = 'student-test-123';
    const hostJoinReqPromise = new Promise((resolve) => {
      hostSocket.on('host:join-request', (data) => resolve(data));
    });

    studentSocket.emit('join:request', {
      meetingCode,
      participantId: studentId,
      name: 'Alex Johnson'
    });

    const hostReq = await hostJoinReqPromise;
    assert(hostReq.request.name === 'Alex Johnson', 'Host received join request for Alex Johnson');

    // 5. Host approves student
    console.log('\nStep 4: Host approves student admission...');
    const studentApprovedPromise = new Promise((resolve) => {
      studentSocket.on('join:approved', (data) => resolve(data));
    });

    hostSocket.emit('host:approve-request', {
      meetingCode,
      socketId: studentSocket.id
    });

    const approvalData = await studentApprovedPromise;
    assert(approvalData.participant.role === 'participant', 'Student approved with role participant');

    // Student enters room
    studentSocket.emit('participant:enter-room', {
      meetingCode,
      participantId: studentId,
      name: 'Alex Johnson',
      role: 'participant',
      isMuted: false,
      isVideoOff: false
    });
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 6. Test Raise Hand
    console.log('\nStep 5: Testing Raise Hand & Lower Hand sync...');
    const handToggledHostPromise = new Promise((resolve) => {
      hostSocket.once('participant:hand-toggled', (data) => resolve(data));
    });
    const handToggledStudentPromise = new Promise((resolve) => {
      studentSocket.once('participant:hand-toggled', (data) => resolve(data));
    });

    studentSocket.emit('hand:toggle', {
      meetingCode,
      isRaised: true
    });

    const [hostHandData, studentHandData] = await Promise.all([
      handToggledHostPromise,
      handToggledStudentPromise
    ]);

    assert(hostHandData.isHandRaised === true, 'Host received student hand raised event');
    assert(studentHandData.isHandRaised === true, 'Student received self hand raised event');

    // Lower Hand
    const lowerHandPromise = new Promise((resolve) => {
      hostSocket.once('participant:hand-toggled', (data) => resolve(data));
    });
    studentSocket.emit('hand:toggle', {
      meetingCode,
      isRaised: false
    });
    const lowerHandData = await lowerHandPromise;
    assert(lowerHandData.isHandRaised === false, 'Host received hand lowered event');

    // 7. Test Emoji Reactions
    console.log('\nStep 6: Testing Emoji Reactions broadcast...');
    const reactionHostPromise = new Promise((resolve) => {
      hostSocket.once('reaction:received', (data) => resolve(data));
    });
    const reactionStudentPromise = new Promise((resolve) => {
      studentSocket.once('reaction:received', (data) => resolve(data));
    });

    studentSocket.emit('reaction:send', {
      meetingCode,
      emoji: '🎉'
    });

    const [hostReaction, studentReaction] = await Promise.all([
      reactionHostPromise,
      reactionStudentPromise
    ]);
    assert(hostReaction.emoji === '🎉' && hostReaction.senderName === 'Alex Johnson', 'Host received emoji reaction 🎉 from Alex Johnson');
    assert(studentReaction.emoji === '🎉', 'Student received emoji reaction broadcast');

    // 8. Test Announcements
    console.log('\nStep 7: Testing Meeting Announcements broadcast...');
    const announcementStudentPromise = new Promise((resolve) => {
      studentSocket.once('announcement:broadcast', (data) => resolve(data));
    });

    hostSocket.emit('announcement:send', {
      meetingCode,
      title: 'Lab Exercise 4 Released',
      message: 'Please review section 2 before writing tests.',
      link: 'https://example.com/lab4'
    });

    const announcementData = await announcementStudentPromise;
    assert(announcementData.title === 'Lab Exercise 4 Released', 'Student received announcement title');
    assert(announcementData.link === 'https://example.com/lab4', 'Student received announcement link');

    // 9. Test In-Meeting Chat
    console.log('\nStep 8: Testing In-Meeting Chat...');
    const chatHostPromise = new Promise((resolve) => {
      hostSocket.once('chat:received', (data) => resolve(data));
    });

    studentSocket.emit('chat:message', {
      meetingCode,
      text: 'Hello professor, is assignment 3 due on Friday?'
    });

    const chatData = await chatHostPromise;
    assert(chatData.text === 'Hello professor, is assignment 3 due on Friday?', 'Host received chat message');
    assert(chatData.senderName === 'Alex Johnson', 'Chat message includes correct sender');

    // 10. Test Real-time Mute & Remote Force Mute
    console.log('\nStep 9: Testing Real-Time Microphone Muting & Remote Mute...');
    // A. Student toggles self mute
    const studentSelfMutePromise = new Promise((resolve) => {
      hostSocket.once('participant:media-updated', (data) => resolve(data));
    });
    studentSocket.emit('media:state-update', {
      meetingCode,
      isMuted: true,
      isVideoOff: false
    });
    const selfMuteData = await studentSelfMutePromise;
    assert(selfMuteData.isMuted === true && selfMuteData.socketId === studentSocket.id, 'Host received student self-mute status update');

    // Student un-mutes
    studentSocket.emit('media:state-update', {
      meetingCode,
      isMuted: false,
      isVideoOff: false
    });
    await new Promise((resolve) => setTimeout(resolve, 200));

    // B. Host remotely force-mutes student
    const forceMuteReceivedPromise = new Promise((resolve) => {
      studentSocket.once('media:force-mute', () => resolve(true));
    });
    const mediaUpdatedBroadcastPromise = new Promise((resolve) => {
      hostSocket.once('participant:media-updated', (data) => resolve(data));
    });

    hostSocket.emit('host:mute-participant', {
      meetingCode,
      targetSocketId: studentSocket.id
    });

    const [forceMuteReceived, mediaUpdated] = await Promise.all([
      forceMuteReceivedPromise,
      mediaUpdatedBroadcastPromise
    ]);

    assert(forceMuteReceived === true, 'Student received media:force-mute instruction from host');
    assert(mediaUpdated.isMuted === true && mediaUpdated.socketId === studentSocket.id, 'Host received participant:media-updated broadcast with isMuted: true');

    // 11. Test Host Kick, Immediate Disconnect & Rejoin Ban
    console.log('\nStep 10: Testing Host Kick, Immediate Disconnect & Ban Prevention...');
    const studentRemovedPromise = new Promise((resolve) => {
      studentSocket.once('participant:removed', (data) => resolve(data));
    });
    const studentDisconnectedPromise = new Promise((resolve) => {
      studentSocket.once('disconnect', () => resolve(true));
    });
    const hostSawLeftPromise = new Promise((resolve) => {
      hostSocket.once('participant:left', (data) => resolve(data));
    });

    const targetSocketId = studentSocket.id;

    hostSocket.emit('host:kick-participant', {
      meetingCode,
      targetSocketId
    });

    const [removedData, studentDisconnected, leftData] = await Promise.all([
      studentRemovedPromise,
      studentDisconnectedPromise,
      hostSawLeftPromise
    ]);

    assert(!!removedData.reason, `Student received kick notice with reason: "${removedData.reason}"`);
    assert(studentDisconnected === true, 'Student socket was immediately and strictly disconnected by server');
    assert(leftData.socketId === targetSocketId, 'Room was notified of kicked participant departure');

    // Step 11: Attempt to Rejoin while Banned
    console.log('\nStep 11: Verifying kicked participant CANNOT rejoin...');
    const bannedSocket = ClientIO(BASE_URL, { transports: ['websocket'] });
    await new Promise((resolve) => bannedSocket.on('connect', resolve));

    // Attempt join:request with same participantId
    const joinRejectedPromise = new Promise((resolve) => {
      bannedSocket.once('join:rejected', (data) => resolve(data));
    });

    bannedSocket.emit('join:request', {
      meetingCode,
      participantId: studentId,
      name: 'Alex Johnson (Sneaky Rejoin)'
    });

    const rejectedData = await joinRejectedPromise;
    const rejectMsg = rejectedData.message || rejectedData.reason || '';
    assert(rejectMsg.includes('removed from this meeting by the host and cannot rejoin'), 'Kicked participant join:request was REJECTED with ban notice');

    // Attempt direct participant:enter-room bypass with same participantId
    const enterRejectedPromise = new Promise((resolve) => {
      bannedSocket.once('participant:not-admitted', (data) => resolve(data));
    });

    bannedSocket.emit('participant:enter-room', {
      meetingCode,
      participantId: studentId,
      name: 'Alex Johnson (Bypass)'
    });

    const notAdmittedData = await enterRejectedPromise;
    assert(notAdmittedData.reason.includes('removed from this meeting by the host and cannot rejoin'), 'Kicked participant direct entry bypass was BLOCKED with ban notice');

    bannedSocket.disconnect();

    console.log('\n========================================================================');
    console.log('  ALL CONTROLS AND MODERATION TESTS PASSED PERFECTLY (100% SUCCESS)    ');
    console.log('========================================================================\n');

  } finally {
    if (hostSocket?.connected) hostSocket.disconnect();
    if (studentSocket?.connected) studentSocket.disconnect();
    server.close();
  }
}

runControlsAndModerationTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
