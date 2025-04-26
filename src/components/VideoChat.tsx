'use client';

import React from 'react';
import { useVideoChat } from '@/src/hooks/useVideoChat';
import VideoPlayer from './VideoPlayer';
import ControlButtons from './ControlButtons';
import StatusIndicator from './StatusIndicator';
import UserCount from './UserCount';

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
      <div className="flex-1 relative overflow-hidden bg-gray-800 rounded-lg shadow-xl">
        {/* Remote video (main view) */}
        {status === 'connected' ? (
          <div className="relative w-full h-full min-h-[500px]">
            <VideoPlayer
              ref={remoteVideoRef}
              className="w-full h-full"
            />
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 text-white px-8 py-5 rounded-xl text-center flex flex-col items-center max-w-[90%] shadow-2xl">
                  <div className="animate-spin h-10 w-10 border-4 border-lavender-400 rounded-full border-t-transparent mb-4"></div>
                  <div className="text-lg">Connected - Establishing video connection...</div>
                  <div className="text-sm mt-2 text-gray-300">This may take a few moments</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gray-800">
            <div className="text-white text-center p-6 max-w-[90%]">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-5 text-lavender-300">Random Video Chat</h2>
              <p className="mb-5 md:mb-7 text-sm md:text-base text-gray-300">Connect with random people from around the world</p>

              {/* User count display */}
              <div className="mb-6">
                <UserCount />
              </div>

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
                      btn.className = "w-full md:w-auto bg-gray-700 text-white px-8 py-4 rounded-lg font-medium transition-colors shadow-lg";
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
                        btn.className = "w-full md:w-auto bg-lavender-600 hover:bg-lavender-700 text-white px-8 py-4 rounded-lg font-medium transition-colors shadow-lg";
                      }
                    }, 8000);
                  }}
                  className="w-full md:w-auto bg-lavender-600 hover:bg-lavender-700 text-white px-8 py-4 rounded-lg font-medium transition-colors shadow-lg"
                >
                  Start Chatting
                </button>
              )}
              {status === 'error' && (
                <div className="bg-red-900/30 border border-red-700 p-5 rounded-lg text-white shadow-lg">
                  <p className="font-medium text-lg">Camera/microphone access error</p>
                  <p className="text-sm mt-3">This browser may not support WebRTC or camera access is blocked.</p>
                  <p className="text-sm mt-2">Try using a modern browser like Chrome, Firefox, or Safari.</p>
                </div>
              )}
              {status === 'waiting' && (
                <div className="mt-4 bg-gray-700/50 border border-lavender-700 p-5 rounded-lg text-white shadow-lg">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="animate-spin h-5 w-5 border-3 border-lavender-400 rounded-full border-t-transparent"></div>
                    <p className="font-medium text-lg">Searching for a partner...</p>
                  </div>
                  <p className="text-sm">Please wait while we connect you with someone</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-4 right-4 w-1/3 h-1/4 sm:w-1/4 sm:h-1/4 md:w-1/5 md:h-1/5 rounded-lg overflow-hidden border-2 border-lavender-600 shadow-xl z-10">
          <VideoPlayer
            ref={localVideoRef}
            muted={true}
            isLocal={true}
          />
        </div>
      </div>

      {/* Status indicator */}
      <div className="py-3 md:py-4">
        <StatusIndicator status={status} />
      </div>

      {/* Control buttons */}
      <div className="w-full max-w-full overflow-x-auto bg-gray-800 p-3 rounded-lg shadow-lg mt-2 border border-gray-700">
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
