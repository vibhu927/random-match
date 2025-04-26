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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle socket events
  useEffect(() => {
    if (!socket || !isConnected || !localStream) return;

    // Handle when matched with another user
    socket.on('matched', ({ partnerId }) => {
      console.log(`Matched with partner: ${partnerId}`);
      setStatus('connected');

      // Destroy any existing peer connection
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      // Create a peer connection as initiator
      const peer = new Peer({
        initiator: true,
        trickle: true,
        stream: localStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443?transport=tcp',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ],
          iceCandidatePoolSize: 10
        },
        // Simplify the connection process
        sdpTransform: (sdp) => {
          console.log('SDP Transform (initiator)');
          return sdp;
        }
      });

      console.log('Created initiator peer connection');

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        console.log('Connection timeout - destroying peer');
        if (peerRef.current === peer) {
          try {
            peer.destroy();
          } catch (e) {
            console.error('Error destroying peer:', e);
          }
          peerRef.current = null;
          setRemoteStream(null);
          setStatus('waiting');
          // Try to reconnect
          console.log('Trying to reconnect after timeout...');
          setTimeout(() => {
            if (socket && socket.connected) {
              socket.emit('ready');
            } else if (socket) {
              socket.connect();
              socket.once('connect', () => {
                socket.emit('ready');
              });
            }
          }, 1000);
        }
      }, 10000); // 10 seconds timeout

      // When signal is generated, send it to the partner
      peer.on('signal', (data) => {
        console.log('Generated signal (initiator):', data.type || 'candidate');
        if (socket.connected) {
          socket.emit('signal', {
            to: partnerId,
            signal: data,
          });
        }
      });

      // Add connection state handlers
      peer.on('connect', () => {
        console.log('Peer connection established (initiator)');
        clearTimeout(connectionTimeout);

        // Send a test message to confirm data channel is working
        try {
          peer.send('connection-test');
        } catch (e) {
          console.error('Error sending test message:', e);
        }
      });

      peer.on('data', (data) => {
        console.log('Received data from peer (initiator):', data.toString());
      });

      peer.on('close', () => {
        console.log('Peer connection closed (initiator)');
        clearTimeout(connectionTimeout);
        if (peerRef.current === peer) {
          peerRef.current = null;
          setRemoteStream(null);
        }
      });

      // When we receive the remote stream
      peer.on('stream', (stream) => {
        console.log('Received remote stream (initiator)', stream);

        // Ensure we have video tracks
        if (stream.getVideoTracks().length === 0) {
          console.warn('Remote stream has no video tracks (initiator)');
        }

        // Set the remote stream in state
        setRemoteStream(stream);

        // Set the stream on the video element
        if (remoteVideoRef.current) {
          console.log('Setting remote video source (initiator)');
          remoteVideoRef.current.srcObject = stream;

          // Force play the video with retry
          try {
            const playPromise = remoteVideoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(e => {
                console.error('Error playing remote video (initiator):', e);
                // Try again after a short delay
                setTimeout(() => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.play().catch(e2 =>
                      console.error('Error playing remote video (initiator retry):', e2)
                    );
                  }
                }, 1000);
              });
            }
          } catch (e) {
            console.error('Exception trying to play remote video (initiator):', e);
          }
        } else {
          console.error('Remote video ref is not available (initiator)');
        }
      });

      // Add error handler
      peer.on('error', (err) => {
        console.error('Peer connection error (initiator):', err);
        clearTimeout(connectionTimeout);

        // Only handle if this is still the current peer
        if (peerRef.current === peer) {
          peer.destroy();
          peerRef.current = null;
          setRemoteStream(null);

          // Go back to waiting and try again
          setStatus('waiting');
          setTimeout(() => {
            if (socket.connected) {
              socket.emit('ready');
            }
          }, 1000);
        }
      });

      peerRef.current = peer;
    });

    // Handle receiving signals from partner
    socket.on('signal', ({ from, signal }: { from: string, signal: any }) => {
      console.log(`Received signal from ${from}:`, signal.type || 'candidate');

      if (peerRef.current && status === 'connected') {
        // If we're already connected, we're receiving a signal from our peer
        console.log('Forwarding signal to existing peer');
        try {
          peerRef.current.signal(signal);
        } catch (e) {
          console.error('Error processing signal:', e);
        }
      } else {
        console.log('Creating new peer as non-initiator');
        // Destroy any existing peer connection
        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }

        // If we're not connected yet, we need to create a new peer
        const peer = new Peer({
          initiator: false,
          trickle: true,
          stream: localStream,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
              {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
              },
              {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
              },
              {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
              }
            ],
            iceCandidatePoolSize: 10
          },
          // Simplify the connection process
          sdpTransform: (sdp) => {
            console.log('SDP Transform (non-initiator)');
            return sdp;
          }
        });

        console.log('Created non-initiator peer connection');

        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          console.log('Connection timeout - destroying peer (non-initiator)');
          if (peerRef.current === peer) {
            try {
              peer.destroy();
            } catch (e) {
              console.error('Error destroying peer (non-initiator):', e);
            }
            peerRef.current = null;
            setRemoteStream(null);
            setStatus('waiting');
            // Try to reconnect
            console.log('Trying to reconnect after timeout (non-initiator)...');
            setTimeout(() => {
              if (socket && socket.connected) {
                socket.emit('ready');
              } else if (socket) {
                socket.connect();
                socket.once('connect', () => {
                  socket.emit('ready');
                });
              }
            }, 1000);
          }
        }, 10000); // 10 seconds timeout

        // When signal is generated, send it to the partner
        peer.on('signal', (data) => {
          console.log('Generated signal (non-initiator):', data.type || 'candidate');
          if (socket.connected) {
            socket.emit('signal', {
              to: from,
              signal: data,
            });
          }
        });

        // Add connection state handlers
        peer.on('connect', () => {
          console.log('Peer connection established (non-initiator)');
          clearTimeout(connectionTimeout);

          // Send a test message to confirm data channel is working
          try {
            peer.send('connection-test-response');
          } catch (e) {
            console.error('Error sending test message:', e);
          }
        });

        peer.on('data', (data) => {
          console.log('Received data from peer (non-initiator):', data.toString());
        });

        peer.on('close', () => {
          console.log('Peer connection closed (non-initiator)');
          clearTimeout(connectionTimeout);
          if (peerRef.current === peer) {
            peerRef.current = null;
            setRemoteStream(null);
          }
        });

        // When we receive the remote stream
        peer.on('stream', (stream) => {
          console.log('Received remote stream (non-initiator)', stream);

          // Ensure we have video tracks
          if (stream.getVideoTracks().length === 0) {
            console.warn('Remote stream has no video tracks');
          }

          // Set the remote stream in state
          setRemoteStream(stream);

          // Set the stream on the video element
          if (remoteVideoRef.current) {
            console.log('Setting remote video source (non-initiator)');
            remoteVideoRef.current.srcObject = stream;

            // Force play the video with retry
            try {
              const playPromise = remoteVideoRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch(e => {
                  console.error('Error playing remote video:', e);
                  // Try again after a short delay
                  setTimeout(() => {
                    if (remoteVideoRef.current) {
                      remoteVideoRef.current.play().catch(e2 =>
                        console.error('Error playing remote video (retry):', e2)
                      );
                    }
                  }, 1000);
                });
              }
            } catch (e) {
              console.error('Exception trying to play remote video:', e);
            }
          } else {
            console.error('Remote video ref is not available (non-initiator)');
          }
        });

        // Add error handler
        peer.on('error', (err) => {
          console.error('Peer connection error (non-initiator):', err);
          clearTimeout(connectionTimeout);

          // Only handle if this is still the current peer
          if (peerRef.current === peer) {
            peer.destroy();
            peerRef.current = null;
            setRemoteStream(null);

            // Go back to waiting and try again
            setStatus('waiting');
            setTimeout(() => {
              if (socket.connected) {
                socket.emit('ready');
              }
            }, 1000);
          }
        });

        // Process the received signal
        try {
          peer.signal(signal);
        } catch (e) {
          console.error('Error processing initial signal:', e);
          peer.destroy();
          return;
        }

        peerRef.current = peer;
        setStatus('connected');
      }
    });

    // Handle waiting state
    socket.on('waiting', () => {
      console.log('Received waiting event');
      setStatus('waiting');

      // Clean up any existing peer connection
      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying peer in waiting handler:', e);
        }
        peerRef.current = null;
      }

      // Clear remote stream
      if (remoteStream) {
        setRemoteStream(null);
      }

      // Update any UI elements
      const btn = document.getElementById('startChatButton') as HTMLButtonElement | null;
      if (btn) {
        btn.innerText = "Searching...";
        btn.disabled = true;
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

    // Handle peer unavailable (when signaling fails)
    socket.on('peerUnavailable', ({ peerId }: { peerId: string }) => {
      console.log(`Peer ${peerId} is unavailable`);

      // Clean up peer connection
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      // Clear remote stream
      if (remoteStream) {
        setRemoteStream(null);
      }

      // Go back to waiting state
      setStatus('waiting');

      // Automatically look for a new match
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
      socket.off('peerUnavailable');

      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, [socket, isConnected, localStream, status, remoteStream]);

  // Start looking for a match
  const startMatching = () => {
    console.log('startMatching called, socket:', !!socket, 'isConnected:', isConnected, 'localStream:', !!localStream);

    if (!localStream) {
      console.error('Cannot start matching: localStream not available');
      return;
    }

    if (!socket) {
      console.error('Cannot start matching: socket not available');
      return;
    }

    // Force status update to waiting
    setStatus('waiting');

    // If socket is not connected, try to reconnect
    if (!isConnected) {
      console.log('Socket not connected, attempting to reconnect...');

      try {
        socket.connect();

        // Wait for connection and then emit ready
        socket.once('connect', () => {
          console.log('Socket reconnected, emitting ready');
          socket.emit('ready');
        });
      } catch (error) {
        console.error('Error reconnecting socket:', error);
      }

      return;
    }

    // If already connected, emit ready directly
    try {
      console.log('Emitting ready event');
      socket.emit('ready');
    } catch (error) {
      console.error('Error emitting ready event:', error);
    }
  };

  // Skip current match and find a new one
  const skipMatch = () => {
    if (socket) {
      // If socket is not connected, try to reconnect
      if (!isConnected) {
        console.log('Socket not connected, attempting to reconnect before skip...');
        socket.connect();

        // Wait for connection and then emit skip
        socket.once('connect', () => {
          console.log('Socket reconnected, emitting skip');
          socket.emit('skip');
          setStatus('waiting');
        });

        return;
      }

      console.log('Emitting skip event');
      socket.emit('skip');

      // Clean up peer connection immediately for better UX
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      // Clear remote stream
      if (remoteStream) {
        setRemoteStream(null);
      }

      // Update status immediately for better UX
      setStatus('waiting');
    } else {
      console.error('Cannot skip: socket not available');
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
    remoteStream,
    startMatching,
    skipMatch,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
  };
};
