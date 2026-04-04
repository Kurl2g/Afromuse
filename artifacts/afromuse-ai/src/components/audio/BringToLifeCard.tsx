import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music2, Mic2, Zap, Sparkles, Download, FileText, RefreshCw,
  ChevronRight, AlertCircle, Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AudioPlayer from "./AudioPlayer";
import { formatDraftForClipboard, type SongDraft } from "@/lib/songGenerator";

type AudioStatus = "idle" | "loading" | "ready" | "error";

interface InstrumentalMetadata {
  genre: string;
  mood: string;
  bpm: number;
  key: string;
  energy: string;
  duration: string;
  hitmakerMode: boolean;
  hookRepeatLevel: string;
  audioType: "Instrumental Preview";
}

interface VocalMetadata {
  vocalStyle: string;
  bpm: number;
  key: string;
  duration: string;
  genre: string;
  mood: string;
  hitmakerMode: boolean;
  audioType: "Vocal Demo";
}

interface BringToLifeCardProps {
  draft: SongDraft;
  genre: string;
  mood: string;
  topic: string;
  songLength: string;
  languageFlavor: string;
  style: string;
  commercialMode: boolean;
  lyricalDepth: string;
  hookRepeat: string;
  customFlavor: string;
}

const INSTRUMENTAL_STEPS = [
  "Building your groove...",
  "Shaping the rhythm...",
  "Arranging your vibe...",
  "Engineering the sound...",
  "Rendering preview...",
];

const VOCAL_STEPS = [
  "Finding the melody pocket...",
  "Laying the vocal guide...",
  "Shaping the chorus lift...",
  "Blending the harmonies...",
  "Rendering vocal preview...",
];

function MetaChip({ label, value }: { label: string; value: string | number | boolean }) {
  const display = typeof value === "boolean" ? (value ? "On" : "Off") : String(value);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-bold tracking-widest uppercase text-white/25">{label}</span>
      <span className="text-xs font-semibold text-white/65">{display}</span>
    </div>
  );
}

function AudioMetadataPanel({ metadata }: { metadata: InstrumentalMetadata | VocalMetadata }) {
  const isInstrumental = metadata.audioType === "Instrumental Preview";
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.025] px-5 py-4 mt-3">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[9px] font-bold tracking-widest uppercase text-white/30">Song Audio Specs</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-6 gap-y-4">
        <MetaChip label="Key" value={metadata.key} />
        <MetaChip label="BPM" value={metadata.bpm} />
        <MetaChip label="Genre" value={metadata.genre} />
        <MetaChip label="Mood" value={metadata.mood} />
        {isInstrumental && (
          <>
            <MetaChip label="Energy" value={(metadata as InstrumentalMetadata).energy} />
            <MetaChip label="Hook Repeat" value={(metadata as InstrumentalMetadata).hookRepeatLevel} />
          </>
        )}
        {!isInstrumental && (
          <MetaChip label="Vocal Style" value={(metadata as VocalMetadata).vocalStyle} />
        )}
        <MetaChip label="Hitmaker" value={metadata.hitmakerMode} />
        <MetaChip label="Audio Type" value={metadata.audioType} />
      </div>
    </div>
  );
}

function LoadingCard({
  steps,
  activeStep,
  label,
  accent,
}: {
  steps: string[];
  activeStep: number;
  label: string;
  accent: "amber" | "violet";
}) {
  const dotColor = accent === "violet" ? "bg-violet-400" : "bg-primary";
  const labelColor = accent === "violet" ? "text-violet-400/80" : "text-primary/80";
  const borderColor = accent === "violet" ? "border-violet-500/12 bg-violet-500/4" : "border-primary/12 bg-primary/4";
  const progressGradient =
    accent === "violet"
      ? "bg-gradient-to-r from-violet-500 to-violet-300"
      : "bg-gradient-to-r from-primary to-amber-400";

  return (
    <div className={`rounded-2xl border ${borderColor}`}>
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full animate-pulse ${dotColor}`} />
        <span className={`text-xs font-semibold ${labelColor}`}>{label}</span>
      </div>
      <div className="flex flex-col items-center py-10 gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-[2px] border-white/5 border-t-primary/70 animate-spin" />
          <div className="absolute inset-2 rounded-full border-[2px] border-white/5 border-b-amber-400/50 animate-[spin_2s_linear_infinite_reverse]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Music2 className="w-5 h-5 text-primary/70 animate-pulse" />
          </div>
        </div>
        <div className="h-6 flex items-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={activeStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-white/50 font-medium"
            >
              {steps[activeStep]}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="w-40 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${progressGradient}`}
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
          />
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/15 bg-red-500/5 px-5 py-4 flex items-center gap-3">
      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-white/60">{message}</p>
        <p className="text-[11px] text-white/30 mt-0.5">Check your connection and try again.</p>
      </div>
      <button
        onClick={onRetry}
        className="text-xs font-medium text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all"
      >
        Retry
      </button>
    </div>
  );
}

function AudioResultCard({
  label,
  dotColor,
  borderColor,
  gradientFrom,
  headerBorder,
  metadata,
  draft,
  onRegenerate,
  onDownload,
}: {
  label: string;
  dotColor: string;
  borderColor: string;
  gradientFrom: string;
  headerBorder: string;
  metadata: InstrumentalMetadata | VocalMetadata;
  draft: SongDraft;
  onRegenerate: () => void;
  onDownload: () => void;
}) {
  const audioType = metadata.audioType;

  return (
    <div className={`rounded-2xl border overflow-hidden ${borderColor} bg-gradient-to-b ${gradientFrom} to-transparent`}>
      <div className={`px-5 pt-4 pb-3 flex items-center justify-between border-b ${headerBorder}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className="text-xs font-bold text-white/70">{label}</span>
        </div>
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Regenerate
        </button>
      </div>
      <div className="p-4">
        <AudioPlayer
          audioUrl={null}
          duration={metadata.duration}
          title={draft.title}
          audioType={audioType}
          onRegenerate={onRegenerate}
          onDownload={onDownload}
        />
        <AudioMetadataPanel metadata={metadata} />
      </div>
    </div>
  );
}

function ExportSection({
  draft,
  genre,
  mood,
  instrumentalMeta,
  vocalMeta,
}: {
  draft: SongDraft;
  genre: string;
  mood: string;
  instrumentalMeta: InstrumentalMetadata | null;
  vocalMeta: VocalMetadata | null;
}) {
  const { toast } = useToast();

  const downloadLyrics = () => {
    const text = formatDraftForClipboard(draft, genre, mood);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.title.toLowerCase().replace(/\s+/g, "_")}_lyrics.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Lyrics downloaded", description: `${draft.title} · lyrics.txt` });
  };

  const downloadProductionNotes = () => {
    const lines = [
      `Song: ${draft.title}`,
      `Genre: ${genre} | Mood: ${mood}`,
      ``,
      `CHORD / VIBE`,
      draft.chordVibe,
      ``,
      `MELODY DIRECTION`,
      draft.melodyDirection,
      ``,
      `ARRANGEMENT`,
      draft.arrangement,
      ``,
      `─ Created with AfroMuse AI ─`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.title.toLowerCase().replace(/\s+/g, "_")}_production_notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Production notes downloaded" });
  };

  const notifyMp3Coming = (type: "instrumental" | "vocal") => {
    toast({
      title: `${type === "instrumental" ? "Instrumental" : "Vocal Demo"} MP3`,
      description: "Full audio export unlocks when the render engine is connected.",
    });
  };

  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.018] p-5 mt-5">
      <div className="flex items-center gap-2 mb-4">
        <Download className="w-3.5 h-3.5 text-white/30" />
        <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Export</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={downloadLyrics}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-white/10 text-xs text-white/50 hover:text-white hover:border-white/25 hover:bg-white/5 transition-all"
        >
          <FileText className="w-3 h-3" />
          Download Lyrics
        </button>
        <button
          onClick={downloadProductionNotes}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-white/10 text-xs text-white/50 hover:text-white hover:border-white/25 hover:bg-white/5 transition-all"
        >
          <FileText className="w-3 h-3" />
          Download Production Notes
        </button>
        {instrumentalMeta && (
          <button
            onClick={() => notifyMp3Coming("instrumental")}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-primary/20 text-xs text-primary/60 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <Lock className="w-3 h-3" />
            Instrumental MP3
            <span className="ml-1 text-[9px] text-primary/40 font-bold tracking-wider uppercase">Soon</span>
          </button>
        )}
        {vocalMeta && (
          <button
            onClick={() => notifyMp3Coming("vocal")}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-violet-500/20 text-xs text-violet-400/60 hover:text-violet-300 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
          >
            <Lock className="w-3 h-3" />
            Vocal Demo MP3
            <span className="ml-1 text-[9px] text-violet-400/40 font-bold tracking-wider uppercase">Soon</span>
          </button>
        )}
      </div>
    </div>
  );
}

function TriggerButton({
  onClick,
  disabled,
  status,
  icon,
  label,
  sublabel,
  accent,
}: {
  onClick: () => void;
  disabled: boolean;
  status: AudioStatus;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  accent: "amber" | "violet";
}) {
  const isLoading = status === "loading";
  const isReady = status === "ready";

  const borderReady = accent === "violet" ? "border-violet-500/25 bg-violet-500/8 text-violet-300 hover:border-violet-500/40 hover:bg-violet-500/12" : "border-primary/25 bg-primary/8 text-primary hover:border-primary/40 hover:bg-primary/12";
  const borderLoading = accent === "violet" ? "border-violet-500/30 bg-violet-500/8 text-violet-400/60 cursor-wait" : "border-primary/30 bg-primary/8 text-primary/60 cursor-wait";
  const iconReady = accent === "violet" ? "bg-violet-500/15 border-violet-500/25" : "bg-primary/15 border-primary/25";
  const iconReadyText = accent === "violet" ? "text-violet-400" : "text-primary";
  const spinnerColor = accent === "violet" ? "border-violet-500/30 border-t-violet-400" : "border-primary/30 border-t-primary";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden group flex items-center justify-between gap-3 h-16 rounded-2xl border px-5 text-sm font-semibold transition-all ${
        isLoading
          ? borderLoading
          : isReady
          ? borderReady
          : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isReady ? iconReady : "bg-white/5 border-white/10"}`}>
          <span className={isReady ? iconReadyText : "text-white/40"}>{icon}</span>
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold text-white/80">
            {isReady ? `Regenerate ${label}` : `Generate ${label}`}
          </div>
          <div className="text-[10px] text-white/30 mt-0.5">{sublabel}</div>
        </div>
      </div>
      {!isLoading && (
        <ChevronRight className="w-4 h-4 text-white/20 shrink-0 group-hover:text-white/50 transition-colors" />
      )}
      {isLoading && (
        <div className={`shrink-0 w-4 h-4 rounded-full border-2 animate-spin ${spinnerColor}`} />
      )}
    </button>
  );
}

export default function BringToLifeCard({
  draft,
  genre,
  mood,
  topic,
  songLength,
  languageFlavor,
  style,
  commercialMode,
  lyricalDepth,
  hookRepeat,
  customFlavor,
}: BringToLifeCardProps) {
  const { toast } = useToast();

  const [instrumentalStatus, setInstrumentalStatus] = useState<AudioStatus>("idle");
  const [instrumentalStep, setInstrumentalStep] = useState(0);
  const [instrumentalMeta, setInstrumentalMeta] = useState<InstrumentalMetadata | null>(null);

  const [vocalStatus, setVocalStatus] = useState<AudioStatus>("idle");
  const [vocalStep, setVocalStep] = useState(0);
  const [vocalMeta, setVocalMeta] = useState<VocalMetadata | null>(null);

  const instrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vocalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const instrAbortRef = useRef<AbortController | null>(null);
  const vocalAbortRef = useRef<AbortController | null>(null);

  const clearInstrTimer = useCallback(() => {
    if (instrTimerRef.current) { clearInterval(instrTimerRef.current); instrTimerRef.current = null; }
  }, []);
  const clearVocalTimer = useCallback(() => {
    if (vocalTimerRef.current) { clearInterval(vocalTimerRef.current); vocalTimerRef.current = null; }
  }, []);

  useEffect(() => {
    if (instrumentalStatus === "loading") {
      instrTimerRef.current = setInterval(() => {
        setInstrumentalStep((s) => (s + 1) % INSTRUMENTAL_STEPS.length);
      }, 900);
    } else {
      clearInstrTimer();
    }
    return clearInstrTimer;
  }, [instrumentalStatus, clearInstrTimer]);

  useEffect(() => {
    if (vocalStatus === "loading") {
      vocalTimerRef.current = setInterval(() => {
        setVocalStep((s) => (s + 1) % VOCAL_STEPS.length);
      }, 900);
    } else {
      clearVocalTimer();
    }
    return clearVocalTimer;
  }, [vocalStatus, clearVocalTimer]);

  useEffect(() => {
    return () => {
      instrAbortRef.current?.abort();
      vocalAbortRef.current?.abort();
    };
  }, []);

  const buildPayload = useCallback(() => ({
    genre,
    mood,
    theme: topic,
    soundReference: style,
    songLength,
    languageFlavor: languageFlavor === "Custom" ? customFlavor || languageFlavor : languageFlavor,
    hitmakerMode: commercialMode,
    lyricalDepth,
    hookRepeatLevel: hookRepeat,
    title: draft.title,
    lyrics: {
      intro: draft.intro,
      hook: draft.hook,
      verse1: draft.verse1,
      verse2: draft.verse2,
      bridge: draft.bridge,
      outro: draft.outro,
    },
    productionNotes: {
      chordVibe: draft.chordVibe,
      melodyDirection: draft.melodyDirection,
      arrangement: draft.arrangement,
    },
  }), [genre, mood, topic, style, songLength, languageFlavor, customFlavor, commercialMode, lyricalDepth, hookRepeat, draft]);

  const generateInstrumental = useCallback(async () => {
    if (instrumentalStatus === "loading") return;
    instrAbortRef.current?.abort();
    const controller = new AbortController();
    instrAbortRef.current = controller;
    setInstrumentalStatus("loading");
    setInstrumentalStep(0);
    setInstrumentalMeta(null);
    try {
      const res = await fetch("/api/generate-instrumental-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json() as { metadata: InstrumentalMetadata };
      setInstrumentalMeta(data.metadata);
      setInstrumentalStatus("ready");
      toast({ title: "Instrumental Preview Ready", description: `${data.metadata.bpm} BPM · ${data.metadata.key}` });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setInstrumentalStatus("error");
      toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
    }
  }, [instrumentalStatus, buildPayload, toast]);

  const generateVocal = useCallback(async () => {
    if (vocalStatus === "loading") return;
    vocalAbortRef.current?.abort();
    const controller = new AbortController();
    vocalAbortRef.current = controller;
    setVocalStatus("loading");
    setVocalStep(0);
    setVocalMeta(null);
    try {
      const res = await fetch("/api/generate-vocal-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json() as { metadata: VocalMetadata };
      setVocalMeta(data.metadata);
      setVocalStatus("ready");
      toast({ title: "Vocal Demo Ready", description: `${data.metadata.vocalStyle} · ${data.metadata.key}` });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setVocalStatus("error");
      toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
    }
  }, [vocalStatus, buildPayload, toast]);

  const anyReady = instrumentalStatus === "ready" || vocalStatus === "ready";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-3xl border border-white/8 bg-gradient-to-b from-[#0b0b18] to-[#07070f] overflow-hidden shadow-2xl"
    >
      <div className="px-6 pt-6 pb-5 border-b border-white/6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center">
                <Music2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-bold tracking-widest uppercase text-primary/70">
                AfroMuse Studio V2
              </span>
              {commercialMode && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary">
                  <Zap className="w-2.5 h-2.5" /> Hitmaker Audio
                </span>
              )}
            </div>
            <h3 className="text-xl font-display font-bold text-white">Bring It To Life</h3>
            <p className="text-sm text-white/35 mt-0.5">Turn this draft into a playable demo.</p>
          </div>
          <div className="shrink-0 inline-flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Sparkles className="w-2.5 h-2.5" /> Pro
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TriggerButton
            onClick={generateInstrumental}
            disabled={instrumentalStatus === "loading"}
            status={instrumentalStatus}
            icon={<Music2 className="w-4 h-4" />}
            label="Instrumental Preview"
            sublabel="Beat · Rhythm · Arrangement"
            accent="amber"
          />
          <TriggerButton
            onClick={generateVocal}
            disabled={vocalStatus === "loading"}
            status={vocalStatus}
            icon={<Mic2 className="w-4 h-4" />}
            label="Vocal Demo"
            sublabel="Melody · Guide Vocal · Style"
            accent="violet"
          />
        </div>

        <AnimatePresence>
          {instrumentalStatus === "loading" && (
            <motion.div
              key="instr-loading"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <LoadingCard steps={INSTRUMENTAL_STEPS} activeStep={instrumentalStep} label="Building Instrumental Preview" accent="amber" />
            </motion.div>
          )}

          {instrumentalStatus === "ready" && instrumentalMeta && (
            <motion.div
              key="instr-ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <AudioResultCard
                label="Instrumental Preview Ready"
                dotColor="bg-primary"
                borderColor="border-primary/15"
                gradientFrom="from-primary/5"
                headerBorder="border-primary/8"
                metadata={instrumentalMeta}
                draft={draft}
                onRegenerate={generateInstrumental}
                onDownload={() => toast({ title: "Instrumental MP3", description: "Full audio export unlocks when the render engine is connected." })}
              />
            </motion.div>
          )}

          {instrumentalStatus === "error" && (
            <motion.div key="instr-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ErrorCard message="Instrumental generation failed." onRetry={generateInstrumental} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {vocalStatus === "loading" && (
            <motion.div
              key="vocal-loading"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <LoadingCard steps={VOCAL_STEPS} activeStep={vocalStep} label="Building Vocal Demo" accent="violet" />
            </motion.div>
          )}

          {vocalStatus === "ready" && vocalMeta && (
            <motion.div
              key="vocal-ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <AudioResultCard
                label="Vocal Demo Ready"
                dotColor="bg-violet-400"
                borderColor="border-violet-500/15"
                gradientFrom="from-violet-500/5"
                headerBorder="border-violet-500/8"
                metadata={vocalMeta}
                draft={draft}
                onRegenerate={generateVocal}
                onDownload={() => toast({ title: "Vocal Demo MP3", description: "Full audio export unlocks when the render engine is connected." })}
              />
            </motion.div>
          )}

          {vocalStatus === "error" && (
            <motion.div key="vocal-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ErrorCard message="Vocal demo generation failed." onRetry={generateVocal} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {anyReady && (
            <motion.div
              key="export"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ExportSection
                draft={draft}
                genre={genre}
                mood={mood}
                instrumentalMeta={instrumentalMeta}
                vocalMeta={vocalMeta}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}
