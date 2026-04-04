import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music2, Mic2, Zap, Sparkles, Download, FileText, RefreshCw,
  ChevronRight, AlertCircle,
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

function LoadingSteps({ steps, activeStep }: { steps: string[]; activeStep: number }) {
  return (
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
          className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full"
          animate={{ width: ["0%", "100%"] }}
          transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
        />
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

  const downloadMp3 = (type: "instrumental" | "vocal") => {
    toast({
      title: "MP3 download queued",
      description: "Your audio file will be ready once the full render engine is connected.",
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
            onClick={() => downloadMp3("instrumental")}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-primary/20 text-xs text-primary/60 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <Download className="w-3 h-3" />
            Download Instrumental MP3
          </button>
        )}
        {vocalMeta && (
          <button
            onClick={() => downloadMp3("vocal")}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-violet-500/20 text-xs text-violet-400/60 hover:text-violet-300 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
          >
            <Download className="w-3 h-3" />
            Download Vocal Demo MP3
          </button>
        )}
      </div>
    </div>
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

  const buildPayload = () => ({
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
  });

  const generateInstrumental = async () => {
    if (instrumentalStatus === "loading") return;
    setInstrumentalStatus("loading");
    setInstrumentalStep(0);
    setInstrumentalMeta(null);
    try {
      const res = await fetch("/api/generate-instrumental-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json() as { metadata: InstrumentalMetadata };
      setInstrumentalMeta(data.metadata);
      setInstrumentalStatus("ready");
      toast({ title: "Instrumental Preview Ready", description: `${data.metadata.bpm} BPM · ${data.metadata.key}` });
    } catch {
      setInstrumentalStatus("error");
      toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const generateVocal = async () => {
    if (vocalStatus === "loading") return;
    setVocalStatus("loading");
    setVocalStep(0);
    setVocalMeta(null);
    try {
      const res = await fetch("/api/generate-vocal-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json() as { metadata: VocalMetadata };
      setVocalMeta(data.metadata);
      setVocalStatus("ready");
      toast({ title: "Vocal Demo Ready", description: `${data.metadata.vocalStyle} · ${data.metadata.key}` });
    } catch {
      setVocalStatus("error");
      toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const anyReady = instrumentalStatus === "ready" || vocalStatus === "ready";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-3xl border border-white/8 bg-gradient-to-b from-[#0b0b18] to-[#07070f] overflow-hidden shadow-2xl"
    >
      {/* Card Header */}
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

        {/* Action Buttons — always visible */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Instrumental Button */}
          <button
            onClick={generateInstrumental}
            disabled={instrumentalStatus === "loading"}
            className={`relative overflow-hidden group flex items-center justify-between gap-3 h-16 rounded-2xl border px-5 text-sm font-semibold transition-all ${
              instrumentalStatus === "loading"
                ? "border-primary/30 bg-primary/8 text-primary/60 cursor-wait"
                : instrumentalStatus === "ready"
                ? "border-primary/25 bg-primary/8 text-primary hover:border-primary/40 hover:bg-primary/12"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${instrumentalStatus === "ready" ? "bg-primary/15 border border-primary/25" : "bg-white/5 border border-white/10"}`}>
                <Music2 className={`w-4 h-4 ${instrumentalStatus === "ready" ? "text-primary" : "text-white/40"}`} />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-white/80">
                  {instrumentalStatus === "ready" ? "Regenerate Instrumental" : "Generate Instrumental Preview"}
                </div>
                <div className="text-[10px] text-white/30 mt-0.5">Beat · Rhythm · Arrangement</div>
              </div>
            </div>
            {instrumentalStatus !== "loading" && (
              <ChevronRight className="w-4 h-4 text-white/20 shrink-0 group-hover:text-white/50 transition-colors" />
            )}
            {instrumentalStatus === "loading" && (
              <div className="shrink-0 w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            )}
          </button>

          {/* Vocal Button */}
          <button
            onClick={generateVocal}
            disabled={vocalStatus === "loading"}
            className={`relative overflow-hidden group flex items-center justify-between gap-3 h-16 rounded-2xl border px-5 text-sm font-semibold transition-all ${
              vocalStatus === "loading"
                ? "border-violet-500/30 bg-violet-500/8 text-violet-400/60 cursor-wait"
                : vocalStatus === "ready"
                ? "border-violet-500/25 bg-violet-500/8 text-violet-300 hover:border-violet-500/40 hover:bg-violet-500/12"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${vocalStatus === "ready" ? "bg-violet-500/15 border border-violet-500/25" : "bg-white/5 border border-white/10"}`}>
                <Mic2 className={`w-4 h-4 ${vocalStatus === "ready" ? "text-violet-400" : "text-white/40"}`} />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-white/80">
                  {vocalStatus === "ready" ? "Regenerate Vocal Demo" : "Generate Vocal Demo"}
                </div>
                <div className="text-[10px] text-white/30 mt-0.5">Melody · Guide Vocal · Style</div>
              </div>
            </div>
            {vocalStatus !== "loading" && (
              <ChevronRight className="w-4 h-4 text-white/20 shrink-0 group-hover:text-white/50 transition-colors" />
            )}
            {vocalStatus === "loading" && (
              <div className="shrink-0 w-4 h-4 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
            )}
          </button>
        </div>

        {/* Instrumental Preview Result */}
        <AnimatePresence>
          {instrumentalStatus === "loading" && (
            <motion.div
              key="instr-loading"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-primary/12 bg-primary/4">
                <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-semibold text-primary/80">Building Instrumental Preview</span>
                </div>
                <LoadingSteps steps={INSTRUMENTAL_STEPS} activeStep={instrumentalStep} />
              </div>
            </motion.div>
          )}

          {instrumentalStatus === "ready" && instrumentalMeta && (
            <motion.div
              key="instr-ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/5 to-transparent overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-primary/8">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-xs font-bold text-white/70">Instrumental Preview Ready</span>
                  </div>
                  <button
                    onClick={generateInstrumental}
                    className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </button>
                </div>
                <div className="p-4">
                  <AudioPlayer
                    audioUrl={null}
                    duration={instrumentalMeta.duration}
                    title={draft.title}
                    audioType="Instrumental Preview"
                    onRegenerate={generateInstrumental}
                    onDownload={() => toast({ title: "MP3 download queued", description: "Ready when audio engine is connected." })}
                  />
                  <AudioMetadataPanel metadata={instrumentalMeta} />
                </div>
              </div>
            </motion.div>
          )}

          {instrumentalStatus === "error" && (
            <motion.div
              key="instr-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-red-500/15 bg-red-500/5 px-5 py-4 flex items-center gap-3"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-white/60">Instrumental generation failed.</p>
              </div>
              <button onClick={generateInstrumental} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vocal Demo Result */}
        <AnimatePresence>
          {vocalStatus === "loading" && (
            <motion.div
              key="vocal-loading"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-violet-500/12 bg-violet-500/4">
                <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  <span className="text-xs font-semibold text-violet-400/80">Building Vocal Demo</span>
                </div>
                <LoadingSteps steps={VOCAL_STEPS} activeStep={vocalStep} />
              </div>
            </motion.div>
          )}

          {vocalStatus === "ready" && vocalMeta && (
            <motion.div
              key="vocal-ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="rounded-2xl border border-violet-500/15 bg-gradient-to-b from-violet-500/5 to-transparent overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-violet-500/8">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-400" />
                    <span className="text-xs font-bold text-white/70">Vocal Demo Ready</span>
                  </div>
                  <button
                    onClick={generateVocal}
                    className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </button>
                </div>
                <div className="p-4">
                  <AudioPlayer
                    audioUrl={null}
                    duration={vocalMeta.duration}
                    title={draft.title}
                    audioType="Vocal Demo"
                    onRegenerate={generateVocal}
                    onDownload={() => toast({ title: "MP3 download queued", description: "Ready when audio engine is connected." })}
                  />
                  <AudioMetadataPanel metadata={vocalMeta} />
                </div>
              </div>
            </motion.div>
          )}

          {vocalStatus === "error" && (
            <motion.div
              key="vocal-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-red-500/15 bg-red-500/5 px-5 py-4 flex items-center gap-3"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-white/60">Vocal demo generation failed.</p>
              </div>
              <button onClick={generateVocal} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Export Section */}
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
