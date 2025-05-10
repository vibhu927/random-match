'use client';

import React, { forwardRef, useEffect, useRef } from 'react';
import { cn } from '@/src/lib/utils';

interface VideoPlayerProps {
  className?: string;
  muted?: boolean;
  autoPlay?: boolean;
  playsInline?: boolean;
  isLocal?: boolean;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ className, muted = false, autoPlay = true, playsInline = true, isLocal = false }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Combine refs
    const setRefs = (element: HTMLVideoElement) => {
      // For the forwarded ref
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }

      // For our local ref
      videoRef.current = element;
    };

    // Add event listeners to debug video loading
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleLoadedMetadata = () => {
        console.log(`Video ${isLocal ? 'local' : 'remote'} metadata loaded`);

        // Set video attributes again to ensure they're applied
        if (!isLocal) {
          video.muted = muted;
          video.volume = 1.0;
        }
      };

      const handleLoadedData = () => {
        console.log(`Video ${isLocal ? 'local' : 'remote'} data loaded`);

        // Log video track info
        if (video.srcObject instanceof MediaStream) {
          const stream = video.srcObject;
          console.log(`Video ${isLocal ? 'local' : 'remote'} tracks:`,
            stream.getTracks().map(t => `${t.kind}:${t.id}:${t.enabled}:${t.readyState}`));

          // Ensure video tracks are enabled
          stream.getVideoTracks().forEach(track => {
            track.enabled = true;
          });
        }

        // Force play when data is loaded
        try {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => {
              console.error(`Error playing ${isLocal ? 'local' : 'remote'} video:`, e);
              // Try again after a short delay
              setTimeout(() => {
                if (video) {
                  video.play().catch(e2 => {
                    console.error(`Error playing ${isLocal ? 'local' : 'remote'} video (retry):`, e2);
                    // Try one more time with user interaction simulation
                    document.addEventListener('click', function tryPlayAfterClick() {
                      if (video) {
                        video.play().catch(e3 =>
                          console.error(`Error playing ${isLocal ? 'local' : 'remote'} video after click:`, e3)
                        );
                      }
                      document.removeEventListener('click', tryPlayAfterClick);
                    }, { once: true });
                  });
                }
              }, 1000);
            });
          }
        } catch (e) {
          console.error(`Exception trying to play ${isLocal ? 'local' : 'remote'} video:`, e);
        }
      };

      const handleCanPlay = () => {
        console.log(`Video ${isLocal ? 'local' : 'remote'} can play`);
        // Try to play again if not already playing
        if (video.paused) {
          video.play().catch(e =>
            console.error(`Error playing ${isLocal ? 'local' : 'remote'} video on canplay:`, e)
          );
        }
      };

      const handleError = (e: Event) => {
        console.error(`Video ${isLocal ? 'local' : 'remote'} error:`, e, video.error);
      };

      const handleStalled = () => {
        console.warn(`Video ${isLocal ? 'local' : 'remote'} stalled`);
      };

      const handleSuspend = () => {
        console.warn(`Video ${isLocal ? 'local' : 'remote'} suspended`);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      video.addEventListener('stalled', handleStalled);
      video.addEventListener('suspend', handleSuspend);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        video.removeEventListener('stalled', handleStalled);
        video.removeEventListener('suspend', handleSuspend);
      };
    }, [isLocal, muted]);

    return (
      <video
        ref={setRefs}
        className={cn(
          'rounded-lg bg-black/10 w-full h-full object-cover',
          isLocal && 'transform scale-x-[-1]', // Mirror local video
          className
        )}
        muted={muted}
        autoPlay={autoPlay}
        playsInline={playsInline}
        controls={false}
        disablePictureInPicture={true}
        disableRemotePlayback={true}
      />
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
