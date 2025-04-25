'use client';

import React, { forwardRef } from 'react';
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
    return (
      <video
        ref={ref}
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
