import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import { setupMeetingSockets } from '../sockets/meetingSocket.js';

async function runFacultyDirectEntryAndWaitingRoomTest() {
  console.log('========================================================================');
  console.log('  Testing Faculty Direct Entry, Host Permissions & Waiting Room Rejection');
  console.log('========================================================================\n');

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Start test server
  await connectDB();
  const server = http.createServer(app);
  const ioServer = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling']
  });
  setupMeetingSockets(ioServer);

  const TEST_PORT = 5055;
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  const BASE_URL = `http://localhost:${TEST_PORT}`;
  console.log(`Test server running on ${BASE_URL}\n`);

  try {
    // 2. Faculty creates meeting
    console.log('1. Faculty creates meeting on Versemeet...');
    const createRes = await fetch(`${BASE_URL}/api/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Computer Science 101: Operating Systems',
        hostName: 'Dr. Smith (Faculty)',
        settings: { isWaitingRoomEnabled: true }
      })
    });
    const createData = await createRes.json();
    assert(createData.success, 'Meeting created successfully via API');
    const { meetingCode, hostToken, hostName } = createData.data;
    assert(!!meetingCode && !!hostToken, 'Valid meetingCode and secret hostToken returned');

    // 3. Test verifyHost API
    console.log('\n2. Testing /api/meetings/:code/verify-host endpoint...');
    const verifyValidRes = await fetch(`${BASE_URL}/api/meetings/${meetingCode}/verify-host`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostToken })
    });
    const verifyValidData = await verifyValidRes.json();
    assert(verifyValidData.isHost === true, 'Faculty with valid hostToken verified as Host (isHost: true)');

    const verifyInvalidRes = await fetch(`${BASE_URL}/api/meetings/${meetingCode}/verify-host`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostToken: 'invalid-token-xyz' })
    });
    const verifyInvalidData = await verifyInvalidRes.json();
    assert(verifyInvalidData.isHost === false, 'Joiner with invalid token rejected (isHost: false)');

    // 4. Faculty enters directly as Host
    console.log('\n3. Faculty enters directly into the meeting as Host (NO waiting room)...');
    const facultySocket = ClientIO(BASE_URL, { transports: ['websocket'] });
    let facultyJoinedData = null;

    await new Promise((resolve, reject) => {
      facultySocket.on('connect', () => {
        facultySocket.emit('host:join', { meetingCode, hostToken, hostName });
      });
      facultySocket.on('host:joined-success', (data) => {
        facultyJoinedData = data;
        resolve();
      });
      setTimeout(() => reject(new Error('Faculty join timeout')), 4000);
    });

    assert(facultyJoinedData !== null, 'Faculty joined directly without any waiting room');
    assert(facultyJoinedData.participant.role === 'host', 'Faculty has role: "host"');
    assert(facultyJoinedData.participant.name === 'Dr. Smith (Faculty)', 'Faculty display name matches');

    // 5. Student 1 requests to join -> goes to Waiting Room
    console.log('\n4. Student 1 connects with link and requests to join...');
    const student1Socket = ClientIO(BASE_URL, { transports: ['websocket'] });
    let student1WaitingData = null;
    let facultyReceivedReq1 = null;

    await new Promise((resolve, reject) => {
      facultySocket.on('host:join-request', (data) => {
        facultyReceivedReq1 = data;
        if (student1WaitingData) resolve();
      });

      student1Socket.on('connect', () => {
        student1Socket.emit('join:request', {
          meetingCode,
          participantId: 'student-1',
          name: 'Alice (Student)',
          role: 'participant'
        });
      });

      student1Socket.on('waiting:enqueued', (data) => {
        student1WaitingData = data;
        if (facultyReceivedReq1) resolve();
      });

      setTimeout(() => reject(new Error('Student 1 join request timeout')), 4000);
    });

    assert(student1WaitingData !== null, 'Student 1 is placed in the waiting room (waiting:enqueued)');
    assert(facultyReceivedReq1 !== null, 'Faculty received join request notification for Student 1');
    assert(facultyReceivedReq1.request.name === 'Alice (Student)', 'Request name is Student 1');

    // 6. Faculty APPROVES Student 1
    console.log('\n5. Faculty approves Student 1 to enter the meeting...');
    let student1ApprovedData = null;

    await new Promise((resolve, reject) => {
      student1Socket.on('join:approved', (data) => {
        student1ApprovedData = data;
        resolve();
      });

      facultySocket.emit('host:approve-request', {
        meetingCode,
        socketId: student1Socket.id
      });

      setTimeout(() => reject(new Error('Student 1 approval timeout')), 4000);
    });

    assert(student1ApprovedData !== null, 'Student 1 received join:approved confirmation');
    assert(student1ApprovedData.participant.role === 'participant', 'Student 1 has role: "participant" (NOT host)');
    assert(student1ApprovedData.participant.role !== 'host', 'Student 1 is strictly not marked with host title');

    // Student 1 enters live room
    let facultyNotifiedStudent1Entered = null;
    await new Promise((resolve, reject) => {
      facultySocket.on('participant:joined', (data) => {
        facultyNotifiedStudent1Entered = data;
        resolve();
      });

      student1Socket.emit('participant:enter-room', {
        meetingCode,
        participantId: 'student-1',
        name: 'Alice (Student)',
        role: 'participant'
      });

      setTimeout(() => reject(new Error('Student 1 enter room timeout')), 4000);
    });
    assert(facultyNotifiedStudent1Entered.participant.role === 'participant', 'Student 1 entered meeting as regular participant');

    // 7. Student 2 requests to join -> goes to Waiting Room
    console.log('\n6. Student 2 connects and requests to join...');
    const student2Socket = ClientIO(BASE_URL, { transports: ['websocket'] });
    let student2WaitingData = null;
    let facultyReceivedReq2 = null;

    await new Promise((resolve, reject) => {
      facultySocket.on('host:join-request', (data) => {
        facultyReceivedReq2 = data;
        if (student2WaitingData) resolve();
      });

      student2Socket.on('connect', () => {
        student2Socket.emit('join:request', {
          meetingCode,
          participantId: 'student-2',
          name: 'Bob (Unwanted Guest)',
          role: 'participant'
        });
      });

      student2Socket.on('waiting:enqueued', (data) => {
        student2WaitingData = data;
        if (facultyReceivedReq2) resolve();
      });

      setTimeout(() => reject(new Error('Student 2 join request timeout')), 4000);
    });

    assert(student2WaitingData !== null, 'Student 2 is in waiting room');
    assert(facultyReceivedReq2 !== null, 'Faculty received join request for Student 2');

    // 8. Faculty DECLINES / REJECTS Student 2
    console.log('\n7. Faculty declines / rejects Student 2...');
    let student2RejectedData = null;

    await new Promise((resolve, reject) => {
      student2Socket.on('join:rejected', (data) => {
        student2RejectedData = data;
        resolve();
      });

      facultySocket.emit('host:reject-request', {
        meetingCode,
        socketId: student2Socket.id,
        reason: 'This lecture is restricted to enrolled students.'
      });

      setTimeout(() => reject(new Error('Student 2 rejection timeout')), 4000);
    });

    assert(student2RejectedData !== null, 'Student 2 received join:rejected event');
    assert(
      student2RejectedData.reason === 'This lecture is restricted to enrolled students.',
      'Student 2 received decline reason and is moved out of waiting area'
    );

    // Verify Student 2 CANNOT enter the room after rejection
    let student2NotAdmitted = false;
    await new Promise((resolve) => {
      student2Socket.on('participant:not-admitted', () => {
        student2NotAdmitted = true;
        resolve();
      });

      student2Socket.emit('participant:enter-room', {
        meetingCode,
        participantId: 'student-2',
        name: 'Bob (Unwanted Guest)'
      });

      setTimeout(resolve, 1500);
    });
    assert(student2NotAdmitted, 'Rejected user is blocked from entering the meeting room');

    // Clean up sockets
    facultySocket.disconnect();
    student1Socket.disconnect();
    student2Socket.disconnect();

    console.log('\n========================================================================');
    console.log(' ALL FACULTY DIRECT ENTRY & WAITING ROOM TESTS PASSED WITH 100% SUCCESS! ');
    console.log('========================================================================\n');
  } finally {
    server.close();
  }
}

runFacultyDirectEntryAndWaitingRoomTest().catch((err) => {
  console.error('\nTest suite failed:', err);
  process.exit(1);
});
