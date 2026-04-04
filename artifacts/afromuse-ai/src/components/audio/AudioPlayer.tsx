import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

function useStableWaveformBars() {
  return useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const base = 20 + Math.sin(i * 0.7) * 14 + Math.sin(i * 1.3) * 10;
      const animated = [
        Math.max(10, Math.min(80, base)),
        Math.max(10, Math.min(80, base + (((i * 17 + 5) % 30) - 15))),
        Math.max(10, Math.min(80, base + (((i * 11 + 3) % 20) - 10))),
        Math.max(10, Math.min(80, base)),
      ];
      return { base: Math.max(10, Math.min(80, base)), animated };
    });
  }, []);
}

function Waveform({ playing, accent }: { playing: boolean; accent: "amber" | "violet" }) {
  const bars = useStableWaveformBars();
  const barClass = accent === "violet" ? "bg-violet-400/70" : "bg-primary/70";

  return (
    <div className="flex items-center gap-[2px] h-10">
      {bars.map((bar, i) => (
        <motion.div
          key={i}
          className={`rounded-full flex-1 ${barClass}`}
          style={{ height: `${bar.base}%` }}
          animate={playing ? { height: bar.animated.map((v) => `${v}%`) } : { height: `${bar.base}%` }}
          transition={
            playing
              ? {
                  duration: 0.6 + (i % 5) * 0.08,
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
  const totalSeconds = durationToSeconds(duration);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const accent = audioType === "Vocal Demo" ? "violet" : "amber";
  const accentPlayBtn =
    accent === "violet"
      ? "bg-violet-600 hover:bg-violet-500 shadow-[0_4px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_4px_28px_rgba(139,92,246,0.38)]"
      : "bg-primary hover:bg-primary/90 shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_28px_rgba(245,158,11,0.38)]";
  const accentProgressBar =
    accent === "violet"
      ? "bg-gradient-to-r from-violet-500 to-violet-300"
      : "bg-gradient-to-r from-primary to-amber-400";
  const accentScrubber =
    accent === "violet"
      ? "bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]"
      : "bg-primary shadow-[0_0_8px_rgba(245,158,11,0.6)]";

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

  const seekToRatio = useCallback(
    (ratio: number) => {
      const newTime = Math.max(0, Math.min(1, ratio)) * totalSeconds;
      setCurrentTime(newTime);
      if (audioRef.current) audioRef.current.currentTime = newTime;
    },
    [totalSeconds],
  );

  const handleProgressInteraction = useCallback(
    (clientX: number) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      seekToRatio((clientX - rect.left) / rect.width);
    },
    [seekToRatio],
  );

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    handleProgressInteraction(e.clientX);
    const onMove = (ev: MouseEvent) => handleProgressInteraction(ev.clientX);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleProgressKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = totalSeconds * 0.05;
    if (e.key === "ArrowRight") seekToRatio((currentTime + step) / totalSeconds);
    if (e.key === "ArrowLeft") seekToRatio((currentTime - step) / totalSeconds);
    if (e.key === " ") { e.preventDefault(); togglePlay(); }
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

      <div className="mb-4">
        <Waveform playing={playing} accent={accent} />
      </div>

      <div
        ref={progressRef}
        role="slider"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={totalSeconds}
        aria-valuenow={Math.floor(currentTime)}
        tabIndex={0}
        className="relative h-1.5 rounded-full bg-white/8 mb-3 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        onMouseDown={handleProgressMouseDown}
        onKeyDown={handleProgressKeyDown}
      >
        <motion.div
          className={`absolute top-0 left-0 h-full rounded-full ${accentProgressBar}`}
          style={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.15 }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity ${accentScrubber}`}
          style={{ left: `calc(${progress * 100}% - 6px)` }}
        />
      </div>

      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] font-mono text-white/40">{secondsToDisplay(currentTime)}</span>
        <span className="text-[11px] font-mono text-white/25">{duration}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={replay}
          aria-label="Replay from start"
          className="w-9 h-9 rounded-xl border border-white/8 flex items-center justify-center text-white/35 hover:text-white/70 hover:border-white/20 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play preview"}
          className={`flex-1 h-11 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all ${accentPlayBtn}`}
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
            aria-label="Download audio"
            className="w-9 h-9 rounded-xl border border-white/8 flex items-center justify-center text-white/35 hover:text-white/70 hover:border-white/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            aria-label="Regenerate"
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
