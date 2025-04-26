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
      };

      const handleLoadedData = () => {
        console.log(`Video ${isLocal ? 'local' : 'remote'} data loaded`);
        // Force play when data is loaded
        try {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => {
              console.error('Error playing video:', e);
              // Try again after a short delay
              setTimeout(() => {
                video.play().catch(e2 => console.error('Error playing video (retry):', e2));
              }, 1000);
            });
          }
        } catch (e) {
          console.error('Exception trying to play video:', e);
        }
      };

      const handleError = (e: Event) => {
        console.error(`Video ${isLocal ? 'local' : 'remote'} error:`, e);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('error', handleError);
      };
    }, [isLocal]);

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
      />
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
