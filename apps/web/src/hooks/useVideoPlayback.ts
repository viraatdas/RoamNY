"use client";

import { useCallback, useRef, useState } from "react";
import type YouTube from "react-youtube";

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export function useVideoPlayback() {
  const playerRef = useRef<YT.Player | null>(null);
  const [state, setState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });
  const animFrameRef = useRef<number>(0);

  const pollTime = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    try {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      setState((prev) => ({ ...prev, currentTime, duration }));
    } catch {
      // player not ready
    }

    animFrameRef.current = requestAnimationFrame(pollTime);
  }, []);

  const onReady = useCallback(
    (event: { target: YT.Player }) => {
      playerRef.current = event.target;
    },
    []
  );

  const onPlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
    animFrameRef.current = requestAnimationFrame(pollTime);
  }, [pollTime]);

  const onPause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  const onEnd = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    setState((prev) => ({ ...prev, currentTime: seconds }));
  }, []);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    playerRef.current = null;
    setState({ isPlaying: false, currentTime: 0, duration: 0 });
  }, []);

  return {
    ...state,
    playerRef,
    onReady,
    onPlay,
    onPause,
    onEnd,
    seekTo,
    cleanup,
  };
}
