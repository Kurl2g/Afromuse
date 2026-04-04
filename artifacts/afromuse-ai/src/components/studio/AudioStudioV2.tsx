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
  { value: "instrumental", label: "Instrumental Only" },
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
      <div className={`w-1.5 h-5 rounded-full ${color} opacity-60`} />
      <span className="text-xs text-white/50">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/4 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.floor(Math.random() * 40) + 55}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: Math.random() * 0.4 }}
        />
      </div>
    </div>
  );
}

function ResultCard({
  title,
  icon,
  status,
  accentColor,
  children,
  loadingLabel,
}: {
  title: string;
  icon: React.ReactNode;
  status: CardStatus;
  accentColor: string;
  children: React.ReactNode;
  loadingLabel: string;
}) {
  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
      status === "idle" ? "border-white/6 bg-white/[0.02]" :
      status === "loading" ? `border-${accentColor}/20 bg-${accentColor}/3` :
      status === "success" ? `border-${accentColor}/20 bg-${accentColor}/5` :
      "border-red-500/15 bg-red-500/3"
    }`}>
      <div className="px-5 py-4 border-b border-white/4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            status === "idle" ? "bg-white/4" :
            status === "loading" ? `bg-${accentColor}/10` :
            status === "success" ? `bg-${accentColor}/12` :
            "bg-red-500/10"
          }`}>
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
                className="w-1 h-1 rounded-full bg-amber-400/60"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="p-5">
        {status === "idle" && (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-2xl bg-white/3 border border-white/6 flex items-center justify-center mx-auto mb-3">
              <span className="opacity-20">{icon}</span>
            </div>
            <p className="text-xs text-white/20">Ready to generate</p>
          </div>
        )}
        {status === "loading" && (
          <div className="text-center py-6">
            <p className="text-xs text-amber-400/60 animate-pulse">{loadingLabel}</p>
          </div>
        )}
        {status === "error" && (
          <div className="text-center py-4">
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

  const simulateGeneration = async (
    type: "instrumental" | "vocal" | "full",
    setStatus: (s: CardStatus) => void
  ) => {
    if (!audioLyrics.trim() && !draft) {
      toast({ title: "Add lyrics first", description: "Paste your lyrics or use your generated AfroMuse lyrics.", variant: "destructive" });
      return;
    }
    setStatus("loading");
    await new Promise((r) => setTimeout(r, 2800));
    setStatus("success");
    if (type === "full" || type === "instrumental") {
      setBlueprintStatus("success");
      setBlueprint({
        bpm: bpm || (audioGenre === "Amapiano" ? "112–116 BPM" : audioGenre === "Dancehall" ? "90–96 BPM" : "98–104 BPM"),
        key: key || (audioGenre === "Gospel" ? "D major" : audioGenre === "Amapiano" ? "A minor" : "F# minor"),
        genre: audioGenre,
        energy: energy,
        vocalType: vocalGender === "instrumental" ? "Instrumental" : vocalGender.charAt(0).toUpperCase() + vocalGender.slice(1),
        arrangementStyle: generationMode === "instrumental" ? "Pure instrumental arrangement" : section === "chorus" ? "Chorus-led hook focus" : "Full song arrangement with verse / chorus / bridge flow",
        hookFocus: hitmakerPriority ? "Hitmaker — maximum chant energy and first-listen memorability" : "Balanced — replay value with emotional resonance",
        producerNotes: `Session ready in ${bpm || (audioGenre === "Amapiano" ? "114" : "100")} BPM, key of ${key || "F# minor"}. ${includeArrangement ? "Full arrangement notes included — follow section-by-section." : ""} ${includeStems ? "Stems breakdown provided for individual track mixing." : ""} Vocal booth setup recommended: close-mic dynamic microphone, minimal reverb tracking, leave space for post-processing. Reference energy: ${energy.toLowerCase()} intensity with ${audioGenre} cultural texture throughout.`,
      });
    }
  };

  const handleGenerateInstrumental = () => {
    setInstrumentalStatus("idle");
    setBlueprintStatus("idle");
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
        new Promise<void>(async (r) => {
          await new Promise((w) => setTimeout(w, 600));
          await simulateGeneration("vocal", setVocalStatus);
          r();
        }),
      ]);
    };
    void runAll();
  };

  const copyBlueprint = () => {
    if (!blueprint) return;
    const text = Object.entries(blueprint).map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").trim()}: ${v}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Blueprint copied", description: "Audio blueprint copied to clipboard." });
    });
  };

  const hasAnyResult = instrumentalStatus === "success" || vocalStatus === "success" || blueprintStatus === "success";

  return (
    <section className="mt-12 rounded-3xl border border-sky-500/12 bg-gradient-to-b from-[#090c14] to-[#070a12] overflow-hidden shadow-2xl">

      {/* Header */}
      <div className="px-6 md:px-8 py-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/12 border border-sky-500/25 flex items-center justify-center shrink-0">
            <Music2 className="w-4.5 h-4.5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-bold text-white">AfroMuse Audio Studio</h2>
              <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-sky-500/12 border border-sky-500/25 text-sky-400">V2</span>
            </div>
            <p className="text-xs text-white/35">Turn your lyrics into a production-ready audio concept</p>
          </div>
        </div>
        {draft && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUseLyrics}
            className="shrink-0 h-9 px-4 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-semibold hover:bg-sky-500/18 transition-all flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" />
            Use Generated Lyrics
          </motion.button>
        )}
      </div>

      <div className="p-6 md:p-8 space-y-8">

        {/* Lyrics Input */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold tracking-widest uppercase text-white/40">
              Lyrics for Audio Generation
            </label>
            {audioLyrics && (
              <span className="text-[10px] text-white/20">{audioLyrics.split("\n").filter(Boolean).length} lines</span>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={audioLyrics}
            onChange={(e) => setAudioLyrics(e.target.value)}
            rows={12}
            placeholder={"Paste your full lyrics here or use your generated AfroMuse lyrics...\n\n[Intro]\n[Verse 1]\n[Chorus]\n[Verse 2]\n[Bridge]\n[Outro]"}
            className="w-full rounded-2xl bg-white/3 border border-white/8 px-5 py-4 text-sm text-white placeholder:text-white/18 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/15 transition-all resize-none leading-relaxed font-mono"
          />
          {!draft && (
            <p className="text-[11px] text-white/20 mt-2">Generate lyrics in the V1 Studio above first, then click "Use Generated Lyrics" to load them here automatically.</p>
          )}
        </div>

        {/* Controls Grid */}
        <div className="rounded-2xl border border-white/6 bg-white/[0.018] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/4 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Audio Generation Controls</span>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Genre */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Genre / Style</label>
              <div className="relative">
                <select
                  value={audioGenre}
                  onChange={(e) => setAudioGenre(e.target.value)}
                  className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 pr-8 text-sm text-white appearance-none focus:outline-none focus:border-sky-500/40 transition-all"
                >
                  {AUDIO_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>

            {/* Song Style / Vibe */}
            <div className="sm:col-span-2 lg:col-span-2">
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
                        ? "bg-sky-500/15 border border-sky-500/30 text-sky-400"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/12"
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
                        ? "bg-sky-500/15 border border-sky-500/30 text-sky-400"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/12"
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
                        ? "bg-primary/12 border border-primary/25 text-primary"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/12"
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
                  placeholder="e.g. 100"
                  min={60}
                  max={180}
                  className="w-full h-10 rounded-xl bg-white/4 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/35 mb-2">Key</label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="F# min"
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
                        ? e === "High" ? "bg-red-500/12 border border-red-500/25 text-red-400"
                          : e === "Medium" ? "bg-amber-500/12 border border-amber-500/25 text-amber-400"
                          : "bg-sky-500/12 border border-sky-500/25 text-sky-400"
                        : "bg-white/3 border border-white/6 text-white/35 hover:border-white/12"
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
                    className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                      checked
                        ? "bg-sky-500/20 border-sky-500/40"
                        : "bg-white/4 border-white/10 group-hover:border-white/20"
                    }`}
                  >
                    {checked && <Check className="w-2.5 h-2.5 text-sky-400" />}
                  </button>
                  <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateInstrumental}
            disabled={instrumentalStatus === "loading" || vocalStatus === "loading"}
            className="h-12 rounded-xl bg-white/4 border border-white/8 text-sm font-semibold text-white/70 hover:bg-white/7 hover:text-white hover:border-white/15 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Music2 className="w-4 h-4 text-sky-400/70" />
            Generate Instrumental
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateVocal}
            disabled={instrumentalStatus === "loading" || vocalStatus === "loading"}
            className="h-12 rounded-xl bg-violet-500/8 border border-violet-500/18 text-sm font-semibold text-violet-300/70 hover:bg-violet-500/14 hover:text-violet-200 hover:border-violet-500/28 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Mic2 className="w-4 h-4" />
            Generate Vocal Demo
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateFull}
            disabled={instrumentalStatus === "loading" || vocalStatus === "loading"}
            className="h-12 rounded-xl bg-gradient-to-r from-primary/80 to-amber-500/80 text-sm font-bold text-black hover:from-primary hover:to-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {(instrumentalStatus === "loading" || vocalStatus === "loading") ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Zap className="w-4 h-4" /> Generate Full Audio Concept</>
            )}
          </motion.button>
        </div>

        {/* Result Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Instrumental Preview Card */}
          <ResultCard
            title="Instrumental Preview"
            icon={<Music2 className="w-3.5 h-3.5" />}
            status={instrumentalStatus}
            accentColor="sky"
            loadingLabel="Building your instrumental arrangement..."
          >
            <div className="space-y-3">
              <p className="text-xs text-white/50 leading-relaxed">
                Instrumental concept generated for <span className="text-sky-400">{audioGenre}</span> — {bpm || "auto"} BPM, {key || "auto"} key.
              </p>
              <div className="space-y-2 pt-1">
                {[
                  { label: "Kick & Percussion", color: "bg-primary" },
                  { label: "Bass & Sub", color: "bg-violet-500" },
                  { label: "Pads & Chords", color: "bg-sky-500" },
                  { label: "Lead Melody", color: "bg-green-500" },
                  { label: "Guitar / Plucks", color: "bg-orange-400" },
                ].map((stem) => (
                  <StemBar key={stem.label} label={stem.label} color={stem.color} />
                ))}
              </div>
              <p className="text-[10px] text-white/20 pt-1">
                {includeArrangement ? "Arrangement notes included below in blueprint." : "Enable arrangement notes for full section breakdown."}
              </p>
            </div>
          </ResultCard>

          {/* Vocal Demo Card */}
          <ResultCard
            title="Vocal Demo"
            icon={<Mic2 className="w-3.5 h-3.5" />}
            status={vocalStatus}
            accentColor="violet"
            loadingLabel="Shaping vocal phrasing and demo guide..."
          >
            <div className="space-y-3">
              <p className="text-xs text-white/50 leading-relaxed">
                Vocal concept ready — <span className="text-violet-400">{VOCAL_GENDERS.find((v) => v.value === vocalGender)?.label}</span> delivery in {audioGenre} style.
              </p>
              <div className="space-y-2">
                {[
                  { label: "Verse delivery", note: "Low, conversational, storytelling" },
                  { label: "Chorus lift", note: "Open throat, full projection" },
                  { label: "Bridge turn", note: "Raw, stripped-back emotion" },
                  { label: "Ad-lib energy", note: "Chant and crowd response ready" },
                ].map(({ label, note }) => (
                  <div key={label} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-violet-400/50 mt-2 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-violet-300/70">{label}</span>
                      <p className="text-[10px] text-white/30">{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ResultCard>

          {/* Audio Blueprint Card */}
          <ResultCard
            title="Audio Blueprint"
            icon={<Wand2 className="w-3.5 h-3.5" />}
            status={blueprintStatus}
            accentColor="primary"
            loadingLabel="Compiling your audio blueprint..."
          >
            {blueprint && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "BPM", value: blueprint.bpm, color: "text-primary" },
                    { label: "Key", value: blueprint.key, color: "text-sky-400" },
                    { label: "Genre", value: blueprint.genre, color: "text-violet-400" },
                    { label: "Energy", value: blueprint.energy, color: "text-amber-400" },
                    { label: "Vocal Type", value: blueprint.vocalType, color: "text-green-400" },
                    { label: "Hook Focus", value: "", color: "" },
                  ].filter((item) => item.label !== "Hook Focus").map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg bg-white/3 border border-white/5 px-3 py-2">
                      <div className="text-[9px] font-bold tracking-widest uppercase text-white/25 mb-0.5">{label}</div>
                      <div className={`text-xs font-semibold ${color}`}>{value}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-white/3 border border-white/5 px-3 py-2">
                  <div className="text-[9px] font-bold tracking-widest uppercase text-white/25 mb-1">Arrangement Style</div>
                  <p className="text-xs text-white/50">{blueprint.arrangementStyle}</p>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/12 px-3 py-2">
                  <div className="text-[9px] font-bold tracking-widest uppercase text-primary/60 mb-1">Producer Notes</div>
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

        {/* Session export bar — appears when results are ready */}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={copyBlueprint}
                  disabled={!blueprint}
                  className="h-8 px-3 rounded-lg bg-white/4 border border-white/8 text-xs text-white/50 hover:text-white/80 hover:border-white/15 transition-all flex items-center gap-1.5 disabled:opacity-30"
                >
                  <Copy className="w-3 h-3" /> Copy Blueprint
                </button>
                <button
                  onClick={() => {
                    toast({ title: "Coming soon", description: "Full session export will be available in AfroMuse Gold." });
                  }}
                  className="h-8 px-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary hover:bg-primary/18 transition-all flex items-center gap-1.5"
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
