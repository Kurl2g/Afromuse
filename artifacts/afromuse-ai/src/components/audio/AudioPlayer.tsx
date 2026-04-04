import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Download, RefreshCw } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string | null;
  duration: string;
  title: string;
  audioType: "Instrumental Preview" | "Vocal Demo";
  onRegenerate?: () => void;
  onDownload?: () => void;
}

function durationToSeconds(dur: string): number {
  const parts = dur.split(":").map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

function secondsToDisplay(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const BAR_COUNT = 32;

function Waveform({ playing }: { playing: boolean }) {
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const base = 20 + Math.sin(i * 0.7) * 14 + Math.sin(i * 1.3) * 10;
    return Math.max(10, Math.min(80, base));
  });

  return (
    <div className="flex items-center gap-[2px] h-10">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="rounded-full bg-primary/70 flex-1"
          style={{ height: `${height}%` }}
          animate={
            playing
              ? {
                  height: [
                    `${height}%`,
                    `${Math.max(10, height + (Math.random() * 30 - 15))}%`,
                    `${Math.max(10, height + (Math.random() * 20 - 10))}%`,
                    `${height}%`,
                  ],
                }
              : { height: `${height}%` }
          }
          transition={
            playing
              ? {
                  duration: 0.6 + Math.random() * 0.4,
                  repeat: Infinity,
                  repeatType: "mirror",
                  delay: i * 0.02,
                  ease: "easeInOut",
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

export default function AudioPlayer({
  audioUrl,
  duration,
  title,
  audioType,
  onRegenerate,
  onDownload,
}: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [dragging, setDragging] = useState(false);
  const totalSeconds = durationToSeconds(duration);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startFakeTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= totalSeconds) {
          clearTimer();
          setPlaying(false);
          return 0;
        }
        return prev + 0.25;
      });
    }, 250);
  }, [totalSeconds, clearTimer]);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      if (playing) {
        audioRef.current.play().catch(() => {
          startFakeTimer();
        });
      } else {
        audioRef.current.pause();
        clearTimer();
      }
    } else {
      if (playing) {
        startFakeTimer();
      } else {
        clearTimer();
      }
    }
    return clearTimer;
  }, [playing, audioUrl, startFakeTimer, clearTimer]);

  const togglePlay = () => setPlaying((p) => !p);

  const replay = () => {
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
    setPlaying(true);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * totalSeconds;
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
  };

  const progress = totalSeconds > 0 ? Math.min(1, currentTime / totalSeconds) : 0;

  return (
    <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-[#0b0b18] to-[#07070f] p-5 md:p-6">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
          onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        />
      )}

      {/* Waveform */}
      <div className="mb-4">
        <Waveform playing={playing} />
      </div>

      {/* Progress bar */}
      <div
        ref={progressRef}
        className="relative h-1.5 rounded-full bg-white/8 mb-3 cursor-pointer group"
        onClick={handleProgressClick}
      >
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary to-amber-400"
          style={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.15 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(245,158,11,0.6)] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress * 100}% - 6px)` }}
        />
      </div>

      {/* Time display */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] font-mono text-white/40">{secondsToDisplay(currentTime)}</span>
        <span className="text-[11px] font-mono text-white/25">{duration}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={replay}
          className="w-9 h-9 rounded-xl border border-white/8 flex items-center justify-center text-white/35 hover:text-white/70 hover:border-white/20 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={togglePlay}
          className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_28px_rgba(245,158,11,0.38)] transition-all"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={playing ? "pause" : "play"}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {playing ? "Pause" : "Play Preview"}
            </motion.div>
          </AnimatePresence>
        </button>

        {onDownload && (
          <button
            onClick={onDownload}
            className="w-9 h-9 rounded-xl border border-white/8 flex items-center justify-center text-white/35 hover:text-white/70 hover:border-white/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="w-9 h-9 rounded-xl border border-white/8 flex items-center justify-center text-white/35 hover:text-white/70 hover:border-white/20 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!audioUrl && (
        <p className="text-[10px] text-white/20 text-center mt-4 leading-relaxed">
          Preview mode · Real audio engine integration ready
        </p>
      )}
    </div>
  );
}
