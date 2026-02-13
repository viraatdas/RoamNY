"use client";

import { motion, AnimatePresence } from "framer-motion";
import { YouTubePlayer } from "./YouTubePlayer";
import type { VideoResult } from "@/types";

interface VideoPanelProps {
  visible: boolean;
  videos: VideoResult[];
  activeVideo: VideoResult | null;
  startTimestamp: number;
  onSelectVideo: (video: VideoResult) => void;
  onClose: () => void;
  onReady: (event: { target: YT.Player }) => void;
  onPlay: () => void;
  onPause: () => void;
  onEnd: () => void;
}

export function VideoPanel({
  visible,
  videos,
  activeVideo,
  startTimestamp,
  onSelectVideo,
  onClose,
  onReady,
  onPlay,
  onPause,
  onEnd,
}: VideoPanelProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute bottom-0 left-0 right-0 z-40 bg-roam-dark/95 backdrop-blur-lg border-t border-white/10 rounded-t-2xl max-h-[60vh] overflow-hidden flex flex-col"
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-white/30 rounded-full" />
          </div>

          {/* Active video player */}
          {activeVideo && (
            <div className="px-4 pb-3">
              <YouTubePlayer
                videoId={activeVideo.youtube_id}
                startSeconds={startTimestamp}
                onReady={onReady}
                onPlay={onPlay}
                onPause={onPause}
                onEnd={onEnd}
              />
              <h3 className="text-sm font-medium text-white mt-2 line-clamp-2">
                {activeVideo.title}
              </h3>
              <p className="text-xs text-white/50 mt-1">
                {activeVideo.channel_name} &middot;{" "}
                {formatDuration(activeVideo.duration_secs)}
              </p>
            </div>
          )}

          {/* Video list */}
          {videos.length > 1 && (
            <div className="px-4 pb-4 overflow-y-auto">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
                Other tours at this location
              </p>
              <div className="space-y-2">
                {videos
                  .filter((v) => v.id !== activeVideo?.id)
                  .map((video) => (
                    <button
                      key={video.id}
                      onClick={() => onSelectVideo(video)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                    >
                      <img
                        src={video.thumbnail_url}
                        alt=""
                        className="w-24 h-14 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white line-clamp-2">
                          {video.title}
                        </p>
                        <p className="text-xs text-white/50 mt-1">
                          {video.channel_name} &middot;{" "}
                          {Math.round(video.distance_m)}m away &middot;{" "}
                          {formatTimestamp(video.nearest_timestamp_s)}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-4 text-white/50 hover:text-white text-xl"
            aria-label="Close panel"
          >
            &times;
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTimestamp(secs: number): string {
  return formatDuration(Math.floor(secs));
}
