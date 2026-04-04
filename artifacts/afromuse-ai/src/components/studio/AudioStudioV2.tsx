import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2, Music2, Wand2, Loader2, Check, AlertCircle,
  ChevronDown, Zap, Sliders, FileText, Download, Copy, VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SongDraft } from "@/lib/songGenerator";
import { formatDraftForClipboard } from "@/lib/songGenerator";

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

interface Blueprint {
  bpm: string;
  key: string;
  genre: string;
  energy: string;
  vocalType: string;
  arrangementStyle: string;
  hookFocus: string;
  producerNotes: string;
}

const AUDIO_GENRES = [
  "Afrobeats", "Dancehall", "Amapiano", "Gospel", "Afro-fusion", "R&B Afro", "Street Pop",
];

const VOCAL_GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "mixed", label: "Mixed" },
  { value: "random", label: "Random" },
];

const GENERATION_MODES = [
  { value: "full", label: "Full Demo" },
  { value: "instrumental", label: "Instrumental Only" },
  { value: "vocal", label: "Vocal Demo Only" },
];

const SECTIONS = [
  { value: "full", label: "Full Song" },
  { value: "chorus", label: "Chorus Only" },
  { value: "verse", label: "Verse Only" },
  { value: "hook", label: "Hook Only" },
];

const ENERGIES = ["Low", "Medium", "High"];

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

// Deterministic width based on label — never changes between renders
function StemBar({ label, color }: { label: string; color: string }) {
  const pct = Math.round(55 + hashString(label) * 35);
  const delay = hashString(label + "_d") * 0.4;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-1.5 h-4 rounded-full opacity-60 ${color}`} />
      <span className="text-xs text-white/50 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.4, ease: "easeOut", delay }}
        />
      </div>
    </div>
  );
}

type AccentKey = "sky" | "violet" | "amber";

const CARD_STYLES: Record<AccentKey, {
  idle: string;
  loading: string;
  success: string;
  iconIdle: string;
  iconLoading: string;
  iconSuccess: string;
  dotLoading: string;
}> = {
  sky: {
    idle: "border-white/6 bg-white/[0.02]",
    loading: "border-sky-500/20 bg-sky-500/[0.03]",
    success: "border-sky-500/20 bg-sky-500/[0.05]",
    iconIdle: "bg-white/4",
    iconLoading: "bg-sky-500/10",
    iconSuccess: "bg-sky-500/12",
    dotLoading: "bg-sky-400/60",
  },
  violet: {
    idle: "border-white/6 bg-white/[0.02]",
    loading: "border-violet-500/20 bg-violet-500/[0.03]",
    success: "border-violet-500/20 bg-violet-500/[0.05]",
    iconIdle: "bg-white/4",
    iconLoading: "bg-violet-500/10",
    iconSuccess: "bg-violet-500/12",
    dotLoading: "bg-violet-400/60",
  },
  amber: {
    idle: "border-white/6 bg-white/[0.02]",
    loading: "border-amber-500/20 bg-amber-500/[0.03]",
    success: "border-amber-500/20 bg-amber-500/[0.05]",
    iconIdle: "bg-white/4",
    iconLoading: "bg-amber-500/10",
    iconSuccess: "bg-amber-500/12",
    dotLoading: "bg-amber-400/60",
  },
};

function ResultCard({
  title,
  icon,
  status,
  accent,
  children,
  loadingLabel,
  muted = false,
  mutedLabel,
}: {
  title: string;
  icon: React.ReactNode;
  status: CardStatus;
  accent: AccentKey;
  children: React.ReactNode;
  loadingLabel: string;
  muted?: boolean;
  mutedLabel?: string;
}) {
  const s = CARD_STYLES[accent];
  const containerClass = muted
    ? "border-white/4 bg-white/[0.01] opacity-45"
    : status === "idle" ? s.idle
    : status === "loading" ? s.loading
    : status === "success" ? s.success
    : "border-red-500/15 bg-red-500/[0.03]";
  const iconClass = muted
    ? "bg-white/3"
    : status === "idle" ? s.iconIdle
    : status === "loading" ? s.iconLoading
    : status === "success" ? s.iconSuccess
    : "bg-red-500/10";

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${containerClass}`}>
      <div className="px-5 py-4 border-b border-white/4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconClass}`}>
            {muted ? <VolumeX className="w-3.5 h-3.5 text-white/20" /> :
             status === "loading" ? <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" /> :
             status === "success" ? <Check className="w-3.5 h-3.5 text-green-400" /> :
             status === "error" ? <AlertCircle className="w-3.5 h-3.5 text-red-400" /> :
             <span className="text-white/30">{icon}</span>}
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-white/40">{title}</span>
        </div>
        {!muted && status === "loading" && (
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-1 h-1 rounded-full ${s.dotLoading}`}
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

// Deterministic BPM/key defaults per genre
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

  // ── Controlled state ──────────────────────────────────────────────────────
  const [audioLyrics, setAudioLyrics] = useState("");
  const [audioGenre, setAudioGenre] = useState("Afrobeats");
  const [audioStyleReference, setAudioStyleReference] = useState("");
  const [vocalGender, setVocalGender] = useState("male");
  const [generationMode, setGenerationMode] = useState("full");
  const [sectionMode, setSectionMode] = useState("full");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [energyLevel, setEnergyLevel] = useState("Medium");

  const [useGeneratedLyrics, setUseGeneratedLyrics] = useState(false);
  const [generateOnlyInstrumental, setGenerateOnlyInstrumental] = useState(false);
  const [includeArrangementNotes, setIncludeArrangementNotes] = useState(true);
  const [includeStemsBreakdown, setIncludeStemsBreakdown] = useState(false);
  const [useHitmakerHookPriority, setUseHitmakerHookPriority] = useState(false);

  const [instrumentalStatus, setInstrumentalStatus] = useState<CardStatus>("idle");
  const [vocalStatus, setVocalStatus] = useState<CardStatus>("idle");
  const [blueprintStatus, setBlueprintStatus] = useState<CardStatus>("idle");
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);

  // ── Derived: instrumental-only mode ───────────────────────────────────────
  // Triggered by any of three signals
  const isInstrumentalMode =
    generateOnlyInstrumental ||
    generationMode === "instrumental";

  // Whether lyrics are present (textarea or draft)
  const hasLyrics = audioLyrics.trim().length > 0 || draft !== null;

  // ── Auto-sync: when checkbox is on, keep textarea in sync with V1 draft ───
  useEffect(() => {
    if (useGeneratedLyrics && draft) {
      setAudioLyrics(extractLyricsText(draft, genre, mood));
    }
  }, [draft, useGeneratedLyrics, genre, mood]);

  // ── "Use Generated Lyrics" header button ──────────────────────────────────
  const handleUseLyrics = () => {
    if (!draft) {
      toast({
        title: "No lyrics yet",
        description: "Generate lyrics first or paste your own lyrics.",
        variant: "destructive",
      });
      return;
    }
    const text = extractLyricsText(draft, genre, mood);
    setAudioLyrics(text);
    setUseGeneratedLyrics(true);
    toast({ title: "Lyrics loaded", description: "Your generated lyrics are ready for audio production." });
    textareaRef.current?.focus();
  };

  // ── Imperative handle for parent bridging ─────────────────────────────────
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

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 400);
    },
  }), []);

  // ── Toggle "use generated lyrics" checkbox ────────────────────────────────
  const handleToggleAutoLyrics = (next: boolean) => {
    setUseGeneratedLyrics(next);
    // If turning on and we have a draft, sync immediately
    if (next && draft) {
      setAudioLyrics(extractLyricsText(draft, genre, mood));
      toast({ title: "Auto-sync on", description: "Lyrics will update whenever you generate in V1." });
    }
  };

  // ── Deterministic blueprint builder ───────────────────────────────────────
  const buildBlueprint = (): Blueprint => {
    const defaults = getGenreDefaults(audioGenre);
    const resolvedBpm = bpm || defaults.bpm;
    const resolvedKey = musicalKey || defaults.key;
    const vocalLabel =
      vocalGender === "random" ? "Randomised"
      : vocalGender.charAt(0).toUpperCase() + vocalGender.slice(1);

    const arrangementStyle = isInstrumentalMode
      ? "Pure instrumental — no vocal layer"
      : sectionMode === "chorus" ? "Chorus-led hook focus with instrumental bed"
      : sectionMode === "verse" ? "Verse-focused narrative flow"
      : sectionMode === "hook" ? "Hook-only — maximum chant and repeat energy"
      : "Full song arrangement — Intro / Verse / Chorus / Bridge / Outro";

    const hookFocus = useHitmakerHookPriority
      ? "Hitmaker — first-listen memorability, maximum chant energy"
      : "Balanced — replay value with emotional resonance";

    const notesParts = [
      `Session set in ${resolvedBpm} BPM, key of ${resolvedKey}.`,
      includeArrangementNotes ? "Full section-by-section arrangement notes included." : "",
      includeStemsBreakdown ? "Stems breakdown provided for individual track mixing." : "",
      isInstrumentalMode
        ? "Instrumental-only session — no vocal tracking required."
        : "Vocal booth setup: close-mic dynamic mic, minimal reverb on tracking, leave headroom for post-processing.",
      `Reference energy: ${energyLevel.toLowerCase()} intensity throughout with ${audioGenre} cultural texture.`,
    ].filter(Boolean);

    return {
      bpm: resolvedBpm,
      key: resolvedKey,
      genre: audioGenre,
      energy: energyLevel,
      vocalType: isInstrumentalMode ? "Instrumental" : vocalLabel,
      arrangementStyle,
      hookFocus,
      producerNotes: notesParts.join(" "),
    };
  };

  // ── Validation helper ─────────────────────────────────────────────────────
  const validateForVocal = (): boolean => {
    if (!hasLyrics) {
      toast({
        title: "Lyrics required",
        description: "Paste lyrics or generate one first — vocal demo needs lyric content.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  // ── Generation handlers ───────────────────────────────────────────────────
  const runInstrumental = async () => {
    setInstrumentalStatus("loading");
    await new Promise((r) => setTimeout(r, 2800));
    setInstrumentalStatus("success");
    setBlueprintStatus("success");
    setBlueprint(buildBlueprint());
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
    void (async () => {
      const tasks: Promise<void>[] = [runInstrumental()];
      if (!isInstrumentalMode) {
        tasks.push((async () => {
          await new Promise((w) => setTimeout(w, 600));
          await runVocal();
        })());
      }
      await Promise.all(tasks);
    })();
  };

  const copyBlueprint = () => {
    if (!blueprint) return;
    const lines = [
      `BPM: ${blueprint.bpm}`,
      `Key: ${blueprint.key}`,
      `Genre: ${blueprint.genre}`,
      `Energy: ${blueprint.energy}`,
      `Vocal Type: ${blueprint.vocalType}`,
      `Arrangement Style: ${blueprint.arrangementStyle}`,
      `Hook Focus: ${blueprint.hookFocus}`,
      ``,
      `Producer Notes:`,
      blueprint.producerNotes,
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
              </div>
              <p className="text-xs text-white/40">Write. Shape. Hear. — craft a beat, vocal guide, and full session blueprint from your lyrics.</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUseLyrics}
            className="shrink-0 h-9 px-4 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-semibold hover:bg-sky-500/18 hover:border-sky-500/40 transition-all flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" />
            Load Lyrics
          </motion.button>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">

        {/* ── Lyrics Input ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold tracking-widest uppercase text-white/40">
                Your Lyrics
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
                <span className="text-[10px] text-white/20">
                  {audioLyrics.split("\n").filter(Boolean).length} lines
                </span>
              )}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={audioLyrics}
            onChange={(e) => {
              setAudioLyrics(e.target.value);
              if (useGeneratedLyrics) setUseGeneratedLyrics(false);
            }}
            rows={11}
            placeholder={"Drop your full lyrics here, or write from scratch...\n\n[Intro]\n...\n\n[Verse 1]\n...\n\n[Chorus / Hook]\n...\n\n[Bridge]\n..."}
            className="w-full rounded-2xl bg-white/[0.03] border border-white/8 px-5 py-4 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/10 transition-all resize-none leading-relaxed font-mono"
          />
          {!draft && !audioLyrics && (
            <p className="text-[11px] text-white/22 mt-2 leading-relaxed">
              Write your song above in the Lyrics Studio, then click <span className="text-white/35">"Load Lyrics"</span> to bring it here — or paste your own below.
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
            <span className="text-[10px] text-white/18">Dial in your sound</span>
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
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Sound Reference</label>
              <input
                type="text"
                value={audioStyleReference}
                onChange={(e) => setAudioStyleReference(e.target.value)}
                placeholder="e.g. Burna Boy x Asake, Omah Lay type vibe, soulful church atmosphere..."
                className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/40 transition-all"
              />
            </div>

            {/* Vocal Gender — dimmed in instrumental mode */}
            <div className={isInstrumentalMode ? "opacity-40 pointer-events-none" : ""}>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">
                Vocal Gender
                {isInstrumentalMode && <span className="ml-2 text-white/18 font-normal normal-case tracking-normal">(off)</span>}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {VOCAL_GENDERS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setVocalGender(v.value)}
                    className={`h-8 rounded-lg text-xs font-semibold transition-all ${
                      vocalGender === v.value
                        ? "bg-sky-500/15 border border-sky-500/35 text-sky-400"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generation Mode */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Generation Mode</label>
              <div className="space-y-1.5">
                {GENERATION_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setGenerationMode(m.value)}
                    className={`w-full h-8 rounded-lg text-xs font-semibold transition-all text-left px-3 ${
                      generationMode === m.value
                        ? "bg-sky-500/15 border border-sky-500/35 text-sky-400"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section Selector */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Section</label>
              <div className="space-y-1.5">
                {SECTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSectionMode(s.value)}
                    className={`w-full h-8 rounded-lg text-xs font-semibold transition-all text-left px-3 ${
                      sectionMode === s.value
                        ? "bg-amber-500/12 border border-amber-500/28 text-amber-400"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* BPM + Key */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">BPM</label>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  placeholder={genreDefaults.bpm.split("–")[0]}
                  min={60}
                  max={200}
                  className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Key</label>
                <input
                  type="text"
                  value={musicalKey}
                  onChange={(e) => setMusicalKey(e.target.value)}
                  placeholder={genreDefaults.key}
                  className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/40 transition-all"
                />
              </div>
            </div>

            {/* Energy */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Energy</label>
              <div className="grid grid-cols-3 gap-1.5">
                {ENERGIES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEnergyLevel(e)}
                    className={`h-8 rounded-lg text-xs font-semibold transition-all ${
                      energyLevel === e
                        ? e === "High" ? "bg-red-500/12 border border-red-500/28 text-red-400"
                          : e === "Medium" ? "bg-amber-500/12 border border-amber-500/28 text-amber-400"
                          : "bg-sky-500/12 border border-sky-500/28 text-sky-400"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/15 hover:text-white/55"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Session Options */}
          <div className="px-5 py-4 border-t border-white/4">
            <div className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-3">Session Options</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {([
                {
                  id: "useLyrics",
                  label: "Auto-sync lyrics from Lyrics Studio",
                  checked: useGeneratedLyrics,
                  onToggle: handleToggleAutoLyrics,
                },
                {
                  id: "instOnly",
                  label: "Beat-only — skip vocals",
                  checked: generateOnlyInstrumental,
                  onToggle: (v: boolean) => setGenerateOnlyInstrumental(v),
                },
                {
                  id: "arrangement",
                  label: "Include arrangement guide",
                  checked: includeArrangementNotes,
                  onToggle: (v: boolean) => setIncludeArrangementNotes(v),
                },
                {
                  id: "stems",
                  label: "Include stems breakdown",
                  checked: includeStemsBreakdown,
                  onToggle: (v: boolean) => setIncludeStemsBreakdown(v),
                },
                {
                  id: "hitmaker",
                  label: "Hitmaker hook priority",
                  checked: useHitmakerHookPriority,
                  onToggle: (v: boolean) => setUseHitmakerHookPriority(v),
                },
              ] as const).map(({ id, label, checked, onToggle }) => (
                <label key={id} className="flex items-center gap-2.5 cursor-pointer group">
                  <button
                    type="button"
                    onClick={() => onToggle(!checked)}
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                      checked
                        ? "bg-sky-500/20 border-sky-500/45"
                        : "bg-white/4 border-white/10 group-hover:border-white/22"
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

        {/* ── Beat-only mode notice ── */}
        <AnimatePresence>
          {isInstrumentalMode && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
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

          {/* Beat Preview */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateInstrumental}
            disabled={isGenerating}
            className="h-12 rounded-xl bg-sky-500/7 border border-sky-500/18 text-sm font-semibold text-sky-300/70 hover:bg-sky-500/12 hover:text-sky-200 hover:border-sky-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Music2 className="w-4 h-4 text-sky-400" />
            Beat Preview
          </motion.button>

          {/* Vocal Guide — disabled in beat-only mode */}
          <motion.button
            type="button"
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
            {isInstrumentalMode ? "Vocals Off" : "Vocal Guide"}
          </motion.button>

          {/* Build Full Session */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateFull}
            disabled={isGenerating}
            className="h-12 rounded-xl bg-gradient-to-r from-amber-500/85 to-primary/85 text-sm font-bold text-black hover:from-amber-400 hover:to-primary shadow-[0_0_32px_rgba(245,158,11,0.20)] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Building...</>
            ) : (
              <><Zap className="w-4 h-4" /> Build Full Session</>
            )}
          </motion.button>

        </div>

        {/* ── Result Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Beat Preview */}
          <ResultCard
            title="Beat Preview"
            icon={<Music2 className="w-3.5 h-3.5" />}
            status={instrumentalStatus}
            accent="sky"
            loadingLabel="Building your groove..."
          >
            <div className="space-y-4">
              <p className="text-xs text-white/50 leading-relaxed">
                Beat concept set for <span className="text-sky-400 font-medium">{audioGenre}</span>
                {" — "}{bpm || genreDefaults.bpm} BPM in {musicalKey || genreDefaults.key}.
              </p>
              <div className="space-y-2.5 pt-1">
                {[
                  { label: "Kick & Percussion", color: "bg-amber-400" },
                  { label: "Bass & Sub",         color: "bg-violet-500" },
                  { label: "Pads & Chords",      color: "bg-sky-500" },
                  { label: "Lead Melody",         color: "bg-green-400" },
                  { label: "Guitar / Plucks",     color: "bg-orange-400" },
                ].map((stem) => (
                  <StemBar key={stem.label} label={stem.label} color={stem.color} />
                ))}
              </div>
              {includeArrangementNotes && (
                <p className="text-[10px] text-white/22 pt-1 border-t border-white/4 leading-relaxed">
                  Arrangement guide included in the Session Blueprint →
                </p>
              )}
            </div>
          </ResultCard>

          {/* Vocal Guide — muted when beat-only mode */}
          <ResultCard
            title="Vocal Guide"
            icon={<Mic2 className="w-3.5 h-3.5" />}
            status={vocalStatus}
            accent="violet"
            loadingLabel="Finding your vocal pocket..."
            muted={isInstrumentalMode}
            mutedLabel="Vocals are off in beat-only mode"
          >
            <div className="space-y-3">
              <p className="text-xs text-white/50 leading-relaxed">
                Vocal concept ready — <span className="text-violet-400 font-medium">
                  {VOCAL_GENDERS.find((v) => v.value === vocalGender)?.label}
                </span> delivery in {audioGenre} style.
              </p>
              <div className="space-y-2.5">
                {[
                  { label: "Verse Delivery", note: "Low, conversational, storytelling energy" },
                  { label: "Hook Lift",       note: "Open throat, full projection, crowd-ready" },
                  { label: "Bridge Turn",     note: "Raw, stripped-back emotional peak" },
                  { label: "Ad-lib Layer",    note: "Chant and crowd response layer ready" },
                ].map(({ label, note }) => (
                  <div key={label} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400/50 mt-1.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-violet-300/70 block">{label}</span>
                      <p className="text-[10px] text-white/30 leading-relaxed">{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ResultCard>

          {/* Session Blueprint */}
          <ResultCard
            title="Session Blueprint"
            icon={<Wand2 className="w-3.5 h-3.5" />}
            status={blueprintStatus}
            accent="amber"
            loadingLabel="Designing your session blueprint..."
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
                <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
                  <div className="text-[9px] font-bold tracking-widest uppercase text-white/25 mb-1">Arrangement Style</div>
                  <p className="text-xs text-white/50 leading-relaxed">{blueprint.arrangementStyle}</p>
                </div>
                <div className="rounded-lg bg-amber-500/[0.04] border border-amber-500/12 px-3 py-2">
                  <div className="text-[9px] font-bold tracking-widest uppercase text-amber-400/60 mb-1">Producer Notes</div>
                  <p className="text-[10px] text-white/40 leading-relaxed">{blueprint.producerNotes}</p>
                </div>
                <button
                  onClick={copyBlueprint}
                  className="w-full h-8 rounded-lg bg-white/4 border border-white/8 text-[10px] font-semibold text-white/40 hover:text-white/70 hover:border-white/15 transition-all flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3 h-3" /> Copy Blueprint
                </button>
              </div>
            )}
          </ResultCard>

        </div>

        {/* ── Session export bar ── */}
        <AnimatePresence>
          {hasAnyResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-white/5 bg-white/[0.015] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-white/40">Session ready — drop this blueprint in your producer's inbox.</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={copyBlueprint}
                  disabled={!blueprint}
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
