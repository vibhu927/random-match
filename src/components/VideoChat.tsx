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
    remoteStream,
    startMatching,
    skipMatch,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
  } = useVideoChat();

  return (
    <div className="flex flex-col h-full min-h-[300px] w-full">
      <div className="flex-1 relative overflow-hidden bg-gray-900 rounded-lg">
        {/* Remote video (main view) */}
        {status === 'connected' ? (
          <div className="relative w-full h-full min-h-[200px]">
            <VideoPlayer
              ref={remoteVideoRef}
              className="w-full h-full"
            />
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 text-white px-6 py-3 rounded-lg text-center flex flex-col items-center max-w-[90%]">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mb-3"></div>
                  <div>Connected - Establishing video connection...</div>
                  <div className="text-xs mt-2 text-gray-300">This may take a few moments</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="text-white text-center p-4 max-w-[90%]">
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Random Video Chat</h2>
              <p className="mb-4 md:mb-6 text-sm md:text-base">Connect with random people from around the world</p>
              {status === 'idle' && (
                <button
                  id="startChatButton"
                  onClick={() => {
                    console.log("Start chat button clicked");

                    // Add visual feedback
                    const btn = document.getElementById('startChatButton') as HTMLButtonElement | null;
                    if (btn) {
                      btn.disabled = true;
                      btn.innerText = "Connecting...";
                      btn.className = "w-full md:w-auto bg-gray-500 text-white px-6 py-3 rounded-full font-medium transition-colors";
                    }

                    // Call startMatching
                    startMatching();

                    // Force status update to waiting
                    setTimeout(() => {
                      if (status === 'idle') {
                        console.log("Forcing status to waiting");
                        // Try to reconnect the socket if needed
                        if (btn) {
                          btn.innerText = "Searching...";
                        }
                      }
                    }, 1000);

                    // Set a timeout to re-enable the button if nothing happens
                    setTimeout(() => {
                      if (status === 'idle' && btn) {
                        console.log("Timeout reached, re-enabling button");
                        btn.disabled = false;
                        btn.innerText = "Start Chatting";
                        btn.className = "w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-medium transition-colors";
                      }
                    }, 8000);
                  }}
                  className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-medium transition-colors"
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
              {status === 'waiting' && (
                <div className="mt-4 bg-blue-500/20 border border-blue-500 p-4 rounded-lg text-white">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    <p className="font-medium">Searching for a partner...</p>
                  </div>
                  <p className="text-sm">Please wait while we connect you with someone</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-4 right-4 w-1/3 h-1/4 sm:w-1/4 sm:h-1/4 md:w-1/5 md:h-1/5 rounded-lg overflow-hidden border-2 border-white shadow-lg z-10">
          <VideoPlayer
            ref={localVideoRef}
            muted={true}
            isLocal={true}
          />
        </div>
      </div>

      {/* Status indicator */}
      <div className="py-2 md:py-3">
        <StatusIndicator status={status} />
      </div>

      {/* Control buttons */}
      <div className="w-full max-w-full overflow-x-auto">
        <ControlButtons
          onSkip={skipMatch}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isConnected={status === 'connected'}
        />
      </div>
    </div>
  );
};

export default VideoChat;
