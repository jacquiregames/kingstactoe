// src/components/MediaPreloader.tsx
import React, { useEffect } from 'react';

interface MediaPreloaderProps {
  imageUrls: string[];
  videoUrls: string[]; // <-- New array for videos
  onComplete: () => void;
}

const MediaPreloader: React.FC<MediaPreloaderProps> = ({ imageUrls, videoUrls, onComplete }) => {
  useEffect(() => {
    let isMounted = true;
    
    const loadImages = imageUrls.map((url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(true);
        img.onerror = () => {
          console.warn(`Failed to preload image: ${url}`);
          resolve(true); 
        };
      });
    });

    const loadVideos = videoUrls.map((url) => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = url;
        video.preload = 'auto'; // Force the browser to download the file
        
        // 'canplaythrough' means the browser estimates it has downloaded 
        // enough to play the video to the end without stopping to buffer
        video.oncanplaythrough = () => resolve(true);
        video.onerror = () => {
          console.warn(`Failed to preload video: ${url}`);
          resolve(true);
        };
      });
    });

    const loadAllMedia = async () => {
      await Promise.all([...loadImages, ...loadVideos]);
      if (isMounted) onComplete();
    };

    if (imageUrls.length > 0 || videoUrls.length > 0) {
      loadAllMedia();
    } else {
      onComplete();
    }

    return () => { isMounted = false; };
  }, [imageUrls, videoUrls, onComplete]);

  return null;
};

export default MediaPreloader;
