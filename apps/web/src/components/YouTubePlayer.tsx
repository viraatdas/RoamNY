"use client";

import YouTube from "react-youtube";

interface YouTubePlayerProps {
  videoId: string;
  startSeconds: number;
  onReady: (event: { target: YT.Player }) => void;
  onPlay: () => void;
  onPause: () => void;
  onEnd: () => void;
}

export function YouTubePlayer({
  videoId,
  startSeconds,
  onReady,
  onPlay,
  onPause,
  onEnd,
}: YouTubePlayerProps) {
  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      <YouTube
        videoId={videoId}
        opts={{
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            start: Math.floor(startSeconds),
            modestbranding: 1,
            rel: 0,
          },
        }}
        onReady={onReady}
        onPlay={onPlay}
        onPause={onPause}
        onEnd={onEnd}
        className="w-full h-full"
        iframeClassName="w-full h-full"
      />
    </div>
  );
}
