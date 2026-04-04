import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2, Music2, Wand2, Loader2, Check, AlertCircle,
  ChevronDown, Zap, Sliders, FileText, Download, Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SongDraft } from "@/lib/songGenerator";
import { formatDraftForClipboard } from "@/lib/songGenerator";

interface Props {
  draft: SongDraft | null;
  genre: string;
  mood: string;
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

function extractLyricsText(draft: SongDraft | null, genre: string, mood: string): string {
  if (!draft) return "";
  return formatDraftForClipboard(draft, genre, mood);
}

function StemBar({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-1.5 h-4 rounded-full opacity-60 ${color}`} />
      <span className="text-xs text-white/50 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.floor(Math.random() * 35) + 55}%` }}
          transition={{ duration: 1.4, ease: "easeOut", delay: Math.random() * 0.5 }}
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
}: {
  title: string;
  icon: React.ReactNode;
  status: CardStatus;
  accent: AccentKey;
  children: React.ReactNode;
  loadingLabel: string;
}) {
  const s = CARD_STYLES[accent];
  const containerClass =
    status === "idle" ? s.idle :
    status === "loading" ? s.loading :
    status === "success" ? s.success :
    "border-red-500/15 bg-red-500/[0.03]";
  const iconClass =
    status === "idle" ? s.iconIdle :
    status === "loading" ? s.iconLoading :
    status === "success" ? s.iconSuccess :
    "bg-red-500/10";

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${containerClass}`}>
      <div className="px-5 py-4 border-b border-white/4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconClass}`}>
            {status === "loading" ? <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" /> :
             status === "success" ? <Check className="w-3.5 h-3.5 text-green-400" /> :
             status === "error" ? <AlertCircle className="w-3.5 h-3.5 text-red-400" /> :
             <span className="text-white/30">{icon}</span>}
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-white/40">{title}</span>
        </div>
        {status === "loading" && (
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
        {status === "idle" && (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-2xl bg-white/3 border border-white/6 flex items-center justify-center mx-auto mb-3">
              <span className="opacity-20">{icon}</span>
            </div>
            <p className="text-xs text-white/20">Ready to generate</p>
          </div>
        )}
        {status === "loading" && (
          <div className="text-center py-8">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-white/5 border-t-amber-400/60 animate-spin" />
              <div className="absolute inset-2 rounded-full border-2 border-white/5 border-b-sky-400/40 animate-[spin_1.8s_linear_infinite_reverse]" />
            </div>
            <p className="text-xs text-amber-400/60 animate-pulse">{loadingLabel}</p>
          </div>
        )}
        {status === "error" && (
          <div className="text-center py-6">
            <AlertCircle className="w-8 h-8 text-red-400/50 mx-auto mb-2" />
            <p className="text-xs text-red-400/70">Generation failed. Please try again.</p>
          </div>
        )}
        {status === "success" && children}
      </div>
    </div>
  );
}

export default function AudioStudioV2({ draft, genre, mood }: Props) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [audioLyrics, setAudioLyrics] = useState("");
  const [audioGenre, setAudioGenre] = useState("Afrobeats");
  const [audioStyle, setAudioStyle] = useState("");
  const [vocalGender, setVocalGender] = useState("male");
  const [generationMode, setGenerationMode] = useState("full");
  const [section, setSection] = useState("full");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [energy, setEnergy] = useState("Medium");

  const [useGeneratedLyrics, setUseGeneratedLyrics] = useState(false);
  const [instrumentalOnly, setInstrumentalOnly] = useState(false);
  const [includeArrangement, setIncludeArrangement] = useState(true);
  const [includeStems, setIncludeStems] = useState(false);
  const [hitmakerPriority, setHitmakerPriority] = useState(false);

  const [instrumentalStatus, setInstrumentalStatus] = useState<CardStatus>("idle");
  const [vocalStatus, setVocalStatus] = useState<CardStatus>("idle");
  const [blueprintStatus, setBlueprintStatus] = useState<CardStatus>("idle");
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);

  const handleUseLyrics = () => {
    if (!draft) return;
    const text = extractLyricsText(draft, genre, mood);
    setAudioLyrics(text);
    setUseGeneratedLyrics(true);
    toast({ title: "Lyrics loaded", description: "Your generated lyrics are ready for audio production." });
    textareaRef.current?.focus();
  };

  const buildBlueprint = (): Blueprint => ({
    bpm: bpm || (audioGenre === "Amapiano" ? "112–116" : audioGenre === "Dancehall" ? "90–96" : audioGenre === "Gospel" ? "72–84" : "98–104"),
    key: key || (audioGenre === "Gospel" ? "D major" : audioGenre === "Amapiano" ? "A minor" : "F# minor"),
    genre: audioGenre,
    energy,
    vocalType: vocalGender === "random" ? "Randomised" : vocalGender.charAt(0).toUpperCase() + vocalGender.slice(1),
    arrangementStyle: generationMode === "instrumental"
      ? "Pure instrumental — no vocal layer"
      : section === "chorus" ? "Chorus-led hook focus with instrumental bed"
      : section === "verse" ? "Verse-focused narrative flow"
      : section === "hook" ? "Hook-only — maximum chant and repeat energy"
      : "Full song arrangement — Intro / Verse / Chorus / Bridge / Outro",
    hookFocus: hitmakerPriority
      ? "Hitmaker — first-listen memorability, maximum chant energy"
      : "Balanced — replay value with emotional resonance",
    producerNotes: `Session set in ${bpm || (audioGenre === "Amapiano" ? "114" : "100")} BPM, key of ${key || "F# minor"}. ${includeArrangement ? "Full section-by-section arrangement notes included." : ""} ${includeStems ? "Stems breakdown provided for individual track mixing." : ""} Vocal booth setup: close-mic dynamic mic, minimal reverb on tracking, leave headroom for post-processing. Reference energy level: ${energy.toLowerCase()} intensity throughout with ${audioGenre} cultural texture.`,
  });

  const simulateGeneration = async (
    type: "instrumental" | "vocal" | "full",
    setStatus: (s: CardStatus) => void
  ) => {
    if (!audioLyrics.trim() && !draft) {
      toast({
        title: "Add lyrics first",
        description: "Paste your lyrics or use your generated AfroMuse lyrics.",
        variant: "destructive",
      });
      return;
    }
    setStatus("loading");
    await new Promise((r) => setTimeout(r, 2800 + Math.random() * 800));
    setStatus("success");
    if (type === "full" || type === "instrumental") {
      setBlueprintStatus("success");
      setBlueprint(buildBlueprint());
    }
  };

  const handleGenerateInstrumental = () => {
    setInstrumentalStatus("idle");
    setBlueprintStatus("idle");
    setBlueprint(null);
    void simulateGeneration("instrumental", setInstrumentalStatus);
  };

  const handleGenerateVocal = () => {
    setVocalStatus("idle");
    void simulateGeneration("vocal", setVocalStatus);
  };

  const handleGenerateFull = () => {
    setInstrumentalStatus("idle");
    setVocalStatus("idle");
    setBlueprintStatus("idle");
    setBlueprint(null);
    const runAll = async () => {
      await Promise.all([
        simulateGeneration("full", setInstrumentalStatus),
        (async () => {
          await new Promise((w) => setTimeout(w, 600));
          await simulateGeneration("vocal", setVocalStatus);
        })(),
      ]);
    };
    void runAll();
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

  return (
    <section className="mt-14 rounded-3xl border border-sky-500/15 bg-gradient-to-b from-[#080c15] via-[#07090f] to-[#060810] overflow-hidden shadow-[0_0_80px_rgba(14,165,233,0.04)]">

      {/* ── Header ── */}
      <div className="relative px-6 md:px-8 py-6 border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 via-transparent to-transparent pointer-events-none" />
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
              <p className="text-xs text-white/35">Turn your lyrics into a production-ready audio concept — beats, vocal demo, and full blueprint</p>
            </div>
          </div>
          {draft && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUseLyrics}
              className="shrink-0 h-9 px-4 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-semibold hover:bg-sky-500/18 hover:border-sky-500/40 transition-all flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              Use Generated Lyrics
            </motion.button>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">

        {/* ── Lyrics Input ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold tracking-widest uppercase text-white/40">
              Lyrics for Audio Generation
            </label>
            {audioLyrics && (
              <span className="text-[10px] text-white/20">
                {audioLyrics.split("\n").filter(Boolean).length} lines
              </span>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={audioLyrics}
            onChange={(e) => setAudioLyrics(e.target.value)}
            rows={12}
            placeholder={"Paste your full lyrics here or use your generated AfroMuse lyrics...\n\n[Intro]\n[Verse 1]\n[Chorus]\n[Verse 2]\n[Bridge]\n[Outro]"}
            className="w-full rounded-2xl bg-white/[0.03] border border-white/8 px-5 py-4 text-sm text-white placeholder:text-white/18 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/12 transition-all resize-none leading-relaxed font-mono"
          />
          {!draft && (
            <p className="text-[11px] text-white/22 mt-2 leading-relaxed">
              Generate lyrics with the V1 Lyrics Studio above, then click "Use Generated Lyrics" to load them here automatically — or paste your own.
            </p>
          )}
        </div>

        {/* ── Audio Generation Controls ── */}
        <div className="rounded-2xl border border-white/6 bg-white/[0.018] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/4 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Audio Generation Controls</span>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Genre / Style */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Genre / Style</label>
              <div className="relative">
                <select
                  value={audioGenre}
                  onChange={(e) => setAudioGenre(e.target.value)}
                  className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 pr-8 text-sm text-white appearance-none focus:outline-none focus:border-sky-500/40 transition-all cursor-pointer"
                >
                  {AUDIO_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>

            {/* Song Style / Vibe */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Song Style / Vibe</label>
              <input
                type="text"
                value={audioStyle}
                onChange={(e) => setAudioStyle(e.target.value)}
                placeholder="e.g. Burna Boy x Asake, Omah Lay type vibe, soulful church atmosphere"
                className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/40 transition-all"
              />
            </div>

            {/* Vocal Gender */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Vocal Gender</label>
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
                    onClick={() => setSection(s.value)}
                    className={`w-full h-8 rounded-lg text-xs font-semibold transition-all text-left px-3 ${
                      section === s.value
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
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">BPM <span className="text-white/20 font-normal normal-case">optional</span></label>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  placeholder="e.g. 100"
                  min={60}
                  max={180}
                  className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Key <span className="text-white/20 font-normal normal-case">optional</span></label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="F# minor"
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
                    onClick={() => setEnergy(e)}
                    className={`h-8 rounded-lg text-xs font-semibold transition-all ${
                      energy === e
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

          {/* Quick Action Checkboxes */}
          <div className="px-5 py-4 border-t border-white/4">
            <div className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-3">Quick Options</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                { id: "useLyrics", label: "Use generated lyrics automatically", checked: useGeneratedLyrics, setter: setUseGeneratedLyrics },
                { id: "instOnly", label: "Generate only instrumental", checked: instrumentalOnly, setter: setInstrumentalOnly },
                { id: "arrangement", label: "Include arrangement notes", checked: includeArrangement, setter: setIncludeArrangement },
                { id: "stems", label: "Include stems breakdown", checked: includeStems, setter: setIncludeStems },
                { id: "hitmaker", label: "Use hitmaker hook priority", checked: hitmakerPriority, setter: setHitmakerPriority },
              ].map(({ id, label, checked, setter }) => (
                <label key={id} className="flex items-center gap-2.5 cursor-pointer group">
                  <button
                    type="button"
                    onClick={() => setter(!checked)}
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

        {/* ── Action Buttons ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateInstrumental}
            disabled={isGenerating}
            className="h-12 rounded-xl bg-white/4 border border-white/8 text-sm font-semibold text-white/65 hover:bg-white/7 hover:text-white hover:border-sky-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Music2 className="w-4 h-4 text-sky-400" />
            Generate Instrumental
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateVocal}
            disabled={isGenerating}
            className="h-12 rounded-xl bg-violet-500/8 border border-violet-500/18 text-sm font-semibold text-violet-300/70 hover:bg-violet-500/14 hover:text-violet-200 hover:border-violet-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Mic2 className="w-4 h-4" />
            Generate Vocal Demo
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateFull}
            disabled={isGenerating}
            className="h-12 rounded-xl bg-gradient-to-r from-amber-500/80 to-primary/80 text-sm font-bold text-black hover:from-amber-400 hover:to-primary shadow-[0_0_28px_rgba(245,158,11,0.18)] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Zap className="w-4 h-4" /> Generate Full Audio Concept</>
            )}
          </motion.button>
        </div>

        {/* ── Result Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Instrumental Preview */}
          <ResultCard
            title="Instrumental Preview"
            icon={<Music2 className="w-3.5 h-3.5" />}
            status={instrumentalStatus}
            accent="sky"
            loadingLabel="Building your instrumental arrangement..."
          >
            <div className="space-y-4">
              <p className="text-xs text-white/50 leading-relaxed">
                Instrumental concept for <span className="text-sky-400 font-medium">{audioGenre}</span> — {bpm || "auto"} BPM, {key || "auto key"}.
              </p>
              <div className="space-y-2.5 pt-1">
                {[
                  { label: "Kick & Percussion", color: "bg-amber-400" },
                  { label: "Bass & Sub", color: "bg-violet-500" },
                  { label: "Pads & Chords", color: "bg-sky-500" },
                  { label: "Lead Melody", color: "bg-green-400" },
                  { label: "Guitar / Plucks", color: "bg-orange-400" },
                ].map((stem) => (
                  <StemBar key={stem.label} label={stem.label} color={stem.color} />
                ))}
              </div>
              {includeArrangement && (
                <p className="text-[10px] text-white/22 pt-1 border-t border-white/4">
                  Arrangement notes included in the Audio Blueprint →
                </p>
              )}
            </div>
          </ResultCard>

          {/* Vocal Demo */}
          <ResultCard
            title="Vocal Demo"
            icon={<Mic2 className="w-3.5 h-3.5" />}
            status={vocalStatus}
            accent="violet"
            loadingLabel="Shaping vocal phrasing and demo guide..."
          >
            <div className="space-y-3">
              <p className="text-xs text-white/50 leading-relaxed">
                Vocal concept ready — <span className="text-violet-400 font-medium">{VOCAL_GENDERS.find((v) => v.value === vocalGender)?.label}</span> delivery in {audioGenre} style.
              </p>
              <div className="space-y-2.5">
                {[
                  { label: "Verse Delivery", note: "Low, conversational, storytelling energy" },
                  { label: "Chorus Lift", note: "Open throat, full projection, crowd-ready" },
                  { label: "Bridge Turn", note: "Raw, stripped-back emotional peak" },
                  { label: "Ad-lib Energy", note: "Chant and crowd response layer ready" },
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

          {/* Audio Blueprint */}
          <ResultCard
            title="Audio Blueprint"
            icon={<Wand2 className="w-3.5 h-3.5" />}
            status={blueprintStatus}
            accent="amber"
            loadingLabel="Compiling your audio blueprint..."
          >
            {blueprint && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "BPM", value: blueprint.bpm, color: "text-amber-400" },
                    { label: "Key", value: blueprint.key, color: "text-sky-400" },
                    { label: "Genre", value: blueprint.genre, color: "text-violet-400" },
                    { label: "Energy", value: blueprint.energy, color: "text-green-400" },
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
                <span className="text-xs text-white/40">Audio concept ready — share with your producer or vocalist</span>
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
                  onClick={() => {
                    toast({ title: "Coming soon", description: "Full session export unlocks in AfroMuse Gold." });
                  }}
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
}
