import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { audioAlert } from '../utils/audioAlert';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  ArrowRight,
  Clock,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Users
} from 'lucide-react';

export default function WaitingRoom() {
  const { meetingCode } = useParams();
  const cleanCode = (meetingCode || '').trim().toLowerCase();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const initialName = searchParams.get('name') || sessionStorage.getItem('versemeet_name_preset') || '';
  const [displayName, setDisplayName] = useState(initialName);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  // Waiting states
  const [isRequested, setIsRequested] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState(searchParams.get('reason') || null);
  const [meetingEnded, setMeetingEnded] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);

  // 1. Fetch meeting status and check if host or already admitted
  useEffect(() => {
    async function checkMeeting() {
      try {
        setLoading(true);
        // If this user is the creator host, check sessionStorage (or localStorage if not joining as participant)
        const isParticipantSession = sessionStorage.getItem('versemeet_name_preset') || sessionStorage.getItem(`versemeet_part_id_${cleanCode}`);
        let hostToken = sessionStorage.getItem(`hostToken_${cleanCode}`);
        if (!hostToken && !isParticipantSession) {
          hostToken = localStorage.getItem(`hostToken_${cleanCode}`);
        }
        if (hostToken) {
          const isHost = await api.verifyHost(cleanCode, hostToken);
          if (isHost) {
            // Direct entry for authorized host
            navigate(`/meeting/${cleanCode}`);
            return;
          }
        }

        // Check if already admitted participant
        const rawPart = sessionStorage.getItem(`versemeet_participant_${cleanCode}`);
        if (rawPart) {
          try {
            const p = JSON.parse(rawPart);
            if (p.admitted) {
              navigate(`/meeting/${cleanCode}`);
              return;
            }
          } catch (e) {}
        }

        const data = await api.getMeeting(cleanCode);
        if (data.status === 'ended') {
          setMeetingEnded(true);
        } else {
          setMeeting(data);
        }
      } catch (err) {
        setError(err.message || 'Invalid or expired meeting link.');
      } finally {
        setLoading(false);
      }
    }

    checkMeeting();
  }, [cleanCode, navigate]);

  // 2. Pre-join media preview (Camera & Mic)
  useEffect(() => {
    let localStream = null;

    async function initPreview() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        streamRef.current = localStream;
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
      } catch (err) {
        console.warn('Waiting room media access denied or limited:', err);
      }
    }

    initPreview();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // 3. Socket event listeners for approval/rejection
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleEnqueued = (data) => {
      setIsRequested(true);
      setWaitingMessage(data.message || 'Your request has been sent. Please wait for the host to admit you.');
    };

    const handleApproved = (data) => {
      audioAlert.playAdmissionChime();
      // Store participant info with admitted flag in sessionStorage for MeetingRoom
      sessionStorage.setItem(`versemeet_participant_${cleanCode}`, JSON.stringify({
        participantId: data.participant.participantId,
        name: data.participant.name,
        role: 'participant',
        admitted: true,
        isMuted: !isMicOn,
        isVideoOff: !isCameraOn
      }));

      // Stop waiting preview stream before entering
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      navigate(`/meeting/${cleanCode}`);
    };

    const handleRejected = (data) => {
      setIsRequested(false);
      setRejectionReason(data.reason || 'The host has declined your request to join.');
    };

    const handleMeetingEnded = () => {
      setMeetingEnded(true);
      setIsRequested(false);
    };

    socket.on('waiting:enqueued', handleEnqueued);
    socket.on('join:approved', handleApproved);
    socket.on('join:rejected', handleRejected);
    socket.on('meeting:ended-by-host', handleMeetingEnded);

    return () => {
      socket.off('waiting:enqueued', handleEnqueued);
      socket.off('join:approved', handleApproved);
      socket.off('join:rejected', handleRejected);
      socket.off('meeting:ended-by-host', handleMeetingEnded);
    };
  }, [cleanCode, navigate, isMicOn, isCameraOn]);

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    } else {
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    } else {
      setIsCameraOn(!isCameraOn);
    }
  };

  const handleRequestJoin = (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    const socket = getSocket();
    let participantId = sessionStorage.getItem(`versemeet_part_id_${cleanCode}`);
    if (!participantId) {
      participantId = `part-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem(`versemeet_part_id_${cleanCode}`, participantId);
    }

    socket.emit('join:request', {
      meetingCode: cleanCode,
      participantId,
      name: displayName.trim(),
      role: 'participant'
    });

    setIsRequested(true);
    setWaitingMessage('Your request has been sent. Please wait for the host to admit you.');
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Verifying Meeting Room...</p>
        </div>
      </div>
    );
  }

  if (meetingEnded) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Meeting Has Ended</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            This meeting session has ended and is no longer accepting new participants.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all text-sm"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Meeting Unavailable</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all text-sm"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-4xl w-full">
        {/* Header Meeting Info */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>CampusVerse Waiting Room</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {meeting?.title || 'CampusVerse Meeting'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Host: <strong className="text-slate-700">{meeting?.hostName || 'Host'}</strong> • Meeting ID: <span className="font-mono font-bold text-indigo-600">{cleanCode}</span>
          </p>
        </div>

        {/* REJECTION ALERT IF APPLICABLE */}
        {rejectionReason && (
          <div className="mb-6 p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 shadow-sm animate-in fade-in">
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Join Request Declined</p>
              <p className="text-xs text-rose-700 mt-0.5">{rejectionReason}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Column: Camera Preview Tile */}
          <div className="md:col-span-7">
            <div className="aspect-video bg-slate-950 rounded-3xl overflow-hidden relative shadow-2xl border border-slate-800 flex items-center justify-center">
              {isCameraOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-2xl font-bold mb-3 border border-slate-700">
                    {displayName ? displayName.slice(0, 2).toUpperCase() : 'ME'}
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Camera is off</span>
                </div>
              )}

              {/* Bottom Quick Preview Controls */}
              <div className="absolute bottom-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-3.5 rounded-2xl shadow-xl backdrop-blur-md transition-all active:scale-95 ${
                    isMicOn ? 'bg-slate-900/80 text-white hover:bg-slate-800' : 'bg-rose-600 text-white'
                  }`}
                  title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                  {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`p-3.5 rounded-2xl shadow-xl backdrop-blur-md transition-all active:scale-95 ${
                    isCameraOn ? 'bg-slate-900/80 text-white hover:bg-slate-800' : 'bg-rose-600 text-white'
                  }`}
                  title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Name Form or Waiting State */}
          <div className="md:col-span-5">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50">
              {!isRequested ? (
                /* PRE-JOIN NAME INPUT FORM */
                <form onSubmit={handleRequestJoin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Your Display Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Jordan Lee"
                      required
                      maxLength={50}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!displayName.trim()}
                    className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-40 shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
                  >
                    <span>Request to Join</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    The host will receive your join request immediately.
                  </p>
                </form>
              ) : (
                /* WAITING FOR HOST APPROVAL SCREEN */
                <div className="text-center py-6 space-y-4 animate-in fade-in">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                      <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Waiting for Host Approval
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      "Your request has been sent. Please wait for the host to admit you."
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-xs text-indigo-700 font-medium">
                    Name: <strong>{displayName}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRequested(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline"
                  >
                    Cancel Request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
