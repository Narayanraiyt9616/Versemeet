import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMeetingCode(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return '';
  let str = rawInput.trim();
  try {
    if (str.startsWith('http://') || str.startsWith('https://')) {
      const url = new URL(str);
      const pathname = url.pathname;
      const match = pathname.match(/\/(?:meeting|waiting|join)\/([^/?#]+)/i);
      if (match && match[1]) return match[1].trim().toLowerCase();
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) return segments[segments.length - 1].trim().toLowerCase();
    }
  } catch (e) {}
  const match = str.match(/(?:meeting|waiting|join)\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) return match[1].trim().toLowerCase();
  return str.split('?')[0].split('#')[0].replace(/\/+$/, '').replace(/^\/+/, '').trim().toLowerCase();
}

async function runMultiUserMeetingTest() {
  console.log('================================================================');
  console.log('   CAMPUSVERSE MEET - COMPLETE MULTI-USER WORKFLOW E2E TEST   ');
  console.log('================================================================\n');

  let passedSteps = 0;
  const totalSteps = 10;

  // -------------------------------------------------------------
  // STEP 1: Parse and link normalization tests
  // -------------------------------------------------------------
  console.log('[Step 1/10] Testing meeting code & link parser with tricky inputs...');
  const testInputs = [
    { input: 'vm-100-abcd-200', expected: 'vm-100-abcd-200' },
    { input: '  VM-100-ABCD-200  ', expected: 'vm-100-abcd-200' },
    { input: 'http://localhost:5173/meeting/vm-100-abcd-200', expected: 'vm-100-abcd-200' },
    { input: 'http://localhost:5173/meeting/vm-100-abcd-200?ref=share&user=1', expected: 'vm-100-abcd-200' },
    { input: 'http://localhost:5173/join/vm-100-abcd-200/', expected: 'vm-100-abcd-200' },
    { input: 'http://localhost:5173/waiting/vm-100-abcd-200#video', expected: 'vm-100-abcd-200' },
    { input: 'https://campusverse.edu/meeting/VM-100-ABCD-200?track=cs101', expected: 'vm-100-abcd-200' }
  ];

  for (const item of testInputs) {
    const result = parseMeetingCode(item.input);
    if (result !== item.expected) {
      throw new Error(`Parser failed for "${item.input}". Expected: "${item.expected}", Got: "${result}"`);
    }
  }
  console.log('  ✓ All 7 tricky link and code formats parsed and normalized perfectly.');
  passedSteps++;

  // -------------------------------------------------------------
  // STEP 2: Create Meeting as Host via API
  // -------------------------------------------------------------
  console.log('\n[Step 2/10] Creating meeting room via API...');
  const createRes = await fetch(`${BACKEND_URL}/api/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Advanced Computer Science & Distributed Systems',
      hostName: 'Prof. Evelyn Reed',
      settings: {
        isWaitingRoomEnabled: true,
        allowStudentScreenShare: true,
        allowStudentChat: true,
        allowStudentAnnouncements: true
      }
    })
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.success) {
    throw new Error(`Failed to create meeting: ${JSON.stringify(createData)}`);
  }

  const { meetingCode, hostToken, title, hostName } = createData.data;
  const shareableMeetingLink = `http://localhost:5173/meeting/${meetingCode}`;

  console.log(`  ✓ Meeting Created Successfully:`);
  console.log(`    - Meeting ID:   ${meetingCode}`);
  console.log(`    - Host Token:   ${hostToken.slice(0, 10)}...`);
  console.log(`    - Title:        ${title}`);
  console.log(`    - Host:         ${hostName}`);
  console.log(`    - Share Link:   ${shareableMeetingLink}`);
  passedSteps++;

  // -------------------------------------------------------------
  // STEP 3: Verify Meeting Details via GET API with various cases
  // -------------------------------------------------------------
  console.log('\n[Step 3/10] Verifying meeting retrieval API with case-insensitivity...');
  const getRes = await fetch(`${BACKEND_URL}/api/meetings/${meetingCode.toUpperCase()}`);
  const getData = await getRes.json();
  if (!getRes.ok || getData.data.meetingCode !== meetingCode) {
    throw new Error(`GET API failed to retrieve meeting with uppercase code`);
  }
  console.log(`  ✓ Meeting confirmed active via API with uppercase/normalized lookup.`);
  passedSteps++;

  // -------------------------------------------------------------
  // STEP 4: Host Connects & Enters Live Meeting Room
  // -------------------------------------------------------------
  console.log('\n[Step 4/10] Host connecting Socket.IO and joining room...');
  const hostSocket = io(BACKEND_URL, { transports: ['websocket'] });

  await new Promise((resolve, reject) => {
    hostSocket.on('connect', () => {
      hostSocket.emit('host:join', {
        meetingCode,
        hostToken,
        hostName
      });
    });

    hostSocket.on('host:joined-success', (data) => {
      if (data.participant.role === 'host') {
        console.log(`  ✓ Host successfully joined room meeting:${meetingCode} on socket ${hostSocket.id}`);
        resolve();
      } else {
        reject(new Error('Host role mismatch'));
      }
    });

    hostSocket.on('error:general', reject);
    setTimeout(() => reject(new Error('Host join timeout')), 5000);
  });
  passedSteps++;

  // -------------------------------------------------------------
  // STEP 5: Participant 1 (Alice) Joins Using Meeting Code
  // -------------------------------------------------------------
  console.log('\n[Step 5/10] Participant 1 (Alice) requesting admission with meeting code...');
  const p1Socket = io(BACKEND_URL, { transports: ['websocket'] });
  const p1Id = `part-alice-${Date.now()}`;
  let p1Approved = false;

  await new Promise((resolve, reject) => {
    p1Socket.on('connect', () => {
      p1Socket.emit('join:request', {
        meetingCode,
        participantId: p1Id,
        name: 'Alice Johnson',
        role: 'participant'
      });
    });

    p1Socket.on('waiting:enqueued', (data) => {
      console.log(`  ✓ Alice enqueued in waiting room: "${data.message}"`);
    });

    // Host listens for join request
    hostSocket.on('host:join-request', ({ request }) => {
      console.log(`  ✓ Host received join request from: ${request.name} (socket: ${request.socketId})`);
      // Host admits Alice
      hostSocket.emit('host:approve-request', {
        meetingCode,
        socketId: request.socketId
      });
    });

    // Alice receives approval
    p1Socket.on('join:approved', (data) => {
      p1Approved = true;
      console.log(`  ✓ Alice received join:approved! Admitted by host.`);
      resolve();
    });

    setTimeout(() => reject(new Error('Participant 1 approval timeout')), 6000);
  });

  // Alice enters meeting room with participant:enter-room
  await new Promise((resolve, reject) => {
    p1Socket.emit('participant:enter-room', {
      meetingCode,
      participantId: p1Id,
      name: 'Alice Johnson',
      role: 'participant',
      isMuted: false,
      isVideoOff: false
    });

    p1Socket.on('room:sync-admitted', ({ participants }) => {
      console.log(`  ✓ Alice received room:sync-admitted. Total peers in room: ${participants.length}`);
      if (participants.some(p => p.role === 'host') && participants.some(p => p.name === 'Alice Johnson')) {
        resolve();
      } else {
        reject(new Error('Missing host or participant in room sync'));
      }
    });

    setTimeout(() => reject(new Error('Alice room sync timeout')), 5000);
  });
  passedSteps++;

  // -------------------------------------------------------------
  // STEP 6: WebRTC Signaling Between Host and Participant 1 (Alice)
  // -------------------------------------------------------------
  console.log('\n[Step 6/10] Testing WebRTC SDP Offer/Answer & ICE signaling between Host and Alice...');
  await new Promise((resolve, reject) => {
    const mockOfferSdp = { type: 'offer', sdp: 'v=0\r\no=alice 1234 5678 IN IP4 127.0.0.1\r\ns=CampusVerseVideo...' };
    const mockAnswerSdp = { type: 'answer', sdp: 'v=0\r\no=host 5678 1234 IN IP4 127.0.0.1\r\ns=CampusVerseVideo...' };
    const mockCandidate = { candidate: 'candidate:1 1 UDP 2122260223 127.0.0.1 50001 typ host' };

    // Host receives offer and sends answer
    hostSocket.once('signal:offer', ({ senderSocketId, sdp }) => {
      console.log(`  ✓ Host received SDP offer from Alice (${senderSocketId})`);
      hostSocket.emit('signal:answer', {
        targetSocketId: senderSocketId,
        sdp: mockAnswerSdp
      });
    });

    // Alice receives answer
    p1Socket.once('signal:answer', ({ senderSocketId, sdp }) => {
      console.log(`  ✓ Alice received SDP answer from Host (${senderSocketId})`);
      // Now Alice sends ICE candidate
      p1Socket.emit('signal:ice-candidate', {
        targetSocketId: senderSocketId,
        candidate: mockCandidate
      });
    });

    // Host receives ICE candidate
    hostSocket.once('signal:ice-candidate', ({ senderSocketId, candidate }) => {
      console.log(`  ✓ Host received ICE candidate from Alice (${senderSocketId})`);
      resolve();
    });

    // Alice initiates offer
    p1Socket.emit('signal:offer', {
      targetSocketId: hostSocket.id,
      sdp: mockOfferSdp
    });

    setTimeout(() => reject(new Error('WebRTC signaling timeout')), 6000);
  });
  passedSteps++;

  // -------------------------------------------------------------
  // STEP 7: Participant 2 (Bob) Joins Using Shared URL Link
  // -------------------------------------------------------------
  console.log('\n[Step 7/10] Participant 2 (Bob) joining using shared link format...');
  const sharedUrlWithParams = `${shareableMeetingLink}?name=Bob+Martinez&invitedBy=Dean`;
  const parsedCodeForBob = parseMeetingCode(sharedUrlWithParams);
  console.log(`  ✓ Bob parsed code from shared link: "${parsedCodeForBob}"`);

  const p2Socket = io(BACKEND_URL, { transports: ['websocket'] });
  const p2Id = `part-bob-${Date.now()}`;

  await new Promise((resolve, reject) => {
    p2Socket.on('connect', () => {
      p2Socket.emit('join:request', {
        meetingCode: parsedCodeForBob,
        participantId: p2Id,
        name: 'Bob Martinez',
        role: 'participant'
      });
    });

    hostSocket.once('host:join-request', ({ request }) => {
      console.log(`  ✓ Host received join request from: ${request.name}`);
      hostSocket.emit('host:approve-request', {
        meetingCode: parsedCodeForBob,
        socketId: request.socketId
      });
    });

    p2Socket.on('join:approved', () => {
      console.log(`  ✓ Bob received join:approved! Entering room.`);
      p2Socket.emit('participant:enter-room', {
        meetingCode: parsedCodeForBob,
        participantId: p2Id,
        name: 'Bob Martinez',
        role: 'participant',
        isMuted: false,
        isVideoOff: false
      });
    });

    // Bob receives room sync with all 3 participants
    p2Socket.on('room:sync-admitted', ({ participants }) => {
      console.log(`  ✓ Bob received room:sync-admitted! Total participants in live room: ${participants.length}`);
      if (participants.length === 3) {
        resolve();
      } else {
        reject(new Error(`Expected 3 participants, found ${participants.length}`));
      }
    });

    setTimeout(() => reject(new Error('Bob join timeout')), 7000);
  });
  passedSteps++;

  // -------------------------------------------------------------
  // STEP 8: Mesh Signaling Between Bob, Alice, and Host
  // -------------------------------------------------------------
  console.log('\n[Step 8/10] Verifying full mesh signaling (Bob connects to Host & Alice)...');
  await new Promise((resolve, reject) => {
    let hostAnswered = false;
    let aliceAnswered = false;

    hostSocket.once('signal:offer', ({ senderSocketId, sdp }) => {
      hostSocket.emit('signal:answer', {
        targetSocketId: senderSocketId,
        sdp: { type: 'answer', sdp: 'host-to-bob-answer' }
      });
    });

    p1Socket.once('signal:offer', ({ senderSocketId, sdp }) => {
      p1Socket.emit('signal:answer', {
        targetSocketId: senderSocketId,
        sdp: { type: 'answer', sdp: 'alice-to-bob-answer' }
      });
    });

    p2Socket.on('signal:answer', ({ senderSocketId }) => {
      if (senderSocketId === hostSocket.id) {
        console.log('  ✓ Bob received WebRTC answer from Host');
        hostAnswered = true;
      }
      if (senderSocketId === p1Socket.id) {
        console.log('  ✓ Bob received WebRTC answer from Alice');
        aliceAnswered = true;
      }
      if (hostAnswered && aliceAnswered) {
        resolve();
      }
    });

    // Bob creates offers for both existing peers
    p2Socket.emit('signal:offer', { targetSocketId: hostSocket.id, sdp: { type: 'offer', sdp: 'bob-to-host' } });
    p2Socket.emit('signal:offer', { targetSocketId: p1Socket.id, sdp: { type: 'offer', sdp: 'bob-to-alice' } });

    setTimeout(() => reject(new Error('Mesh signaling timeout')), 6000);
  });
  passedSteps++;

  // -------------------------------------------------------------
  // STEP 9: Test In-Meeting Chat, Active Speaker & Mute Control
  // -------------------------------------------------------------
  console.log('\n[Step 9/10] Testing In-Meeting Chat, Active Speaker & Host Controls...');
  await new Promise((resolve, reject) => {
    // Alice sends chat
    hostSocket.once('chat:received', (msg) => {
      console.log(`  ✓ Host received chat message from ${msg.senderName}: "${msg.text}"`);
    });

    p2Socket.once('chat:received', (msg) => {
      console.log(`  ✓ Bob received chat message from ${msg.senderName}: "${msg.text}"`);
      // Now test active speaker
      p2Socket.emit('media:active-speaker', { meetingCode, isSpeaking: true });
    });

    hostSocket.once('participant:speaking', ({ socketId, isSpeaking }) => {
      console.log(`  ✓ Host received active speaker glow indicator: socket ${socketId} speaking=${isSpeaking}`);
      // Host force-mutes Alice
      hostSocket.emit('host:mute-participant', { meetingCode, targetSocketId: p1Socket.id });
    });

    p1Socket.once('media:force-mute', () => {
      console.log('  ✓ Alice received media:force-mute from Host');
      resolve();
    });

    p1Socket.emit('chat:message', {
      meetingCode,
      text: 'Hello everyone, audio and video are crystal clear!'
    });

    setTimeout(() => reject(new Error('In-meeting features test timeout')), 6000);
  });
  passedSteps++;

  // -------------------------------------------------------------
  // STEP 10: Page Refresh Reconnect & Host End Meeting For All
  // -------------------------------------------------------------
  console.log('\n[Step 10/10] Testing participant page reload reconnect & Host End Meeting...');
  // Alice disconnects and reconnects (simulating browser page refresh)
  p1Socket.disconnect();
  await wait(500);

  const reconnectedAlice = io(BACKEND_URL, { transports: ['websocket'] });
  await new Promise((resolve, reject) => {
    reconnectedAlice.on('connect', () => {
      // Alice re-enters directly with existing participantId
      reconnectedAlice.emit('participant:enter-room', {
        meetingCode,
        participantId: p1Id,
        name: 'Alice Johnson',
        role: 'participant'
      });
    });

    reconnectedAlice.on('room:sync-admitted', ({ participants }) => {
      console.log(`  ✓ Alice seamlessly re-entered room after page reload without re-waiting!`);
      resolve();
    });

    reconnectedAlice.on('participant:not-admitted', () => {
      reject(new Error('Alice was unexpectedly rejected after reload'));
    });

    setTimeout(() => reject(new Error('Reload reconnect timeout')), 5000);
  });

  // Host ends meeting for all
  await new Promise((resolve, reject) => {
    reconnectedAlice.once('meeting:ended-by-host', (data) => {
      console.log(`  ✓ Alice received meeting ended notification: "${data.message}"`);
    });

    p2Socket.once('meeting:ended-by-host', (data) => {
      console.log(`  ✓ Bob received meeting ended notification: "${data.message}"`);
      resolve();
    });

    hostSocket.emit('meeting:end-all', { meetingCode, hostToken });
    setTimeout(() => reject(new Error('End meeting timeout')), 5000);
  });

  // Cleanup sockets
  hostSocket.disconnect();
  reconnectedAlice.disconnect();
  p2Socket.disconnect();

  passedSteps++;

  console.log('\n================================================================');
  console.log(`   SUCCESS: ALL ${passedSteps}/${totalSteps} TEST STAGES PASSED WITHOUT ERRORS!   `);
  console.log('================================================================\n');
}

runMultiUserMeetingTest().catch((err) => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
