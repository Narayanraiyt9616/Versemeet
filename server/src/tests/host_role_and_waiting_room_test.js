import { io } from 'socket.io-client';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function testHostRoleAndWaitingRoom() {
  console.log('========================================================================');
  console.log('  Testing Host Role Distinction & Mandatory Waiting Room Host Approval ');
  console.log('========================================================================');

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Create meeting via API
  console.log('\n1. Creating a new meeting as Creator (Host)...');
  const createRes = await fetch(`${BACKEND_URL}/api/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Host Role & Waiting Room Test',
      hostName: 'Meeting Creator (Real Host)',
      settings: { isWaitingRoomEnabled: true }
    })
  });
  const createData = await createRes.json();
  assert(createData.success, 'Meeting created successfully');
  const { meetingCode, hostToken, hostName } = createData.data;

  // 2. Connect Host Socket
  console.log('\n2. Connecting Creator as Host...');
  const hostSocket = io(BACKEND_URL, { transports: ['websocket'] });
  let hostJoinedData = null;

  await new Promise((resolve) => {
    hostSocket.on('connect', () => {
      hostSocket.emit('host:join', { meetingCode, hostToken, hostName });
    });
    hostSocket.on('host:joined-success', (data) => {
      hostJoinedData = data;
      resolve();
    });
  });

  assert(hostJoinedData.participant.role === 'host', 'Creator correctly received role: "host"');
  assert(hostJoinedData.participant.name === 'Meeting Creator (Real Host)', 'Creator name matches');

  // 3. Unauthorized user attempting host:join
  console.log('\n3. Verifying that a joiner WITHOUT valid hostToken CANNOT join as Host...');
  const fakeHostSocket = io(BACKEND_URL, { transports: ['websocket'] });
  let unauthorizedReceived = false;

  await new Promise((resolve) => {
    fakeHostSocket.on('connect', () => {
      fakeHostSocket.emit('host:join', {
        meetingCode,
        hostToken: 'fake-token-12345',
        hostName: 'Imposter Host'
      });
    });
    fakeHostSocket.on('error:unauthorized', () => {
      unauthorizedReceived = true;
      resolve();
    });
    setTimeout(resolve, 2000);
  });
  assert(unauthorizedReceived, 'Imposter user was rejected with error:unauthorized');
  fakeHostSocket.disconnect();

  // 4. Participant joins and MUST be put in Waiting Room
  console.log('\n4. Participant joining - verifying MANDATORY waiting room...');
  const studentSocket = io(BACKEND_URL, { transports: ['websocket'] });
  let studentWaitingEnqueued = null;
  let hostReceivedJoinRequest = null;

  const joinPromise = new Promise((resolve) => {
    hostSocket.on('host:join-request', (data) => {
      hostReceivedJoinRequest = data;
      if (studentWaitingEnqueued) resolve();
    });

    studentSocket.on('connect', () => {
      studentSocket.emit('join:request', {
        meetingCode,
        participantId: 'student-unique-123',
        name: 'Regular Student',
        role: 'participant'
      });
    });

    studentSocket.on('waiting:enqueued', (data) => {
      studentWaitingEnqueued = data;
      if (hostReceivedJoinRequest) resolve();
    });
  });

  await joinPromise;
  assert(studentWaitingEnqueued !== null, 'Student was placed in waiting room (waiting:enqueued)');
  assert(hostReceivedJoinRequest !== null, 'Host received the student join request for approval');
  assert(hostReceivedJoinRequest.request.role === 'participant', 'Student request role is strictly "participant"');

  // 5. Verify student CANNOT enter room before host approval
  console.log('\n5. Verifying student CANNOT enter room before host approves...');
  let notAdmittedReceived = false;
  await new Promise((resolve) => {
    studentSocket.emit('participant:enter-room', {
      meetingCode,
      participantId: 'student-unique-123',
      name: 'Regular Student',
      role: 'participant'
    });
    studentSocket.on('participant:not-admitted', () => {
      notAdmittedReceived = true;
      resolve();
    });
    setTimeout(resolve, 1500);
  });
  assert(notAdmittedReceived, 'Direct entry attempt before host approval was blocked!');

  // 6. Host approves student
  console.log('\n6. Host approving student...');
  let studentApprovedData = null;
  const approvePromise = new Promise((resolve) => {
    studentSocket.on('join:approved', (data) => {
      studentApprovedData = data;
      resolve();
    });
    hostSocket.emit('host:approve-request', {
      meetingCode,
      socketId: studentSocket.id
    });
  });

  await approvePromise;
  assert(studentApprovedData !== null, 'Student received join:approved after host approved');
  assert(studentApprovedData.participant.role === 'participant', 'Approved participant has role: "participant" (NOT host!)');
  assert(studentApprovedData.participant.role !== 'host', 'Approved participant is strictly NOT a host');

  // 7. Student enters room
  console.log('\n7. Student enters live room as admitted participant...');
  let hostNotifiedParticipantJoined = null;
  const enterPromise = new Promise((resolve) => {
    hostSocket.on('participant:joined', (data) => {
      hostNotifiedParticipantJoined = data;
      resolve();
    });
    studentSocket.emit('participant:enter-room', {
      meetingCode,
      participantId: 'student-unique-123',
      name: 'Regular Student',
      role: 'participant'
    });
  });

  await enterPromise;
  assert(hostNotifiedParticipantJoined !== null, 'Host was notified of participant entering');
  assert(hostNotifiedParticipantJoined.participant.role === 'participant', 'Host sees participant with role: "participant"');
  assert(hostNotifiedParticipantJoined.participant.role !== 'host', 'Participant does NOT have host title in the room!');

  // Clean up
  hostSocket.disconnect();
  studentSocket.disconnect();

  console.log('\n========================================================================');
  console.log(' ALL HOST ROLE & MANDATORY WAITING ROOM TESTS PASSED WITH 100% SUCCESS! ');
  console.log('========================================================================');
}

testHostRoleAndWaitingRoom().catch(err => {
  console.error('\nTest failed:', err);
  process.exit(1);
});
