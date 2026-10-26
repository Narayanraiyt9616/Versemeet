import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

async function runVerification() {
  console.log('--- Starting CampusVerse Meet Real-Time Test ---');

  // Step 1: Create Meeting via API
  console.log('1. Creating new meeting via REST API...');
  const createRes = await fetch(`${BACKEND_URL}/api/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Advanced Computer Architecture Lecture',
      hostName: 'Prof. Ada Lovelace',
      settings: {
        allowStudentScreenShare: true,
        allowStudentChat: true,
        allowStudentAnnouncements: true,
        isWaitingRoomEnabled: true
      }
    })
  });

  const createData = await createRes.json();
  if (!createData.success) {
    throw new Error('Failed to create meeting: ' + JSON.stringify(createData));
  }

  const { meetingCode, hostToken, hostName } = createData.data;
  console.log(`✓ Meeting created successfully: Code = ${meetingCode}, Host = ${hostName}`);

  // Step 2: Connect Host Socket
  console.log('2. Connecting Host to meeting socket...');
  const hostSocket = io(BACKEND_URL, { transports: ['websocket'] });

  await new Promise((resolve, reject) => {
    hostSocket.on('connect', () => {
      console.log('✓ Host socket connected:', hostSocket.id);
      hostSocket.emit('host:join', {
        meetingCode,
        hostToken,
        hostName
      });
    });

    hostSocket.on('host:joined-success', (data) => {
      console.log('✓ Host joined successfully as room administrator:', data.participant.name);
      resolve();
    });

    setTimeout(() => reject(new Error('Host join timeout')), 5000);
  });

  // Step 3: Connect Student Socket & Request to Join Waiting Room
  console.log('3. Student connecting and requesting admission to Waiting Room...');
  const studentSocket = io(BACKEND_URL, { transports: ['websocket'] });

  let joinRequestId = null;

  await new Promise((resolve, reject) => {
    studentSocket.on('connect', () => {
      console.log('✓ Student socket connected:', studentSocket.id);
      studentSocket.emit('join:request', {
        meetingCode,
        participantId: 'student-rahul-01',
        name: 'Rahul Sharma',
        role: 'student'
      });
    });

    studentSocket.on('waiting:enqueued', (data) => {
      console.log('✓ Student placed in waiting lobby:', data.message);
    });

    // Verify host receives the join request in real time
    hostSocket.on('host:join-request', ({ request }) => {
      console.log(`✓ Host received real-time join request from: ${request.name} (Socket: ${request.socketId})`);
      joinRequestId = request.socketId;
      resolve();
    });

    setTimeout(() => reject(new Error('Student request admission timeout')), 5000);
  });

  // Step 4: Host Approves Student
  console.log('4. Host approving join request...');
  await new Promise((resolve, reject) => {
    studentSocket.on('join:approved', (data) => {
      console.log(`✓ Student successfully admitted into live room! Total participants: ${data.participants.length}`);
      resolve();
    });

    hostSocket.emit('host:approve-request', {
      meetingCode,
      socketId: joinRequestId
    });

    setTimeout(() => reject(new Error('Approval timeout')), 5000);
  });

  // Step 5: Test In-Meeting Chat
  console.log('5. Testing in-meeting real-time chat...');
  await new Promise((resolve, reject) => {
    hostSocket.on('chat:received', (msg) => {
      console.log(`✓ Host received chat message from [${msg.senderName}]: "${msg.text}"`);
      resolve();
    });

    studentSocket.emit('chat:message', {
      meetingCode,
      text: 'Good morning Professor! Excited for today lecture.'
    });

    setTimeout(() => reject(new Error('Chat message timeout')), 5000);
  });

  // Step 6: Test Classroom Announcement Broadcast
  console.log('6. Testing classroom temporary announcement...');
  await new Promise((resolve, reject) => {
    studentSocket.on('announcement:broadcast', (ann) => {
      console.log(`✓ Student received broadcast announcement from [${ann.senderName}]: "${ann.title} - ${ann.message}"`);
      resolve();
    });

    hostSocket.emit('announcement:send', {
      meetingCode,
      title: 'Lab Document',
      message: 'Please review problem 4 in the syllabus repository.',
      link: 'https://versemeet.edu/labs'
    });

    setTimeout(() => reject(new Error('Announcement timeout')), 5000);
  });

  // Step 7: Test WebRTC Signaling Offer & Answer Exchange
  console.log('7. Testing WebRTC signaling exchange (SDP Offer -> Answer)...');
  await new Promise((resolve, reject) => {
    const mockOfferSdp = { type: 'offer', sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' };

    studentSocket.on('signal:offer', ({ senderSocketId, sdp }) => {
      console.log(`✓ Student received SDP offer from Host (${senderSocketId})`);
      studentSocket.emit('signal:answer', {
        targetSocketId: senderSocketId,
        sdp: { type: 'answer', sdp: 'v=0\r\no=- 67890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
      });
    });

    hostSocket.on('signal:answer', ({ senderSocketId }) => {
      console.log(`✓ Host received SDP answer from Student (${senderSocketId})`);
      resolve();
    });

    hostSocket.emit('signal:offer', {
      targetSocketId: studentSocket.id,
      sdp: mockOfferSdp
    });

    setTimeout(() => reject(new Error('WebRTC signaling timeout')), 5000);
  });

  // Step 8: Test Raise Hand & Reactions
  console.log('8. Testing Raise Hand and Emoji reaction broadcast...');
  await new Promise((resolve, reject) => {
    hostSocket.on('participant:hand-toggled', ({ name, isHandRaised }) => {
      console.log(`✓ Host notified that ${name} raised hand: ${isHandRaised}`);
      resolve();
    });

    studentSocket.emit('hand:toggle', {
      meetingCode,
      isRaised: true
    });

    setTimeout(() => reject(new Error('Raise hand timeout')), 5000);
  });

  // Step 9: Host Ends Meeting for Everyone
  console.log('9. Host ending meeting for everyone...');
  await new Promise((resolve, reject) => {
    studentSocket.on('meeting:ended-by-host', (data) => {
      console.log(`✓ Student received meeting termination: "${data.message}"`);
      resolve();
    });

    hostSocket.emit('meeting:end-all', {
      meetingCode,
      hostToken
    });

    setTimeout(() => reject(new Error('Meeting termination timeout')), 5000);
  });

  // Step 10: Verify meeting is marked ended in backend
  console.log('10. Verifying meeting is marked ended and cannot accept new entries...');
  const verifyRes = await fetch(`${BACKEND_URL}/api/meetings/${meetingCode}`);
  const verifyData = await verifyRes.json();
  if (verifyRes.status === 404 && verifyData.error?.includes('ended')) {
    console.log(`✓ Meeting status confirmed: "${verifyData.error}". All server state cleaned up and access blocked!`);
  } else {
    throw new Error(`Expected ended response but got: ${JSON.stringify(verifyData)}`);
  }

  // Cleanup sockets
  hostSocket.disconnect();
  studentSocket.disconnect();

  console.log('======================================================');
  console.log(' ALL 10 CAMPUSVERSE MEET TESTS PASSED SUCCESSFULLY! ');
  console.log('======================================================');
}

runVerification().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
