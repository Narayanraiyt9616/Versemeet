import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../services/socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

export function useWebRTC({
  socket,
  meetingCode,
  isHost,
  onParticipantSpeaking
}) {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { [socketId]: MediaStream }
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState('good'); // excellent, good, poor
  const [statsData, setStatsData] = useState({ rtt: 35, packetLoss: 0, resolution: '720p HD' });
  const [speakingParticipants, setSpeakingParticipants] = useState(new Set());

  const peerConnectionsRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const iceCandidateQueuesRef = useRef(new Map()); // socketId -> RTCIceCandidate[]
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Active socket instance
  const activeSocket = socket || getSocket();

  // Helper to drain queued ICE candidates after setRemoteDescription
  const drainIceCandidates = useCallback(async (targetSocketId, pc) => {
    const queue = iceCandidateQueuesRef.current.get(targetSocketId);
    if (!queue || queue.length === 0) return;
    while (queue.length > 0) {
      const candidate = queue.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn(`Error applying queued ICE candidate for ${targetSocketId}:`, err);
      }
    }
  }, []);

  // Initialize or get local media stream
  const initializeMedia = useCallback(async (initialVideo = true, initialAudio = true) => {
    try {
      setMediaError(null);
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn('Initial video/audio failed, attempting audio-only...', err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setIsVideoOff(true);
        } catch (audioErr) {
          setMediaError('Microphone or Camera access was denied or devices are missing. You can still participate in the meeting.');
          return null;
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Apply initial mute/video off states
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = initialAudio;
        setIsMuted(!initialAudio);
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = initialVideo;
        setIsVideoOff(!initialVideo);
      }

      // Setup audio analysis for active speaker detection
      setupSpeakingDetection(stream);

      return stream;
    } catch (err) {
      console.error('Failed to get media devices:', err);
      setMediaError('Could not access media devices: ' + err.message);
      return null;
    }
  }, []);

  // Web Audio API speaking detection
  const setupSpeakingDetection = (stream) => {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let wasSpeaking = false;

      const checkVolume = () => {
        if (!audioTrack.enabled) {
          if (wasSpeaking) {
            wasSpeaking = false;
            updateSpeakingState(activeSocket?.id, false);
          }
          animationFrameRef.current = requestAnimationFrame(checkVolume);
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const isNowSpeaking = average > 18;

        if (isNowSpeaking !== wasSpeaking) {
          wasSpeaking = isNowSpeaking;
          updateSpeakingState(activeSocket?.id, isNowSpeaking);
          if (activeSocket && meetingCode) {
            activeSocket.emit('media:active-speaker', {
              meetingCode,
              isSpeaking: isNowSpeaking
            });
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      animationFrameRef.current = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.warn('Speaking detection not available:', e);
    }
  };

  const updateSpeakingState = (socketId, isSpeaking) => {
    setSpeakingParticipants(prev => {
      const next = new Set(prev);
      if (isSpeaking) {
        next.add(socketId);
      } else {
        next.delete(socketId);
      }
      return next;
    });
    if (onParticipantSpeaking) {
      onParticipantSpeaking(socketId, isSpeaking);
    }
  };

  // Create WebRTC peer connection
  const createPeerConnection = useCallback((targetSocketId, isInitiator = false) => {
    if (peerConnectionsRef.current.has(targetSocketId)) {
      return peerConnectionsRef.current.get(targetSocketId);
    }

    if (!iceCandidateQueuesRef.current.has(targetSocketId)) {
      iceCandidateQueuesRef.current.set(targetSocketId, []);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Attach local stream tracks to this peer
    const activeStream = screenStreamRef.current || localStreamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach(track => {
        pc.addTrack(track, activeStream);
      });
    }

    // Handle remote track
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteStreams(prev => ({
          ...prev,
          [targetSocketId]: remoteStream
        }));
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && activeSocket) {
        activeSocket.emit('signal:ice-candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[targetSocketId];
          return next;
        });
      }
    };

    peerConnectionsRef.current.set(targetSocketId, pc);

    // If initiator, generate and send offer
    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (activeSocket) {
            activeSocket.emit('signal:offer', {
              targetSocketId,
              sdp: pc.localDescription
            });
          }
        })
        .catch(err => console.error(`Error creating offer for ${targetSocketId}:`, err));
    }

    return pc;
  }, [activeSocket]);

  // Handle incoming signaling messages
  useEffect(() => {
    if (!activeSocket) return;

    // Offer received
    const handleOffer = async ({ senderSocketId, sdp }) => {
      try {
        let pc = peerConnectionsRef.current.get(senderSocketId);
        if (!pc) {
          pc = createPeerConnection(senderSocketId, false);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await drainIceCandidates(senderSocketId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        activeSocket.emit('signal:answer', {
          targetSocketId: senderSocketId,
          sdp: pc.localDescription
        });
      } catch (err) {
        console.error('Error handling offer from', senderSocketId, err);
      }
    };

    // Answer received
    const handleAnswer = async ({ senderSocketId, sdp }) => {
      try {
        const pc = peerConnectionsRef.current.get(senderSocketId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await drainIceCandidates(senderSocketId, pc);
        }
      } catch (err) {
        console.error('Error handling answer from', senderSocketId, err);
      }
    };

    // ICE candidate received
    const handleIceCandidate = async ({ senderSocketId, candidate }) => {
      try {
        const pc = peerConnectionsRef.current.get(senderSocketId);
        if (!pc || !pc.remoteDescription) {
          if (!iceCandidateQueuesRef.current.has(senderSocketId)) {
            iceCandidateQueuesRef.current.set(senderSocketId, []);
          }
          iceCandidateQueuesRef.current.get(senderSocketId).push(candidate);
          return;
        }
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.warn('Error adding ICE candidate from', senderSocketId, err);
      }
    };

    // Speaking update from remote peer
    const handleSpeaking = ({ socketId, isSpeaking }) => {
      updateSpeakingState(socketId, isSpeaking);
    };

    activeSocket.on('signal:offer', handleOffer);
    activeSocket.on('signal:answer', handleAnswer);
    activeSocket.on('signal:ice-candidate', handleIceCandidate);
    activeSocket.on('participant:speaking', handleSpeaking);

    return () => {
      activeSocket.off('signal:offer', handleOffer);
      activeSocket.off('signal:answer', handleAnswer);
      activeSocket.off('signal:ice-candidate', handleIceCandidate);
      activeSocket.off('participant:speaking', handleSpeaking);
    };
  }, [activeSocket, createPeerConnection, drainIceCandidates]);

  // Periodic WebRTC stats monitor
  useEffect(() => {
    const statsInterval = setInterval(async () => {
      const connections = Array.from(peerConnectionsRef.current.values());
      if (connections.length === 0) return;

      try {
        let totalRtt = 0;
        let count = 0;

        for (const pc of connections) {
          if (pc.connectionState === 'connected') {
            const stats = await pc.getStats();
            stats.forEach(report => {
              if (report.type === 'candidate-pair' && report.currentRoundTripTime) {
                totalRtt += report.currentRoundTripTime * 1000;
                count++;
              }
            });
          }
        }

        if (count > 0) {
          const avgRtt = Math.round(totalRtt / count);
          setStatsData(prev => ({ ...prev, rtt: avgRtt }));
          if (avgRtt < 80) setConnectionQuality('excellent');
          else if (avgRtt < 180) setConnectionQuality('good');
          else setConnectionQuality('poor');
        }
      } catch (e) {
        // silent stats error
      }
    }, 4000);

    return () => clearInterval(statsInterval);
  }, []);

  // Toggle Microphone
  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);

      if (activeSocket && meetingCode) {
        activeSocket.emit('media:state-update', {
          meetingCode,
          isMuted: !audioTrack.enabled,
          isVideoOff
        });
      }
    }
  }, [activeSocket, meetingCode, isVideoOff]);

  // Toggle Camera
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);

      if (activeSocket && meetingCode) {
        activeSocket.emit('media:state-update', {
          meetingCode,
          isMuted,
          isVideoOff: !videoTrack.enabled
        });
      }
    }
  }, [activeSocket, meetingCode, isMuted]);

  // Change video resolution
  const changeResolution = useCallback(async (preset) => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    let width = 1280;
    let height = 720;
    let label = '720p HD';

    if (preset === '1080p') {
      width = 1920; height = 1080; label = '1080p Full HD';
    } else if (preset === '480p') {
      width = 854; height = 480; label = '480p SD';
    } else if (preset === '360p') {
      width = 640; height = 360; label = '360p Low Bandwidth';
    }

    try {
      await videoTrack.applyConstraints({
        width: { ideal: width },
        height: { ideal: height }
      });
      setStatsData(prev => ({ ...prev, resolution: label }));
    } catch (err) {
      console.warn('Resolution change constraint not supported by device:', err);
    }
  }, []);

  // Screen Sharing
  const startScreenShare = useCallback(async () => {
    try {
      if (!navigator.mediaDevices.getDisplayMedia) {
        alert('Screen sharing is not supported by your browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true
      });

      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);

      const screenTrack = stream.getVideoTracks()[0];

      // Replace track on all existing peer connections
      peerConnectionsRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }
      });

      if (activeSocket && meetingCode) {
        activeSocket.emit('screen:start', { meetingCode });
      }

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.error('Error starting screen share:', err);
      }
    }
  }, [activeSocket, meetingCode]);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setIsScreenSharing(false);

    // Restore camera video track on all peer connections
    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      if (cameraTrack) {
        peerConnectionsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(cameraTrack);
          }
        });
      }
    }

    if (activeSocket && meetingCode) {
      activeSocket.emit('screen:stop', { meetingCode });
    }
  }, [activeSocket, meetingCode]);

  // Disconnect & cleanup
  const cleanupMedia = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    iceCandidateQueuesRef.current.clear();

    setLocalStream(null);
    setScreenStream(null);
    setRemoteStreams({});
  }, []);

  return {
    localStream,
    screenStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    isScreenSharing,
    mediaError,
    connectionQuality,
    statsData,
    speakingParticipants,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    changeResolution,
    createPeerConnection,
    cleanupMedia,
    setIsMuted,
    setIsVideoOff
  };
}
