import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';

// Pages
import Home from './pages/Home';
import CreateMeeting from './pages/CreateMeeting';
import JoinMeeting from './pages/JoinMeeting';
import WaitingRoom from './pages/WaitingRoom';
import MeetingRoom from './pages/MeetingRoom';
import MeetingEnded from './pages/MeetingEnded';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
        <Navbar />
        <div className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateMeeting />} />
            <Route path="/join" element={<JoinMeeting />} />
            <Route path="/join/:meetingCode" element={<WaitingRoom />} />
            <Route path="/waiting/:meetingCode" element={<WaitingRoom />} />
            <Route path="/meeting/:meetingCode" element={<MeetingRoom />} />
            <Route path="/meeting/:meetingCode/ended" element={<MeetingEnded />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}
