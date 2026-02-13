"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { AppState } from "@/types";

interface PegmanProps {
  appState: AppState;
  isDragging: boolean;
  dragPosition: { x: number; y: number } | null;
  onDragStart: (e: React.PointerEvent) => void;
  onReset: () => void;
}

export function Pegman({
  appState,
  isDragging,
  dragPosition,
  onDragStart,
  onReset,
}: PegmanProps) {
  const showDock = appState === "IDLE" || appState === "BROWSING";
  const showFloating = isDragging && dragPosition;

  return (
    <>
      {/* Dock */}
      <AnimatePresence>
        {showDock && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute bottom-6 right-6 z-50 cursor-grab active:cursor-grabbing"
            onPointerDown={onDragStart}
            style={{ touchAction: "none" }}
          >
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 hover:bg-white/20 transition-colors">
              <PegmanSVG state="docked" />
              <p className="text-xs text-white/60 text-center mt-1 select-none">
                Drag me
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating during drag */}
      {showFloating && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: dragPosition.x - 20,
            top: dragPosition.y - 50,
          }}
        >
          <PegmanSVG state="dragging" />
        </div>
      )}

      {/* Playing state: show return button */}
      <AnimatePresence>
        {(appState === "PLAYING" || appState === "LOADING") && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={onReset}
            className="absolute bottom-6 right-6 z-50 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 hover:bg-white/20 transition-colors"
          >
            <PegmanSVG state="docked" />
            <p className="text-xs text-white/60 text-center mt-1">
              Reset
            </p>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

function PegmanSVG({ state }: { state: "docked" | "dragging" }) {
  const scale = state === "dragging" ? 1.2 : 1;
  const color = state === "dragging" ? "#f59e0b" : "#1a73e8";

  return (
    <svg
      width={40 * scale}
      height={48 * scale}
      viewBox="0 0 40 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Body */}
      <ellipse cx="20" cy="38" rx="8" ry="3" fill="rgba(0,0,0,0.3)" />
      <rect x="14" y="18" width="12" height="18" rx="3" fill={color} />
      {/* Head */}
      <circle cx="20" cy="12" r="8" fill={color} />
      <circle cx="20" cy="12" r="6" fill="#fff" />
      <circle cx="18" cy="11" r="1.2" fill="#333" />
      <circle cx="22" cy="11" r="1.2" fill="#333" />
      <path
        d="M18 14.5 Q20 16.5 22 14.5"
        stroke="#333"
        strokeWidth="0.8"
        fill="none"
      />
      {/* Arms */}
      <rect x="8" y="20" width="6" height="3" rx="1.5" fill={color} />
      <rect x="26" y="20" width="6" height="3" rx="1.5" fill={color} />
      {/* Legs */}
      <rect x="15" y="34" width="4" height="8" rx="2" fill={color} />
      <rect x="21" y="34" width="4" height="8" rx="2" fill={color} />
      {/* Drop indicator when dragging */}
      {state === "dragging" && (
        <path
          d="M20 46 L17 42 L23 42 Z"
          fill={color}
          opacity={0.8}
        />
      )}
    </svg>
  );
}
