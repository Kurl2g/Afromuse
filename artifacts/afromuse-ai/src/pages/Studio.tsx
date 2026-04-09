import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Copy, Save, Loader2, Music, RefreshCw,
  ChevronDown, Volume2, Download, Check, Lock,
  Mic2, Wand2, FileText, Zap, Flame, Play,
  SkipForward, Sliders, Radio, Guitar,
  VolumeX, Volume1, ChevronRight, Crown, Dna,
} from "lucide-react";
import { SubscriptionModal } from "@/components/ui/SubscriptionModal";
import AudioStudioV2, { type AudioStudioV2Handle, type QuickMode } from "@/components/studio/AudioStudioV2";
import ProjectLibraryPanel from "@/components/studio/ProjectLibraryPanel";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  formatDraftForClipboard,
  type SongDraft,
} from "@/lib/songGenerator";
import { useAuth } from "@/context/AuthContext";
import { usePlan, PLAN_LIMITS, type Plan } from "@/context/PlanContext";
import { useProjectLibrary, extractResumeState } from "@/context/ProjectLibraryContext";
import type { SavedSession } from "@/lib/projectLibrary";

type GenerationStatus = "idle" | "generating" | "done";
type StudioTab = "lyric" | "audio" | "release";

const generatingSteps = [
  "Finding your keeper line...",
  "Engineering the hook...",
  "Building your verses...",
  "Running the tightness filter...",
  "Shaping the bridge...",
  "Running quality check...",
  "Finalising your draft...",
];

const GENRES = [
  { value: "Afrobeats", label: "Afrobeats" },
  { value: "Afropop", label: "Afropop" },
  { value: "Amapiano", label: "Amapiano" },
  { value: "Dancehall", label: "Dancehall" },
  { value: "R&B", label: "Afro R&B" },
  { value: "Afro-fusion", label: "Afro-fusion" },
  { value: "Street Anthem", label: "Street Anthem" },
  { value: "Spiritual", label: "Spiritual / Gospel" },
];

const MOODS = [
  { value: "Uplifting", label: "Uplifting" },
  { value: "Romantic", label: "Romantic" },
  { value: "Energetic", label: "Energetic" },
  { value: "Sad", label: "Heartbreak" },
  { value: "Spiritual", label: "Spiritual" },
  { value: "Confident", label: "Confident" },
];

const SONG_LENGTHS = [
  { value: "Short", label: "Short" },
  { value: "Standard", label: "Standard" },
  { value: "Full", label: "Full" },
] as const;

type SongLength = "Short" | "Standard" | "Full";

const LANGUAGE_FLAVORS = [
  { value: "English", label: "English" },
  { value: "Naija Melodic Pidgin", label: "Naija Melodic Pidgin" },
  { value: "Naija Street Pidgin", label: "Naija Street Pidgin" },
  { value: "Ghana Urban Pidgin", label: "Ghana Urban Pidgin" },
  { value: "Afro-fusion Clean Pidgin", label: "Afro-fusion Clean Pidgin" },
  { value: "Jamaican Street Patois", label: "Jamaican Street Patois" },
  { value: "Jamaican Spiritual Patois", label: "Jamaican Spiritual Patois" },
  { value: "Mixed / Blend", label: "Mixed / Blend" },
] as const;

function getApiLanguageParams(flavor: string): { languageFlavor: string; dialectStyle: string | undefined } {
  switch (flavor) {
    case "Naija Melodic Pidgin": return { languageFlavor: "Naija Melodic Pidgin", dialectStyle: "Naija Melodic Pidgin" };
    case "Naija Street Pidgin": return { languageFlavor: "Naija Street Pidgin", dialectStyle: "Naija Street Pidgin" };
    case "Ghana Urban Pidgin": return { languageFlavor: "Ghana Urban Pidgin", dialectStyle: "Ghana Urban Pidgin" };
    case "Afro-fusion Clean Pidgin": return { languageFlavor: "Afro-fusion Clean Pidgin", dialectStyle: "Afro-fusion Clean Pidgin" };
    case "Jamaican Street Patois": return { languageFlavor: "Jamaican Patois", dialectStyle: "Jamaican Street" };
    case "Jamaican Spiritual Patois": return { languageFlavor: "Jamaican Patois", dialectStyle: "Jamaican Spiritual" };
    case "Mixed / Blend": return { languageFlavor: "Mixed / Blend", dialectStyle: undefined };
    default: return { languageFlavor: "Global English", dialectStyle: undefined };
  }
}

const STEMS = [
  { id: "instrumental", label: "Instrumental", color: "amber" },
  { id: "leadVocal", label: "Lead Vocal", color: "violet" },
  { id: "harmony", label: "Harmony", color: "sky" },
  { id: "adlibs", label: "Adlibs", color: "pink" },
  { id: "bass", label: "Bass", color: "green" },
  { id: "percussion", label: "Percussion", color: "orange" },
] as const;

export default function Studio() {
  const { toast } = useToast();
  const { isLoggedIn } = useAuth();
  const { saveCurrentSession } = useProjectLibrary();
  const {
    plan, hasAccess, generationsUsed, generationsLimit,
    generationsRemaining, audioTrialsLeft, collabTrialsLeft,
    canGenerate, incrementGeneration,
  } = usePlan();

  const [activeTab, setActiveTab] = useState<StudioTab>("lyric");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [topic, setTopic] = useState("");
  const [genre, setGenre] = useState("Afrobeats");
  const [mood, setMood] = useState("Uplifting");
  const [songLength, setSongLength] = useState<SongLength>("Standard");
  const [languageFlavor, setLanguageFlavor] = useState("English");
  const [dialectStyle, setDialectStyle] = useState("Auto");
  const [customFlavor, setCustomFlavor] = useState("");
  const [dialectDepth, setDialectDepth] = useState("Balanced Native");
  const [clarityMode, setClarityMode] = useState("Artist Real");
  const [blendBalance, setBlendBalance] = useState("Balanced Mix");
  const [voiceTexture, setVoiceTexture] = useState("");
  const [style, setStyle] = useState("");
  const [notes, setNotes] = useState("");
  const [generatingStep, setGeneratingStep] = useState(0);
  const [draft, setDraft] = useState<SongDraft | null>(null);
  const [seed, setSeed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commercialMode, setCommercialMode] = useState(false);
  const [lyricalDepth, setLyricalDepth] = useState<"Simple" | "Balanced" | "Deep">("Balanced");
  const [hookRepeat, setHookRepeat] = useState<"Low" | "Medium" | "High">("Medium");
  const [lyricsSource, setLyricsSource] = useState<"Studio Lyrics" | "Paste My Own" | "Instrumental Only">("Studio Lyrics");
  const [genderVoiceModel, setGenderVoiceModel] = useState<"Male" | "Female" | "Mixed" | "Random">("Random");
  const [performanceFeel, setPerformanceFeel] = useState("Smooth");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [upgradeTo, setUpgradeTo] = useState<Plan>("Creator Pro");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isHardening, setIsHardening] = useState(false);
  const [isCatchifying, setIsCatchifying] = useState(false);
  const [mutedStems, setMutedStems] = useState<Record<string, boolean>>({});
  const [stemVolumes, setStemVolumes] = useState<Record<string, number>>({
    instrumental: 80, leadVocal: 90, harmony: 60, adlibs: 50, bass: 75, percussion: 85,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [audioMixOpen, setAudioMixOpen] = useState(false);
  const [mobileCreateOpen, setMobileCreateOpen] = useState(true);

  const audioStudioRef = useRef<AudioStudioV2Handle>(null);

  const handleSendToAudio = (mode: QuickMode) => {
    if (!draft) return;
    const text = formatDraftForClipboard(draft, genre, mood);
    audioStudioRef.current?.sendLyrics(text, mode);
    setActiveTab("audio");
    setTimeout(() => {
      const el = document.getElementById("audio-studio-v2");
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }, 120);
  };

  useEffect(() => {
    if (status !== "generating") return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % generatingSteps.length;
      setGeneratingStep(i);
    }, 700);
    return () => clearInterval(interval);
  }, [status]);

  const runGeneration = async () => {
    setStatus("generating");
    setGeneratingStep(0);
    setSaved(false);
    incrementGeneration();
    const { languageFlavor: apiLanguageFlavor, dialectStyle: apiDialectStyle } = getApiLanguageParams(languageFlavor);
    try {
      const res = await fetch("/api/generate-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic, genre, mood, style, notes, songLength,
          languageFlavor: apiLanguageFlavor, dialectStyle: apiDialectStyle, customFlavor,
          dialectDepth, clarityMode, blendBalance: languageFlavor === "Mixed / Blend" ? blendBalance : undefined,
          voiceTexture: voiceTexture || undefined,
          commercialMode, lyricalDepth, hookRepeat, lyricsSource, genderVoiceModel, performanceFeel,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? "Generation failed");
      }
      const data = await res.json() as { draft: SongDraft };
      setDraft(data.draft);
      setStatus("done");
      toast({ title: "Draft ready!", description: `"${data.draft.title}" has been written.` });
    } catch (err) {
      setStatus("idle");
      toast({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast({ title: "Topic required", description: "Please enter a topic or theme for your song.", variant: "destructive" });
      return;
    }
    if (!canGenerate()) {
      setUpgradeTo("Creator Pro");
      setShowUpgradeModal(true);
      return;
    }
    setSeed((s) => s + 1);
    runGeneration();
  };

  const handleRegenerate = () => {
    if (!canGenerate()) { setUpgradeTo("Creator Pro"); setShowUpgradeModal(true); return; }
    setSeed((s) => s + 1);
    runGeneration();
  };

  const handleHumanizeLyrics = async () => {
    if (!draft || isHumanizing) return;
    setIsHumanizing(true);
    setSaved(false);
    const { languageFlavor: apiLanguageFlavor } = getApiLanguageParams(languageFlavor);
    try {
      const res = await fetch("/api/rewrite-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft, genre, mood, languageFlavor: apiLanguageFlavor, dialectDepth, clarityMode,
          lyricalDepth, hookRepeat, genderVoiceModel, performanceFeel,
          style: style || undefined, commercialMode,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: string }).error ?? "Rewrite failed"); }
      const data = await res.json() as { draft: SongDraft };
      setDraft(data.draft);
      toast({ title: "Lyrics humanized!", description: "AI lines rewritten by your session songwriter." });
    } catch (err) {
      toast({ title: "Humanize failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally { setIsHumanizing(false); }
  };

  const handleMakeItCatchier = async () => {
    if (!draft || isCatchifying) return;
    setIsCatchifying(true);
    setSaved(false);
    const { languageFlavor: apiLanguageFlavor } = getApiLanguageParams(languageFlavor);
    try {
      const res = await fetch("/api/catchier-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft, genre, mood, languageFlavor: apiLanguageFlavor, dialectDepth, clarityMode,
          lyricalDepth, hookRepeat, genderVoiceModel, performanceFeel,
          style: style || undefined, commercialMode,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: string }).error ?? "Rewrite failed"); }
      const data = await res.json() as { draft: SongDraft };
      setDraft(data.draft);
      toast({ title: "Hook upgraded.", description: "Your song just got catchier." });
    } catch (err) {
      toast({ title: "Make It Catchier failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally { setIsCatchifying(false); }
  };

  const handleMakeItHarder = async () => {
    if (!draft || isHardening) return;
    setIsHardening(true);
    setSaved(false);
    const { languageFlavor: apiLanguageFlavor } = getApiLanguageParams(languageFlavor);
    try {
      const res = await fetch("/api/harden-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft, genre, mood, languageFlavor: apiLanguageFlavor, dialectDepth, clarityMode,
          lyricalDepth, hookRepeat, genderVoiceModel, performanceFeel,
          style: style || undefined, commercialMode,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: string }).error ?? "Rewrite failed"); }
      const data = await res.json() as { draft: SongDraft };
      setDraft(data.draft);
      toast({ title: "Lyrics hit harder now.", description: "Your session songwriter punched up every line." });
    } catch (err) {
      toast({ title: "Make It Harder failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally { setIsHardening(false); }
  };

  const copyToClipboard = async () => {
    if (!draft) return;
    const text = formatDraftForClipboard(draft, genre, mood);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    toast({ title: "Copied!", description: "Full draft copied to clipboard." });
    setTimeout(() => setCopied(false), 2500);
  };

  const saveProject = async () => {
    if (!draft) return;
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    const beatDNA = audioStudioRef.current?.getBeatDNAState();
    try {
      const persistedSession = await saveCurrentSession({
        sessionId: activeSessionId ?? undefined,
        topic, genre, mood, songLength, lyricsSource, languageFlavor, dialectStyle,
        customFlavor, style, notes, commercialMode, lyricalDepth, hookRepeat,
        genderVoiceModel, performanceFeel,
        bounceStyle: beatDNA?.bounceStyle,
        melodyDensity: beatDNA?.melodyDensity,
        drumCharacter: beatDNA?.drumCharacter,
        hookLift: beatDNA?.hookLift,
        draft,
      });
      setActiveSessionId(persistedSession.sessionId);
      setSaved(true);
      toast({ title: "Session saved!", description: `"${draft.title}" saved to your Project Library.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401")) { setShowLoginModal(true); }
      else { toast({ title: "Save failed", description: "Could not save your project. Please try again.", variant: "destructive" }); }
    }
  };

  const handleResume = (session: SavedSession) => {
    const state = extractResumeState(session);
    setTopic(state.topic); setGenre(state.genre); setMood(state.mood);
    setSongLength(state.songLength as SongLength);
    setLyricsSource(state.lyricsSource as "Studio Lyrics" | "Paste My Own" | "Instrumental Only");
    setLanguageFlavor(state.languageFlavor);
    setDialectStyle(state.dialectStyle ?? "Auto");
    setCustomFlavor(state.customFlavor);
    setStyle(state.style); setNotes(state.notes);
    setCommercialMode(state.commercialMode);
    setLyricalDepth(state.lyricalDepth as "Simple" | "Balanced" | "Deep");
    setHookRepeat(state.hookRepeat as "Low" | "Medium" | "High");
    setGenderVoiceModel(state.genderVoiceModel as "Male" | "Female" | "Mixed" | "Random");
    setPerformanceFeel(state.performanceFeel);
    setDraft(state.draft);
    setActiveSessionId(state.sessionId);
    setSaved(false);
    setStatus(state.draft ? "done" : "idle");
    if (state.bounceStyle || state.melodyDensity || state.drumCharacter || state.hookLift) {
      audioStudioRef.current?.setBeatDNAState({
        bounceStyle: state.bounceStyle, melodyDensity: state.melodyDensity,
        drumCharacter: state.drumCharacter, hookLift: state.hookLift,
      });
    }
    toast({ title: "Session resumed", description: `"${state.sessionTitle}" loaded into the studio.` });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleMute = (stemId: string) => {
    setMutedStems((prev) => ({ ...prev, [stemId]: !prev[stemId] }));
  };

  const stemColorMap: Record<string, string> = {
    amber: "bg-amber-500/20 border-amber-500/30 text-amber-400",
    violet: "bg-violet-500/20 border-violet-500/30 text-violet-400",
    sky: "bg-sky-500/20 border-sky-500/30 text-sky-400",
    pink: "bg-pink-500/20 border-pink-500/30 text-pink-400",
    green: "bg-green-500/20 border-green-500/30 text-green-400",
    orange: "bg-orange-500/20 border-orange-500/30 text-orange-400",
  };

  const LYRICS_SECTIONS = draft ? [
    ...(draft.intro?.length ? [{ label: "Intro", lines: draft.intro }] : []),
    { label: "Hook", lines: draft.hook },
    { label: "Verse 1", lines: draft.verse1 },
    ...(draft.verse2?.length ? [{ label: "Verse 2", lines: draft.verse2 }] : []),
    ...(draft.bridge?.length ? [{ label: "Bridge", lines: draft.bridge }] : []),
    ...(draft.outro?.length ? [{ label: "Outro", lines: draft.outro }] : []),
  ] : [];

  return (
    <div className="min-h-screen bg-[#080810] text-white overflow-x-hidden">
      {/* Ambient bg glows */}
      <div className="fixed top-0 left-1/4 w-[800px] h-[400px] bg-amber-500/4 blur-[200px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-violet-500/5 blur-[200px] pointer-events-none rounded-full" />

      {/* ── UPGRADE MODAL ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-3xl border border-amber-500/25 bg-[#0d0d1a] shadow-2xl p-8 text-center relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 blur-3xl pointer-events-none bg-amber-500/15" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-amber-500/10 border border-amber-500/25">
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border mb-4 bg-amber-500/10 border-amber-500/25 text-amber-400">
                  Upgrade to {upgradeTo}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">You've Hit Your Limit</h3>
                <p className="text-sm text-white/50 mb-6 leading-relaxed">
                  {plan === "Free"
                    ? `You've used all ${PLAN_LIMITS.Free} Free generations. Upgrade to Creator Pro for unlimited.`
                    : "Upgrade to Artist Pro for the full creator toolkit and Artist DNA."}
                </p>
                <div className="flex flex-col gap-3">
                  <Link href="/pricing">
                    <button className="w-full h-12 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400 hover:to-amber-300 transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                      See Plans & Pricing
                    </button>
                  </Link>
                  <button onClick={() => setShowUpgradeModal(false)} className="w-full h-10 rounded-xl border border-white/8 text-sm text-white/40 hover:text-white hover:border-white/20 transition-all">
                    Maybe Later
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LOGIN MODAL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d0d1a] shadow-2xl p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
                <Lock className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Log in to save your work</h3>
              <p className="text-sm text-white/50 mb-6 leading-relaxed">
                Save your song drafts and access them from anywhere.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/auth?from=/studio">
                  <button className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                    Log In or Sign Up
                  </button>
                </Link>
                <button onClick={() => setShowLoginModal(false)} className="w-full h-10 rounded-xl border border-white/8 text-sm text-white/40 hover:text-white hover:border-white/20 transition-all">
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STUDIO SHELL ─────────────────────────────────────────────────── */}
      <div className="flex flex-col h-screen pt-16">

        {/* ── TOP HEADER BAR ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/6 bg-[#09090f]/90 backdrop-blur-xl shrink-0">

          {/* Branding */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.4)]">
              <Mic2 className="w-3.5 h-3.5 text-black" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black text-white tracking-tight">AfroMuse</span>
              <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-md">V3</span>
            </div>
          </div>

          {/* Center tabs */}
          <div className="flex items-center gap-1 bg-white/4 rounded-xl p-1 border border-white/6">
            {(["lyric", "audio", "release"] as StudioTab[]).map((tab) => {
              const labels: Record<StudioTab, string> = { lyric: "Lyric Studio", audio: "Audio Studio", release: "Release Mode" };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                    activeTab === tab
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-white/35 hover:text-white/60"
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Status pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
            status === "generating" ? "bg-amber-500/10 border-amber-500/25 text-amber-400" :
            status === "done" ? "bg-green-500/10 border-green-500/25 text-green-400" :
            "bg-white/4 border-white/8 text-white/30"
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              status === "generating" ? "bg-amber-400 animate-pulse" :
              status === "done" ? "bg-green-400" : "bg-white/25"
            }`} />
            {status === "idle" && "Ready"}
            {status === "generating" && "Writing..."}
            {status === "done" && "Draft Ready"}
          </div>
        </div>

        {/* ── MAIN BODY ─────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ══ LEFT SIDEBAR — CREATE PANEL (desktop only) ════════════════ */}
          <div className="hidden lg:flex w-72 shrink-0 border-r border-white/6 bg-[#090912] overflow-y-auto flex-col">
            <form onSubmit={handleGenerate} className="flex flex-col gap-4 p-4">

              {/* Header */}
              <div className="flex items-center gap-2 pt-1">
                <Wand2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Create</span>
              </div>

              {/* Song Idea */}
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Song Idea</label>
                <input
                  type="text"
                  placeholder="love in Lagos, hustle, heartbreak..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full h-10 rounded-xl bg-white/5 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/15 transition-all"
                />
              </div>

              {/* Genre */}
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Genre</label>
                <div className="relative">
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#111118] border border-white/8 px-3 pr-8 text-sm text-white focus:outline-none focus:border-amber-500/40 transition-all appearance-none cursor-pointer"
                  >
                    {GENRES.map((g) => <option key={g.value} value={g.value} className="bg-[#111118]">{g.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Mood</label>
                <div className="grid grid-cols-3 gap-1">
                  {MOODS.map((m) => (
                    <button
                      key={m.value} type="button"
                      onClick={() => setMood(m.value)}
                      className={`h-8 rounded-lg text-[11px] font-bold transition-all border ${
                        mood === m.value
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                          : "bg-white/3 border-white/6 text-white/30 hover:text-white/55 hover:border-white/15"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Language Style</label>
                <div className="relative">
                  <select
                    value={languageFlavor}
                    onChange={(e) => setLanguageFlavor(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#111118] border border-white/8 px-3 pr-8 text-sm text-white focus:outline-none focus:border-amber-500/40 transition-all appearance-none cursor-pointer"
                  >
                    {LANGUAGE_FLAVORS.map((f) => <option key={f.value} value={f.value} className="bg-[#111118]">{f.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                </div>
              </div>

              {/* Length */}
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Length</label>
                <div className="grid grid-cols-3 gap-1">
                  {SONG_LENGTHS.map((l) => (
                    <button
                      key={l.value} type="button"
                      onClick={() => setSongLength(l.value)}
                      className={`h-8 rounded-lg text-[11px] font-bold transition-all border ${
                        songLength === l.value
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                          : "bg-white/3 border-white/6 text-white/30 hover:text-white/55 hover:border-white/15"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt / extra direction */}
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Prompt / Direction</label>
                <textarea
                  placeholder="A line you want, a story, a feeling to chase..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/8 px-3 py-2.5 text-sm text-white placeholder:text-white/18 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/15 transition-all resize-none min-h-[80px]"
                />
              </div>

              {/* ── ADVANCED SONGWRITING CONTROLS ───────────────────────── */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (!hasAccess("Creator Pro")) {
                      setUpgradeTo("Creator Pro");
                      setShowSubscriptionModal(true);
                      return;
                    }
                    setShowAdvanced((v) => !v);
                  }}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-white/3 border border-white/6 hover:bg-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[11px] font-bold text-white/55 group-hover:text-white/75 transition-colors">Advanced Songwriting</span>
                    {!hasAccess("Creator Pro") && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500/70 border border-amber-500/25 bg-amber-500/8 px-1.5 py-0.5 rounded-md">
                        <Lock className="w-2.5 h-2.5" /> Creator Pro
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/25 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} />
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-4 px-0.5">

                    {/* Lyrical Depth */}
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Lyrical Depth</label>
                      <div className="grid grid-cols-3 gap-1">
                        {(["Simple", "Balanced", "Deep"] as const).map((v) => (
                          <button
                            key={v} type="button"
                            onClick={() => setLyricalDepth(v)}
                            className={`h-8 rounded-lg text-[11px] font-bold transition-all border ${
                              lyricalDepth === v
                                ? "bg-violet-500/15 border-violet-500/40 text-violet-400"
                                : "bg-white/3 border-white/6 text-white/30 hover:text-white/55 hover:border-white/15"
                            }`}
                          >{v}</button>
                        ))}
                      </div>
                    </div>

                    {/* Hook Repeat Level */}
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Hook Repeat Level</label>
                      <div className="grid grid-cols-3 gap-1">
                        {(["Low", "Medium", "High"] as const).map((v) => (
                          <button
                            key={v} type="button"
                            onClick={() => setHookRepeat(v)}
                            className={`h-8 rounded-lg text-[11px] font-bold transition-all border ${
                              hookRepeat === v
                                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                                : "bg-white/3 border-white/6 text-white/30 hover:text-white/55 hover:border-white/15"
                            }`}
                          >{v}</button>
                        ))}
                      </div>
                    </div>

                    {/* Gender / Voice Model */}
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Gender / Voice Model</label>
                      <div className="grid grid-cols-2 gap-1">
                        {(["Male", "Female", "Mixed", "Random"] as const).map((v) => (
                          <button
                            key={v} type="button"
                            onClick={() => setGenderVoiceModel(v)}
                            className={`h-8 rounded-lg text-[11px] font-bold transition-all border ${
                              genderVoiceModel === v
                                ? "bg-sky-500/15 border-sky-500/40 text-sky-400"
                                : "bg-white/3 border-white/6 text-white/30 hover:text-white/55 hover:border-white/15"
                            }`}
                          >{v}</button>
                        ))}
                      </div>
                    </div>

                    {/* Performance Feel */}
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Performance Feel</label>
                      <div className="grid grid-cols-2 gap-1">
                        {["Smooth", "Melodic", "Gritty", "Emotional", "Soulful", "Intimate", "Confident", "Airy", "Prayerful", "Street"].map((v) => (
                          <button
                            key={v} type="button"
                            onClick={() => setPerformanceFeel(v)}
                            className={`h-8 rounded-lg text-[11px] font-bold transition-all border ${
                              performanceFeel === v
                                ? "bg-pink-500/15 border-pink-500/40 text-pink-400"
                                : "bg-white/3 border-white/6 text-white/30 hover:text-white/55 hover:border-white/15"
                            }`}
                          >{v}</button>
                        ))}
                      </div>
                    </div>

                    {/* Dialect Depth */}
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Dialect Depth</label>
                      <div className="relative">
                        <select
                          value={dialectDepth}
                          onChange={(e) => setDialectDepth(e.target.value)}
                          className="w-full h-10 rounded-xl bg-[#111118] border border-white/8 px-3 pr-8 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-all appearance-none cursor-pointer"
                        >
                          {["Light Touch", "Balanced Native", "Deep Immersive", "Full Street"].map((v) => (
                            <option key={v} value={v} className="bg-[#111118]">{v}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                      </div>
                    </div>

                    {/* Sound Reference */}
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Sound Reference</label>
                      <input
                        type="text"
                        placeholder="e.g. Wizkid Essence vibes, Burna Boy Twice as Tall..."
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        className="w-full h-10 rounded-xl bg-white/5 border border-white/8 px-3 text-sm text-white placeholder:text-white/18 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/15 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Hitmaker toggle */}
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/3 border border-white/6">
                <div>
                  <p className="text-[11px] font-bold text-white/60">Hitmaker Mode</p>
                  <p className="text-[10px] text-white/25">Max hooks & singability</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCommercialMode((v) => !v)}
                  className={`relative w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${commercialMode ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" : "bg-white/10"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm ${commercialMode ? "left-[18px]" : "left-0.5"}`} />
                </button>
              </div>

              {/* Generate CTA */}
              <button
                type="submit"
                disabled={status === "generating"}
                className="w-full h-12 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400 hover:to-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === "generating" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="truncate max-w-[160px]">{generatingSteps[generatingStep]}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate V3 Song
                  </>
                )}
              </button>
            </form>

            {/* ── QUICK ACTIONS ──────────────────────────────────────────── */}
            <div className="px-4 pb-4 space-y-2 mt-1">
              <div className="flex items-center gap-1.5 mb-3">
                <Zap className="w-3 h-3 text-white/25" />
                <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Quick Actions</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!hasAccess("Creator Pro")) { setShowSubscriptionModal(true); return; }
                  handleHumanizeLyrics();
                }}
                disabled={!draft || isHumanizing}
                className="w-full flex items-center gap-2.5 h-9 px-3 rounded-xl bg-white/4 border border-white/6 text-xs font-semibold text-white/55 hover:text-white hover:bg-white/8 hover:border-white/12 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
              >
                {isHumanizing ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Wand2 className="w-3.5 h-3.5 shrink-0 text-violet-400" />}
                Humanize Lyrics
                {!hasAccess("Creator Pro") && <Lock className="w-3 h-3 ml-auto text-amber-500/50" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!hasAccess("Creator Pro")) { setShowSubscriptionModal(true); return; }
                  handleMakeItHarder();
                }}
                disabled={!draft || isHardening}
                className="w-full flex items-center gap-2.5 h-9 px-3 rounded-xl bg-white/4 border border-white/6 text-xs font-semibold text-white/55 hover:text-white hover:bg-white/8 hover:border-white/12 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
              >
                {isHardening ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Flame className="w-3.5 h-3.5 shrink-0 text-orange-400" />}
                Make It Harder
                {!hasAccess("Creator Pro") && <Lock className="w-3 h-3 ml-auto text-amber-500/50" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!hasAccess("Creator Pro")) { setShowSubscriptionModal(true); return; }
                  handleMakeItCatchier();
                }}
                disabled={!draft || isCatchifying}
                className="w-full flex items-center gap-2.5 h-9 px-3 rounded-xl bg-white/4 border border-white/6 text-xs font-semibold text-white/55 hover:text-white hover:bg-white/8 hover:border-white/12 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
              >
                {isCatchifying ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
                Make It Catchier
                {!hasAccess("Creator Pro") && <Lock className="w-3 h-3 ml-auto text-amber-500/50" />}
              </button>

              <button
                type="button"
                onClick={() => { if (draft) handleSendToAudio("instrumental"); }}
                disabled={!draft}
                className="w-full flex items-center gap-2.5 h-9 px-3 rounded-xl bg-white/4 border border-white/6 text-xs font-semibold text-white/55 hover:text-white hover:bg-white/8 hover:border-white/12 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <Music className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                Generate Melody
              </button>

              <button
                type="button"
                onClick={() => { if (draft) handleSendToAudio("afrobeats-demo"); }}
                disabled={!draft}
                className="w-full flex items-center gap-2.5 h-9 px-3 rounded-xl bg-white/4 border border-white/6 text-xs font-semibold text-white/55 hover:text-white hover:bg-white/8 hover:border-white/12 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <Mic2 className="w-3.5 h-3.5 shrink-0 text-pink-400" />
                Generate Voice Demo
              </button>

              {draft && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={status === "generating"}
                  className="w-full flex items-center gap-2.5 h-9 px-3 rounded-xl bg-white/4 border border-white/6 text-xs font-semibold text-white/40 hover:text-white/70 hover:bg-white/6 transition-all disabled:opacity-35"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  Regenerate
                </button>
              )}
            </div>

            {/* Project Library */}
            <div className="px-4 pb-4 mt-auto">
              <ProjectLibraryPanel onResume={handleResume} />
            </div>
          </div>

          {/* ══ CENTER PANEL — SONG WORKSPACE ══════════════════════════════ */}
          <div className="flex-1 overflow-y-auto bg-[#08080f]">

            {/* ══ MOBILE CREATE PANEL (hidden on desktop) ═════════════════ */}
            <div className="lg:hidden border-b border-white/6 bg-[#090912]">
              <button
                onClick={() => setMobileCreateOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white/70">Create Your Song</span>
                  {status === "done" && (
                    <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-green-500/12 border border-green-500/25 text-green-400">
                      Draft Ready
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-white/30 transition-transform duration-300 ${mobileCreateOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {mobileCreateOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <form onSubmit={(e) => { handleGenerate(e); setMobileCreateOpen(false); }} className="px-4 pb-5 space-y-4">

                      {/* Song Idea */}
                      <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Song Idea</label>
                        <input
                          type="text"
                          placeholder="love in Lagos, hustle, heartbreak..."
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="w-full h-11 rounded-xl bg-white/5 border border-white/8 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/15 transition-all"
                        />
                      </div>

                      {/* Genre + Language */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Genre</label>
                          <div className="relative">
                            <select
                              value={genre}
                              onChange={(e) => setGenre(e.target.value)}
                              className="w-full h-10 rounded-xl bg-[#111118] border border-white/8 px-3 pr-7 text-sm text-white focus:outline-none focus:border-amber-500/40 transition-all appearance-none cursor-pointer"
                            >
                              {GENRES.map((g) => <option key={g.value} value={g.value} className="bg-[#111118]">{g.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25 pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Language</label>
                          <div className="relative">
                            <select
                              value={languageFlavor}
                              onChange={(e) => setLanguageFlavor(e.target.value)}
                              className="w-full h-10 rounded-xl bg-[#111118] border border-white/8 px-3 pr-7 text-sm text-white focus:outline-none focus:border-amber-500/40 transition-all appearance-none cursor-pointer"
                            >
                              {LANGUAGE_FLAVORS.map((f) => <option key={f.value} value={f.value} className="bg-[#111118]">{f.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* Mood */}
                      <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Mood</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {MOODS.map((m) => (
                            <button
                              key={m.value} type="button"
                              onClick={() => setMood(m.value)}
                              className={`h-9 rounded-xl text-[11px] font-bold transition-all border ${
                                mood === m.value
                                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                                  : "bg-white/3 border-white/6 text-white/30"
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Length */}
                      <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Length</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {SONG_LENGTHS.map((l) => (
                            <button
                              key={l.value} type="button"
                              onClick={() => setSongLength(l.value)}
                              className={`h-9 rounded-xl text-[11px] font-bold transition-all border ${
                                songLength === l.value
                                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                                  : "bg-white/3 border-white/6 text-white/30"
                              }`}
                            >
                              {l.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Prompt */}
                      <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Direction / Prompt</label>
                        <textarea
                          placeholder="A line, a feeling, a story..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full rounded-xl bg-white/5 border border-white/8 px-3 py-2.5 text-sm text-white placeholder:text-white/18 focus:outline-none focus:border-amber-500/40 transition-all resize-none min-h-[72px]"
                        />
                      </div>

                      {/* Hitmaker toggle */}
                      <div className="flex items-center justify-between py-3 px-3 rounded-xl bg-white/3 border border-white/6">
                        <div>
                          <p className="text-sm font-bold text-white/60">Hitmaker Mode</p>
                          <p className="text-xs text-white/25">Max hooks & singability</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCommercialMode((v) => !v)}
                          className={`relative w-10 h-5.5 rounded-full transition-all duration-200 shrink-0 ${commercialMode ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" : "bg-white/10"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm ${commercialMode ? "left-[22px]" : "left-0.5"}`} />
                        </button>
                      </div>

                      {/* Generate CTA */}
                      <button
                        type="submit"
                        disabled={status === "generating"}
                        className="w-full h-13 rounded-xl font-bold text-base transition-all bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400 hover:to-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {status === "generating" ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>{generatingSteps[generatingStep]}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Generate V3 Song
                          </>
                        )}
                      </button>

                    </form>

                    {/* Quick Actions (mobile) */}
                    {draft && (
                      <div className="px-4 pb-5 pt-1 border-t border-white/5 space-y-2">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Zap className="w-3 h-3 text-white/25" />
                          <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Quick Actions</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "Humanize", icon: <Wand2 className="w-3.5 h-3.5 text-violet-400" />, action: () => { if (!hasAccess("Creator Pro")) { setShowSubscriptionModal(true); return; } handleHumanizeLyrics(); }, loading: isHumanizing, locked: !hasAccess("Creator Pro") },
                            { label: "Make Harder", icon: <Flame className="w-3.5 h-3.5 text-orange-400" />, action: () => { if (!hasAccess("Creator Pro")) { setShowSubscriptionModal(true); return; } handleMakeItHarder(); }, loading: isHardening, locked: !hasAccess("Creator Pro") },
                            { label: "Make Catchier", icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />, action: () => { if (!hasAccess("Creator Pro")) { setShowSubscriptionModal(true); return; } handleMakeItCatchier(); }, loading: isCatchifying, locked: !hasAccess("Creator Pro") },
                            { label: "Regenerate", icon: <RefreshCw className="w-3.5 h-3.5 text-white/40" />, action: handleRegenerate, loading: status === "generating", locked: false },
                          ].map(({ label, icon, action, loading, locked }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={action}
                              disabled={loading}
                              className="flex items-center gap-2 h-10 px-3 rounded-xl bg-white/4 border border-white/6 text-xs font-semibold text-white/55 hover:text-white hover:bg-white/8 transition-all disabled:opacity-35"
                            >
                              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : icon}
                              {label}
                              {locked && <Lock className="w-3 h-3 ml-auto text-amber-500/50" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {activeTab === "lyric" && (
              <div className="p-6 max-w-3xl mx-auto space-y-5">

                {/* Empty state */}
                {!draft && status !== "generating" && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-24 text-center"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
                      <Music className="w-9 h-9 text-amber-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Your workspace is empty</h2>
                    <p className="text-sm text-white/35 max-w-xs leading-relaxed">
                      Enter your song idea on the left and hit <span className="text-amber-400 font-semibold">Generate V3 Song</span> to start.
                    </p>
                  </motion.div>
                )}

                {/* Generating state */}
                {status === "generating" && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-24 text-center"
                  >
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                        <Loader2 className="w-9 h-9 text-amber-400 animate-spin" />
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 rounded-3xl border-2 border-amber-500/30"
                      />
                    </div>
                    <p className="text-sm font-semibold text-white/60 animate-pulse">{generatingSteps[generatingStep]}</p>
                  </motion.div>
                )}

                {/* Draft workspace */}
                {draft && status !== "generating" && (
                  <AnimatePresence>
                    <motion.div
                      key={`draft-${seed}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      className="space-y-5"
                    >
                      {/* Song header card */}
                      <div className="rounded-2xl border border-white/8 bg-gradient-to-r from-white/3 to-transparent p-5 flex items-start justify-between gap-4">
                        <div>
                          <h1 className="text-2xl font-black text-white leading-tight mb-1">{draft.title}</h1>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/12 border border-amber-500/25 text-amber-400 text-[11px] font-bold">{genre}</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-white/6 border border-white/8 text-white/45 text-[11px] font-bold">{mood}</span>
                            {draft.productionNotes?.key && (
                              <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[11px] font-bold">Key: {draft.productionNotes.key}</span>
                            )}
                            {draft.productionNotes?.bpm && (
                              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-bold">{draft.productionNotes.bpm} BPM</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={copyToClipboard}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/5 border border-white/8 text-xs font-semibold text-white/50 hover:text-white hover:bg-white/10 transition-all"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? "Copied" : "Copy"}
                          </button>
                          <button
                            onClick={saveProject}
                            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-all ${
                              saved
                                ? "bg-green-500/10 border-green-500/25 text-green-400"
                                : "bg-white/5 border-white/8 text-white/50 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                            {saved ? "Saved" : "Save"}
                          </button>
                          <button
                            onClick={() => handleSendToAudio("default")}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-amber-500/12 border border-amber-500/25 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all"
                          >
                            <Music className="w-3.5 h-3.5" />
                            To Audio
                          </button>
                        </div>
                      </div>

                      {/* Keeper line */}
                      {draft.keeperLine && (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Keeper Line</span>
                          </div>
                          <p className="text-base font-semibold text-white/90 italic leading-relaxed">"{draft.keeperLine}"</p>
                        </div>
                      )}

                      {/* Lyrics workspace */}
                      <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-white/2 to-transparent overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
                          <FileText className="w-3.5 h-3.5 text-white/30" />
                          <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Lyrics Workspace</span>
                        </div>
                        <div className="p-5 space-y-6">
                          {LYRICS_SECTIONS.map((section) => (
                            <div key={section.label}>
                              <div className="flex items-center gap-2 mb-2.5">
                                <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-md border ${
                                  section.label === "Hook"
                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                    : section.label.startsWith("Verse")
                                    ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                                    : section.label === "Bridge"
                                    ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                                    : "bg-white/6 border-white/8 text-white/35"
                                }`}>
                                  {section.label}
                                </span>
                              </div>
                              <div className="space-y-1 pl-1">
                                {section.lines.map((line, i) => (
                                  <p key={i} className={`text-sm leading-relaxed ${
                                    line === "" ? "h-3" : "text-white/80 hover:text-white transition-colors cursor-default"
                                  }`}>
                                    {line}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Generation Blueprint */}
                      {(draft.arrangementBlueprint || draft.sessionNotes || draft.productionNotes || draft.sonicIdentity || draft.vocalIdentity) && (
                        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/5 to-transparent overflow-hidden">
                          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-violet-500/10">
                            <Sliders className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Generation Blueprint</span>
                          </div>
                          <div className="p-5 space-y-5">

                            {/* Production Notes */}
                            {draft.productionNotes && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-3">
                                  <Zap className="w-3 h-3 text-amber-400" />
                                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Production Notes</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {draft.productionNotes.key && (
                                    <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-white/70">
                                      <span className="text-white/35 font-medium">Key</span>
                                      <span className="text-white/80 font-semibold">{draft.productionNotes.key}</span>
                                    </span>
                                  )}
                                  {draft.productionNotes.bpm && (
                                    <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-white/70">
                                      <span className="text-white/35 font-medium">BPM</span>
                                      <span className="text-white/80 font-semibold">{draft.productionNotes.bpm}</span>
                                    </span>
                                  )}
                                  {draft.productionNotes.energy && (
                                    <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-white/70">
                                      <span className="text-white/35 font-medium">Energy</span>
                                      <span className="text-white/80 font-semibold">{draft.productionNotes.energy}</span>
                                    </span>
                                  )}
                                  {draft.productionNotes.hookStrength && (
                                    <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/8 border border-amber-500/15 text-white/70">
                                      <span className="text-amber-400/60 font-medium">Hook</span>
                                      <span className="text-amber-300 font-semibold">{draft.productionNotes.hookStrength}</span>
                                    </span>
                                  )}
                                  {draft.productionNotes.lyricalDepth && (
                                    <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-white/70">
                                      <span className="text-white/35 font-medium">Depth</span>
                                      <span className="text-white/80 font-semibold">{draft.productionNotes.lyricalDepth}</span>
                                    </span>
                                  )}
                                </div>
                                {(draft.productionNotes.arrangement || draft.productionNotes.melodyDirection) && (
                                  <div className="mt-3 space-y-1.5">
                                    {draft.productionNotes.arrangement && (
                                      <p className="text-xs text-white/55 leading-relaxed">
                                        <span className="text-white/30 font-semibold mr-1">Arrangement:</span>
                                        {draft.productionNotes.arrangement}
                                      </p>
                                    )}
                                    {draft.productionNotes.melodyDirection && (
                                      <p className="text-xs text-white/55 leading-relaxed">
                                        <span className="text-white/30 font-semibold mr-1">Melody:</span>
                                        {draft.productionNotes.melodyDirection}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Sonic & Vocal Identity */}
                            {(draft.sonicIdentity || draft.vocalIdentity) && (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {draft.sonicIdentity && (
                                  <div className="rounded-xl border border-white/6 bg-white/3 p-3.5">
                                    <div className="flex items-center gap-1.5 mb-2.5">
                                      <Dna className="w-3 h-3 text-violet-400" />
                                      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Sonic Identity</span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {draft.sonicIdentity.coreBounce && (
                                        <p className="text-[11px] text-white/60 leading-relaxed">
                                          <span className="text-white/30 font-semibold">Bounce: </span>{draft.sonicIdentity.coreBounce}
                                        </p>
                                      )}
                                      {draft.sonicIdentity.atmosphere && (
                                        <p className="text-[11px] text-white/60 leading-relaxed">
                                          <span className="text-white/30 font-semibold">Atmosphere: </span>{draft.sonicIdentity.atmosphere}
                                        </p>
                                      )}
                                      {draft.sonicIdentity.mainTexture && (
                                        <p className="text-[11px] text-white/60 leading-relaxed">
                                          <span className="text-white/30 font-semibold">Texture: </span>{draft.sonicIdentity.mainTexture}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {draft.vocalIdentity && (
                                  <div className="rounded-xl border border-white/6 bg-white/3 p-3.5">
                                    <div className="flex items-center gap-1.5 mb-2.5">
                                      <Mic2 className="w-3 h-3 text-sky-400" />
                                      <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Vocal Identity</span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {draft.vocalIdentity.leadType && (
                                        <p className="text-[11px] text-white/60 leading-relaxed">
                                          <span className="text-white/30 font-semibold">Lead: </span>{draft.vocalIdentity.leadType}
                                        </p>
                                      )}
                                      {draft.vocalIdentity.deliveryStyle && (
                                        <p className="text-[11px] text-white/60 leading-relaxed">
                                          <span className="text-white/30 font-semibold">Delivery: </span>{draft.vocalIdentity.deliveryStyle}
                                        </p>
                                      )}
                                      {draft.vocalIdentity.emotionalTone && (
                                        <p className="text-[11px] text-white/60 leading-relaxed">
                                          <span className="text-white/30 font-semibold">Tone: </span>{draft.vocalIdentity.emotionalTone}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Arrangement Blueprint */}
                            {draft.arrangementBlueprint && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-2.5">
                                  <Guitar className="w-3 h-3 text-violet-400" />
                                  <span className="text-[10px] font-bold text-violet-400/80 uppercase tracking-widest">Arrangement Blueprint</span>
                                </div>
                                <p className="text-xs text-white/55 leading-relaxed whitespace-pre-line">{draft.arrangementBlueprint}</p>
                              </div>
                            )}

                            {/* Session Notes */}
                            {draft.sessionNotes && (
                              <div className="rounded-xl border border-amber-500/12 bg-amber-500/4 p-3.5">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Session Brief</span>
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.sessionNotes}</p>
                              </div>
                            )}

                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            )}

            {activeTab === "audio" && (
              <div className="p-4" id="audio-studio-v2">
                <AudioStudioV2 ref={audioStudioRef} draft={draft} genre={genre} mood={mood} />
              </div>
            )}

            {activeTab === "release" && (
              <div className="flex flex-col items-center justify-center py-32 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5">
                  <Radio className="w-7 h-7 text-violet-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Release Mode</h2>
                <p className="text-sm text-white/35 max-w-xs leading-relaxed">
                  Distribution, promo assets, and release scheduling — coming to AfroMuse V3.
                </p>
              </div>
            )}

            {/* ══ MOBILE AUDIO MIX PANEL (hidden on desktop) ══════════════ */}
            <div className="lg:hidden border-t border-white/6 bg-[#090912]">
              <button
                onClick={() => setAudioMixOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-white/30" />
                  <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Audio Mix & Output</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-white/30 transition-transform duration-300 ${audioMixOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {audioMixOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-6 space-y-6">

                      {/* Output stats */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <Zap className="w-3.5 h-3.5 text-white/25" />
                          <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Output</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {[
                            { label: "Key",    value: draft?.productionNotes?.key ?? "—" },
                            { label: "BPM",    value: draft?.productionNotes?.bpm ?? "—" },
                            { label: "Energy", value: draft?.productionNotes?.energy ?? "—" },
                            { label: "Hook",   value: draft?.productionNotes?.hookStrength ?? "—" },
                          ].map((item) => (
                            <div key={item.label} className="rounded-xl bg-white/3 border border-white/6 px-2 py-2.5 text-center">
                              <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-1">{item.label}</p>
                              <p className="text-sm font-bold text-white/70 truncate">{item.value}</p>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => { if (draft) handleSendToAudio("default"); else toast({ title: "No song yet", description: "Generate a song first.", variant: "destructive" }); }}
                          className="w-full h-11 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 transition-all shadow-[0_0_16px_rgba(139,92,246,0.25)] flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Render Final Demo
                        </button>
                      </div>

                      {/* Stem channels */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <Sliders className="w-3.5 h-3.5 text-white/25" />
                          <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Stem Channels</span>
                        </div>
                        <div className="space-y-3">
                          {STEMS.map((stem) => {
                            const isMuted = mutedStems[stem.id];
                            const vol = stemVolumes[stem.id] ?? 75;
                            const colorClass = stemColorMap[stem.color] ?? "bg-white/8 border-white/10 text-white/50";
                            return (
                              <div key={stem.id} className="rounded-xl border border-white/6 bg-white/2 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md border ${colorClass}`}>
                                    {stem.label}
                                  </span>
                                  <button
                                    onClick={() => toggleMute(stem.id)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                      isMuted ? "bg-red-500/20 border border-red-500/30" : "bg-white/5 border border-white/8 hover:bg-white/10"
                                    }`}
                                  >
                                    {isMuted
                                      ? <VolumeX className="w-4 h-4 text-red-400" />
                                      : <Volume1 className="w-4 h-4 text-white/35" />
                                    }
                                  </button>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={isMuted ? 0 : vol}
                                  onChange={(e) => setStemVolumes((prev) => ({ ...prev, [stem.id]: Number(e.target.value) }))}
                                  className="w-full h-2 rounded-full appearance-none bg-white/8 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/60"
                                />
                                <div className="flex justify-between">
                                  <span className="text-[10px] text-white/20">0</span>
                                  <span className="text-[10px] text-white/40 font-mono font-semibold">{isMuted ? "MUTED" : `${vol}%`}</span>
                                  <span className="text-[10px] text-white/20">100</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Artist DNA */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <Dna className="w-3.5 h-3.5 text-violet-400/50" />
                          <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Artist DNA</span>
                          {!hasAccess("Artist Pro") && <Lock className="w-3 h-3 text-white/15 ml-auto" />}
                        </div>
                        {hasAccess("Artist Pro") ? (
                          <div className="space-y-2">
                            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                              <p className="text-xs text-violet-400 font-semibold mb-1">Style Active</p>
                              <p className="text-xs text-white/40 leading-relaxed">Artist DNA is shaping every generation based on your style profile.</p>
                            </div>
                            <button className="w-full h-10 rounded-xl text-xs font-bold border border-violet-500/25 bg-violet-500/8 text-violet-400 hover:bg-violet-500/15 transition-all">
                              Edit Artist DNA →
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowSubscriptionModal(true)}
                            className="w-full rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-left hover:border-violet-500/35 hover:bg-violet-500/8 transition-all group"
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Crown className="w-3.5 h-3.5 text-violet-400/60" />
                              <p className="text-xs font-bold text-violet-400/60">Artist Pro Feature</p>
                            </div>
                            <p className="text-xs text-white/30 leading-relaxed">Train AfroMuse on your sound for personalized generations.</p>
                            <p className="text-xs font-bold text-violet-400/50 mt-2 group-hover:text-violet-400 transition-colors">Unlock Artist DNA →</p>
                          </button>
                        )}
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* ══ RIGHT SIDEBAR — AUDIO STACK (desktop only) ════════════════ */}
          <div className="hidden lg:flex w-64 shrink-0 border-l border-white/6 bg-[#090912] overflow-y-auto flex-col">

            {/* Stems */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 pt-1 mb-3">
                <Sliders className="w-3.5 h-3.5 text-white/25" />
                <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Audio Stack</span>
              </div>

              {STEMS.map((stem) => {
                const isMuted = mutedStems[stem.id];
                const vol = stemVolumes[stem.id] ?? 75;
                const colorClass = stemColorMap[stem.color] ?? "bg-white/8 border-white/10 text-white/50";
                return (
                  <div key={stem.id} className="rounded-xl border border-white/6 bg-white/2 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md border ${colorClass}`}>
                        {stem.label}
                      </span>
                      <button
                        onClick={() => toggleMute(stem.id)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                          isMuted ? "bg-red-500/20 border border-red-500/30" : "bg-white/5 border border-white/8 hover:bg-white/10"
                        }`}
                      >
                        {isMuted
                          ? <VolumeX className="w-3 h-3 text-red-400" />
                          : <Volume1 className="w-3 h-3 text-white/35" />
                        }
                      </button>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={isMuted ? 0 : vol}
                      onChange={(e) => setStemVolumes((prev) => ({ ...prev, [stem.id]: Number(e.target.value) }))}
                      className="w-full h-1 rounded-full appearance-none bg-white/8 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/60"
                    />
                    <div className="flex justify-between">
                      <span className="text-[9px] text-white/20">0</span>
                      <span className="text-[9px] text-white/35 font-mono">{isMuted ? "MUTED" : `${vol}%`}</span>
                      <span className="text-[9px] text-white/20">100</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── ARTIST DNA PANEL (Artist Pro) ──────────────────────── */}
            <div className="p-4 border-t border-white/6">
              <div className="flex items-center gap-1.5 mb-3">
                <Dna className="w-3.5 h-3.5 text-violet-400/50" />
                <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Artist DNA</span>
                {!hasAccess("Artist Pro") && <Lock className="w-3 h-3 text-white/15 ml-auto" />}
              </div>
              {hasAccess("Artist Pro") ? (
                <div className="space-y-2">
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                    <p className="text-[10px] text-violet-400 font-semibold mb-1">Style Active</p>
                    <p className="text-[10px] text-white/40 leading-relaxed">Artist DNA is shaping every generation based on your style profile.</p>
                  </div>
                  <button className="w-full h-8 rounded-lg text-[10px] font-bold border border-violet-500/25 bg-violet-500/8 text-violet-400 hover:bg-violet-500/15 transition-all">
                    Edit Artist DNA →
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="w-full rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-left hover:border-violet-500/35 hover:bg-violet-500/8 transition-all group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Crown className="w-3 h-3 text-violet-400/60" />
                    <p className="text-[10px] font-bold text-violet-400/60">Artist Pro Feature</p>
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed">Train AfroMuse on your sound for personalized generations.</p>
                  <p className="text-[10px] font-bold text-violet-400/50 mt-2 group-hover:text-violet-400 transition-colors">Unlock Artist DNA →</p>
                </button>
              )}
            </div>

            {/* Output panel */}
            <div className="p-4 mt-auto border-t border-white/6 space-y-3">
              <div className="flex items-center gap-1.5 mb-3">
                <Zap className="w-3.5 h-3.5 text-white/25" />
                <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Output</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Key", value: draft?.productionNotes?.key ?? "—" },
                  { label: "BPM", value: draft?.productionNotes?.bpm ?? "—" },
                  { label: "Energy", value: draft?.productionNotes?.energy ?? "—" },
                  { label: "Hook", value: draft?.productionNotes?.hookStrength ?? "—" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-white/3 border border-white/6 px-3 py-2 text-center">
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-0.5">{item.label}</p>
                    <p className="text-sm font-bold text-white/70 truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { if (draft) handleSendToAudio("default"); else toast({ title: "No song yet", description: "Generate a song first.", variant: "destructive" }); }}
                className="w-full h-10 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 transition-all shadow-[0_0_16px_rgba(139,92,246,0.25)] flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                Render Final Demo
              </button>
            </div>
          </div>

        </div>
      </div>

      <SubscriptionModal
        open={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        defaultPlan={upgradeTo === "Artist Pro" ? "artist-pro" : "creator-pro"}
      />
    </div>
  );
}
