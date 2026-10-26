# CampusVerse Meet 🎓
### Simple, Modern & Secure Video Conferencing
> *"Connect. Learn. Collaborate."*

CampusVerse Meet is a simplified, modern, and fully functional real-time video conferencing web application. Anyone can instantly create a meeting room, share the generated link, and connect with other participants through crystal-clear WebRTC audio, HD video, screen sharing, and real-time chat.

---

## 🌟 Core Features & Workflows

### 1. Create Meeting
- Prominent **Create Meeting** section right on the homepage or via the Create Meeting view.
- Enter your name and optional meeting title.
- Automatically generates an unpredictable, unique meeting code (e.g. `vm-926-9f23-743`) and shareable URL (`http://localhost:5173/meeting/:code`).
- **Copy Link** and **Copy ID** buttons with instant visual confirmation.
- **Start Meeting** button to enter the live room immediately as the meeting host.
- The person who creates the meeting automatically becomes its authorized host.

### 2. Join Meeting
- Prominent **Join Meeting** section right on the homepage or via the Join Meeting view.
- Paste any shared meeting link or type in the meeting code.
- Enter your display name before joining.
- Pre-join hardware preview: test your camera and microphone before requesting entry.
- Click **Request to Join** to enter the host-controlled waiting room.
- Clear error messages if a meeting code is invalid or if the meeting has already concluded.
- No student or faculty role selection required—anyone with the link can join!

### 3. Waiting Room & Host Admission Control
- Participants remain in a clean waiting lobby with live feedback:
  > *"Your request has been sent. Please wait for the host to admit you."*
- The host receives real-time join request notifications with a chime, showing the requester's name, timestamp, and **[Accept]** / **[Reject]** buttons.
- Host can admit individuals or click **"Admit All"** in the participant drawer.
- Host can also mute participant microphones, remove participants, and control in-meeting permissions.

### 4. Real-Time Video & Audio Conferencing
- **Adaptive Video Grid**: Automatically arranges video tiles (1 centered tile, 2 equal tiles, 2x2, 2x3, 3x3) preserving 16:9 aspect ratios.
- **Microphone & Camera Controls**: Reliable mute/unmute and camera on/off with hardware track management.
- **Active Speaker Glow**: Web Audio API frequency analysis highlights whoever is currently speaking with an animated boundary.
- **Screen Sharing**: High-resolution browser screen, window, or tab capture with an automatic theater spotlight view.
- **In-Meeting Chat**: Real-time text messaging with timestamps and unread counters.
- **Classroom Announcements**: Broadcast temporary resource cards with auto-dismiss (8 seconds).
- **Raise Hand & Emoji Reactions**: Interactive floating emoji reactions and raised-hand indicators.
- **Leave vs. End Meeting**:
  - Regular participants can click **Leave Meeting** at any time.
  - The host can click **End Meeting for Everyone** with a confirmation dialog, immediately disconnecting all participants and cleaning up server state.

---

## 🎨 Design Tokens & Branding

- **Brand Name**: CampusVerse Meet
- **Main Heading**: "Connect. Learn. Collaborate."
- **Description**: "Create a meeting, share your link, and connect with others through seamless video communication."
- **Primary Indigo (`#4F46E5`)**: Primary buttons, active controls, branded gradients
- **Secondary Blue (`#2563EB`)**: Accents and headers
- **Educational Teal (`#0D9488`)**: Security badges, positive status
- **Main Background (`#F8FAFC`)**: Light dashboard and homepage
- **Meeting Background (`#111827`)**: Distraction-free dark meeting room
- **Text (`#0F172A` / `#64748B`)**: High contrast typography

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, React Router DOM v7, Lucide React icons
- **Real-Time & Media**: Socket.IO Client v4, native browser WebRTC (`RTCPeerConnection`, `getDisplayMedia`, Web Audio API)
- **Backend**: Node.js v22 (ES Modules), Express.js 5, Socket.IO v4
- **Database / Cache**: MongoDB with Mongoose (with automatic resilient in-memory fallback for local zero-config runs)

---

## 📂 Project Structure

```
Versemeet/
├── package.json               # Root workspace scripts
├── README.md                  # Comprehensive documentation
├── server/                    # Node.js + Express + Socket.IO Backend
│   ├── package.json
│   └── src/
│       ├── app.js             # Express app, CORS & health check
│       ├── server.js          # HTTP & Socket.IO server bootstrap
│       ├── config/
│       │   ├── db.js          # MongoDB connection + resilient in-memory fallback
│       │   └── webrtc.js      # STUN/TURN configuration
│       ├── controllers/
│       │   └── meetingController.js
│       ├── models/
│       │   └── Meeting.js     # Mongoose Meeting schema
│       ├── routes/
│       │   └── meetingRoutes.js
│       ├── services/
│       │   ├── activeRoomService.js # In-memory active room & waiting lobby store
│       │   └── meetingService.js    # Persistent meeting management
│       ├── sockets/
│       │   └── meetingSocket.js     # WebRTC signaling, admission & moderation
│       └── tests/
│           └── e2e_test.js          # Automated end-to-end integration test
│
└── client/                    # React + Vite + Tailwind Frontend
    ├── index.html             # HTML entry point with CampusVerse Meet metadata
    ├── package.json
    ├── vite.config.js         # Vite config with Tailwind v4 & proxy
    └── src/
        ├── App.jsx            # Simplified routing (Home, Create, Join, Waiting, Meeting)
        ├── index.css          # Design system & animations
        ├── components/
        │   ├── common/
        │   │   ├── Navbar.jsx # Clean top header with Create & Join actions
        │   │   └── Footer.jsx # Clean footer
        │   ├── meeting/
        │   │   ├── VideoTile.jsx         # Video stream tile with speaker glow
        │   │   ├── VideoGrid.jsx         # Responsive auto-adaptive grid & spotlight
        │   │   ├── MeetingHeader.jsx     # Header with duration timer & link copy
        │   │   ├── ControlToolbar.jsx    # Bottom controls & host end dialog
        │   │   ├── HostJoinRequestModal.jsx # Real-time floating admission toast
        │   │   ├── AnnouncementModal.jsx # Announcement composer
        │   │   ├── AnnouncementBanner.jsx# Broadcast announcement notification
        │   │   ├── ReactionsMenu.jsx     # Floating emoji reactions & raise hand
        │   │   └── SettingsModal.jsx     # WebRTC diagnostics & resolution selector
        │   ├── participants/
        │   │   └── ParticipantDrawer.jsx # People list, waiting room & host permissions
        │   └── chat/
        │       └── ChatDrawer.jsx        # Real-time text chat
        ├── hooks/
        │   └── useWebRTC.js   # WebRTC hook managing streams & audio detection
        ├── pages/
        │   ├── Home.jsx              # Simple modern homepage with Create & Join cards
        │   ├── CreateMeeting.jsx     # Meeting creation & link generator
        │   ├── JoinMeeting.jsx       # Join meeting by ID/URL with name input
        │   ├── WaitingRoom.jsx       # Camera/mic preview & host admission lobby
        │   ├── MeetingRoom.jsx       # Real-time video meeting room
        │   └── MeetingEnded.jsx      # Post-meeting conclusion screen
        └── services/
            ├── api.js                # REST client
            └── socket.js             # Socket.IO client singleton
```

---

## 🚀 Running the Project

### 1. Start the Backend Server (Port 5000)
```bash
cd server
npm run dev
```

### 2. Start the Frontend Client (Port 5173)
```bash
cd client
npm run dev
```

Open your browser to:
- **Application**: [http://localhost:5173](http://localhost:5173)
- **API Health**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Automated End-to-End Test

To run the automated 10-step real-time test suite:
```bash
cd server
npm test
```

Verifies:
1. REST API meeting creation with unique ID and host credentials.
2. Host socket connection and room initialization.
3. Participant waiting room request with display name.
4. Real-time host admission notification.
5. Host approval and participant room admission.
6. Real-time in-meeting chat.
7. Temporary announcements broadcast.
8. WebRTC SDP offer and answer exchange.
9. Raise hand notification.
10. Host meeting termination for everyone and server cleanup.
