import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2, Music2, Wand2, Loader2, Check, AlertCircle,
  ChevronDown, Zap, Sliders, FileText, Download, Copy, VolumeX,
  Headphones, Radio,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SongDraft } from "@/lib/songGenerator";
import { formatDraftForClipboard } from "@/lib/songGenerator";
import { buildFullIntelligence, type FullIntelligence, type ExportNoteBlock } from "@/lib/audioIntelligence";

interface Props {
  draft: SongDraft | null;
  genre: string;
  mood: string;
}

export type QuickMode = "default" | "instrumental" | "hook-only" | "afrobeats-demo";

export interface AudioStudioV2Handle {
  sendLyrics: (text: string, mode?: QuickMode) => void;
}

type CardStatus = "idle" | "loading" | "success" | "error";
type WorkflowMode = "artist" | "producer";

interface Blueprint {
  bpm: string;
  key: string;
  genre: string;
  energy: string;
  vocalType: string;
  arrangementStyle: string;
  hookFocus: string;
  producerNotes: string;
  // Producer-mode extras
  introBehavior?: string;
  chorusLift?: string;
  drumDensity?: string;
  bassWeight?: string;
  transitionStyle?: string;
  outroStyle?: string;
}

const AUDIO_GENRES = [
  "Afrobeats", "Dancehall", "Amapiano", "Gospel", "Afro-fusion", "R&B Afro", "Street Pop",
];

const VOCAL_GENDERS = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
  { value: "mixed",  label: "Mixed" },
  { value: "random", label: "Random" },
];

const GENERATION_MODES = [
  { value: "full",         label: "Full Demo" },
  { value: "instrumental", label: "Instrumental Only" },
  { value: "vocal",        label: "Vocal Demo Only" },
];

const SECTIONS = [
  { value: "full",   label: "Full Song" },
  { value: "chorus", label: "Chorus Only" },
  { value: "verse",  label: "Verse Only" },
  { value: "hook",   label: "Hook Only" },
];

const ENERGIES = ["Low", "Medium", "High"];

// Producer-mode option sets
const INTRO_BEHAVIORS   = ["Cold open", "Build up", "Atmospheric fade-in", "Drum roll in", "Acapella intro"];
const CHORUS_LIFTS      = ["Sudden drop", "Gradual swell", "Strip-back & explode", "Key change lift", "Layer stack"];
const DRUM_DENSITIES    = ["Sparse", "Mid", "Heavy", "Trap-lite", "Afro-percussive"];
const BASS_WEIGHTS      = ["Punchy sub", "Rolling bass", "Minimal", "Deep sine", "Afrobeats pocket"];
const TRANSITION_STYLES = ["Hard cut", "Filter sweep", "Reverb trail", "Riser + impact", "Beat drop"];
const OUTRO_STYLES      = ["Fade out", "Cold cut", "Loop decay", "Outro chant", "Breakdown end"];

// Deterministic hash — same string always produces same number in [0, 1)
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return (h % 10000) / 10000;
}

function extractLyricsText(draft: SongDraft | null, genre: string, mood: string): string {
  if (!draft) return "";
  return formatDraftForClipboard(draft, genre, mood);
}

function StemBar({ label, color, pct }: { label: string; color: string; pct?: number }) {
  const resolvedPct = pct ?? Math.round(55 + hashString(label) * 35);
  const delay = hashString(label + "_d") * 0.4;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-1.5 h-4 rounded-full opacity-60 ${color}`} />
      <span className="text-xs text-white/50 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${resolvedPct}%` }}
          transition={{ duration: 1.4, ease: "easeOut", delay }}
        />
      </div>
    </div>
  );
}

type AccentKey = "sky" | "violet" | "amber";

const CARD_STYLES: Record<AccentKey, {
  idle: string; loading: string; success: string;
  iconIdle: string; iconLoading: string; iconSuccess: string; dotLoading: string;
}> = {
  sky: {
    idle: "border-white/6 bg-white/[0.02]", loading: "border-sky-500/20 bg-sky-500/[0.03]",
    success: "border-sky-500/20 bg-sky-500/[0.05]", iconIdle: "bg-white/4",
    iconLoading: "bg-sky-500/10", iconSuccess: "bg-sky-500/12", dotLoading: "bg-sky-400/60",
  },
  violet: {
    idle: "border-white/6 bg-white/[0.02]", loading: "border-violet-500/20 bg-violet-500/[0.03]",
    success: "border-violet-500/20 bg-violet-500/[0.05]", iconIdle: "bg-white/4",
    iconLoading: "bg-violet-500/10", iconSuccess: "bg-violet-500/12", dotLoading: "bg-violet-400/60",
  },
  amber: {
    idle: "border-white/6 bg-white/[0.02]", loading: "border-amber-500/20 bg-amber-500/[0.03]",
    success: "border-amber-500/20 bg-amber-500/[0.05]", iconIdle: "bg-white/4",
    iconLoading: "bg-amber-500/10", iconSuccess: "bg-amber-500/12", dotLoading: "bg-amber-400/60",
  },
};

function ResultCard({
  title, icon, status, accent, children, loadingLabel, muted = false, mutedLabel,
}: {
  title: string; icon: React.ReactNode; status: CardStatus; accent: AccentKey;
  children: React.ReactNode; loadingLabel: string; muted?: boolean; mutedLabel?: string;
}) {
  const s = CARD_STYLES[accent];
  const containerClass = muted
    ? "border-white/4 bg-white/[0.01] opacity-45"
    : status === "idle"    ? s.idle
    : status === "loading" ? s.loading
    : status === "success" ? s.success
    : "border-red-500/15 bg-red-500/[0.03]";
  const iconClass = muted
    ? "bg-white/3"
    : status === "idle"    ? s.iconIdle
    : status === "loading" ? s.iconLoading
    : status === "success" ? s.iconSuccess
    : "bg-red-500/10";

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${containerClass}`}>
      <div className="px-5 py-4 border-b border-white/4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconClass}`}>
            {muted            ? <VolumeX className="w-3.5 h-3.5 text-white/20" /> :
             status === "loading" ? <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" /> :
             status === "success" ? <Check   className="w-3.5 h-3.5 text-green-400" /> :
             status === "error"   ? <AlertCircle className="w-3.5 h-3.5 text-red-400" /> :
             <span className="text-white/30">{icon}</span>}
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-white/40">{title}</span>
        </div>
        {!muted && status === "loading" && (
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className={`w-1 h-1 rounded-full ${s.dotLoading}`}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="p-5">
        {muted && (
          <div className="text-center py-8">
            <VolumeX className="w-7 h-7 text-white/10 mx-auto mb-2.5" />
            <p className="text-xs text-white/22 font-medium">{mutedLabel ?? "Not applicable in this mode"}</p>
            <p className="text-[10px] text-white/12 mt-1">Switch off instrumental mode to enable</p>
          </div>
        )}
        {!muted && status === "idle" && (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-2xl bg-white/3 border border-white/6 flex items-center justify-center mx-auto mb-3">
              <span className="opacity-25">{icon}</span>
            </div>
            <p className="text-xs text-white/25 font-medium">Hit generate when ready</p>
            <p className="text-[10px] text-white/15 mt-1">Set your controls above and launch</p>
          </div>
        )}
        {!muted && status === "loading" && (
          <div className="text-center py-8">
            <div className="relative w-14 h-14 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-[2px] border-white/4 border-t-amber-400/70 animate-spin" />
              <div className="absolute inset-[3px] rounded-full border-[2px] border-white/4 border-b-sky-400/50 animate-[spin_1.8s_linear_infinite_reverse]" />
              <div className="absolute inset-[7px] rounded-full border-[2px] border-white/3 border-t-violet-400/40 animate-[spin_3s_linear_infinite]" />
            </div>
            <p className="text-xs text-amber-400/70 animate-pulse font-medium">{loadingLabel}</p>
          </div>
        )}
        {!muted && status === "error" && (
          <div className="text-center py-6">
            <AlertCircle className="w-8 h-8 text-red-400/50 mx-auto mb-2" />
            <p className="text-xs text-red-400/70">Generation failed. Please try again.</p>
          </div>
        )}
        {!muted && status === "success" && children}
      </div>
    </div>
  );
}

// Compact dropdown used in producer panel
function ProducerSelect({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 rounded-xl bg-[#0b0b18] border border-violet-500/12 px-3 pr-7 text-xs text-white/70 appearance-none focus:outline-none focus:border-violet-500/35 transition-all cursor-pointer"
        >
          {options.map((o) => (
            <option key={o} value={o} className="bg-[#0b0b18] text-white">{o}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-violet-400/40 pointer-events-none" />
      </div>
    </div>
  );
}

function formatBlockForClipboard(block: ExportNoteBlock): string {
  return `== ${block.title.toUpperCase()} ==\n\n` +
    block.items.map((item) => `${item.label}:\n${item.value}`).join("\n\n");
}

function ExportSection({
  block, accent = "white", onCopy,
}: {
  block: ExportNoteBlock;
  accent?: "amber" | "violet" | "sky" | "green" | "white";
  onCopy: (text: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const accentColors = {
    amber:  { badge: "bg-amber-500/10 border-amber-500/20 text-amber-400/80",  dot: "bg-amber-400",  btn: "hover:text-amber-300" },
    violet: { badge: "bg-violet-500/10 border-violet-500/20 text-violet-400/80", dot: "bg-violet-400", btn: "hover:text-violet-300" },
    sky:    { badge: "bg-sky-500/10 border-sky-500/20 text-sky-400/80",         dot: "bg-sky-400",   btn: "hover:text-sky-300" },
    green:  { badge: "bg-green-500/10 border-green-500/20 text-green-400/80",   dot: "bg-green-400", btn: "hover:text-green-300" },
    white:  { badge: "bg-white/5 border-white/10 text-white/60",               dot: "bg-white/40",  btn: "hover:text-white/80" },
  };
  const c = accentColors[accent];
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.018] hover:bg-white/[0.026] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
          <span className="text-xs font-bold tracking-widest uppercase text-white/50">{block.title}</span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${c.badge}`}>
            {block.items.length} items
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCopy(formatBlockForClipboard(block)); }}
            className={`text-[9px] font-semibold text-white/25 ${c.btn} transition-colors flex items-center gap-1`}
          >
            <Copy className="w-2.5 h-2.5" /> Copy
          </button>
          <ChevronDown className={`w-3.5 h-3.5 text-white/25 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-3 bg-white/[0.01]">
              {block.items.map(({ label, value }) => (
                <div key={label} className="grid grid-cols-[140px_1fr] gap-3 items-start">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wide leading-relaxed pt-0.5 shrink-0">{label}</span>
                  <p className="text-xs text-white/55 leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StudioExportNotesCard({
  exportNotes, isProducer, onCopyAll, onCopyBlock,
}: {
  exportNotes: import("@/lib/audioIntelligence").StudioExportNotes;
  isProducer: boolean;
  onCopyAll: () => void;
  onCopyBlock: (block: ExportNoteBlock) => void;
}) {
  const footerButtons: { key: keyof typeof exportNotes; label: string; accent: string }[] = [
    { key: "artist",    label: "Copy Artist Notes",    accent: "text-amber-400/70" },
    { key: "producer",  label: "Copy Producer Notes",  accent: "text-sky-400/70" },
    { key: "recording", label: "Copy Recording Notes", accent: "text-violet-400/70" },
    { key: "session",   label: "Copy Session Notes",   accent: "text-green-400/70" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.04] to-transparent overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/12 border border-amber-500/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-amber-400/80" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-amber-400/80">Studio Export Notes</div>
            <div className="text-[10px] text-white/30 mt-0.5">
              {isProducer
                ? "Full production brief — artist, producer, recording & engineering"
                : "Artist & producer brief — vocal, recording & session guidance"}
            </div>
          </div>
        </div>
        <button type="button" onClick={onCopyAll}
          className="h-8 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] font-semibold text-amber-400/80 hover:bg-amber-500/18 hover:text-amber-300 transition-all flex items-center gap-1.5"
        >
          <Copy className="w-3 h-3" /> Copy All Notes
        </button>
      </div>

      {/* Note Sections */}
      <div className="p-4 space-y-2">
        <ExportSection block={exportNotes.artist}    accent="amber"  onCopy={onCopyBlock} />
        <ExportSection block={exportNotes.producer}  accent="sky"    onCopy={onCopyBlock} />
        <ExportSection block={exportNotes.recording} accent="violet" onCopy={onCopyBlock} />
        <ExportSection block={exportNotes.session}   accent="green"  onCopy={onCopyBlock} />
        {exportNotes.producerDeep && (
          <ExportSection block={exportNotes.producerDeep} accent="white" onCopy={onCopyBlock} />
        )}
      </div>

      {/* Footer copy row */}
      <div className="px-4 pb-4 pt-3 border-t border-white/4 flex flex-wrap gap-2">
        {footerButtons.map(({ key, label, accent }) => {
          const block = exportNotes[key] as ExportNoteBlock | undefined;
          if (!block) return null;
          return (
            <button key={key} type="button" onClick={() => onCopyBlock(block)}
              className={`h-7 px-3 rounded-lg bg-white/3 border border-white/6 text-[10px] font-semibold ${accent} hover:bg-white/6 hover:border-white/12 transition-all flex items-center gap-1.5`}
            >
              <Copy className="w-2.5 h-2.5" /> {label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function getGenreDefaults(g: string): { bpm: string; key: string } {
  const map: Record<string, { bpm: string; key: string }> = {
    "Amapiano":   { bpm: "112–116", key: "A minor" },
    "Dancehall":  { bpm: "90–96",   key: "C major" },
    "Gospel":     { bpm: "72–84",   key: "D major" },
    "R&B Afro":   { bpm: "85–95",   key: "G minor" },
    "Street Pop": { bpm: "96–102",  key: "E minor" },
    "Afro-fusion":{ bpm: "95–105",  key: "B♭ major" },
    "Afrobeats":  { bpm: "98–104",  key: "F# minor" },
  };
  return map[g] ?? { bpm: "98–104", key: "F# minor" };
}

const AudioStudioV2 = forwardRef<AudioStudioV2Handle, Props>(function AudioStudioV2({ draft, genre, mood }, ref) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [highlighted, setHighlighted] = useState(false);

  // ── Workflow mode ──────────────────────────────────────────────────────────
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("artist");

  // ── Controlled state ──────────────────────────────────────────────────────
  const [audioLyrics,          setAudioLyrics]          = useState("");
  const [audioGenre,           setAudioGenre]           = useState("Afrobeats");
  const [audioStyleReference,  setAudioStyleReference]  = useState("");
  const [vocalGender,          setVocalGender]          = useState("male");
  const [generationMode,       setGenerationMode]       = useState("full");
  const [sectionMode,          setSectionMode]          = useState("full");
  const [bpm,                  setBpm]                  = useState("");
  const [musicalKey,           setMusicalKey]           = useState("");
  const [energyLevel,          setEnergyLevel]          = useState("Medium");

  const [useGeneratedLyrics,       setUseGeneratedLyrics]       = useState(false);
  const [generateOnlyInstrumental, setGenerateOnlyInstrumental] = useState(false);
  const [includeArrangementNotes,  setIncludeArrangementNotes]  = useState(true);
  const [includeStemsBreakdown,    setIncludeStemsBreakdown]    = useState(false);
  const [useHitmakerHookPriority,  setUseHitmakerHookPriority]  = useState(false);

  // ── Producer-mode extended fields ─────────────────────────────────────────
  const [introBehavior,   setIntroBehavior]   = useState(INTRO_BEHAVIORS[0]);
  const [chorusLift,      setChorusLift]      = useState(CHORUS_LIFTS[0]);
  const [drumDensity,     setDrumDensity]     = useState(DRUM_DENSITIES[2]);
  const [bassWeight,      setBassWeight]      = useState(BASS_WEIGHTS[0]);
  const [transitionStyle, setTransitionStyle] = useState(TRANSITION_STYLES[3]);
  const [outroStyle,      setOutroStyle]      = useState(OUTRO_STYLES[0]);

  // ── Card statuses ─────────────────────────────────────────────────────────
  const [instrumentalStatus, setInstrumentalStatus] = useState<CardStatus>("idle");
  const [vocalStatus,        setVocalStatus]        = useState<CardStatus>("idle");
  const [blueprintStatus,    setBlueprintStatus]    = useState<CardStatus>("idle");
  const [blueprint,          setBlueprint]          = useState<Blueprint | null>(null);
  const [intelligence,       setIntelligence]       = useState<FullIntelligence | null>(null);

  const isInstrumentalMode = generateOnlyInstrumental || generationMode === "instrumental";
  const hasLyrics          = audioLyrics.trim().length > 0 || draft !== null;
  const isProducer         = workflowMode === "producer";

  useEffect(() => {
    if (useGeneratedLyrics && draft) {
      setAudioLyrics(extractLyricsText(draft, genre, mood));
    }
  }, [draft, useGeneratedLyrics, genre, mood]);

  const handleUseLyrics = () => {
    if (!draft) {
      toast({ title: "No lyrics yet", description: "Generate lyrics first or paste your own lyrics.", variant: "destructive" });
      return;
    }
    const text = extractLyricsText(draft, genre, mood);
    setAudioLyrics(text);
    setUseGeneratedLyrics(true);
    toast({ title: "Lyrics loaded", description: "Your generated lyrics are ready for audio production." });
    textareaRef.current?.focus();
  };

  useImperativeHandle(ref, () => ({
    sendLyrics(text: string, mode?: QuickMode) {
      setAudioLyrics(text);
      setUseGeneratedLyrics(true);
      if (mode === "instrumental") {
        setGenerationMode("instrumental");
        setGenerateOnlyInstrumental(true);
      } else if (mode === "hook-only") {
        setSectionMode("hook");
        setGenerationMode("full");
        setGenerateOnlyInstrumental(false);
      } else if (mode === "afrobeats-demo") {
        setAudioGenre("Afrobeats");
        setGenerationMode("full");
        setGenerateOnlyInstrumental(false);
        setSectionMode("full");
      } else {
        setGenerationMode("full");
        setGenerateOnlyInstrumental(false);
      }
      setHighlighted(true);
      setTimeout(() => setHighlighted(false), 2000);
      setTimeout(() => { textareaRef.current?.focus(); }, 400);
    },
  }), []);

  const handleToggleAutoLyrics = (next: boolean) => {
    setUseGeneratedLyrics(next);
    if (next && draft) {
      setAudioLyrics(extractLyricsText(draft, genre, mood));
      toast({ title: "Auto-sync on", description: "Lyrics will update whenever you generate in V1." });
    }
  };

  const buildBlueprintAndIntelligence = (): { bp: Blueprint; intel: FullIntelligence } => {
    const defaults    = getGenreDefaults(audioGenre);
    const resolvedBpm = bpm || defaults.bpm;
    const resolvedKey = musicalKey || defaults.key;
    const vocalLabel  = vocalGender === "random" ? "Randomised" : vocalGender.charAt(0).toUpperCase() + vocalGender.slice(1);

    const intel = buildFullIntelligence({
      genre: audioGenre,
      bpm: resolvedBpm,
      key: resolvedKey,
      energy: energyLevel,
      section: sectionMode,
      vocalGender,
      vocalLabel,
      isInstrumentalMode,
      isProducer,
      useHitmakerHookPriority,
      includeArrangementNotes,
      includeStemsBreakdown,
      lyrics: audioLyrics,
      styleReference: audioStyleReference,
      ...(isProducer ? { introBehavior, chorusLift, drumDensity, bassWeight, transitionStyle, outroStyle } : {}),
    });

    const bp: Blueprint = {
      bpm: resolvedBpm,
      key: resolvedKey,
      genre: audioGenre,
      energy: energyLevel,
      vocalType: isInstrumentalMode ? "Instrumental" : vocalLabel,
      arrangementStyle: intel.arrangementStyle,
      hookFocus:        intel.hookFocus,
      producerNotes:    intel.producerNotes,
      ...(isProducer ? { introBehavior, chorusLift, drumDensity, bassWeight, transitionStyle, outroStyle } : {}),
    };

    return { bp, intel };
  };

  const validateForVocal = (): boolean => {
    if (!hasLyrics) {
      toast({ title: "Lyrics required", description: "Paste lyrics or generate one first — vocal demo needs lyric content.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const runInstrumental = async () => {
    setInstrumentalStatus("loading");
    await new Promise((r) => setTimeout(r, 2800));
    const { bp, intel } = buildBlueprintAndIntelligence();
    setInstrumentalStatus("success");
    setBlueprintStatus("success");
    setBlueprint(bp);
    setIntelligence(intel);
  };

  const runVocal = async () => {
    setVocalStatus("loading");
    await new Promise((r) => setTimeout(r, 3200));
    setVocalStatus("success");
  };

  const handleGenerateInstrumental = () => {
    setInstrumentalStatus("idle");
    setBlueprintStatus("idle");
    setBlueprint(null);
    setIntelligence(null);
    void runInstrumental();
  };

  const handleGenerateVocal = () => {
    if (!validateForVocal()) return;
    setVocalStatus("idle");
    void runVocal();
  };

  const handleGenerateFull = () => {
    if (!isInstrumentalMode && !validateForVocal()) return;
    setInstrumentalStatus("idle");
    setVocalStatus("idle");
    setBlueprintStatus("idle");
    setBlueprint(null);
    setIntelligence(null);
    void (async () => {
      const tasks: Promise<void>[] = [runInstrumental()];
      if (!isInstrumentalMode) {
        tasks.push((async () => { await new Promise((w) => setTimeout(w, 600)); await runVocal(); })());
      }
      await Promise.all(tasks);
    })();
  };

  const copyBlueprint = () => {
    if (!blueprint) return;
    const lines = [
      `BPM: ${blueprint.bpm}`, `Key: ${blueprint.key}`, `Genre: ${blueprint.genre}`,
      `Energy: ${blueprint.energy}`, `Vocal Type: ${blueprint.vocalType}`,
      `Arrangement Style: ${blueprint.arrangementStyle}`, `Hook Focus: ${blueprint.hookFocus}`,
      ...(isProducer && blueprint.introBehavior ? [
        ``, `— Producer Detail —`,
        `Intro: ${blueprint.introBehavior}`, `Chorus Lift: ${blueprint.chorusLift}`,
        `Drum Density: ${blueprint.drumDensity}`, `Bass Weight: ${blueprint.bassWeight}`,
        `Transitions: ${blueprint.transitionStyle}`, `Outro: ${blueprint.outroStyle}`,
      ] : []),
      ``, `Producer Notes:`, blueprint.producerNotes,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      toast({ title: "Blueprint copied", description: "Audio blueprint copied to clipboard." });
    });
  };

  const hasAnyResult = instrumentalStatus === "success" || vocalStatus === "success" || blueprintStatus === "success";
  const isGenerating = instrumentalStatus === "loading" || vocalStatus === "loading";
  const genreDefaults = getGenreDefaults(audioGenre);

  return (
    <section
      id="audio-studio-v2"
      className={`mt-14 rounded-3xl border bg-gradient-to-b from-[#080c15] via-[#07090f] to-[#060810] overflow-hidden transition-all duration-700 ${
        highlighted
          ? "border-sky-400/50 shadow-[0_0_80px_rgba(14,165,233,0.18),0_0_0_2px_rgba(14,165,233,0.12)]"
          : "border-sky-500/15 shadow-[0_0_80px_rgba(14,165,233,0.04)]"
      }`}
    >

      {/* ── Header ── */}
      <div className="relative px-6 md:px-8 py-6 border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/6 via-transparent to-violet-500/3 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/12 border border-sky-500/25 flex items-center justify-center shrink-0">
              <Music2 className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-base font-bold text-white tracking-tight">AfroMuse Audio Studio</h2>
                <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400">V2</span>
                <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-violet-500/12 border border-violet-500/25 text-violet-400">Workflow Intelligence</span>
              </div>
              <p className="text-xs text-white/40">Write. Shape. Hear. — craft a beat, vocal guide, and full session blueprint from your lyrics.</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleUseLyrics}
            className="shrink-0 h-9 px-4 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-semibold hover:bg-sky-500/18 hover:border-sky-500/40 transition-all flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" /> Load Lyrics
          </motion.button>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">

        {/* ── Workflow Mode Toggle ── */}
        <div className="rounded-2xl border border-white/6 bg-white/[0.015] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/4 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Audio Workflow Mode</span>
            <span className="ml-auto text-[10px] text-white/18">Choose your creation style</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/30 border border-white/5">
              {/* Artist Mode */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setWorkflowMode("artist")}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-300 ${
                  workflowMode === "artist"
                    ? "bg-gradient-to-br from-amber-500/18 to-amber-600/8 border border-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.10)]"
                    : "hover:bg-white/4 border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  workflowMode === "artist" ? "bg-amber-500/20 border border-amber-500/35" : "bg-white/4 border border-white/8"
                }`}>
                  <Headphones className={`w-4 h-4 ${workflowMode === "artist" ? "text-amber-400" : "text-white/30"}`} />
                </div>
                <div className="text-left">
                  <div className={`text-sm font-bold transition-colors ${workflowMode === "artist" ? "text-amber-300" : "text-white/40"}`}>Artist Mode</div>
                  <div className={`text-[10px] leading-tight transition-colors ${workflowMode === "artist" ? "text-amber-400/55" : "text-white/20"}`}>Vibe-first. Emotional. Fast.</div>
                </div>
                {workflowMode === "artist" && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </motion.button>

              {/* Producer Mode */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setWorkflowMode("producer")}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-300 ${
                  workflowMode === "producer"
                    ? "bg-gradient-to-br from-violet-500/18 to-violet-600/8 border border-violet-500/30 shadow-[0_0_24px_rgba(139,92,246,0.10)]"
                    : "hover:bg-white/4 border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  workflowMode === "producer" ? "bg-violet-500/20 border border-violet-500/35" : "bg-white/4 border border-white/8"
                }`}>
                  <Sliders className={`w-4 h-4 ${workflowMode === "producer" ? "text-violet-400" : "text-white/30"}`} />
                </div>
                <div className="text-left">
                  <div className={`text-sm font-bold transition-colors ${workflowMode === "producer" ? "text-violet-300" : "text-white/40"}`}>Producer Mode</div>
                  <div className={`text-[10px] leading-tight transition-colors ${workflowMode === "producer" ? "text-violet-400/55" : "text-white/20"}`}>Technical. Structured. Studio-ready.</div>
                </div>
                {workflowMode === "producer" && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </motion.button>
            </div>

            {/* Mode description strip */}
            <AnimatePresence mode="wait">
              {workflowMode === "artist" ? (
                <motion.p key="artist-desc"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="mt-3 text-[11px] text-amber-400/50 text-center leading-relaxed"
                >
                  Focused on feel, hook strength, and vocal emotion — built for creators who work from the heart.
                </motion.p>
              ) : (
                <motion.p key="producer-desc"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="mt-3 text-[11px] text-violet-400/50 text-center leading-relaxed"
                >
                  Full arrangement scripting, stem control, transition design — built for the studio engineer in you.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Lyrics Input ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold tracking-widest uppercase text-white/40">
                {isProducer ? "Lyric Sheet" : "Your Lyrics"}
              </label>
              {useGeneratedLyrics && audioLyrics && (
                <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-sky-500/12 border border-sky-500/25 text-sky-400/70">Synced</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isInstrumentalMode && (
                <span className="text-[10px] text-sky-400/55 font-medium">Optional in beat-only mode</span>
              )}
              {audioLyrics && (
                <span className="text-[10px] text-white/20">{audioLyrics.split("\n").filter(Boolean).length} lines</span>
              )}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={audioLyrics}
            onChange={(e) => { setAudioLyrics(e.target.value); if (useGeneratedLyrics) setUseGeneratedLyrics(false); }}
            rows={11}
            placeholder={
              isProducer
                ? "Drop the lyric sheet here with section labels — the engine will map your arrangement...\n\n[Intro]\n...\n\n[Verse 1]\n...\n\n[Chorus / Hook]\n...\n\n[Bridge]\n..."
                : "Drop your full lyrics here, or write from scratch...\n\n[Intro]\n...\n\n[Verse 1]\n...\n\n[Chorus / Hook]\n...\n\n[Bridge]\n..."
            }
            className="w-full rounded-2xl bg-white/[0.03] border border-white/8 px-5 py-4 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/10 transition-all resize-none leading-relaxed font-mono"
          />
          {!draft && !audioLyrics && (
            <p className="text-[11px] text-white/22 mt-2 leading-relaxed">
              {isProducer
                ? "Label each section clearly (e.g. [Verse 1], [Chorus]) — Producer Mode uses section labels to map the arrangement."
                : <>Write your song above in the Lyrics Studio, then click <span className="text-white/35">"Load Lyrics"</span> to bring it here — or paste your own below.</>
              }
              {isInstrumentalMode && " In beat-only mode, lyrics are optional."}
            </p>
          )}
        </div>

        {/* ── Session Setup Controls ── */}
        <div className="rounded-2xl border border-white/6 bg-white/[0.018] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Session Setup</span>
            </div>
            <span className="text-[10px] text-white/18">{isProducer ? "Full technical control" : "Dial in your sound"}</span>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Genre */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Genre</label>
              <div className="relative">
                <select
                  value={audioGenre}
                  onChange={(e) => setAudioGenre(e.target.value)}
                  className="w-full h-10 rounded-xl bg-[#0e0e1c] border border-white/8 px-3 pr-8 text-sm text-white appearance-none focus:outline-none focus:border-sky-500/40 transition-all cursor-pointer"
                >
                  {AUDIO_GENRES.map((g) => (
                    <option key={g} value={g} className="bg-[#0e0e1c] text-white">{g}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>

            {/* Sound Reference */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">
                {isProducer ? "Production Reference" : "Sound Reference"}
              </label>
              <input
                type="text"
                value={audioStyleReference}
                onChange={(e) => setAudioStyleReference(e.target.value)}
                placeholder={
                  isProducer
                    ? "e.g. Timbaland arrangement style, Sarz drum pattern, Legendury Beatz chord movement..."
                    : "e.g. Burna Boy x Asake, Omah Lay type vibe, soulful church atmosphere..."
                }
                className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/40 transition-all"
              />
            </div>

            {/* Vocal Gender */}
            <div className={isInstrumentalMode ? "opacity-40 pointer-events-none" : ""}>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">
                Vocal Gender
                {isInstrumentalMode && <span className="ml-2 text-white/18 font-normal normal-case tracking-normal">(off)</span>}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {VOCAL_GENDERS.map((v) => (
                  <button key={v.value} type="button" onClick={() => setVocalGender(v.value)}
                    className={`h-8 rounded-lg text-xs font-semibold transition-all ${
                      vocalGender === v.value
                        ? "bg-sky-500/15 border border-sky-500/35 text-sky-400"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                    }`}
                  >{v.label}</button>
                ))}
              </div>
            </div>

            {/* Generation Mode */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Generation Mode</label>
              <div className="space-y-1.5">
                {GENERATION_MODES.map((m) => (
                  <button key={m.value} type="button" onClick={() => setGenerationMode(m.value)}
                    className={`w-full h-8 rounded-lg text-xs font-semibold transition-all text-left px-3 ${
                      generationMode === m.value
                        ? "bg-sky-500/15 border border-sky-500/35 text-sky-400"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                    }`}
                  >{m.label}</button>
                ))}
              </div>
            </div>

            {/* Section Selector */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">
                {isProducer ? "Section Scope" : "Section"}
              </label>
              <div className="space-y-1.5">
                {SECTIONS.map((s) => (
                  <button key={s.value} type="button" onClick={() => setSectionMode(s.value)}
                    className={`w-full h-8 rounded-lg text-xs font-semibold transition-all text-left px-3 ${
                      sectionMode === s.value
                        ? "bg-amber-500/12 border border-amber-500/28 text-amber-400"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                    }`}
                  >{s.label}</button>
                ))}
              </div>
            </div>

            {/* BPM + Key */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">BPM</label>
                <input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)}
                  placeholder={genreDefaults.bpm.split("–")[0]} min={60} max={200}
                  className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Key</label>
                <input type="text" value={musicalKey} onChange={(e) => setMusicalKey(e.target.value)}
                  placeholder={genreDefaults.key}
                  className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/40 transition-all"
                />
              </div>
            </div>

            {/* Energy */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">
                {isProducer ? "Energy Arc" : "Energy"}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {ENERGIES.map((e) => (
                  <button key={e} type="button" onClick={() => setEnergyLevel(e)}
                    className={`h-8 rounded-lg text-xs font-semibold transition-all ${
                      energyLevel === e
                        ? e === "High"   ? "bg-red-500/12 border border-red-500/28 text-red-400"
                          : e === "Medium" ? "bg-amber-500/12 border border-amber-500/28 text-amber-400"
                          : "bg-sky-500/12 border border-sky-500/28 text-sky-400"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                    }`}
                  >{e}</button>
                ))}
              </div>
            </div>

          </div>

          {/* Session Options */}
          <div className="px-5 py-4 border-t border-white/4">
            <div className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-3">Session Options</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {([
                { id: "useLyrics",   label: isProducer ? "Auto-sync lyric sheet from Lyrics Studio" : "Auto-sync lyrics from Lyrics Studio",  checked: useGeneratedLyrics,       onToggle: handleToggleAutoLyrics },
                { id: "instOnly",    label: "Beat-only — skip vocals",                                                                          checked: generateOnlyInstrumental, onToggle: (v: boolean) => setGenerateOnlyInstrumental(v) },
                { id: "arrangement", label: isProducer ? "Include full arrangement script" : "Include arrangement guide",                       checked: includeArrangementNotes,  onToggle: (v: boolean) => setIncludeArrangementNotes(v) },
                { id: "stems",       label: isProducer ? "Include stems export map" : "Include stems breakdown",                                checked: includeStemsBreakdown,    onToggle: (v: boolean) => setIncludeStemsBreakdown(v) },
                { id: "hitmaker",    label: isProducer ? "Engineer hook priority — coded for replay" : "Hitmaker hook priority",                checked: useHitmakerHookPriority,  onToggle: (v: boolean) => setUseHitmakerHookPriority(v) },
              ] as const).map(({ id, label, checked, onToggle }) => (
                <label key={id} className="flex items-center gap-2.5 cursor-pointer group">
                  <button type="button" onClick={() => onToggle(!checked as never)}
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                      checked ? "bg-sky-500/20 border-sky-500/45" : "bg-white/4 border-white/10 group-hover:border-white/22"
                    }`}
                  >
                    {checked && <Check className="w-2.5 h-2.5 text-sky-400" />}
                  </button>
                  <span className="text-xs text-white/40 group-hover:text-white/65 transition-colors select-none">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Producer Mode Detail Panel ── */}
        <AnimatePresence>
          {isProducer && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.025] overflow-hidden">
                <div className="px-5 py-4 border-b border-violet-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-violet-500/15 flex items-center justify-center">
                      <Sliders className="w-3 h-3 text-violet-400" />
                    </div>
                    <span className="text-[11px] font-bold tracking-widest uppercase text-violet-400/60">Arrangement Detail</span>
                  </div>
                  <span className="text-[10px] text-violet-400/35">Producer Mode only</span>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ProducerSelect label="Intro Behavior"        value={introBehavior}   options={INTRO_BEHAVIORS}   onChange={setIntroBehavior} />
                  <ProducerSelect label="Chorus Lift"           value={chorusLift}      options={CHORUS_LIFTS}      onChange={setChorusLift} />
                  <ProducerSelect label="Drum Density"          value={drumDensity}     options={DRUM_DENSITIES}    onChange={setDrumDensity} />
                  <ProducerSelect label="Bass Weight"           value={bassWeight}      options={BASS_WEIGHTS}      onChange={setBassWeight} />
                  <ProducerSelect label="Transition Style"      value={transitionStyle} options={TRANSITION_STYLES} onChange={setTransitionStyle} />
                  <ProducerSelect label="Outro Style"           value={outroStyle}      options={OUTRO_STYLES}      onChange={setOutroStyle} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Beat-only mode notice ── */}
        <AnimatePresence>
          {isInstrumentalMode && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-3 rounded-2xl border border-sky-500/18 bg-sky-500/5 px-5 py-3.5"
            >
              <Music2 className="w-4 h-4 text-sky-400 shrink-0" />
              <p className="text-xs text-sky-300/70 leading-relaxed">
                <span className="font-semibold text-sky-400">Beat-only mode is on.</span>{" "}
                Lyrics are optional and vocals are skipped — only the beat preview and session blueprint will run.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action Buttons ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.button type="button" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            onClick={handleGenerateInstrumental} disabled={isGenerating}
            className="h-12 rounded-xl bg-sky-500/7 border border-sky-500/18 text-sm font-semibold text-sky-300/70 hover:bg-sky-500/12 hover:text-sky-200 hover:border-sky-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Music2 className="w-4 h-4 text-sky-400" />
            {isProducer ? "Beat Structure" : "Beat Preview"}
          </motion.button>

          <motion.button type="button"
            whileHover={!isInstrumentalMode ? { scale: 1.01 } : {}}
            whileTap={!isInstrumentalMode ? { scale: 0.98 } : {}}
            onClick={handleGenerateVocal}
            disabled={isGenerating || isInstrumentalMode}
            title={isInstrumentalMode ? "Turn off beat-only mode to generate a vocal guide" : undefined}
            className={`h-12 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
              isInstrumentalMode
                ? "bg-white/2 border border-white/5 text-white/18 cursor-not-allowed"
                : "bg-violet-500/8 border border-violet-500/18 text-violet-300/70 hover:bg-violet-500/14 hover:text-violet-200 hover:border-violet-500/30 disabled:opacity-40"
            }`}
          >
            <Mic2 className="w-4 h-4" />
            {isInstrumentalMode ? "Vocals Off" : isProducer ? "Vocal Blueprint" : "Vocal Guide"}
          </motion.button>

          <motion.button type="button" whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
            onClick={handleGenerateFull} disabled={isGenerating}
            className="h-12 rounded-xl bg-gradient-to-r from-amber-500/85 to-primary/85 text-sm font-bold text-black hover:from-amber-400 hover:to-primary shadow-[0_0_32px_rgba(245,158,11,0.20)] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Building...</>
              : <><Zap className="w-4 h-4" />{isProducer ? "Build Full Session" : "Build Full Session"}</>
            }
          </motion.button>
        </div>

        {/* ── Result Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Beat Preview / Beat Structure */}
          <ResultCard
            title={isProducer ? "Beat Structure" : "Beat Preview"}
            icon={<Music2 className="w-3.5 h-3.5" />}
            status={instrumentalStatus}
            accent="sky"
            loadingLabel={isProducer ? "Scripting your arrangement..." : "Building your groove..."}
          >
            <div className="space-y-4">
              {intelligence && (
                <>
                  {/* Beat summary / arrangement map */}
                  {isProducer ? (
                    <div className="rounded-lg bg-white/[0.03] border border-violet-500/10 px-3 py-2">
                      <div className="text-[9px] font-bold tracking-widest uppercase text-violet-400/50 mb-1">Arrangement Map</div>
                      <p className="text-[10px] text-violet-300/55 leading-relaxed">{intelligence.arrangementMap}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/50 leading-relaxed">{intelligence.beatSummary}</p>
                  )}

                  {/* Intelligent stem bars */}
                  <div className="space-y-3 pt-1">
                    {intelligence.stems.map((stem) => (
                      <div key={stem.label}>
                        <StemBar label={stem.label} color={stem.color} pct={stem.pct} />
                        <p className="text-[9px] text-white/28 mt-1 leading-relaxed pl-[calc(0.375rem+0.75rem+7rem)]">{stem.note}</p>
                      </div>
                    ))}
                  </div>

                  {/* Style influence tag */}
                  {intelligence.styleInfluence !== "neutral" && intelligence.styleDesc && (
                    <div className="pt-1 border-t border-white/4">
                      <p className="text-[10px] text-sky-400/50 leading-relaxed">{intelligence.styleDesc}</p>
                    </div>
                  )}

                  {/* Arrangement guide note (Artist mode) */}
                  {!isProducer && includeArrangementNotes && (
                    <p className="text-[10px] text-white/22 pt-1 border-t border-white/4 leading-relaxed">
                      Full arrangement guide included in the Session Blueprint →
                    </p>
                  )}
                </>
              )}
            </div>
          </ResultCard>

          {/* Vocal Guide / Vocal Blueprint */}
          <ResultCard
            title={isProducer ? "Vocal Blueprint" : "Vocal Guide"}
            icon={<Mic2 className="w-3.5 h-3.5" />}
            status={vocalStatus}
            accent="violet"
            loadingLabel={isProducer ? "Scripting vocal architecture..." : "Finding your vocal pocket..."}
            muted={isInstrumentalMode}
            mutedLabel="Vocals are off in beat-only mode"
          >
            <div className="space-y-3">
              {intelligence && (
                <>
                  <div className="rounded-lg bg-violet-500/[0.05] border border-violet-500/12 px-3 py-2">
                    <div className="text-[9px] font-bold tracking-widest uppercase text-violet-400/50 mb-0.5">
                      {isProducer ? "Vocal Architecture" : "Vocal Setup"}
                    </div>
                    <p className="text-[10px] text-violet-300/60 leading-snug">
                      {VOCAL_GENDERS.find((v) => v.value === vocalGender)?.label} delivery — {audioGenre}
                      {intelligence.lyricsTone !== "neutral" ? ` · Tone: ${intelligence.lyricsTone}` : ""}
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {intelligence.vocalSections.map(({ label, note, color }) => (
                      <div key={label} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400/50 mt-1.5 shrink-0" />
                        <div>
                          <span className={`text-[10px] font-semibold block ${color}`}>{label}</span>
                          <p className="text-[10px] text-white/30 leading-relaxed">{note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </ResultCard>

          {/* Session Blueprint */}
          <ResultCard
            title="Session Blueprint"
            icon={<Wand2 className="w-3.5 h-3.5" />}
            status={blueprintStatus}
            accent="amber"
            loadingLabel={isProducer ? "Engineering your session blueprint..." : "Designing your session blueprint..."}
          >
            {blueprint && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "BPM",        value: blueprint.bpm,       color: "text-amber-400" },
                    { label: "Key",        value: blueprint.key,       color: "text-sky-400" },
                    { label: "Genre",      value: blueprint.genre,     color: "text-violet-400" },
                    { label: "Energy",     value: blueprint.energy,    color: "text-green-400" },
                    { label: "Vocal Type", value: blueprint.vocalType, color: "text-white/70" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
                      <div className="text-[9px] font-bold tracking-widest uppercase text-white/25 mb-0.5">{label}</div>
                      <div className={`text-xs font-semibold ${color}`}>{value}</div>
                    </div>
                  ))}
                  <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2 col-span-2">
                    <div className="text-[9px] font-bold tracking-widest uppercase text-white/25 mb-0.5">Hook Focus</div>
                    <div className="text-xs font-medium text-amber-300/70 leading-snug">{blueprint.hookFocus}</div>
                  </div>
                </div>

                {/* Producer-mode detail badges */}
                {isProducer && blueprint.drumDensity && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Drums",      value: blueprint.drumDensity },
                      { label: "Bass",       value: blueprint.bassWeight ?? "" },
                      { label: "Transition", value: blueprint.transitionStyle ?? "" },
                      { label: "Outro",      value: blueprint.outroStyle ?? "" },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-violet-500/[0.04] border border-violet-500/10 px-3 py-1.5">
                        <div className="text-[9px] font-bold tracking-widest uppercase text-violet-400/40 mb-0.5">{label}</div>
                        <div className="text-[10px] font-semibold text-violet-300/65">{value}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
                  <div className="text-[9px] font-bold tracking-widest uppercase text-white/25 mb-1">Arrangement Style</div>
                  <p className="text-xs text-white/50 leading-relaxed">{blueprint.arrangementStyle}</p>
                </div>
                <div className="rounded-lg bg-amber-500/[0.04] border border-amber-500/12 px-3 py-2">
                  <div className="text-[9px] font-bold tracking-widest uppercase text-amber-400/60 mb-1">
                    {isProducer ? "Engineering Notes" : "Producer Notes"}
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">{blueprint.producerNotes}</p>
                </div>

                {/* Intelligence context tags */}
                {intelligence && (intelligence.lyricsTone !== "neutral" || intelligence.styleInfluence !== "neutral") && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {intelligence.lyricsTone !== "neutral" && (
                      <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-full bg-white/4 border border-white/8 text-white/35">
                        Tone · {intelligence.lyricsTone}
                      </span>
                    )}
                    {intelligence.styleInfluence !== "neutral" && (
                      <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-full bg-sky-500/8 border border-sky-500/15 text-sky-400/50">
                        Style · {intelligence.styleInfluence.replace("-", " ")}
                      </span>
                    )}
                  </div>
                )}

                <button onClick={copyBlueprint}
                  className="w-full h-8 rounded-lg bg-white/4 border border-white/8 text-[10px] font-semibold text-white/40 hover:text-white/70 hover:border-white/15 transition-all flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3 h-3" /> Copy Blueprint
                </button>
              </div>
            )}
          </ResultCard>

        </div>

        {/* ── Studio Export Notes ── */}
        <AnimatePresence>
          {intelligence?.exportNotes && instrumentalStatus === "success" && (
            <StudioExportNotesCard
              exportNotes={intelligence.exportNotes}
              isProducer={isProducer}
              onCopyAll={() => {
                const notes = intelligence.exportNotes;
                const all = [notes.artist, notes.producer, notes.recording, notes.session, ...(notes.producerDeep ? [notes.producerDeep] : [])]
                  .map(formatBlockForClipboard).join("\n\n" + "─".repeat(60) + "\n\n");
                navigator.clipboard.writeText(all).then(
                  () => toast({ title: "All notes copied", description: "Paste into your DAW notes, Notion, or producer email." }),
                  () => toast({ title: "Copy failed", variant: "destructive" }),
                );
              }}
              onCopyBlock={(block) => {
                navigator.clipboard.writeText(formatBlockForClipboard(block)).then(
                  () => toast({ title: `${block.title} copied`, description: "Ready to paste." }),
                  () => toast({ title: "Copy failed", variant: "destructive" }),
                );
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Session export bar ── */}
        <AnimatePresence>
          {hasAnyResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl border border-white/5 bg-white/[0.015] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-white/40">
                  {isProducer
                    ? "Session engineered — send this blueprint straight to your DAW or producer inbox."
                    : "Session ready — drop this blueprint in your producer's inbox."
                  }
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={copyBlueprint} disabled={!blueprint}
                  className="h-8 px-3 rounded-lg bg-white/4 border border-white/8 text-xs text-white/50 hover:text-white/80 hover:border-white/15 transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Copy className="w-3 h-3" /> Copy Blueprint
                </button>
                <button
                  onClick={() => toast({ title: "Coming soon", description: "Full session export unlocks in AfroMuse Gold." })}
                  className="h-8 px-3 rounded-lg bg-amber-500/10 border border-amber-500/22 text-xs text-amber-400 hover:bg-amber-500/16 transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3 h-3" /> Export Session
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
});

export default AudioStudioV2;
