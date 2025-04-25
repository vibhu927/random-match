'use client';

import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/src/context/SocketContext';
import Peer from 'simple-peer';

type ChatStatus = 'idle' | 'waiting' | 'connected' | 'skipped' | 'error';

export const useVideoChat = () => {
  const { socket, isConnected } = useSocket();
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const peerRef = useRef<Peer.Instance | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize local media stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        // Check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('MediaDevices API not supported in this browser');
          setStatus('error');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setStatus('error');
      }
    };

    initializeMedia();

    // Cleanup
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle socket events
  useEffect(() => {
    if (!socket || !isConnected || !localStream) return;

    // Handle when matched with another user
    socket.on('matched', ({ partnerId }) => {
      setStatus('connected');

      // Create a peer connection as initiator
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: localStream,
      });

      // When signal is generated, send it to the partner
      peer.on('signal', (data) => {
        socket.emit('signal', {
          to: partnerId,
          signal: data,
        });
      });

      // When we receive the remote stream
      peer.on('stream', (stream) => {
        setRemoteStream(stream);

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });

      peerRef.current = peer;
    });

    // Handle receiving signals from partner
    socket.on('signal', ({ from, signal }) => {
      if (status === 'connected') {
        // If we're already connected, we're receiving a signal from our peer
        if (peerRef.current) {
          peerRef.current.signal(signal);
        }
      } else {
        // If we're not connected yet, we need to create a new peer
        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: localStream,
        });

        // When signal is generated, send it to the partner
        peer.on('signal', (data) => {
          socket.emit('signal', {
            to: from,
            signal: data,
          });
        });

        // When we receive the remote stream
        peer.on('stream', (stream) => {
          setRemoteStream(stream);

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        });

        // Process the received signal
        peer.signal(signal);
        peerRef.current = peer;
        setStatus('connected');
      }
    });

    // Handle waiting state
    socket.on('waiting', () => {
      setStatus('waiting');

      // Clean up any existing peer connection
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      // Clear remote stream
      if (remoteStream) {
        setRemoteStream(null);
      }
    });

    // Handle being skipped
    socket.on('skipped', () => {
      setStatus('skipped');

      // Clean up peer connection
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      // Clear remote stream
      if (remoteStream) {
        setRemoteStream(null);
      }

      // Automatically look for a new match after a short delay
      setTimeout(() => {
        if (socket.connected) {
          socket.emit('ready');
        }
      }, 1000);
    });

    // Handle partner disconnection
    socket.on('partnerDisconnected', () => {
      setStatus('skipped');

      // Clean up peer connection
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      // Clear remote stream
      if (remoteStream) {
        setRemoteStream(null);
      }

      // Automatically look for a new match after a short delay
      setTimeout(() => {
        if (socket.connected) {
          socket.emit('ready');
        }
      }, 1000);
    });

    // Cleanup
    return () => {
      socket.off('matched');
      socket.off('signal');
      socket.off('waiting');
      socket.off('skipped');
      socket.off('partnerDisconnected');

      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, [socket, isConnected, localStream, status]);

  // Start looking for a match
  const startMatching = () => {
    if (socket && isConnected && localStream) {
      socket.emit('ready');
    }
  };

  // Skip current match and find a new one
  const skipMatch = () => {
    if (socket && isConnected) {
      socket.emit('skip');
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return {
    status,
    localVideoRef,
    remoteVideoRef,
    startMatching,
    skipMatch,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
  };
};
