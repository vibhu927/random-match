'use client';

import React from 'react';
import { useVideoChat } from '@/src/hooks/useVideoChat';
import VideoPlayer from './VideoPlayer';
import ControlButtons from './ControlButtons';
import StatusIndicator from './StatusIndicator';

const VideoChat: React.FC = () => {
  const {
    status,
    localVideoRef,
    remoteVideoRef,
    startMatching,
    skipMatch,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
  } = useVideoChat();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative overflow-hidden bg-gray-900 rounded-lg">
        {/* Remote video (main view) */}
        {status === 'connected' ? (
          <VideoPlayer
            ref={remoteVideoRef}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="text-white text-center p-6">
              <h2 className="text-2xl font-bold mb-4">Random Video Chat</h2>
              <p className="mb-6">Connect with random people from around the world</p>
              {status === 'idle' && (
                <button
                  onClick={startMatching}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-medium transition-colors"
                >
                  Start Chatting
                </button>
              )}
              {status === 'error' && (
                <div className="bg-red-500/20 border border-red-500 p-4 rounded-lg text-white">
                  <p className="font-medium">Camera/microphone access error</p>
                  <p className="text-sm mt-2">This browser may not support WebRTC or camera access is blocked.</p>
                  <p className="text-sm mt-1">Try using a modern browser like Chrome, Firefox, or Safari.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-4 right-4 w-1/4 h-1/4 md:w-1/5 md:h-1/5 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <VideoPlayer
            ref={localVideoRef}
            muted={true}
            isLocal={true}
          />
        </div>
      </div>

      {/* Status indicator */}
      <div className="py-3">
        <StatusIndicator status={status} />
      </div>

      {/* Control buttons */}
      <ControlButtons
        onSkip={skipMatch}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isConnected={status === 'connected'}
      />
    </div>
  );
};

export default VideoChat;
