import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2, Music2, Wand2, Loader2, Check, AlertCircle,
  ChevronDown, Zap, Sliders, FileText, Download, Copy, VolumeX,
  Headphones, Radio, Clock,
  Lock, Sparkles, CheckCircle2, ArrowRight, Package,
  FileAudio, Layers, Guitar, LayoutList, Tag, Star,
  Link2, Heart, Cpu,
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
  introBehavior?: string;
  chorusLift?: string;
  drumDensity?: string;
  bassWeight?: string;
  transitionStyle?: string;
  outroStyle?: string;
  bounceStyle?: string;
  melodyDensity?: string;
  drumCharacter?: string;
  hookLift?: string;
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
  { value: "full",         label: "Full Session",       description: "Beat preview + vocal direction",                  },
  { value: "instrumental", label: "Instrumental Only",  description: "Build beat direction without vocals",             },
  { value: "vocal",        label: "Vocal Demo Setup",   description: "Focus on topline / guide vocal direction",        },
];

const SECTIONS = [
  { value: "full",   label: "Full Song" },
  { value: "chorus", label: "Chorus Only" },
  { value: "verse",  label: "Verse Only" },
  { value: "hook",   label: "Hook Only" },
];

const ENERGIES = ["Low", "Medium", "High"];

const VOCAL_STYLES = [
  "Smooth", "Melodic", "Gritty", "Emotional",
  "Soulful", "Intimate", "Confident", "Airy",
  "Prayerful", "Street",
];

const EMOTIONAL_TONES = [
  "Romantic", "Anthemic", "Devotional", "Melancholic",
  "Uplifting", "Raw", "Hopeful", "Celebratory",
  "Longing", "Confident",
];

const LEAD_VOCAL_BUILD_MODES = [
  { value: "full",       label: "Full Session",  description: "All sections — intro, verse, hook, bridge, outro" },
  { value: "vocal-demo", label: "Vocal Demo",    description: "Hook + verse only — faster turnaround" },
];

interface LeadVocalSessionData {
  vocalBrief: string;
  phrasingGuide: string;
  emotionalArc: string;
  syncNotes: string;
  performanceDirection: string;
  deliveryStyle: string;
  vocalProcessingNotes: string;
}

interface MixMasterSessionData {
  mixBrief: string;
  levelBalancing: string;
  eqNotes: string;
  compressionNotes: string;
  spatialEffects: string;
  masteringChain: string;
  outputNotes: string;
  stemsNotes: string | null;
}

interface StemTrackData {
  name: string;
  extractionNotes: string;
  gainLevel: string;
  fileSpec: string;
}

interface StemExtractionSessionData {
  extractionBrief: string;
  stems: StemTrackData[];
  phaseAlignmentNotes: string;
  dawImportGuide: string;
  recommendedTool: string;
}

const ALL_STEMS = ["Drums", "Bass", "Synths", "Vocals", "Effects"] as const;

const STEM_COLORS: Record<string, { bg: string; border: string; text: string; sub: string }> = {
  "Drums":   { bg: "bg-orange-500/[0.04]",  border: "border-orange-500/12",  text: "text-orange-400/65", sub: "text-orange-300/55"  },
  "Bass":    { bg: "bg-red-500/[0.04]",     border: "border-red-500/12",     text: "text-red-400/65",    sub: "text-red-300/55"    },
  "Synths":  { bg: "bg-violet-500/[0.04]",  border: "border-violet-500/12",  text: "text-violet-400/65", sub: "text-violet-300/55" },
  "Vocals":  { bg: "bg-pink-500/[0.04]",    border: "border-pink-500/12",    text: "text-pink-400/65",   sub: "text-pink-300/55"   },
  "Effects": { bg: "bg-sky-500/[0.04]",     border: "border-sky-500/12",     text: "text-sky-400/65",    sub: "text-sky-300/55"    },
};

const MIX_FEEL_OPTIONS = [
  "Balanced",
  "Dry & Punchy",
  "Lush & Reverb-Heavy",
  "Lo-Fi Warmth",
  "Bright & Crisp",
  "Dark & Gritty",
  "Club-Ready",
];

const INTRO_BEHAVIORS   = ["Cold open", "Build up", "Atmospheric fade-in", "Drum roll in", "Acapella intro"];
const CHORUS_LIFTS      = ["Sudden drop", "Gradual swell", "Strip-back & explode", "Key change lift", "Layer stack"];
const DRUM_DENSITIES    = ["Sparse", "Mid", "Heavy", "Trap-lite", "Afro-percussive"];
const BASS_WEIGHTS      = ["Punchy sub", "Rolling bass", "Minimal", "Deep sine", "Afrobeats pocket"];
const TRANSITION_STYLES = ["Hard cut", "Filter sweep", "Reverb trail", "Riser + impact", "Beat drop"];
const OUTRO_STYLES      = ["Fade out", "Cold cut", "Loop decay", "Outro chant", "Breakdown end"];

const BEAT_DNA_BOUNCE_STYLES  = ["Smooth Glide", "Club Bounce", "Street Bounce", "Late Night Swing", "Festival Lift", "Slow Wine", "Log Drum Drive"];
const BEAT_DNA_MELODY_DENSITIES = ["Minimal", "Balanced", "Rich", "Lush", "Cinematic"];
const BEAT_DNA_DRUM_CHARACTERS  = ["Clean", "Punchy", "Raw", "Dusty", "Percussive", "Heavy Groove"];
const BEAT_DNA_HOOK_LIFTS       = ["Subtle", "Balanced", "Big", "Anthemic", "Explosive"];

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
  iconIdle: string; iconLoading: string; iconSuccess: string;
  dotLoading: string; spinnerOuter: string; spinnerMid: string; spinnerInner: string;
  loadingText: string; statusChip: string; topBar: string;
}> = {
  sky: {
    idle:          "border-white/6 bg-white/[0.02]",
    loading:       "border-sky-500/20 bg-sky-500/[0.03]",
    success:       "border-sky-500/22 bg-sky-500/[0.04]",
    iconIdle:      "bg-white/4",
    iconLoading:   "bg-sky-500/10",
    iconSuccess:   "bg-sky-500/14",
    dotLoading:    "bg-sky-400/60",
    spinnerOuter:  "border-t-sky-400/80",
    spinnerMid:    "border-b-sky-300/40",
    spinnerInner:  "border-t-sky-500/30",
    loadingText:   "text-sky-400/80",
    statusChip:    "bg-sky-500/10 border-sky-500/20 text-sky-400/80",
    topBar:        "from-sky-500/40 to-sky-400/10",
  },
  violet: {
    idle:          "border-white/6 bg-white/[0.02]",
    loading:       "border-violet-500/20 bg-violet-500/[0.03]",
    success:       "border-violet-500/22 bg-violet-500/[0.04]",
    iconIdle:      "bg-white/4",
    iconLoading:   "bg-violet-500/10",
    iconSuccess:   "bg-violet-500/14",
    dotLoading:    "bg-violet-400/60",
    spinnerOuter:  "border-t-violet-400/80",
    spinnerMid:    "border-b-violet-300/40",
    spinnerInner:  "border-t-violet-500/30",
    loadingText:   "text-violet-400/80",
    statusChip:    "bg-violet-500/10 border-violet-500/20 text-violet-400/80",
    topBar:        "from-violet-500/40 to-violet-400/10",
  },
  amber: {
    idle:          "border-white/6 bg-white/[0.02]",
    loading:       "border-amber-500/20 bg-amber-500/[0.03]",
    success:       "border-amber-500/22 bg-amber-500/[0.04]",
    iconIdle:      "bg-white/4",
    iconLoading:   "bg-amber-500/10",
    iconSuccess:   "bg-amber-500/14",
    dotLoading:    "bg-amber-400/60",
    spinnerOuter:  "border-t-amber-400/80",
    spinnerMid:    "border-b-amber-300/40",
    spinnerInner:  "border-t-amber-500/30",
    loadingText:   "text-amber-400/80",
    statusChip:    "bg-amber-500/10 border-amber-500/20 text-amber-400/80",
    topBar:        "from-amber-500/40 to-amber-400/10",
  },
};

function ResultCard({
  title, subtitle, icon, status, accent, children, loadingLabel,
  statusLabel, emptyLabel, emptySubLabel,
  muted = false, mutedLabel,
}: {
  title: string; subtitle?: string; icon: React.ReactNode; status: CardStatus; accent: AccentKey;
  children: React.ReactNode; loadingLabel: string;
  statusLabel?: string; emptyLabel?: string; emptySubLabel?: string;
  muted?: boolean; mutedLabel?: string;
}) {
  const s = CARD_STYLES[accent];
  const containerClass = muted
    ? "border-white/4 bg-white/[0.015] opacity-40"
    : status === "idle"    ? s.idle
    : status === "loading" ? s.loading
    : status === "success" ? s.success
    : "border-red-500/15 bg-red-500/[0.03]";
  const iconClass = muted ? "bg-white/3"
    : status === "idle"    ? s.iconIdle
    : status === "loading" ? s.iconLoading
    : status === "success" ? s.iconSuccess
    : "bg-red-500/10";

  return (
    <div className={`rounded-2xl border transition-all duration-500 overflow-hidden flex flex-col ${containerClass}`}>
      {!muted && status === "success" && (
        <div className={`h-[2px] bg-gradient-to-r ${s.topBar} w-full`} />
      )}
      <div className="px-5 py-3.5 border-b border-white/[0.045] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
            {muted                   ? <VolumeX    className="w-3.5 h-3.5 text-white/20" /> :
             status === "loading"    ? <Loader2    className={`w-3.5 h-3.5 animate-spin ${s.loadingText}`} /> :
             status === "success"    ? <Check      className="w-3.5 h-3.5 text-green-400" /> :
             status === "error"      ? <AlertCircle className="w-3.5 h-3.5 text-red-400" /> :
             <span className="text-white/25">{icon}</span>}
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/58">{title}</div>
            {subtitle && <div className="text-[9px] text-white/20 mt-0.5 tracking-wide leading-snug">{subtitle}</div>}
          </div>
        </div>
        {!muted && status === "success" && statusLabel && (
          <span className={`text-[8px] font-bold tracking-[0.1em] uppercase px-2 py-1 rounded-full border ${s.statusChip}`}>
            {statusLabel}
          </span>
        )}
        {!muted && status === "loading" && (
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className={`w-1 h-1 rounded-full ${s.dotLoading}`}
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.22 }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="p-5 flex-1">
        {muted && (
          <div className="text-center py-10">
            <div className="w-9 h-9 rounded-xl bg-white/3 border border-white/5 flex items-center justify-center mx-auto mb-3">
              <VolumeX className="w-4 h-4 text-white/15" />
            </div>
            <p className="text-xs text-white/22 font-medium">{mutedLabel ?? "Not available in this mode"}</p>
            <p className="text-[10px] text-white/12 mt-1.5 leading-relaxed">Turn off Instrumental Only to enable guide vocals.</p>
          </div>
        )}
        {!muted && status === "idle" && (
          <div className="text-center py-10">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.025] border border-white/6 flex items-center justify-center mx-auto mb-3.5">
              <span className="opacity-20">{icon}</span>
            </div>
            <p className="text-xs text-white/28 font-medium leading-relaxed">
              {emptyLabel ?? "Ready when you are."}
            </p>
            <p className="text-[10px] text-white/14 mt-1.5 leading-relaxed">
              {emptySubLabel ?? "Configure above and hit generate."}
            </p>
          </div>
        )}
        {!muted && status === "loading" && (
          <div className="text-center py-10">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className={`absolute inset-0 rounded-full border-[2px] border-white/4 ${s.spinnerOuter} animate-[spin_1.2s_linear_infinite]`} />
              <div className={`absolute inset-[3px] rounded-full border-[2px] border-white/3 ${s.spinnerMid} animate-[spin_2s_linear_infinite_reverse]`} />
              <div className={`absolute inset-[7px] rounded-full border-[2px] border-white/[0.06] ${s.spinnerInner} animate-[spin_3.5s_linear_infinite]`} />
            </div>
            <p className={`text-xs font-semibold animate-pulse ${s.loadingText}`}>{loadingLabel}</p>
          </div>
        )}
        {!muted && status === "error" && (
          <div className="text-center py-8">
            <AlertCircle className="w-7 h-7 text-red-400/50 mx-auto mb-2" />
            <p className="text-xs text-red-400/60 font-medium">Generation failed</p>
            <p className="text-[10px] text-white/20 mt-1">Please try again.</p>
          </div>
        )}
        {!muted && status === "success" && children}
      </div>
    </div>
  );
}

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
      <div className="p-4 space-y-2">
        <ExportSection block={exportNotes.artist}    accent="amber"  onCopy={onCopyBlock} />
        <ExportSection block={exportNotes.producer}  accent="sky"    onCopy={onCopyBlock} />
        <ExportSection block={exportNotes.recording} accent="violet" onCopy={onCopyBlock} />
        <ExportSection block={exportNotes.session}   accent="green"  onCopy={onCopyBlock} />
        {exportNotes.producerDeep && (
          <ExportSection block={exportNotes.producerDeep} accent="white" onCopy={onCopyBlock} />
        )}
      </div>
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

/* ═══════════════════════════════════════════════════════════
   PIPELINE STATUS BAR — Render Engine Layer
═══════════════════════════════════════════════════════════ */

type PipelineStage = "idle" | "processing" | "success" | "error";

interface PipelineStageConfig {
  label: string;
  helper: string;
  status: PipelineStage;
  muted?: boolean;
}

function PipelineStatusBar({ stages, visible }: { stages: PipelineStageConfig[]; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-white/6 bg-gradient-to-r from-white/[0.02] via-white/[0.015] to-white/[0.01] px-5 py-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-3.5 h-3.5 text-sky-400/60" />
            <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-white/35">Session Pipeline</span>
            <div className="flex-1 h-px bg-white/5 ml-1" />
            <span className="text-[8px] text-white/18 tracking-wider">Render Engine</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {stages.map((stage, i) => {
              const isIdle       = stage.status === "idle";
              const isProcessing = stage.status === "processing";
              const isSuccess    = stage.status === "success";
              const isError      = stage.status === "error";
              return (
                <div
                  key={stage.label}
                  className={`flex flex-col items-center gap-2 text-center transition-all duration-500 ${stage.muted ? "opacity-25 pointer-events-none" : ""}`}
                >
                  <div className="relative w-full flex items-center justify-center">
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500 ${
                      isSuccess    ? "bg-green-500/15 border-green-500/40 shadow-[0_0_14px_rgba(34,197,94,0.22)]" :
                      isProcessing ? "bg-sky-500/12 border-sky-500/35 shadow-[0_0_14px_rgba(14,165,233,0.20)]" :
                      isError      ? "bg-red-500/12 border-red-500/30" :
                      "bg-white/[0.03] border-white/8"
                    }`}>
                      {isSuccess    && <Check       className="w-3.5 h-3.5 text-green-400" />}
                      {isError      && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                      {isProcessing && (
                        <motion.div
                          className="w-2.5 h-2.5 rounded-full bg-sky-400/80"
                          animate={{ scale: [1, 1.35, 1], opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 1.1, repeat: Infinity }}
                        />
                      )}
                      {isIdle       && <div className="w-2 h-2 rounded-full bg-white/10" />}
                    </div>
                    {i < stages.length - 1 && (
                      <div className={`absolute left-1/2 right-0 translate-x-4 h-px top-4 transition-colors duration-700 ${
                        isSuccess ? "bg-green-500/25" : "bg-white/5"
                      }`} />
                    )}
                  </div>
                  <div className="px-1">
                    <div className={`text-[8.5px] font-bold tracking-[0.1em] uppercase transition-colors duration-300 ${
                      isSuccess    ? "text-green-400/75" :
                      isProcessing ? "text-sky-400/80" :
                      isError      ? "text-red-400/65" :
                      "text-white/22"
                    }`}>
                      {stage.label}
                    </div>
                    <div className="text-[7.5px] text-white/16 mt-0.5 leading-snug">{stage.helper}</div>
                    {isProcessing && (
                      <div className="flex justify-center gap-0.5 mt-1.5">
                        {[0, 1, 2].map((j) => (
                          <motion.div
                            key={j}
                            className="w-1 h-1 rounded-full bg-sky-400/45"
                            animate={{ opacity: [0.15, 1, 0.15] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.2 }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════
   FINAL EXPORT CARD
═══════════════════════════════════════════════════════════ */

function FinalExportCard({
  isReady, mixFeel, onToast,
}: {
  isReady: boolean;
  mixFeel: string;
  onToast: (title: string, description: string) => void;
}) {
  const QUALITY_OPTIONS = ["Preview", "Standard", "Studio"] as const;
  const [quality, setQuality] = useState<"Preview" | "Standard" | "Studio">("Standard");

  const exportButtons = [
    { label: "Export MP3",       icon: <FileAudio className="w-3.5 h-3.5" />, color: "sky" },
    { label: "Export WAV",       icon: <Music2    className="w-3.5 h-3.5" />, color: "violet" },
    { label: "Download Stems",   icon: <Layers    className="w-3.5 h-3.5" />, color: "amber" },
  ] as const;

  const notReadyMsg = "Final export unlocks when the render engine completes the full session.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-white/6 bg-white/[0.018] overflow-hidden"
    >
      <div className={`h-[2px] w-full bg-gradient-to-r transition-all duration-700 ${isReady ? "from-green-500/50 to-green-400/10" : "from-white/8 to-transparent"}`} />
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-500 ${isReady ? "bg-green-500/12 border-green-500/28" : "bg-white/4 border-white/8"}`}>
            <Package className={`w-4 h-4 transition-colors duration-500 ${isReady ? "text-green-400" : "text-white/20"}`} />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-white/55">Final Export</div>
            <div className="text-[9px] text-white/22 mt-0.5">Prepare your session for final delivery.</div>
          </div>
        </div>
        <div className={`text-[8px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full border transition-all duration-500 ${
          isReady
            ? "bg-green-500/10 border-green-500/25 text-green-400/80"
            : "bg-white/4 border-white/8 text-white/25"
        }`}>
          {isReady ? "Render Ready" : "Awaiting Render"}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Export buttons */}
        <div className="grid grid-cols-3 gap-2">
          {exportButtons.map(({ label, icon, color }) => {
            const colorMap = {
              sky:    { active: "bg-sky-500/10 border-sky-500/25 text-sky-300 hover:bg-sky-500/18 hover:border-sky-500/40", dim: "bg-white/3 border-white/6 text-white/20 cursor-not-allowed" },
              violet: { active: "bg-violet-500/10 border-violet-500/25 text-violet-300 hover:bg-violet-500/18 hover:border-violet-500/40", dim: "bg-white/3 border-white/6 text-white/20 cursor-not-allowed" },
              amber:  { active: "bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/18 hover:border-amber-500/40", dim: "bg-white/3 border-white/6 text-white/20 cursor-not-allowed" },
            };
            const cls = isReady ? colorMap[color].active : colorMap[color].dim;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (!isReady) {
                    onToast("Export Not Ready", notReadyMsg);
                  } else {
                    onToast("Export Queued", `${label} queued — full audio export unlocks with the AfroMuse Pro audio layer.`);
                  }
                }}
                className={`h-10 rounded-xl border text-[9px] font-bold tracking-wide flex flex-col items-center justify-center gap-1 transition-all duration-300 ${cls}`}
              >
                {icon}
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Mix Feel + Export Quality */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.02] border border-white/5 px-3.5 py-2.5">
            <div className="text-[8.5px] font-bold tracking-widest uppercase text-white/25 mb-1">Mix Feel</div>
            <div className="text-xs font-semibold text-white/50">{mixFeel}</div>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-white/5 px-3.5 py-2.5">
            <div className="text-[8.5px] font-bold tracking-widest uppercase text-white/25 mb-1">Export Quality</div>
            <div className="flex gap-1">
              {QUALITY_OPTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`text-[8px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                    quality === q
                      ? "bg-sky-500/12 border-sky-500/28 text-sky-400/80"
                      : "bg-white/3 border-white/6 text-white/25 hover:text-white/40"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Helper note */}
        <p className="text-[9px] text-white/18 leading-relaxed text-center italic border-t border-white/4 pt-3">
          Final export unlocks when the render engine completes the full session.
        </p>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RECENT SESSION BUILD — Lightweight History Panel
═══════════════════════════════════════════════════════════ */

function RecentSessionBuild({
  sessionTitle,
  mode,
  lastStage,
  startTime,
}: {
  sessionTitle: string;
  mode: string;
  lastStage: string | null;
  startTime: number | null;
}) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, [startTime]);

  const getTimeLabel = () => {
    if (!startTime) return null;
    const diff = Date.now() - startTime;
    if (diff < 10000) return "Just now";
    if (diff < 60000) return "Moments ago";
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  };

  if (!startTime) return null;

  const timeLabel = getTimeLabel();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-white/5 bg-white/[0.012] px-5 py-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-3 h-3 text-amber-400/40" />
        <span className="text-[9px] font-bold tracking-[0.16em] uppercase text-white/30">Recent Session Build</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <div className="text-[8px] font-bold tracking-widest uppercase text-white/20 mb-1">Session</div>
          <div className="text-[10px] font-semibold text-white/45 truncate">{sessionTitle}</div>
        </div>
        <div>
          <div className="text-[8px] font-bold tracking-widest uppercase text-white/20 mb-1">Mode</div>
          <div className="text-[10px] font-semibold text-white/45">{mode}</div>
        </div>
        <div>
          <div className="text-[8px] font-bold tracking-widest uppercase text-white/20 mb-1">Last Stage</div>
          <div className={`text-[10px] font-semibold ${lastStage ? "text-green-400/60" : "text-white/22"}`}>
            {lastStage ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-[8px] font-bold tracking-widest uppercase text-white/20 mb-1">When</div>
          <div className="text-[10px] font-semibold text-white/35">{timeLabel}</div>
        </div>
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

/* ═══════════════════════════════════════════════════════════
   PRO TOOLS SECTION — V2 PREMIUM EXPANSION
═══════════════════════════════════════════════════════════ */

interface ProFeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  miniLabel: string;
  badge: string;
  badgeColor: string;
  accent: "amber" | "violet" | "sky" | "gray";
  toastMessage: string;
}

const PRO_FEATURE_CARDS: ProFeatureCard[] = [
  {
    icon: <Layers className="w-4 h-4" />,
    title: "Stems Export",
    description: "Download separated session parts for flexible mixing and arrangement.",
    miniLabel: "Drums • Bass • Music • Guide Vocals",
    badge: "IN DEVELOPMENT",
    badgeColor: "bg-amber-500/12 text-amber-400/80 border-amber-500/20",
    accent: "amber",
    toastMessage: "Stems Export is being built as part of the AfroMuse Pro audio layer.",
  },
  {
    icon: <FileAudio className="w-4 h-4" />,
    title: "Full WAV Export",
    description: "Export your session as a high-quality studio-ready bounce.",
    miniLabel: "24-bit master-ready output",
    badge: "IN DEVELOPMENT",
    badgeColor: "bg-amber-500/12 text-amber-400/80 border-amber-500/20",
    accent: "amber",
    toastMessage: "WAV Export is being prepared. Your session structure is ready — the audio engine is next.",
  },
  {
    icon: <Download className="w-4 h-4" />,
    title: "MP3 Session Export",
    description: "Download a quick-share version for phone playback, demos, and previews.",
    miniLabel: "Fast artist sharing",
    badge: "MP3 AVAILABLE",
    badgeColor: "bg-emerald-500/12 text-emerald-400/80 border-emerald-500/20",
    accent: "amber",
    toastMessage: "MP3 preview is available — use the Download button in your instrumental player to save it.",
  },
  {
    icon: <Mic2 className="w-4 h-4" />,
    title: "Vocal Model Slots",
    description: "Choose and save different vocal identities for future demo renders.",
    miniLabel: "Lead • Alt Lead • Harmony Voice",
    badge: "BETA PREP",
    badgeColor: "bg-violet-500/12 text-violet-400/80 border-violet-500/20",
    accent: "violet",
    toastMessage: "Vocal Model Slots are in beta preparation — your vocal direction is already being tracked.",
  },
  {
    icon: <Sparkles className="w-4 h-4" />,
    title: "Hook Alternates",
    description: "Generate alternate hook melodies, toplines, or chorus directions.",
    miniLabel: "For stronger replay value",
    badge: "PLANNED",
    badgeColor: "bg-violet-500/10 text-violet-400/65 border-violet-500/15",
    accent: "violet",
    toastMessage: "Hook Alternates will let you explore multiple chorus directions. Coming in the next update.",
  },
  {
    icon: <Guitar className="w-4 h-4" />,
    title: "Instrumental Variations",
    description: "Build alternate beat directions for the same song idea or vocal concept.",
    miniLabel: "Club • Smooth • Dark • Acoustic-lite",
    badge: "PLANNED",
    badgeColor: "bg-sky-500/10 text-sky-400/65 border-sky-500/15",
    accent: "sky",
    toastMessage: "Instrumental Variations will generate alternative beat directions from your session data.",
  },
  {
    icon: <LayoutList className="w-4 h-4" />,
    title: "Arrangement Export",
    description: "Export a producer-friendly structure sheet for recording and beat building.",
    miniLabel: "Intro • Verse • Hook • Bridge map",
    badge: "PREPARING",
    badgeColor: "bg-sky-500/14 text-sky-400/85 border-sky-500/22",
    accent: "sky",
    toastMessage: "Arrangement Export is nearly ready — your structure map is already built inside your session.",
  },
  {
    icon: <Package className="w-4 h-4" />,
    title: "Release Pack",
    description: "Prepare song title, writing sheet, credits, and session notes in one place.",
    miniLabel: "Artist-ready organization",
    badge: "PLANNED",
    badgeColor: "bg-white/8 text-white/45 border-white/12",
    accent: "gray",
    toastMessage: "Release Pack will bundle your full session into an artist-ready delivery format.",
  },
];

const ACCENT_MAP = {
  amber: {
    icon: "text-amber-400/70",
    card: "bg-amber-500/[0.03] border-amber-500/[0.09] hover:border-amber-500/20 hover:bg-amber-500/[0.06]",
    glow: "from-amber-500/5",
    mini: "text-amber-400/40",
  },
  violet: {
    icon: "text-violet-400/70",
    card: "bg-violet-500/[0.03] border-violet-500/[0.09] hover:border-violet-500/20 hover:bg-violet-500/[0.06]",
    glow: "from-violet-500/5",
    mini: "text-violet-400/40",
  },
  sky: {
    icon: "text-sky-400/70",
    card: "bg-sky-500/[0.03] border-sky-500/[0.09] hover:border-sky-500/20 hover:bg-sky-500/[0.06]",
    glow: "from-sky-500/5",
    mini: "text-sky-400/40",
  },
  gray: {
    icon: "text-white/30",
    card: "bg-white/[0.02] border-white/[0.07] hover:border-white/14 hover:bg-white/[0.035]",
    glow: "from-white/3",
    mini: "text-white/28",
  },
};

const SESSION_READY = [
  "Lyrics Input",
  "Genre + Mood Direction",
  "BPM / Key Setup",
  "Vocal Identity Setup",
  "Instrumental Build Path",
  "Vocal Demo Setup",
  "Session Blueprint",
];

const NEXT_UNLOCKS = [
  "Stems Download",
  "WAV Bounce",
  "Vocal Model Saving",
  "Hook Alternate Generator",
  "Beat Variation Engine",
  "Release Pack Export",
];

function ProToolsSection({ onToast }: { onToast: (title: string, description: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mt-8 space-y-6"
    >
      {/* ── Divider ── */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/[0.02]">
          <Star className="w-2.5 h-2.5 text-amber-400/60" />
          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-white/28">Pro Tools</span>
          <Star className="w-2.5 h-2.5 text-amber-400/60" />
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* ── Section Header ── */}
      <div className="text-center">
        <p className="text-[11px] text-white/28 tracking-wide">Premium session tools for artists, writers, and producers.</p>
      </div>

      {/* ══ PART 1 — Feature Grid ══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PRO_FEATURE_CARDS.map((card) => {
          const a = ACCENT_MAP[card.accent];
          return (
            <motion.button
              key={card.title}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onToast(card.title, card.toastMessage)}
              className={`relative text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer group overflow-hidden ${a.card}`}
            >
              {/* Subtle glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

              <div className="relative z-10 space-y-3">
                {/* Icon + Badge row */}
                <div className="flex items-start justify-between gap-2">
                  <div className={`p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] ${a.icon}`}>
                    {card.icon}
                  </div>
                  <span className={`text-[7.5px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <div className="text-[11px] font-bold text-white/75 leading-tight mb-1">{card.title}</div>
                  <p className="text-[9.5px] text-white/32 leading-relaxed">{card.description}</p>
                </div>

                {/* Mini label */}
                <div className={`text-[8.5px] font-medium leading-snug ${a.mini}`}>{card.miniLabel}</div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ══ PART 2 — Session Readiness Panel ══ */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] overflow-hidden">
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.01]">
          <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-white/50 mb-0.5">Session Readiness</div>
          <p className="text-[10px] text-white/25">A quick look at what your session already has and what unlocks next.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
          {/* Left — Ready now */}
          <div className="px-5 py-4 space-y-2.5">
            <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-green-400/60 mb-3">Current Session Ready</div>
            {SESSION_READY.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <CheckCircle2 className="w-3 h-3 text-green-400/70 shrink-0" />
                <span className="text-[10px] text-white/55">{item}</span>
              </div>
            ))}
          </div>

          {/* Right — Next unlocks */}
          <div className="px-5 py-4 space-y-2.5">
            <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-amber-400/50 mb-3">Next Pro Unlocks</div>
            {NEXT_UNLOCKS.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <Lock className="w-3 h-3 text-white/22 shrink-0" />
                <span className="text-[10px] text-white/32">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ PART 3 — Positioning Strip ══ */}
      <div className="rounded-2xl border border-white/[0.05] bg-gradient-to-r from-white/[0.012] to-white/[0.006] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-white/45">Built for artists and producers.</div>
          <p className="text-[10px] text-white/24 leading-relaxed max-w-md">
            Start with lyrics, shape the session, test the vocal identity, and prepare a structure before final audio rendering.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {["Songwriting", "Beat Prep", "Vocal Direction", "Session Planning"].map((tag) => (
            <div key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03]">
              <Tag className="w-2.5 h-2.5 text-white/25" />
              <span className="text-[8.5px] font-semibold tracking-wide text-white/40">{tag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ PART 4 — CTA Panel ══ */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.025] via-white/[0.012] to-transparent overflow-hidden">
        {/* Decorative top accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

        <div className="px-6 py-6 space-y-5">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400/60" />
              <h4 className="text-sm font-semibold tracking-wide text-white/65">AfroMuse Pro Engine</h4>
            </div>
            <p className="text-[11px] text-white/30 leading-relaxed">
              The next layer of AfroMuse expands from writing into real session generation, export, and artist-ready delivery.
            </p>
          </div>

          {/* Bullets */}
          <div className="space-y-2">
            {[
              "More realistic audio generation",
              "Export-ready session tools",
              "Stronger artist / producer workflow",
            ].map((bullet) => (
              <div key={bullet} className="flex items-center gap-2.5">
                <ArrowRight className="w-2.5 h-2.5 text-amber-400/40 shrink-0" />
                <span className="text-[10px] text-white/38">{bullet}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-0.5">
            <button
              onClick={() => onToast("AfroMuse Pro", "The full Pro engine is on the roadmap. Your session data is already shaping the upcoming features.")}
              className="h-8 px-4 rounded-xl bg-amber-500/10 border border-amber-500/22 text-xs font-semibold text-amber-300/85 hover:bg-amber-500/16 hover:border-amber-500/32 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3" />
              See What's Coming
            </button>
            <button
              onClick={() => onToast("Session Prepared", "Your current session structure, vocal identity, and sonic direction are locked in and ready for the Pro layer.")}
              className="h-8 px-4 rounded-xl bg-white/[0.03] border border-white/8 text-xs font-semibold text-white/38 hover:bg-white/[0.06] hover:text-white/55 hover:border-white/14 transition-all flex items-center gap-1.5"
            >
              <FileText className="w-3 h-3" />
              Prepare My Session
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const AudioStudioV2 = forwardRef<AudioStudioV2Handle, Props>(function AudioStudioV2({ draft, genre, mood }, ref) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [highlighted, setHighlighted] = useState(false);

  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("artist");

  const [audioLyrics,          setAudioLyrics]          = useState("");
  const [audioGenre,           setAudioGenre]           = useState("Afrobeats");
  const [audioStyleReference,  setAudioStyleReference]  = useState("");
  const [vocalGender,          setVocalGender]          = useState("male");
  const [vocalStyle,           setVocalStyle]           = useState("Smooth");
  const [generationMode,       setGenerationMode]       = useState("full");
  const [sectionMode,          setSectionMode]          = useState("full");
  const [bpm,                  setBpm]                  = useState("");
  const [musicalKey,           setMusicalKey]           = useState("");
  const [energyLevel,          setEnergyLevel]          = useState("Medium");

  const [useGeneratedLyrics,       setUseGeneratedLyrics]       = useState(false);
  const [includeArrangementNotes,  setIncludeArrangementNotes]  = useState(true);
  const [includeStemsBreakdown,    setIncludeStemsBreakdown]    = useState(false);
  const [useHitmakerHookPriority,  setUseHitmakerHookPriority]  = useState(false);
  const [mixFeel,                  setMixFeel]                  = useState("Balanced");
  const [generateMasteredExport,   setGenerateMasteredExport]   = useState(false);

  const [introBehavior,   setIntroBehavior]   = useState(INTRO_BEHAVIORS[0]);
  const [chorusLift,      setChorusLift]      = useState(CHORUS_LIFTS[0]);
  const [drumDensity,     setDrumDensity]     = useState(DRUM_DENSITIES[2]);
  const [bassWeight,      setBassWeight]      = useState(BASS_WEIGHTS[0]);
  const [transitionStyle, setTransitionStyle] = useState(TRANSITION_STYLES[3]);
  const [outroStyle,      setOutroStyle]      = useState(OUTRO_STYLES[0]);

  const [bounceStyle,     setBounceStyle]     = useState(BEAT_DNA_BOUNCE_STYLES[1]);
  const [melodyDensity,   setMelodyDensity]   = useState(BEAT_DNA_MELODY_DENSITIES[1]);
  const [drumCharacter,   setDrumCharacter]   = useState(BEAT_DNA_DRUM_CHARACTERS[1]);
  const [hookLift,        setHookLift]        = useState(BEAT_DNA_HOOK_LIFTS[1]);

  const [instrumentalUrl,       setInstrumentalUrl]       = useState("");
  const [emotionalTone,         setEmotionalTone]         = useState("Uplifting");
  const [leadVocalBuildMode,    setLeadVocalBuildMode]    = useState("full");

  const [instrumentalStatus, setInstrumentalStatus] = useState<CardStatus>("idle");
  const [vocalStatus,        setVocalStatus]        = useState<CardStatus>("idle");
  const [blueprintStatus,    setBlueprintStatus]    = useState<CardStatus>("idle");
  const [leadVocalStatus,    setLeadVocalStatus]    = useState<CardStatus>("idle");
  const [leadVocalData,      setLeadVocalData]      = useState<LeadVocalSessionData | null>(null);
  const [mixMasterStatus,    setMixMasterStatus]    = useState<CardStatus>("idle");
  const [mixMasterData,      setMixMasterData]      = useState<MixMasterSessionData | null>(null);
  const [mixInstrumentalUrl, setMixInstrumentalUrl] = useState("");
  const [mixVocalUrl,        setMixVocalUrl]        = useState("");
  const [mixMasterFeel,      setMixMasterFeel]      = useState("Balanced");
  const [mixIncludeStems,    setMixIncludeStems]    = useState(false);
  const [stemStatus,         setStemStatus]         = useState<CardStatus>("idle");
  const [stemData,           setStemData]           = useState<StemExtractionSessionData | null>(null);
  const [stemMasteredUrl,    setStemMasteredUrl]    = useState("");
  const [selectedStems,      setSelectedStems]      = useState<string[]>([...ALL_STEMS]);
  const [blueprint,          setBlueprint]          = useState<Blueprint | null>(null);
  const [intelligence,       setIntelligence]       = useState<FullIntelligence | null>(null);
  const [sessionStartTime,   setSessionStartTime]   = useState<number | null>(null);

  const isInstrumentalMode = generationMode === "instrumental";
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
      } else if (mode === "hook-only") {
        setSectionMode("hook");
        setGenerationMode("full");
      } else if (mode === "afrobeats-demo") {
        setAudioGenre("Afrobeats");
        setGenerationMode("full");
        setSectionMode("full");
      } else {
        setGenerationMode("full");
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
      toast({ title: "Auto-sync on", description: "Lyrics will update whenever you generate from the Lyrics Studio above." });
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
      bounceStyle,
      melodyDensity,
      drumCharacter,
      hookLift,
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
      bounceStyle,
      melodyDensity,
      drumCharacter,
      hookLift,
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
    setSessionStartTime(Date.now());
    setInstrumentalStatus("idle");
    setBlueprintStatus("idle");
    setBlueprint(null);
    setIntelligence(null);
    void runInstrumental();
  };

  const handleGenerateVocal = () => {
    if (!validateForVocal()) return;
    setSessionStartTime(Date.now());
    setVocalStatus("idle");
    void runVocal();
  };

  const pollLeadVocalJob = useCallback(async (jobId: string) => {
    const MAX_POLLS = 30;
    let polls = 0;
    while (polls < MAX_POLLS) {
      await new Promise((r) => setTimeout(r, 2000));
      polls++;
      try {
        const res = await fetch(`/api/audio-job/${jobId}`);
        if (!res.ok) throw new Error("Poll failed");
        const data = await res.json() as {
          status: string;
          leadVocalSessionData?: LeadVocalSessionData;
          error?: string;
        };
        if (data.status === "completed") {
          setLeadVocalData(data.leadVocalSessionData ?? null);
          setLeadVocalStatus("success");
          return;
        }
        if (data.status === "failed") {
          setLeadVocalStatus("error");
          toast({ title: "Vocal generation failed", description: data.error ?? "Please try again.", variant: "destructive" });
          return;
        }
      } catch {
        setLeadVocalStatus("error");
        return;
      }
    }
    setLeadVocalStatus("error");
    toast({ title: "Request timed out", description: "The server took too long. Please try again.", variant: "destructive" });
  }, [toast]);

  const handleGenerateLeadVocals = async () => {
    if (!hasLyrics && !instrumentalUrl) {
      toast({ title: "Input required", description: "Add lyrics or an instrumental URL before generating vocals.", variant: "destructive" });
      return;
    }
    setLeadVocalStatus("loading");
    setLeadVocalData(null);
    try {
      const defaults    = getGenreDefaults(audioGenre);
      const resolvedBpm = bpm ? Number(bpm) : undefined;
      const resolvedKey = musicalKey || defaults.key;
      const res = await fetch("/api/generate-lead-vocals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyrics:          audioLyrics || undefined,
          instrumentalUrl: instrumentalUrl || undefined,
          gender:          vocalGender,
          performanceFeel: vocalStyle,
          vocalStyle,
          emotionalTone,
          buildMode:       leadVocalBuildMode,
          genre:           audioGenre,
          bpm:             resolvedBpm,
          key:             resolvedKey,
        }),
      });
      if (!res.ok) throw new Error("Failed to start lead vocal generation");
      const { jobId } = await res.json() as { jobId: string };
      await pollLeadVocalJob(jobId);
    } catch (err) {
      setLeadVocalStatus("error");
      toast({ title: "Generation failed", description: "Could not start lead vocal generation.", variant: "destructive" });
    }
  };

  const handleMixMaster = async () => {
    if (!mixInstrumentalUrl) {
      toast({ title: "Instrumental required", description: "Add an instrumental track URL to generate a mix & master brief.", variant: "destructive" });
      return;
    }
    setMixMasterStatus("loading");
    setMixMasterData(null);
    try {
      const defaults    = getGenreDefaults(audioGenre);
      const resolvedBpm = bpm ? Number(bpm) : undefined;
      const resolvedKey = musicalKey || defaults.key;
      const res = await fetch("/api/mix-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instrumentalUrl: mixInstrumentalUrl || undefined,
          vocalUrl:        mixVocalUrl || undefined,
          mixFeel:         mixMasterFeel,
          genre:           audioGenre,
          bpm:             resolvedBpm,
          key:             resolvedKey,
          includeStems:    mixIncludeStems,
        }),
      });
      if (!res.ok) throw new Error("Failed to start mix & master generation");
      const { jobId } = await res.json() as { jobId: string };
      const MAX_POLLS = 20;
      let polls = 0;
      while (polls < MAX_POLLS) {
        await new Promise((r) => setTimeout(r, 2500));
        polls++;
        try {
          const poll = await fetch(`/api/audio-job/${jobId}`);
          if (!poll.ok) throw new Error("Poll failed");
          const data = await poll.json() as {
            status: string;
            mixMasterSessionData?: MixMasterSessionData;
            error?: string;
          };
          if (data.status === "completed") {
            setMixMasterData(data.mixMasterSessionData ?? null);
            setMixMasterStatus("success");
            return;
          }
          if (data.status === "failed") {
            setMixMasterStatus("error");
            toast({ title: "Mix & master failed", description: data.error ?? "Please try again.", variant: "destructive" });
            return;
          }
        } catch {
          setMixMasterStatus("error");
          return;
        }
      }
      setMixMasterStatus("error");
      toast({ title: "Request timed out", description: "The server took too long. Please try again.", variant: "destructive" });
    } catch {
      setMixMasterStatus("error");
      toast({ title: "Generation failed", description: "Could not start mix & master generation.", variant: "destructive" });
    }
  };

  const handleExtractStems = async () => {
    if (!stemMasteredUrl) {
      toast({ title: "Track URL required", description: "Add the mastered track URL before extracting stems.", variant: "destructive" });
      return;
    }
    if (selectedStems.length === 0) {
      toast({ title: "Select stems", description: "Choose at least one stem to extract.", variant: "destructive" });
      return;
    }
    setStemStatus("loading");
    setStemData(null);
    try {
      const defaults    = getGenreDefaults(audioGenre);
      const resolvedBpm = bpm ? Number(bpm) : undefined;
      const resolvedKey = musicalKey || defaults.key;
      const res = await fetch("/api/extract-stems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masteredUrl: stemMasteredUrl,
          stems:       selectedStems,
          genre:       audioGenre,
          bpm:         resolvedBpm,
          key:         resolvedKey,
        }),
      });
      if (!res.ok) throw new Error("Failed to start stem extraction");
      const { jobId } = await res.json() as { jobId: string };
      const MAX_POLLS = 20;
      let polls = 0;
      while (polls < MAX_POLLS) {
        await new Promise((r) => setTimeout(r, 2500));
        polls++;
        try {
          const poll = await fetch(`/api/audio-job/${jobId}`);
          if (!poll.ok) throw new Error("Poll failed");
          const data = await poll.json() as {
            status: string;
            stemExtractionSessionData?: StemExtractionSessionData;
            error?: string;
          };
          if (data.status === "completed") {
            setStemData(data.stemExtractionSessionData ?? null);
            setStemStatus("success");
            return;
          }
          if (data.status === "failed") {
            setStemStatus("error");
            toast({ title: "Stem extraction failed", description: data.error ?? "Please try again.", variant: "destructive" });
            return;
          }
        } catch {
          setStemStatus("error");
          return;
        }
      }
      setStemStatus("error");
      toast({ title: "Request timed out", description: "The server took too long. Please try again.", variant: "destructive" });
    } catch {
      setStemStatus("error");
      toast({ title: "Generation failed", description: "Could not start stem extraction.", variant: "destructive" });
    }
  };

  const handleGenerateFull = () => {
    if (!isInstrumentalMode && !validateForVocal()) return;
    setSessionStartTime(Date.now());
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
      ...(blueprint.bounceStyle ? [
        ``, `— Beat DNA —`,
        `Bounce Style: ${blueprint.bounceStyle}`,
        `Melody Density: ${blueprint.melodyDensity}`,
        `Drum Character: ${blueprint.drumCharacter}`,
        `Hook Lift: ${blueprint.hookLift}`,
      ] : []),
      ``, `Producer Notes:`, blueprint.producerNotes,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      toast({ title: "Blueprint copied", description: "Audio blueprint copied to clipboard." });
    });
  };

  const hasAnyResult = instrumentalStatus === "success" || vocalStatus === "success" || blueprintStatus === "success" || leadVocalStatus === "success" || mixMasterStatus === "success" || stemStatus === "success";
  const isGenerating = instrumentalStatus === "loading" || vocalStatus === "loading" || leadVocalStatus === "loading" || mixMasterStatus === "loading" || stemStatus === "loading";
  const genreDefaults = getGenreDefaults(audioGenre);

  const masterExportReady = isInstrumentalMode
    ? instrumentalStatus === "success"
    : instrumentalStatus === "success" && vocalStatus === "success";

  const masterExportPipelineStatus: PipelineStage =
    masterExportReady ? "success"
    : (instrumentalStatus === "loading" || (!isInstrumentalMode && vocalStatus === "loading")) ? "processing"
    : (instrumentalStatus === "error" || vocalStatus === "error") ? "error"
    : "idle";

  const pipelineStages: PipelineStageConfig[] = [
    {
      label: "Instrumental",
      helper: "Building sonic direction",
      status: instrumentalStatus === "loading" ? "processing" : instrumentalStatus === "success" ? "success" : instrumentalStatus === "error" ? "error" : "idle",
    },
    {
      label: "Vocals",
      helper: "Preparing vocal performance",
      status: isInstrumentalMode ? "idle" : vocalStatus === "loading" ? "processing" : vocalStatus === "success" ? "success" : vocalStatus === "error" ? "error" : "idle",
      muted: isInstrumentalMode,
    },
    {
      label: "Blueprint",
      helper: "Mapping arrangement",
      status: blueprintStatus === "loading" ? "processing" : blueprintStatus === "success" ? "success" : blueprintStatus === "error" ? "error" : "idle",
    },
    {
      label: "Master Export",
      helper: "Preparing final render",
      status: masterExportPipelineStatus,
    },
  ];

  const pipelineVisible = sessionStartTime !== null;

  const sessionTitle = audioLyrics.trim()
    ? audioLyrics.trim().split("\n").find((l) => l.trim().length > 3 && !l.startsWith("["))?.trim().slice(0, 28) ?? "Untitled Session"
    : `${audioGenre} Session`;

  const modeLabel =
    generationMode === "full" ? "Full Session" :
    generationMode === "instrumental" ? "Instrumental Only" :
    "Vocal Demo Setup";

  const lastCompletedStage =
    masterExportReady ? "Master Export" :
    blueprintStatus === "success" ? "Blueprint" :
    vocalStatus === "success" ? "Vocals" :
    instrumentalStatus === "success" ? "Instrumental" :
    null;

  const BUILD_MODES = [
    {
      value: "full",
      label: "Full Session",
      description: "Beat preview + vocal direction",
      icon: <Zap className="w-4 h-4" />,
      activeClass: "bg-gradient-to-br from-amber-500/15 to-amber-600/5 border-amber-500/35 shadow-[0_0_20px_rgba(245,158,11,0.10)]",
      iconActive: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      iconIdle: "bg-white/4 border-white/8 text-white/25",
      labelActive: "text-amber-200",
      descActive: "text-amber-400/55",
      dotActive: "bg-amber-400",
    },
    {
      value: "instrumental",
      label: "Instrumental Only",
      description: "Build beat direction without vocals",
      icon: <Music2 className="w-4 h-4" />,
      activeClass: "bg-gradient-to-br from-sky-500/15 to-sky-600/5 border-sky-500/35 shadow-[0_0_20px_rgba(14,165,233,0.10)]",
      iconActive: "bg-sky-500/15 border-sky-500/30 text-sky-400",
      iconIdle: "bg-white/4 border-white/8 text-white/25",
      labelActive: "text-sky-200",
      descActive: "text-sky-400/55",
      dotActive: "bg-sky-400",
    },
    {
      value: "vocal",
      label: "Vocal Demo Setup",
      description: "Focus on topline / guide vocal direction",
      icon: <Mic2 className="w-4 h-4" />,
      activeClass: "bg-gradient-to-br from-violet-500/15 to-violet-600/5 border-violet-500/35 shadow-[0_0_20px_rgba(139,92,246,0.10)]",
      iconActive: "bg-violet-500/15 border-violet-500/30 text-violet-400",
      iconIdle: "bg-white/4 border-white/8 text-white/25",
      labelActive: "text-violet-200",
      descActive: "text-violet-400/55",
      dotActive: "bg-violet-400",
    },
  ];

  return (
    <section
      id="audio-studio-v2"
      className={`mt-14 rounded-3xl border bg-gradient-to-b from-[#080c15] via-[#07090f] to-[#060810] overflow-hidden transition-all duration-700 ${
        highlighted
          ? "border-sky-400/50 shadow-[0_0_80px_rgba(14,165,233,0.18),0_0_0_2px_rgba(14,165,233,0.12)]"
          : "border-sky-500/15 shadow-[0_0_80px_rgba(14,165,233,0.04)]"
      }`}
    >

      {/* ══════════════════════════════════════════
          PREMIUM HEADER
      ══════════════════════════════════════════ */}
      <div className="relative px-6 md:px-8 pt-7 pb-6 border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/7 via-transparent to-violet-500/4 pointer-events-none" />

        {/* Top row: title + mode toggle */}
        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/12 border border-sky-500/25 flex items-center justify-center shrink-0 mt-0.5">
              <Music2 className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <h2 className="text-2xl font-bold text-white tracking-tight">Audio Studio</h2>
                <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-sky-500/12 border border-sky-500/25 text-sky-400/80">V2</span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed max-w-lg">
                Shape your lyrics into a playable session — beat direction, vocal identity, and arrangement-ready output.
              </p>
            </div>
          </div>

          {/* Artist / Producer mode toggle */}
          <div className="shrink-0">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/30 border border-white/5 min-w-[200px]">
              <motion.button
                type="button" whileTap={{ scale: 0.98 }}
                onClick={() => setWorkflowMode("artist")}
                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                  workflowMode === "artist"
                    ? "bg-gradient-to-br from-amber-500/18 to-amber-600/8 border border-amber-500/30"
                    : "hover:bg-white/4 border border-transparent"
                }`}
              >
                <Headphones className={`w-3.5 h-3.5 shrink-0 ${workflowMode === "artist" ? "text-amber-400" : "text-white/30"}`} />
                <div className="text-left">
                  <div className={`text-[11px] font-bold transition-colors ${workflowMode === "artist" ? "text-amber-300" : "text-white/40"}`}>Artist</div>
                  <div className={`text-[9px] transition-colors ${workflowMode === "artist" ? "text-amber-400/50" : "text-white/18"}`}>Vibe-first</div>
                </div>
                {workflowMode === "artist" && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </motion.button>

              <motion.button
                type="button" whileTap={{ scale: 0.98 }}
                onClick={() => setWorkflowMode("producer")}
                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                  workflowMode === "producer"
                    ? "bg-gradient-to-br from-violet-500/18 to-violet-600/8 border border-violet-500/30"
                    : "hover:bg-white/4 border border-transparent"
                }`}
              >
                <Sliders className={`w-3.5 h-3.5 shrink-0 ${workflowMode === "producer" ? "text-violet-400" : "text-white/30"}`} />
                <div className="text-left">
                  <div className={`text-[11px] font-bold transition-colors ${workflowMode === "producer" ? "text-violet-300" : "text-white/40"}`}>Producer</div>
                  <div className={`text-[9px] transition-colors ${workflowMode === "producer" ? "text-violet-400/50" : "text-white/18"}`}>Studio-ready</div>
                </div>
                {workflowMode === "producer" && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-violet-400" />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Premium feature chip row */}
        <div className="relative flex flex-wrap gap-2">
          {[
            { label: "Session Builder",            color: "bg-sky-500/6 border-sky-500/14 text-sky-400/50" },
            { label: "Artist + Producer Workflow", color: "bg-violet-500/6 border-violet-500/12 text-violet-400/50" },
            { label: "Instrumental / Vocal Split", color: "bg-white/3 border-white/8 text-white/25" },
          ].map(({ label, color }) => (
            <span key={label} className={`text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border ${color}`}>{label}</span>
          ))}
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-7">

        {/* ══════════════════════════════════════════
            SECTION 1 — LYRICS SOURCE
        ══════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-5 h-5 rounded-md bg-sky-500/12 border border-sky-500/22 flex items-center justify-center shrink-0">
              <FileText className="w-3 h-3 text-sky-400" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/55">Lyrics Source</h3>
              <p className="text-[10px] text-white/25 mt-0.5">Choose what this session should be built from.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/6 bg-white/[0.018] overflow-hidden">
            {/* Source selector cards */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* A: Use Lyrics From Studio */}
              <motion.button
                type="button" whileTap={{ scale: 0.98 }}
                onClick={handleUseLyrics}
                className={`relative flex flex-col gap-1.5 p-3.5 rounded-xl border transition-all text-left ${
                  useGeneratedLyrics && audioLyrics
                    ? "bg-sky-500/10 border-sky-500/30 shadow-[0_0_16px_rgba(14,165,233,0.08)]"
                    : "bg-white/3 border-white/8 hover:border-sky-500/20 hover:bg-sky-500/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Radio className={`w-3.5 h-3.5 shrink-0 ${useGeneratedLyrics && audioLyrics ? "text-sky-400" : "text-white/30"}`} />
                  <span className={`text-xs font-bold ${useGeneratedLyrics && audioLyrics ? "text-sky-300" : "text-white/45"}`}>
                    {isProducer ? "From Lyrics Studio" : "Use Studio Lyrics"}
                  </span>
                  {useGeneratedLyrics && audioLyrics && (
                    <span className="ml-auto text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-400">Live</span>
                  )}
                </div>
                <p className={`text-[10px] leading-snug ${useGeneratedLyrics && audioLyrics ? "text-sky-400/50" : "text-white/20"}`}>
                  {isProducer ? "Pull and sync the lyric sheet from above" : "Pull lyrics from the Lyrics Studio above"}
                </p>
              </motion.button>

              {/* B: Use My Own Lyrics */}
              <motion.button
                type="button" whileTap={{ scale: 0.98 }}
                onClick={() => { setUseGeneratedLyrics(false); if (isInstrumentalMode) setGenerationMode("full"); }}
                className={`relative flex flex-col gap-1.5 p-3.5 rounded-xl border transition-all text-left ${
                  !useGeneratedLyrics && !isInstrumentalMode
                    ? "bg-amber-500/8 border-amber-500/25"
                    : "bg-white/3 border-white/8 hover:border-amber-500/18 hover:bg-amber-500/[0.03]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mic2 className={`w-3.5 h-3.5 shrink-0 ${!useGeneratedLyrics && !isInstrumentalMode ? "text-amber-400" : "text-white/30"}`} />
                  <span className={`text-xs font-bold ${!useGeneratedLyrics && !isInstrumentalMode ? "text-amber-300" : "text-white/45"}`}>
                    Use My Own Lyrics
                  </span>
                </div>
                <p className={`text-[10px] leading-snug ${!useGeneratedLyrics && !isInstrumentalMode ? "text-amber-400/50" : "text-white/20"}`}>
                  Paste or write custom lyrics directly into the session
                </p>
              </motion.button>

              {/* C: Instrumental-Only Setup */}
              <motion.button
                type="button" whileTap={{ scale: 0.98 }}
                onClick={() => setGenerationMode("instrumental")}
                className={`relative flex flex-col gap-1.5 p-3.5 rounded-xl border transition-all text-left ${
                  isInstrumentalMode
                    ? "bg-violet-500/10 border-violet-500/28 shadow-[0_0_16px_rgba(139,92,246,0.08)]"
                    : "bg-white/3 border-white/8 hover:border-violet-500/18 hover:bg-violet-500/[0.03]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Music2 className={`w-3.5 h-3.5 shrink-0 ${isInstrumentalMode ? "text-violet-400" : "text-white/30"}`} />
                  <span className={`text-xs font-bold ${isInstrumentalMode ? "text-violet-300" : "text-white/45"}`}>
                    Instrumental-Only Setup
                  </span>
                </div>
                <p className={`text-[10px] leading-snug ${isInstrumentalMode ? "text-violet-400/50" : "text-white/20"}`}>
                  Skip lyrics — build beat direction only, no vocal guide
                </p>
              </motion.button>
            </div>

            {/* Lyrics textarea */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/22">
                  {isProducer ? "Lyric Sheet" : "Lyrics"}
                </span>
                <div className="flex items-center gap-2">
                  {isInstrumentalMode && (
                    <span className="text-[10px] text-violet-400/55 font-medium">Optional in beat-only mode</span>
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
                rows={9}
                placeholder={
                  isInstrumentalMode
                    ? "Lyrics are optional in Instrumental-Only mode — skip if building beat only..."
                    : isProducer
                      ? "Drop the lyric sheet here with section labels — the engine will map your arrangement...\n\n[Intro]\n...\n\n[Verse 1]\n...\n\n[Chorus / Hook]\n...\n\n[Bridge]\n..."
                      : "Drop your full lyrics here, or write from scratch...\n\n[Intro]\n...\n\n[Verse 1]\n...\n\n[Chorus / Hook]\n...\n\n[Bridge]\n..."
                }
                className="w-full rounded-2xl bg-white/[0.025] border border-white/8 px-5 py-4 text-sm text-white placeholder:text-white/12 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/10 transition-all resize-none leading-relaxed font-mono"
              />
              {!draft && !audioLyrics && !isInstrumentalMode && (
                <p className="text-[11px] text-white/20 mt-2 leading-relaxed">
                  <span className="text-sky-400/60 font-medium">Tip:</span>{" "}
                  You can write in the Lyrics Studio above, then send it here instantly — or paste your own below.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 2 — SESSION IDENTITY
        ══════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-5 h-5 rounded-md bg-amber-500/12 border border-amber-500/22 flex items-center justify-center shrink-0">
              <Sliders className="w-3 h-3 text-amber-400" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/55">Session Identity</h3>
              <p className="text-[10px] text-white/25 mt-0.5">Define the musical direction before generation.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/6 bg-white/[0.018] overflow-hidden">
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

              {/* Genre */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Genre</label>
                <div className="relative">
                  <select value={audioGenre} onChange={(e) => setAudioGenre(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#0e0e1c] border border-white/8 px-3 pr-8 text-sm text-white appearance-none focus:outline-none focus:border-amber-500/40 transition-all cursor-pointer"
                  >
                    {AUDIO_GENRES.map((g) => <option key={g} value={g} className="bg-[#0e0e1c] text-white">{g}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                </div>
              </div>

              {/* Sound / Artist Direction */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">
                  {isProducer ? "Production Reference" : "Sound / Artist Direction"}
                </label>
                <input type="text" value={audioStyleReference} onChange={(e) => setAudioStyleReference(e.target.value)}
                  placeholder={
                    isProducer
                      ? "e.g. Timbaland arrangement style, Sarz drum pattern, Legendury Beatz chord movement..."
                      : "e.g. Burna Boy x Asake, Omah Lay type vibe, soulful church atmosphere..."
                  }
                  className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-all"
                />
              </div>

              {/* BPM + Key */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">BPM</label>
                  <input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)}
                    placeholder={genreDefaults.bpm.split("–")[0]} min={60} max={200}
                    className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Key</label>
                  <input type="text" value={musicalKey} onChange={(e) => setMusicalKey(e.target.value)}
                    placeholder={genreDefaults.key}
                    className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-all"
                  />
                </div>
              </div>

              {/* Energy + Atmosphere */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">
                  {isProducer ? "Energy Arc" : "Energy + Atmosphere"}
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

              {/* Song Scope */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">
                  {isProducer ? "Section Scope" : "Song Scope"}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SECTIONS.map((s) => (
                    <button key={s.value} type="button" onClick={() => setSectionMode(s.value)}
                      className={`h-8 rounded-lg text-xs font-semibold transition-all text-center ${
                        sectionMode === s.value
                          ? "bg-amber-500/12 border border-amber-500/28 text-amber-400"
                          : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                      }`}
                    >{s.label}</button>
                  ))}
                </div>
              </div>

              {/* Mix Feel */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">
                  Mix Feel
                  <span className="ml-2 text-[8px] normal-case tracking-normal font-normal text-white/18">production flavour</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {["Balanced", "Dry & Punchy", "Lush & Reverb-Heavy", "Lo-Fi Warmth", "Bright & Crisp", "Dark & Gritty", "Club-Ready"].map((feel) => (
                    <button key={feel} type="button" onClick={() => setMixFeel(feel)}
                      className={`h-7 px-3 rounded-xl text-[10px] font-semibold transition-all ${
                        mixFeel === feel
                          ? "bg-amber-500/15 border border-amber-500/35 text-amber-300"
                          : "bg-white/3 border border-white/6 text-white/30 hover:border-white/15 hover:text-white/55"
                      }`}
                    >{feel}</button>
                  ))}
                </div>
                <p className="text-[10px] text-white/18 mt-1.5 italic">Shapes the tonal and spatial direction of the session build</p>
              </div>

            </div>

            <div className="px-5 pb-4 border-t border-white/4 pt-3">
              <p className="text-[10px] text-white/18 italic leading-relaxed">
                Think like a producer: what should this record feel like in the room?
              </p>
            </div>

            {/* Producer Arrangement Detail (embedded) */}
            <AnimatePresence>
              {isProducer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mx-4 mb-4 rounded-xl border border-violet-500/15 bg-violet-500/[0.025] overflow-hidden">
                    <div className="px-4 py-3 border-b border-violet-500/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3 h-3 text-violet-400" />
                        <span className="text-[10px] font-bold tracking-widest uppercase text-violet-400/60">Arrangement Detail</span>
                      </div>
                      <span className="text-[9px] text-violet-400/35">Producer Mode only</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <ProducerSelect label="Intro Behavior"   value={introBehavior}   options={INTRO_BEHAVIORS}   onChange={setIntroBehavior} />
                      <ProducerSelect label="Chorus Lift"      value={chorusLift}      options={CHORUS_LIFTS}      onChange={setChorusLift} />
                      <ProducerSelect label="Drum Density"     value={drumDensity}     options={DRUM_DENSITIES}    onChange={setDrumDensity} />
                      <ProducerSelect label="Bass Weight"      value={bassWeight}      options={BASS_WEIGHTS}      onChange={setBassWeight} />
                      <ProducerSelect label="Transition Style" value={transitionStyle} options={TRANSITION_STYLES} onChange={setTransitionStyle} />
                      <ProducerSelect label="Outro Style"      value={outroStyle}      options={OUTRO_STYLES}      onChange={setOutroStyle} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Beat DNA ───────────────────────────────────────────── */}
            <div className="mx-4 mb-4 rounded-xl border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.03] to-transparent overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md bg-amber-500/15 flex items-center justify-center">
                    <Zap className="w-2.5 h-2.5 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400/70">Beat DNA</span>
                </div>
                <span className="text-[9px] text-amber-400/35 italic">shapes beat personality + prompt</span>
              </div>
              <div className="p-4 space-y-4">

                {/* Bounce Style */}
                <div>
                  <label className="block text-[9px] font-bold tracking-[0.14em] uppercase text-white/28 mb-2">
                    Bounce Style <span className="text-white/15 font-normal normal-case tracking-normal">groove motion</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {BEAT_DNA_BOUNCE_STYLES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setBounceStyle(v)}
                        className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold transition-all ${
                          bounceStyle === v
                            ? "bg-amber-500/18 border border-amber-500/40 text-amber-300"
                            : "bg-white/[0.03] border border-white/6 text-white/30 hover:border-white/14 hover:text-white/50"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Melody Density */}
                <div>
                  <label className="block text-[9px] font-bold tracking-[0.14em] uppercase text-white/28 mb-2">
                    Melody Density <span className="text-white/15 font-normal normal-case tracking-normal">melodic layer weight</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {BEAT_DNA_MELODY_DENSITIES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setMelodyDensity(v)}
                        className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold transition-all ${
                          melodyDensity === v
                            ? "bg-amber-500/18 border border-amber-500/40 text-amber-300"
                            : "bg-white/[0.03] border border-white/6 text-white/30 hover:border-white/14 hover:text-white/50"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drum Character + Hook Lift — side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold tracking-[0.14em] uppercase text-white/28 mb-2">
                      Drum Character <span className="text-white/15 font-normal normal-case tracking-normal">rhythm texture</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {BEAT_DNA_DRUM_CHARACTERS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setDrumCharacter(v)}
                          className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold transition-all ${
                            drumCharacter === v
                              ? "bg-amber-500/18 border border-amber-500/40 text-amber-300"
                              : "bg-white/[0.03] border border-white/6 text-white/30 hover:border-white/14 hover:text-white/50"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold tracking-[0.14em] uppercase text-white/28 mb-2">
                      Hook Lift <span className="text-white/15 font-normal normal-case tracking-normal">chorus payoff</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {BEAT_DNA_HOOK_LIFTS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setHookLift(v)}
                          className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold transition-all ${
                            hookLift === v
                              ? "bg-amber-500/18 border border-amber-500/40 text-amber-300"
                              : "bg-white/[0.03] border border-white/6 text-white/30 hover:border-white/14 hover:text-white/50"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 3 — LEAD VOCAL IDENTITY
        ══════════════════════════════════════════ */}
        <AnimatePresence>
          {!isInstrumentalMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-5 h-5 rounded-md bg-violet-500/12 border border-violet-500/22 flex items-center justify-center shrink-0">
                    <Mic2 className="w-3 h-3 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/55">Lead Vocal Identity</h3>
                    <p className="text-[10px] text-white/25 mt-0.5">Shape how the performance should feel.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/6 bg-white/[0.018] p-5 space-y-5">
                  {/* Lead Voice */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-2.5">Lead Voice</label>
                    <div className="grid grid-cols-4 gap-2">
                      {VOCAL_GENDERS.map((v) => (
                        <button key={v.value} type="button" onClick={() => setVocalGender(v.value)}
                          className={`h-9 rounded-xl text-xs font-semibold transition-all ${
                            vocalGender === v.value
                              ? "bg-violet-500/15 border border-violet-500/35 text-violet-300"
                              : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                          }`}
                        >{v.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Performance Feel */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-2.5">
                      Performance Feel
                      <span className="ml-2 text-[8px] normal-case tracking-normal font-normal text-white/18">session shaping</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {VOCAL_STYLES.map((style) => (
                        <button key={style} type="button" onClick={() => setVocalStyle(style)}
                          className={`h-8 px-3 rounded-xl text-xs font-semibold transition-all ${
                            vocalStyle === style
                              ? "bg-violet-500/15 border border-violet-500/35 text-violet-300"
                              : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                          }`}
                        >{style}</button>
                      ))}
                    </div>
                  </div>

                  {/* Emotional Tone */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-2.5">
                      Emotional Tone
                      <span className="ml-2 text-[8px] normal-case tracking-normal font-normal text-white/18">vocal colour</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {EMOTIONAL_TONES.map((tone) => (
                        <button key={tone} type="button" onClick={() => setEmotionalTone(tone)}
                          className={`h-8 px-3 rounded-xl text-xs font-semibold transition-all ${
                            emotionalTone === tone
                              ? "bg-pink-500/15 border border-pink-500/35 text-pink-300"
                              : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                          }`}
                        >{tone}</button>
                      ))}
                    </div>
                  </div>

                  {/* Instrumental Track URL */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-2.5">
                      Instrumental Track URL
                      <span className="ml-2 text-[8px] normal-case tracking-normal font-normal text-white/18">optional — for sync reference</span>
                    </label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-400/40 pointer-events-none" />
                      <input
                        type="url"
                        value={instrumentalUrl}
                        onChange={(e) => setInstrumentalUrl(e.target.value)}
                        placeholder="https://yourdrive.com/beat.mp3  or  SoundCloud / Drive link..."
                        className="w-full h-10 rounded-xl bg-white/4 border border-white/8 pl-9 pr-3 text-sm text-white placeholder:text-white/18 focus:outline-none focus:border-violet-500/40 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-white/15 mt-1.5 italic">Providing the track URL helps shape timing and sync notes in the vocal brief.</p>
                  </div>

                  {/* Build Mode for Lead Vocals */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-2.5">
                      Session Build Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {LEAD_VOCAL_BUILD_MODES.map((mode) => (
                        <button key={mode.value} type="button" onClick={() => setLeadVocalBuildMode(mode.value)}
                          className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition-all ${
                            leadVocalBuildMode === mode.value
                              ? "bg-violet-500/12 border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.08)]"
                              : "bg-white/3 border-white/6 hover:border-white/15"
                          }`}
                        >
                          <span className={`text-xs font-bold ${leadVocalBuildMode === mode.value ? "text-violet-300" : "text-white/40"}`}>
                            {mode.label}
                          </span>
                          <span className={`text-[9px] leading-snug ${leadVocalBuildMode === mode.value ? "text-violet-400/50" : "text-white/18"}`}>
                            {mode.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Lead Vocals CTA */}
                  <div className="pt-1 border-t border-violet-500/10">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      disabled={leadVocalStatus === "loading"}
                      onClick={() => void handleGenerateLeadVocals()}
                      className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all ${
                        leadVocalStatus === "loading"
                          ? "bg-violet-500/8 border border-violet-500/15 text-violet-400/40 cursor-not-allowed"
                          : "bg-gradient-to-r from-violet-600/25 to-violet-500/15 border border-violet-500/35 text-violet-300 hover:from-violet-600/35 hover:to-violet-500/22 hover:border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.12)]"
                      }`}
                    >
                      {leadVocalStatus === "loading" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-violet-400/60" />
                          <span>Generating Vocal Brief…</span>
                        </>
                      ) : (
                        <>
                          <Mic2 className="w-4 h-4" />
                          <span>Generate Lead Vocals</span>
                        </>
                      )}
                    </motion.button>
                    {leadVocalStatus === "success" && (
                      <p className="text-[10px] text-green-400/60 text-center mt-2 flex items-center justify-center gap-1">
                        <Check className="w-3 h-3" /> Vocal brief ready — scroll down to view
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════
            SECTION 3b — MIX & MASTER
        ══════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Headphones className="w-3 h-3 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/55">Mix &amp; Master</h3>
              <p className="text-[10px] text-white/25 mt-0.5">Generate a studio-grade mix and mastering brief for your track.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/12 bg-emerald-500/[0.022] p-5 space-y-5">
            {/* Instrumental URL */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-2.5">
                Instrumental Track URL
                <span className="ml-2 text-[8px] normal-case tracking-normal font-normal text-white/18">required</span>
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400/40 pointer-events-none" />
                <input
                  type="url"
                  value={mixInstrumentalUrl}
                  onChange={(e) => setMixInstrumentalUrl(e.target.value)}
                  placeholder="https://yourdrive.com/beat.mp3  or  SoundCloud / Drive link..."
                  className="w-full h-10 rounded-xl bg-white/4 border border-white/8 pl-9 pr-3 text-sm text-white placeholder:text-white/18 focus:outline-none focus:border-emerald-500/40 transition-all"
                />
              </div>
            </div>

            {/* Vocal URL (optional) */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-2.5">
                Vocal Track URL
                <span className="ml-2 text-[8px] normal-case tracking-normal font-normal text-white/18">optional</span>
              </label>
              <div className="relative">
                <Mic2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400/30 pointer-events-none" />
                <input
                  type="url"
                  value={mixVocalUrl}
                  onChange={(e) => setMixVocalUrl(e.target.value)}
                  placeholder="https://yourdrive.com/vocals.wav  — leave blank for instrumental-only mix"
                  className="w-full h-10 rounded-xl bg-white/4 border border-white/8 pl-9 pr-3 text-sm text-white placeholder:text-white/18 focus:outline-none focus:border-emerald-500/35 transition-all"
                />
              </div>
            </div>

            {/* Mix Feel */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-2.5">Mix Feel</label>
              <div className="flex flex-wrap gap-1.5">
                {MIX_FEEL_OPTIONS.map((feel) => (
                  <button key={feel} type="button" onClick={() => setMixMasterFeel(feel)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                      mixMasterFeel === feel
                        ? "bg-emerald-500/18 border border-emerald-500/40 text-emerald-300"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                    }`}
                  >{feel}</button>
                ))}
              </div>
            </div>

            {/* Include Stems toggle */}
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <button
                type="button"
                onClick={() => setMixIncludeStems(!mixIncludeStems)}
                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                  mixIncludeStems
                    ? "bg-emerald-500/20 border-emerald-500/50"
                    : "bg-white/4 border-white/12 hover:border-white/25"
                }`}
              >
                {mixIncludeStems && <Check className="w-2.5 h-2.5 text-emerald-400" />}
              </button>
              <div>
                <span className="text-xs text-white/45 group-hover:text-white/70 transition-colors font-medium block">Include Stems Export Guidance</span>
                <span className="text-[10px] text-white/20 leading-tight block mt-0.5">Adds DAW-ready stem groupings, naming, and export specs to the brief</span>
              </div>
            </label>

            {/* Generate CTA */}
            <div className="pt-1 border-t border-emerald-500/10">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={mixMasterStatus === "loading"}
                onClick={() => void handleMixMaster()}
                className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all ${
                  mixMasterStatus === "loading"
                    ? "bg-emerald-500/8 border border-emerald-500/15 text-emerald-400/40 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600/25 to-emerald-500/15 border border-emerald-500/35 text-emerald-300 hover:from-emerald-600/35 hover:to-emerald-500/22 hover:border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.10)]"
                }`}
              >
                {mixMasterStatus === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400/60" />
                    <span>Generating Mix Brief…</span>
                  </>
                ) : (
                  <>
                    <Headphones className="w-4 h-4" />
                    <span>Generate Mix &amp; Master Brief</span>
                  </>
                )}
              </motion.button>
              {mixMasterStatus === "success" && (
                <p className="text-[10px] text-green-400/60 text-center mt-2 flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> Mix brief ready — scroll down to view
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 3c — STEM EXTRACTION
        ══════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-5 h-5 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <Layers className="w-3 h-3 text-orange-400" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/55">Stem Extraction</h3>
              <p className="text-[10px] text-white/25 mt-0.5">Generate phase-aligned stem guidance for DAW-ready import.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-500/12 bg-orange-500/[0.018] p-5 space-y-5">
            {/* Mastered Track URL */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-2.5">
                Final Mix Track URL
                <span className="ml-2 text-[8px] normal-case tracking-normal font-normal text-white/18">required</span>
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-400/40 pointer-events-none" />
                <input
                  type="url"
                  value={stemMasteredUrl}
                  onChange={(e) => setStemMasteredUrl(e.target.value)}
                  placeholder="https://yourdrive.com/mastered-track.wav  or  SoundCloud / Drive link..."
                  className="w-full h-10 rounded-xl bg-white/4 border border-white/8 pl-9 pr-3 text-sm text-white placeholder:text-white/18 focus:outline-none focus:border-orange-500/35 transition-all"
                />
              </div>
            </div>

            {/* Stem selector */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-2.5">
                Stems to Extract
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_STEMS.map((stem) => {
                  const active = selectedStems.includes(stem);
                  const c = STEM_COLORS[stem];
                  return (
                    <button
                      key={stem}
                      type="button"
                      onClick={() => setSelectedStems(prev =>
                        prev.includes(stem) ? prev.filter(s => s !== stem) : [...prev, stem]
                      )}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all ${
                        active
                          ? `${c.bg} ${c.border} ${c.text}`
                          : "bg-white/3 border-white/6 text-white/30 hover:border-white/15 hover:text-white/50"
                      }`}
                    >
                      {active && <Check className="w-2.5 h-2.5" />}
                      {stem}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/15 mt-2 italic">All five stems selected by default — deselect any you don&apos;t need.</p>
            </div>

            {/* Generate CTA */}
            <div className="pt-1 border-t border-orange-500/10">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={stemStatus === "loading"}
                onClick={() => void handleExtractStems()}
                className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all ${
                  stemStatus === "loading"
                    ? "bg-orange-500/8 border border-orange-500/15 text-orange-400/40 cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-600/22 to-orange-500/12 border border-orange-500/32 text-orange-300 hover:from-orange-600/32 hover:to-orange-500/20 hover:border-orange-500/48 shadow-[0_0_20px_rgba(249,115,22,0.08)]"
                }`}
              >
                {stemStatus === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-orange-400/60" />
                    <span>Generating Stem Brief…</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Extract Stems</span>
                  </>
                )}
              </motion.button>
              {stemStatus === "success" && (
                <p className="text-[10px] text-green-400/60 text-center mt-2 flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> Stem guide ready — scroll down to view
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 4 — BUILD MODE
        ══════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-5 h-5 rounded-md bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-3 h-3 text-green-400" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/55">Build Mode</h3>
              <p className="text-[10px] text-white/25 mt-0.5">Choose what kind of session you want AfroMuse to prepare.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/6 bg-white/[0.018] p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BUILD_MODES.map((mode) => {
                const isActive = generationMode === mode.value;
                return (
                  <motion.button
                    key={mode.value}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setGenerationMode(mode.value)}
                    className={`relative flex items-start gap-3 p-4 rounded-xl border transition-all duration-300 text-left ${
                      isActive
                        ? mode.activeClass
                        : "bg-white/[0.02] border-white/6 hover:border-white/15 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                      isActive ? mode.iconActive : mode.iconIdle
                    }`}>
                      {mode.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold transition-colors mb-1 ${isActive ? mode.labelActive : "text-white/40"}`}>
                        {mode.label}
                      </div>
                      <div className={`text-[10px] leading-snug transition-colors ${isActive ? mode.descActive : "text-white/18"}`}>
                        {mode.description}
                      </div>
                    </div>
                    {isActive && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className={`absolute top-3 right-3 w-1.5 h-1.5 rounded-full ${mode.dotActive}`}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
            <p className="text-[10px] text-white/18 italic leading-relaxed px-1">
              Pick the fastest route to the version you need right now.
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 5 — SESSION OPTIONS
        ══════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Sliders className="w-3 h-3 text-white/35" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/40">Session Options</h3>
              <p className="text-[10px] text-white/20 mt-0.5">Fine-tune how this build should behave.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.012] p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {([
                {
                  id: "useLyrics",
                  label: isProducer ? "Auto-sync Lyric Sheet from Studio Above" : "Auto-sync Lyrics from Studio Above",
                  sub: "Lyrics update automatically when you generate",
                  checked: useGeneratedLyrics,
                  onToggle: handleToggleAutoLyrics,
                },
                {
                  id: "arrangement",
                  label: isProducer ? "Include Full Arrangement Script" : "Include Arrangement Guide",
                  sub: "Adds a detailed arrangement structure to the blueprint",
                  checked: includeArrangementNotes,
                  onToggle: (v: boolean) => setIncludeArrangementNotes(v),
                },
                {
                  id: "stems",
                  label: isProducer ? "Include Stems Export Map" : "Include Stems Breakdown",
                  sub: "Adds stem weight guidance to the session output",
                  checked: includeStemsBreakdown,
                  onToggle: (v: boolean) => setIncludeStemsBreakdown(v),
                },
                {
                  id: "hitmaker",
                  label: isProducer ? "Engineer Hook Priority — Coded for Replay" : "Hitmaker Hook Priority",
                  sub: "Optimises hook structure and replay value in this session",
                  checked: useHitmakerHookPriority,
                  onToggle: (v: boolean) => setUseHitmakerHookPriority(v),
                },
                {
                  id: "masteredExport",
                  label: isProducer ? "Generate Mastered Export Notes (Engineer)" : "Generate Mastered Export Notes",
                  sub: "Adds mastering chain guidance and export recommendations to your blueprint",
                  checked: generateMasteredExport,
                  onToggle: (v: boolean) => setGenerateMasteredExport(v),
                },
              ] as const).map(({ id, label, sub, checked, onToggle }) => (
                <label key={id} className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <button type="button" onClick={() => onToggle(!checked as never)}
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 mt-0.5 ${
                      checked ? "bg-sky-500/20 border-sky-500/45" : "bg-white/4 border-white/10 group-hover:border-white/22"
                    }`}
                  >
                    {checked && <Check className="w-2.5 h-2.5 text-sky-400" />}
                  </button>
                  <div>
                    <span className="text-xs text-white/45 group-hover:text-white/70 transition-colors select-none font-medium block">{label}</span>
                    <span className="text-[10px] text-white/20 group-hover:text-white/30 transition-colors select-none leading-tight block mt-0.5">{sub}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Instrumental-only notice ── */}
        <AnimatePresence>
          {isInstrumentalMode && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-3 rounded-2xl border border-sky-500/18 bg-sky-500/[0.05] px-5 py-3.5"
            >
              <Music2 className="w-4 h-4 text-sky-400 shrink-0" />
              <p className="text-xs text-sky-300/70 leading-relaxed">
                <span className="font-semibold text-sky-400">Instrumental-only mode is on.</span>{" "}
                Lyrics are optional and vocal generation is skipped — only the beat preview and session blueprint will run.
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
            {isProducer ? "Build Beat Structure" : "Build Beat Preview"}
          </motion.button>

          <motion.button type="button"
            whileHover={!isInstrumentalMode ? { scale: 1.01 } : {}}
            whileTap={!isInstrumentalMode ? { scale: 0.98 } : {}}
            onClick={handleGenerateVocal}
            disabled={isGenerating || isInstrumentalMode}
            title={isInstrumentalMode ? "Set Build Mode to Full Session or Vocal Demo Setup to generate a vocal guide" : undefined}
            className={`h-12 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
              isInstrumentalMode
                ? "bg-white/2 border border-white/5 text-white/18 cursor-not-allowed"
                : "bg-violet-500/8 border border-violet-500/18 text-violet-300/70 hover:bg-violet-500/14 hover:text-violet-200 hover:border-violet-500/30 disabled:opacity-40"
            }`}
          >
            <Mic2 className="w-4 h-4" />
            {isInstrumentalMode ? "Vocals Off" : isProducer ? "Build Vocal Blueprint" : "Build Vocal Demo"}
          </motion.button>

          <motion.button type="button" whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
            onClick={handleGenerateFull} disabled={isGenerating}
            className="h-12 rounded-xl bg-gradient-to-r from-amber-500/85 to-primary/85 text-sm font-bold text-black hover:from-amber-400 hover:to-primary shadow-[0_0_32px_rgba(245,158,11,0.20)] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Building...</>
              : <><Zap className="w-4 h-4" />{isProducer ? "Build Full Session" : "Build Session"}</>
            }
          </motion.button>
        </div>

        {/* ══════════════════════════════════════════
            SESSION PIPELINE STATUS BAR
        ══════════════════════════════════════════ */}
        <PipelineStatusBar stages={pipelineStages} visible={pipelineVisible} />

        {/* ══════════════════════════════════════════
            SESSION OUTPUT
        ══════════════════════════════════════════ */}
        <div>
          <div className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-white/22">Your Session Build</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <p className="text-center text-[10px] text-white/20 tracking-wide">Everything generated for this idea lives here.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Instrumental Preview */}
            <ResultCard
              title={isProducer ? "Beat Structure" : "Instrumental Preview"}
              subtitle="Your current beat direction and playback preview."
              icon={<Music2 className="w-3.5 h-3.5" />}
              status={instrumentalStatus}
              accent="sky"
              statusLabel="Groove Ready"
              emptyLabel="Generate a beat preview to define the sonic lane."
              emptySubLabel="Configure your genre, BPM, and energy above, then hit Build."
              loadingLabel="Shaping instrumental direction..."
            >
              <div className="space-y-4">
                {intelligence && (
                  <>
                    {/* Info chips row */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[9px] font-bold tracking-wide uppercase px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/18 text-sky-400/80">{audioGenre}</span>
                      {bpm && <span className="text-[9px] font-bold tracking-wide uppercase px-2 py-1 rounded-full bg-sky-500/8 border border-sky-500/14 text-sky-300/65">{bpm} BPM</span>}
                      {musicalKey && <span className="text-[9px] font-bold tracking-wide uppercase px-2 py-1 rounded-full bg-white/4 border border-white/8 text-white/38">{musicalKey}</span>}
                      <span className="text-[9px] font-bold tracking-wide uppercase px-2 py-1 rounded-full bg-white/4 border border-white/8 text-white/38">{energyLevel} Energy</span>
                    </div>

                    {/* Sonic Identity mini block */}
                    <div className="rounded-xl bg-sky-500/[0.035] border border-sky-500/10 px-3.5 py-3 space-y-2">
                      <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-sky-400/55">Sonic Identity</div>
                      {[
                        { label: "Core Bounce", value: intelligence.beatSummary.split(".")[0] },
                        { label: "Atmosphere",  value: intelligence.lyricsTone !== "neutral"
                            ? `${intelligence.lyricsTone.charAt(0).toUpperCase() + intelligence.lyricsTone.slice(1)} / ${energyLevel}`
                            : `${energyLevel} / ${audioGenre}` },
                        { label: "Main Texture", value: intelligence.stems.slice(0, 2).map(s => s.label).join(" + ") },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-baseline gap-2">
                          <span className="text-[8.5px] font-bold tracking-wide uppercase text-sky-400/38 shrink-0 w-24">{label}</span>
                          <span className="text-[9.5px] text-sky-300/60 leading-snug">{value}</span>
                        </div>
                      ))}
                    </div>

                    {isProducer ? (
                      <div className="rounded-xl bg-sky-500/[0.04] border border-sky-500/10 px-3.5 py-3">
                        <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-sky-400/50 mb-1.5">Arrangement Map</div>
                        <p className="text-[10px] text-sky-300/55 leading-relaxed">{intelligence.arrangementMap}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-white/45 leading-relaxed">{intelligence.beatSummary}</p>
                    )}
                    <div>
                      <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/20 mb-2.5">Stem Weights</div>
                      <div className="space-y-3">
                        {intelligence.stems.map((stem) => (
                          <div key={stem.label}>
                            <StemBar label={stem.label} color={stem.color} pct={stem.pct} />
                            <p className="text-[9px] text-white/25 mt-1 leading-relaxed pl-[calc(0.375rem+0.75rem+7rem)]">{stem.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {intelligence.styleInfluence !== "neutral" && intelligence.styleDesc && (
                      <div className="pt-2 border-t border-sky-500/8">
                        <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-sky-400/35 mb-1">Style Signal</div>
                        <p className="text-[10px] text-sky-400/55 leading-relaxed">{intelligence.styleDesc}</p>
                      </div>
                    )}

                    {/* Footer action row */}
                    <div className="pt-2 border-t border-sky-500/8 space-y-2">
                      <p className="text-[9px] text-white/18 italic">Preview playback for session direction only.</p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => toast({ title: "Session Notes", description: "Full notes available in the Studio Export Notes below." })}
                          className="flex-1 h-7 rounded-lg bg-sky-500/8 border border-sky-500/14 text-[9px] font-semibold text-sky-400/60 hover:text-sky-400/90 hover:border-sky-500/28 transition-all flex items-center justify-center gap-1"
                        >
                          <FileText className="w-2.5 h-2.5" /> Session Notes
                        </button>
                        <button
                          onClick={() => toast({ title: "WAV Export Preparing", description: "WAV export is in development. MP3 preview is available via the player above." })}
                          className="flex-1 h-7 rounded-lg bg-white/4 border border-white/8 text-[9px] font-semibold text-white/28 hover:text-white/50 hover:border-white/14 transition-all flex items-center justify-center gap-1"
                        >
                          <Clock className="w-2.5 h-2.5" /> WAV Preparing
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ResultCard>

            {/* Vocal Direction Preview */}
            <ResultCard
              title={isProducer ? "Vocal Blueprint" : "Vocal Direction Preview"}
              subtitle="A guide render for vocal feel, tone, and delivery."
              icon={<Mic2 className="w-3.5 h-3.5" />}
              status={vocalStatus}
              accent="violet"
              statusLabel="Vocal Direction"
              emptyLabel="Build vocal direction once your session setup is ready."
              emptySubLabel="Set your lead vocal identity, then hit Generate."
              loadingLabel="Rendering vocal feel..."
              muted={isInstrumentalMode}
              mutedLabel="Vocal direction is currently off for this session."
            >
              <div className="space-y-4">
                {intelligence && (
                  <>
                    {/* Header chips */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[9px] font-bold tracking-wide uppercase px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/18 text-violet-400/80">
                        {VOCAL_GENDERS.find((v) => v.value === vocalGender)?.label}
                      </span>
                      <span className="text-[9px] font-bold tracking-wide uppercase px-2 py-1 rounded-full bg-violet-500/8 border border-violet-500/14 text-violet-300/60">
                        {vocalStyle}
                      </span>
                      <span className="text-[9px] font-bold tracking-wide uppercase px-2 py-1 rounded-full bg-white/4 border border-white/8 text-white/35">
                        {GENERATION_MODES.find(m => m.value === generationMode)?.label ?? "Full Session"}
                      </span>
                    </div>

                    {/* Vocal Identity mini block */}
                    <div className="rounded-xl bg-violet-500/[0.035] border border-violet-500/10 px-3.5 py-3 space-y-2">
                      <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-violet-400/55">Vocal Identity</div>
                      {[
                        {
                          label: "Lead Type",
                          value: `${VOCAL_GENDERS.find((v) => v.value === vocalGender)?.label ?? "Lead"} Lead`,
                        },
                        {
                          label: "Delivery Style",
                          value: `${vocalStyle}${intelligence.lyricsTone !== "neutral" ? " + " + intelligence.lyricsTone.charAt(0).toUpperCase() + intelligence.lyricsTone.slice(1) : ""}`,
                        },
                        {
                          label: "Emotional Tone",
                          value: intelligence.lyricsTone !== "neutral"
                            ? ({
                                romantic:    "Late-night / Romantic / Tender",
                                spiritual:   "Uplifting / Soulful / Spiritual",
                                reflective:  "Introspective / Tender / Quiet ache",
                                energetic:   "High energy / Bold / Peak moment",
                                melancholic: "Sorrowful / Deep / Aching",
                                celebratory: "Joy / Rise / Anthemic warmth",
                              } as Record<string, string>)[intelligence.lyricsTone] ?? `${intelligence.lyricsTone} feel`
                            : `${audioGenre} feel / Session tone`,
                        },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-baseline gap-2">
                          <span className="text-[8.5px] font-bold tracking-wide uppercase text-violet-400/38 shrink-0 w-24">{label}</span>
                          <span className="text-[9.5px] text-violet-300/58 leading-snug">{value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl bg-violet-500/[0.04] border border-violet-500/10 px-3.5 py-3">
                      <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-violet-400/50 mb-1">
                        {isProducer ? "Vocal Architecture" : "Vocal Setup"}
                      </div>
                      <p className="text-[10px] text-violet-300/65 leading-snug">
                        {VOCAL_GENDERS.find((v) => v.value === vocalGender)?.label} delivery —{" "}
                        {intelligence.exportNotes?.artist?.items.find((i) => i.label === "Vocal Delivery Summary")?.value.split("—")[1]?.trim().split(".")[0] ?? audioGenre + " style"}
                      </p>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/20 mb-2.5">Vocal Sections</div>
                      <div className="space-y-3">
                        {intelligence.vocalSections.map(({ label, note, color }) => (
                          <div key={label} className="flex items-start gap-2.5">
                            <div className="w-1 h-1 rounded-full bg-violet-400/40 mt-[7px] shrink-0" />
                            <div>
                              <span className={`text-[10px] font-semibold block mb-0.5 ${color}`}>{label}</span>
                              <p className="text-[10px] text-white/28 leading-relaxed">{note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer helper */}
                    <p className="text-[9px] text-white/16 italic pt-1.5 border-t border-violet-500/8">
                      Guide playback to shape vocal direction.
                    </p>
                  </>
                )}
              </div>
            </ResultCard>

            {/* Arrangement Blueprint */}
            <ResultCard
              title="Arrangement Blueprint"
              subtitle="A structure-first map for building or recording the session."
              icon={<Wand2 className="w-3.5 h-3.5" />}
              status={blueprintStatus}
              accent="amber"
              statusLabel="Blueprint Locked"
              emptyLabel="Create an arrangement map for recording and production."
              emptySubLabel="Generate a beat preview first to unlock the full session plan."
              loadingLabel="Mapping session structure..."
            >
              {blueprint && (
                <div className="space-y-3.5">
                  {/* Session specs grid */}
                  <div>
                    <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/20 mb-2">Session Specs</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "BPM",    value: blueprint.bpm,    color: "text-amber-400" },
                        { label: "Key",    value: blueprint.key,    color: "text-sky-400" },
                        { label: "Genre",  value: blueprint.genre,  color: "text-violet-400" },
                        { label: "Energy", value: blueprint.energy, color: "text-green-400" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-lg bg-white/[0.025] border border-white/[0.045] px-3 py-2">
                          <div className="text-[8px] font-bold tracking-[0.14em] uppercase text-white/22 mb-0.5">{label}</div>
                          <div className={`text-xs font-bold ${color}`}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      <div className="rounded-lg bg-white/[0.025] border border-white/[0.045] px-3 py-2">
                        <div className="text-[8px] font-bold tracking-[0.14em] uppercase text-white/22 mb-0.5">Vocal</div>
                        <div className="text-xs font-bold text-white/65">{blueprint.vocalType}</div>
                      </div>
                      <div className="rounded-lg bg-amber-500/[0.05] border border-amber-500/12 px-3 py-2">
                        <div className="text-[8px] font-bold tracking-[0.14em] uppercase text-amber-400/50 mb-0.5">Hook Focus</div>
                        <div className="text-[10px] font-semibold text-amber-300/75 leading-tight">{blueprint.hookFocus.split(".")[0]}</div>
                      </div>
                    </div>
                  </div>

                  {/* Build Notes mini panel */}
                  <div className="rounded-xl bg-amber-500/[0.035] border border-amber-500/10 px-3.5 py-3 space-y-2">
                    <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-amber-400/55">Build Notes</div>
                    {[
                      {
                        label: "Suggested Lift",
                        value: blueprint.introBehavior ?? blueprint.chorusLift ?? "First Chorus Entry",
                      },
                      {
                        label: "Best Chorus",
                        value: blueprint.hookFocus.split(".")[0] ?? "Hook Repeat 2",
                      },
                      {
                        label: "Recording Focus",
                        value: intelligence?.producerNotes?.split(".")[0] ?? "Tight emotional lead with open ad-libs",
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-baseline gap-2">
                        <span className="text-[8.5px] font-bold tracking-wide uppercase text-amber-400/38 shrink-0 w-24">{label}</span>
                        <span className="text-[9.5px] text-amber-300/58 leading-snug">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.045] px-3.5 py-3">
                    <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/22 mb-1.5">Arrangement Style</div>
                    <p className="text-[11px] text-white/45 leading-relaxed">{blueprint.arrangementStyle}</p>
                  </div>

                  {isProducer && blueprint.drumDensity && (
                    <div>
                      <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-violet-400/30 mb-2">Engineering Specs</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: "Drums",      value: blueprint.drumDensity },
                          { label: "Bass",       value: blueprint.bassWeight ?? "" },
                          { label: "Transition", value: blueprint.transitionStyle ?? "" },
                          { label: "Outro",      value: blueprint.outroStyle ?? "" },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-lg bg-violet-500/[0.035] border border-violet-500/10 px-3 py-1.5">
                            <div className="text-[8px] font-bold tracking-[0.14em] uppercase text-violet-400/38 mb-0.5">{label}</div>
                            <div className="text-[10px] font-semibold text-violet-300/65">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {intelligence && (intelligence.lyricsTone !== "neutral" || intelligence.styleInfluence !== "neutral") && (
                    <div className="flex flex-wrap gap-1.5">
                      {intelligence.lyricsTone !== "neutral" && (
                        <span className="text-[8px] font-bold tracking-[0.1em] uppercase px-2 py-1 rounded-full bg-white/4 border border-white/8 text-white/32">
                          Tone · {intelligence.lyricsTone}
                        </span>
                      )}
                      {intelligence.styleInfluence !== "neutral" && (
                        <span className="text-[8px] font-bold tracking-[0.1em] uppercase px-2 py-1 rounded-full bg-amber-500/8 border border-amber-500/15 text-amber-400/55">
                          Style · {intelligence.styleInfluence.replace("-", " ")}
                        </span>
                      )}
                    </div>
                  )}

                  <button onClick={copyBlueprint}
                    className="w-full h-8 rounded-lg bg-white/3 border border-white/6 text-[10px] font-semibold text-white/35 hover:text-white/65 hover:border-white/12 hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3 h-3" /> Copy Blueprint
                  </button>

                  {/* Session use footer */}
                  <div className="pt-1 border-t border-amber-500/8">
                    <div className="text-[8.5px] font-bold tracking-[0.12em] uppercase text-white/18 mb-1.5">Useful for</div>
                    <div className="flex flex-wrap gap-1">
                      {["Beat planning", "Vocal recording prep", "Arrangement reference"].map((use) => (
                        <span key={use} className="text-[8px] px-2 py-0.5 rounded-full bg-amber-500/6 border border-amber-500/10 text-amber-400/40">{use}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </ResultCard>

          </div>
        </div>

        {/* ══════════════════════════════════════════
            LEAD VOCAL RESULT PANEL
        ══════════════════════════════════════════ */}
        <AnimatePresence>
          {(leadVocalStatus === "loading" || leadVocalStatus === "success" || leadVocalStatus === "error") && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4 }}
              className={`rounded-3xl border overflow-hidden ${
                leadVocalStatus === "success"
                  ? "border-pink-500/20 bg-gradient-to-b from-pink-500/[0.04] via-violet-500/[0.02] to-transparent"
                  : leadVocalStatus === "loading"
                  ? "border-violet-500/15 bg-violet-500/[0.02]"
                  : "border-red-500/15 bg-red-500/[0.02]"
              }`}
            >
              {/* Top accent bar */}
              {leadVocalStatus === "success" && (
                <div className="h-[2px] w-full bg-gradient-to-r from-pink-500/40 via-violet-500/40 to-pink-500/10" />
              )}

              {/* Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    leadVocalStatus === "success" ? "bg-pink-500/14 border-pink-500/25"
                    : leadVocalStatus === "loading" ? "bg-violet-500/10 border-violet-500/20"
                    : "bg-red-500/10 border-red-500/20"
                  }`}>
                    {leadVocalStatus === "loading" ? (
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400/70" />
                    ) : leadVocalStatus === "success" ? (
                      <Mic2 className="w-4 h-4 text-pink-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-white/60">Lead Vocal Brief</div>
                    <div className="text-[9px] text-white/25 mt-0.5">
                      {leadVocalStatus === "loading"
                        ? "AI vocal director is writing your session brief…"
                        : leadVocalStatus === "success"
                        ? `${vocalGender.charAt(0).toUpperCase() + vocalGender.slice(1)} lead · ${vocalStyle} · ${emotionalTone}`
                        : "Generation failed — please try again"}
                    </div>
                  </div>
                </div>
                {leadVocalStatus === "success" && (
                  <span className="text-[8px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/22 text-pink-400/80">
                    Vocal Ready
                  </span>
                )}
                {leadVocalStatus === "loading" && (
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="w-1 h-1 rounded-full bg-violet-400/50"
                        animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.22 }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Loading state */}
              {leadVocalStatus === "loading" && (
                <div className="px-6 py-10 text-center">
                  <div className="relative w-12 h-12 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-[2px] border-white/4 border-t-violet-400/80 animate-[spin_1.2s_linear_infinite]" />
                    <div className="absolute inset-[3px] rounded-full border-[2px] border-white/3 border-b-violet-300/40 animate-[spin_2s_linear_infinite_reverse]" />
                    <div className="absolute inset-[7px] rounded-full border-[2px] border-white/[0.06] border-t-violet-500/30 animate-[spin_3.5s_linear_infinite]" />
                  </div>
                  <p className="text-xs font-semibold text-violet-400/70 animate-pulse">Building your vocal session brief…</p>
                  <p className="text-[10px] text-white/20 mt-1.5">Phrasing · Sync · Emotional arc · Studio direction</p>
                </div>
              )}

              {/* Error state */}
              {leadVocalStatus === "error" && (
                <div className="px-6 py-10 text-center">
                  <AlertCircle className="w-8 h-8 text-red-400/50 mx-auto mb-3" />
                  <p className="text-xs text-red-400/60 font-medium">Vocal brief generation failed</p>
                  <p className="text-[10px] text-white/20 mt-1">Check your connection and try again.</p>
                  <button
                    onClick={() => void handleGenerateLeadVocals()}
                    className="mt-4 h-8 px-4 rounded-xl bg-white/4 border border-white/8 text-[10px] font-semibold text-white/40 hover:text-white/70 hover:border-white/14 transition-all"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Success state */}
              {leadVocalStatus === "success" && leadVocalData && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Vocal Brief headline */}
                  <div className="md:col-span-2 rounded-2xl bg-gradient-to-r from-pink-500/[0.06] to-violet-500/[0.04] border border-pink-500/14 px-5 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-3.5 h-3.5 text-pink-400/70" />
                      <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-pink-400/60">Vocal Brief</div>
                    </div>
                    <p className="text-sm font-semibold text-white/75 leading-relaxed">{leadVocalData.vocalBrief}</p>
                  </div>

                  {/* Phrasing Guide */}
                  <div className="rounded-xl border border-violet-500/12 bg-violet-500/[0.03] px-4 py-3.5 space-y-1.5">
                    <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-violet-400/55 flex items-center gap-1.5">
                      <Mic2 className="w-3 h-3" /> Phrasing Guide
                    </div>
                    <p className="text-[10.5px] text-violet-300/65 leading-relaxed">{leadVocalData.phrasingGuide}</p>
                  </div>

                  {/* Emotional Arc */}
                  <div className="rounded-xl border border-pink-500/12 bg-pink-500/[0.03] px-4 py-3.5 space-y-1.5">
                    <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-pink-400/55 flex items-center gap-1.5">
                      <Heart className="w-3 h-3" /> Emotional Arc
                    </div>
                    <p className="text-[10.5px] text-pink-300/60 leading-relaxed">{leadVocalData.emotionalArc}</p>
                  </div>

                  {/* Sync Notes */}
                  <div className="rounded-xl border border-sky-500/12 bg-sky-500/[0.025] px-4 py-3.5 space-y-1.5">
                    <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-sky-400/55 flex items-center gap-1.5">
                      <Music2 className="w-3 h-3" /> Sync Notes
                    </div>
                    <p className="text-[10.5px] text-sky-300/60 leading-relaxed">{leadVocalData.syncNotes}</p>
                  </div>

                  {/* Performance Direction */}
                  <div className="rounded-xl border border-amber-500/12 bg-amber-500/[0.025] px-4 py-3.5 space-y-1.5">
                    <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-amber-400/55 flex items-center gap-1.5">
                      <Headphones className="w-3 h-3" /> Performance Direction
                    </div>
                    <p className="text-[10.5px] text-amber-300/60 leading-relaxed">{leadVocalData.performanceDirection}</p>
                  </div>

                  {/* Delivery Style */}
                  <div className="rounded-xl border border-green-500/12 bg-green-500/[0.025] px-4 py-3.5 space-y-1.5">
                    <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-green-400/55 flex items-center gap-1.5">
                      <Mic2 className="w-3 h-3" /> Delivery Style
                    </div>
                    <p className="text-[10.5px] text-green-300/60 leading-relaxed">{leadVocalData.deliveryStyle}</p>
                  </div>

                  {/* Vocal Processing Notes */}
                  <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5 space-y-1.5">
                    <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/35 flex items-center gap-1.5">
                      <Cpu className="w-3 h-3" /> Vocal Processing
                    </div>
                    <p className="text-[10.5px] text-white/45 leading-relaxed">{leadVocalData.vocalProcessingNotes}</p>
                  </div>

                  {/* Copy all button */}
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      onClick={() => {
                        if (!leadVocalData) return;
                        const text = [
                          `LEAD VOCAL BRIEF`,
                          `================`,
                          ``,
                          `Vocal Brief: ${leadVocalData.vocalBrief}`,
                          ``,
                          `Phrasing Guide:\n${leadVocalData.phrasingGuide}`,
                          ``,
                          `Emotional Arc:\n${leadVocalData.emotionalArc}`,
                          ``,
                          `Sync Notes:\n${leadVocalData.syncNotes}`,
                          ``,
                          `Performance Direction:\n${leadVocalData.performanceDirection}`,
                          ``,
                          `Delivery Style:\n${leadVocalData.deliveryStyle}`,
                          ``,
                          `Vocal Processing Notes:\n${leadVocalData.vocalProcessingNotes}`,
                        ].join("\n");
                        navigator.clipboard.writeText(text).then(
                          () => toast({ title: "Vocal brief copied", description: "Ready to paste into your session notes." }),
                          () => toast({ title: "Copy failed", variant: "destructive" }),
                        );
                      }}
                      className="h-8 px-4 rounded-xl bg-pink-500/10 border border-pink-500/22 text-[10px] font-semibold text-pink-400/80 hover:bg-pink-500/16 hover:text-pink-300 transition-all flex items-center gap-1.5"
                    >
                      <Copy className="w-3 h-3" /> Copy Full Brief
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Mix & Master Result Panel ── */}
        <AnimatePresence>
          {(mixMasterStatus === "loading" || mixMasterStatus === "success" || mixMasterStatus === "error") && (
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: mixMasterStatus === "success" ? "rgba(16,185,129,0.22)" : mixMasterStatus === "loading" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)" }}
            >
              {/* header bar */}
              <div className={`px-5 py-3.5 flex items-center justify-between border-b ${
                mixMasterStatus === "success" ? "bg-emerald-500/[0.07] border-emerald-500/18"
                : mixMasterStatus === "loading" ? "bg-emerald-500/[0.04] border-emerald-500/10"
                : "bg-red-500/[0.04] border-red-500/10"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    mixMasterStatus === "success" ? "bg-emerald-500/18 border border-emerald-500/30 text-emerald-400"
                    : mixMasterStatus === "loading" ? "bg-emerald-500/10 border border-emerald-500/18 text-emerald-400/50"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                  }`}>
                    <Headphones className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white/75">Mix &amp; Master Brief</div>
                    <div className="text-[9px] text-white/30 mt-0.5">
                      {mixMasterStatus === "loading" ? "AfroMuse Mix Intelligence is analysing your session…"
                      : mixMasterStatus === "success" ? "Commercial-ready mix and mastering guide"
                      : "Mix brief generation encountered an error"}
                    </div>
                  </div>
                </div>
                {mixMasterStatus === "success" && <span className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-emerald-400/80">Ready</span>}
                {mixMasterStatus === "loading" && <Loader2 className="w-4 h-4 animate-spin text-emerald-400/50" />}
              </div>

              {/* loading shimmer */}
              {mixMasterStatus === "loading" && (
                <div className="px-5 py-6 space-y-3 bg-emerald-500/[0.015]">
                  {["w-4/5", "w-3/4", "w-5/6", "w-2/3"].map((w, i) => (
                    <div key={i} className={`h-2.5 ${w} rounded-full bg-emerald-500/10 animate-pulse`} style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
              )}

              {/* error */}
              {mixMasterStatus === "error" && (
                <div className="px-5 py-5 flex items-start gap-3 bg-red-500/[0.03]">
                  <AlertCircle className="w-4 h-4 text-red-400/70 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-300/60 leading-relaxed">Mix brief generation failed. Check your track URL and try again.</p>
                </div>
              )}

              {/* result body */}
              {mixMasterStatus === "success" && mixMasterData && (
                <div className="px-5 py-5 space-y-4 bg-emerald-500/[0.018]">
                  {/* Mix Brief headline */}
                  <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 px-4 py-3.5">
                    <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-emerald-400/55 mb-2">Mix Vision</div>
                    <p className="text-sm font-semibold text-white/75 leading-relaxed">{mixMasterData.mixBrief}</p>
                  </div>

                  {/* Detail rows */}
                  {([
                    { label: "Level Balancing", value: mixMasterData.levelBalancing,   bg: "bg-emerald-500/[0.03] border-emerald-500/10", hd: "text-emerald-400/55", tx: "text-emerald-300/60" },
                    { label: "EQ Notes",         value: mixMasterData.eqNotes,          bg: "bg-teal-500/[0.03] border-teal-500/10",     hd: "text-teal-400/55",    tx: "text-teal-300/60"    },
                    { label: "Compression",      value: mixMasterData.compressionNotes, bg: "bg-cyan-500/[0.03] border-cyan-500/10",     hd: "text-cyan-400/55",    tx: "text-cyan-300/60"    },
                    { label: "Spatial & FX",     value: mixMasterData.spatialEffects,   bg: "bg-sky-500/[0.03] border-sky-500/10",       hd: "text-sky-400/55",     tx: "text-sky-300/60"     },
                    { label: "Mastering Chain",  value: mixMasterData.masteringChain,   bg: "bg-violet-500/[0.03] border-violet-500/10", hd: "text-violet-400/55",  tx: "text-violet-300/60"  },
                    { label: "Output Specs",     value: mixMasterData.outputNotes,      bg: "bg-amber-500/[0.03] border-amber-500/10",   hd: "text-amber-400/55",   tx: "text-amber-300/60"   },
                    ...(mixMasterData.stemsNotes ? [{ label: "Stems Export", value: mixMasterData.stemsNotes, bg: "bg-pink-500/[0.03] border-pink-500/10", hd: "text-pink-400/55", tx: "text-pink-300/60" }] : []),
                  ] as { label: string; value: string; bg: string; hd: string; tx: string }[]).map(({ label, value, bg, hd, tx }) => (
                    <div key={label} className={`rounded-xl border px-4 py-3.5 ${bg}`}>
                      <div className={`text-[9px] font-bold tracking-[0.14em] uppercase mb-1.5 ${hd}`}>{label}</div>
                      <p className={`text-[10.5px] leading-relaxed ${tx}`}>{value}</p>
                    </div>
                  ))}

                  {/* Download buttons + Copy */}
                  <div className="pt-2 border-t border-emerald-500/10 flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toast({ title: "MP3 Preview Available", description: "Mastered MP3 export is in development. Use the instrumental player to download your preview." })}
                        className="h-8 px-4 rounded-xl bg-emerald-500/8 border border-emerald-500/18 text-[10px] font-semibold text-emerald-400/70 hover:bg-emerald-500/14 hover:text-emerald-300 transition-all flex items-center gap-1.5"
                      >
                        <Download className="w-3 h-3" /> MP3
                      </button>
                      <button
                        type="button"
                        onClick={() => toast({ title: "WAV Export Preparing", description: "WAV export is being prepared. Your session is master-ready — the export engine is next." })}
                        className="h-8 px-4 rounded-xl bg-emerald-500/8 border border-emerald-500/18 text-[10px] font-semibold text-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-400/70 transition-all flex items-center gap-1.5"
                      >
                        <Clock className="w-3 h-3" /> WAV
                      </button>
                      {mixMasterData.stemsNotes && (
                        <button
                          type="button"
                          onClick={() => toast({ title: "Stems Export — In Development", description: "Stems export is being built. Your session brief is structured and ready." })}
                          className="h-8 px-4 rounded-xl bg-white/4 border border-white/8 text-[10px] font-semibold text-white/30 hover:text-white/50 hover:border-white/14 transition-all flex items-center gap-1.5"
                        >
                          <Clock className="w-3 h-3" /> Stems
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!mixMasterData) return;
                        const text = [
                          `MIX & MASTER BRIEF`,
                          ``,
                          `Mix Vision: ${mixMasterData.mixBrief}`,
                          ``,
                          `Level Balancing:\n${mixMasterData.levelBalancing}`,
                          ``,
                          `EQ Notes:\n${mixMasterData.eqNotes}`,
                          ``,
                          `Compression:\n${mixMasterData.compressionNotes}`,
                          ``,
                          `Spatial & FX:\n${mixMasterData.spatialEffects}`,
                          ``,
                          `Mastering Chain:\n${mixMasterData.masteringChain}`,
                          ``,
                          `Output Specs:\n${mixMasterData.outputNotes}`,
                          ...(mixMasterData.stemsNotes ? [``, `Stems Export:\n${mixMasterData.stemsNotes}`] : []),
                        ].join("\n");
                        navigator.clipboard.writeText(text).then(
                          () => toast({ title: "Mix brief copied", description: "Ready to paste into your session notes or engineer's inbox." }),
                          () => toast({ title: "Copy failed", variant: "destructive" }),
                        );
                      }}
                      className="h-8 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/22 text-[10px] font-semibold text-emerald-400/80 hover:bg-emerald-500/16 hover:text-emerald-300 transition-all flex items-center gap-1.5"
                    >
                      <Copy className="w-3 h-3" /> Copy Full Brief
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stem Extraction Result Panel ── */}
        <AnimatePresence>
          {(stemStatus === "loading" || stemStatus === "success" || stemStatus === "error") && (
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: stemStatus === "success" ? "rgba(249,115,22,0.22)" : stemStatus === "loading" ? "rgba(249,115,22,0.15)" : "rgba(239,68,68,0.15)" }}
            >
              {/* header */}
              <div className={`px-5 py-3.5 flex items-center justify-between border-b ${
                stemStatus === "success" ? "bg-orange-500/[0.07] border-orange-500/18"
                : stemStatus === "loading" ? "bg-orange-500/[0.04] border-orange-500/10"
                : "bg-red-500/[0.04] border-red-500/10"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    stemStatus === "success" ? "bg-orange-500/18 border border-orange-500/30 text-orange-400"
                    : stemStatus === "loading" ? "bg-orange-500/10 border border-orange-500/18 text-orange-400/50"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                  }`}>
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white/75">Stem Extraction Brief</div>
                    <div className="text-[9px] text-white/30 mt-0.5">
                      {stemStatus === "loading" ? "AfroMuse Stem Intelligence is preparing your extraction guide…"
                      : stemStatus === "success" ? "Phase-aligned, DAW-ready stem guidance"
                      : "Stem extraction brief encountered an error"}
                    </div>
                  </div>
                </div>
                {stemStatus === "success" && <span className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-orange-500/12 border border-orange-500/25 text-orange-400/80">Ready</span>}
                {stemStatus === "loading" && <Loader2 className="w-4 h-4 animate-spin text-orange-400/50" />}
              </div>

              {/* loading shimmer */}
              {stemStatus === "loading" && (
                <div className="px-5 py-6 space-y-3 bg-orange-500/[0.01]">
                  {["w-4/5", "w-3/4", "w-5/6", "w-2/3"].map((w, i) => (
                    <div key={i} className={`h-2.5 ${w} rounded-full bg-orange-500/10 animate-pulse`} style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
              )}

              {/* error */}
              {stemStatus === "error" && (
                <div className="px-5 py-5 flex items-start gap-3 bg-red-500/[0.03]">
                  <AlertCircle className="w-4 h-4 text-red-400/70 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-300/60 leading-relaxed">Stem extraction brief failed. Check your track URL and try again.</p>
                </div>
              )}

              {/* result body */}
              {stemStatus === "success" && stemData && (
                <div className="px-5 py-5 space-y-4 bg-orange-500/[0.012]">
                  {/* Brief headline */}
                  <div className="rounded-xl bg-orange-500/[0.06] border border-orange-500/15 px-4 py-3.5">
                    <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-orange-400/55 mb-2">Extraction Vision</div>
                    <p className="text-sm font-semibold text-white/75 leading-relaxed">{stemData.extractionBrief}</p>
                  </div>

                  {/* Tool recommendation */}
                  <div className="rounded-xl bg-white/[0.02] border border-white/6 px-4 py-3 flex items-start gap-2.5">
                    <Radio className="w-3.5 h-3.5 text-white/30 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[9px] font-bold tracking-widest uppercase text-white/28 mb-1">Recommended Tool</div>
                      <p className="text-[10.5px] text-white/50 leading-relaxed">{stemData.recommendedTool}</p>
                    </div>
                  </div>

                  {/* Individual stems */}
                  <div className="space-y-3">
                    {stemData.stems.map((stem) => {
                      const c = STEM_COLORS[stem.name] ?? STEM_COLORS["Effects"];
                      return (
                        <div key={stem.name} className={`rounded-xl border px-4 py-3.5 ${c.bg} ${c.border}`}>
                          <div className="flex items-center justify-between mb-2.5">
                            <div className={`text-[10px] font-bold tracking-[0.12em] uppercase ${c.text}`}>{stem.name}</div>
                            <button
                              type="button"
                              onClick={() => toast({ title: `${stem.name} — In Development`, description: `${stem.name} WAV download is being prepared as part of the stems export engine.` })}
                              className={`h-6 px-2.5 rounded-lg text-[9px] font-semibold flex items-center gap-1 border transition-all opacity-50 hover:opacity-70 ${c.bg} ${c.border} ${c.text}`}
                            >
                              <Clock className="w-2.5 h-2.5" /> WAV Preparing
                            </button>
                          </div>
                          <p className={`text-[10px] leading-relaxed mb-1.5 ${c.sub}`}>{stem.extractionNotes}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            <span className="text-[9px] text-white/25"><span className="text-white/40 font-semibold">Gain:</span> {stem.gainLevel}</span>
                            <span className="text-[9px] text-white/25"><span className="text-white/40 font-semibold">File:</span> {stem.fileSpec}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Phase alignment + DAW import */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.02] border border-white/6 px-4 py-3.5">
                      <div className="text-[9px] font-bold tracking-widest uppercase text-white/28 mb-1.5">Phase Alignment</div>
                      <p className="text-[10px] text-white/45 leading-relaxed">{stemData.phaseAlignmentNotes}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.02] border border-white/6 px-4 py-3.5">
                      <div className="text-[9px] font-bold tracking-widest uppercase text-white/28 mb-1.5">DAW Import Guide</div>
                      <p className="text-[10px] text-white/45 leading-relaxed">{stemData.dawImportGuide}</p>
                    </div>
                  </div>

                  {/* Copy full brief */}
                  <div className="pt-2 border-t border-orange-500/10 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!stemData) return;
                        const lines = [
                          "STEM EXTRACTION BRIEF",
                          "",
                          `Extraction Vision: ${stemData.extractionBrief}`,
                          "",
                          `Recommended Tool: ${stemData.recommendedTool}`,
                          "",
                          ...stemData.stems.flatMap((s) => [
                            `── ${s.name} ──`,
                            `Extraction Notes: ${s.extractionNotes}`,
                            `Gain Level: ${s.gainLevel}`,
                            `File Spec: ${s.fileSpec}`,
                            "",
                          ]),
                          `Phase Alignment:\n${stemData.phaseAlignmentNotes}`,
                          "",
                          `DAW Import Guide:\n${stemData.dawImportGuide}`,
                        ].join("\n");
                        navigator.clipboard.writeText(lines).then(
                          () => toast({ title: "Stem brief copied", description: "Ready to paste into your engineer notes or DAW session." }),
                          () => toast({ title: "Copy failed", variant: "destructive" }),
                        );
                      }}
                      className="h-8 px-4 rounded-xl bg-orange-500/10 border border-orange-500/22 text-[10px] font-semibold text-orange-400/80 hover:bg-orange-500/16 hover:text-orange-300 transition-all flex items-center gap-1.5"
                    >
                      <Copy className="w-3 h-3" /> Copy Full Brief
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
                  onClick={() => toast({ title: "Export Expanding", description: "Full session export is in development. Blueprint copy is available now." })}
                  className="h-8 px-3 rounded-lg bg-amber-500/10 border border-amber-500/22 text-xs text-amber-400/60 hover:bg-amber-500/14 hover:text-amber-400/90 transition-all flex items-center gap-1.5"
                >
                  <Clock className="w-3 h-3" /> Export Session
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════
            FINAL EXPORT CARD
        ══════════════════════════════════════════ */}
        {pipelineVisible && (
          <FinalExportCard
            isReady={masterExportReady}
            mixFeel={mixFeel}
            onToast={(title, description) => toast({ title, description })}
          />
        )}

        {/* ══════════════════════════════════════════
            RECENT SESSION BUILD
        ══════════════════════════════════════════ */}
        <RecentSessionBuild
          sessionTitle={sessionTitle}
          mode={modeLabel}
          lastStage={lastCompletedStage}
          startTime={sessionStartTime}
        />

        {/* ══════════════════════════════════════════
            PRO TOOLS — V2 PREMIUM EXPANSION LAYER
        ══════════════════════════════════════════ */}
        <ProToolsSection onToast={(title, description) => toast({ title, description })} />

      </div>
    </section>
  );
});

export default AudioStudioV2;
