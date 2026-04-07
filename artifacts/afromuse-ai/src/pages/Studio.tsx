import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Copy, Save, Loader2, Music, RefreshCw,
  ChevronDown, Sliders, Volume2, Music2, Download, Check, Lock,
  Mic2, Wand2, FileText, RotateCcw, Zap, Guitar, Radio, Key, Pen, Flame,
} from "lucide-react";
import BringToLifeCard from "@/components/audio/BringToLifeCard";
import SendToAudioCard from "@/components/audio/SendToAudioCard";
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
  { value: "Energetic", label: "Energetic / Party" },
  { value: "Sad", label: "Sad / Heartbreak" },
  { value: "Spiritual", label: "Spiritual / Deep" },
  { value: "Confident", label: "Confident / Flex" },
];

const SONG_LENGTHS = [
  { value: "Short", label: "Short", hint: "Quick idea / rough concept" },
  { value: "Standard", label: "Standard", hint: "Full balanced draft (recommended)" },
  { value: "Full", label: "Full", hint: "Most developed & detailed" },
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

const DIALECT_DEPTH_OPTIONS = [
  { value: "Light Accent", label: "Light Accent", hint: "Soft local flavor, mostly understandable" },
  { value: "Balanced Native", label: "Balanced Native", hint: "Authentic and natural without overdoing slang" },
  { value: "Deep Native / Street", label: "Deep Native / Street", hint: "Strong local identity, raw and immersive" },
] as const;

const CLARITY_MODE_OPTIONS = [
  { value: "Radio Clean", label: "Radio Clean", hint: "Catchy, polished, broad appeal" },
  { value: "Artist Real", label: "Artist Real", hint: "Authentic, emotional, natural writing" },
  { value: "Raw Street", label: "Raw Street", hint: "Rougher, grittier, more local edge" },
] as const;

const BLEND_BALANCE_OPTIONS = [
  { value: "Mostly English", label: "Mostly English" },
  { value: "Balanced Mix", label: "Balanced Mix" },
  { value: "Mostly Local", label: "Mostly Local" },
] as const;

const VOICE_TEXTURE_OPTIONS = [
  { value: "Romantic / Melodic", label: "Romantic / Melodic" },
  { value: "Street / Gritty", label: "Street / Gritty" },
  { value: "Spiritual / Conscious", label: "Spiritual / Conscious" },
  { value: "Pain / Reflective", label: "Pain / Reflective" },
  { value: "Confident / Bossy", label: "Confident / Bossy" },
] as const;

function getApiLanguageParams(flavor: string): { languageFlavor: string; dialectStyle: string | undefined } {
  switch (flavor) {
    case "Naija Melodic Pidgin":
      return { languageFlavor: "Naija Melodic Pidgin", dialectStyle: "Naija Melodic Pidgin" };
    case "Naija Street Pidgin":
      return { languageFlavor: "Naija Street Pidgin", dialectStyle: "Naija Street Pidgin" };
    case "Ghana Urban Pidgin":
      return { languageFlavor: "Ghana Urban Pidgin", dialectStyle: "Ghana Urban Pidgin" };
    case "Afro-fusion Clean Pidgin":
      return { languageFlavor: "Afro-fusion Clean Pidgin", dialectStyle: "Afro-fusion Clean Pidgin" };
    case "Jamaican Street Patois":
      return { languageFlavor: "Jamaican Patois", dialectStyle: "Jamaican Street" };
    case "Jamaican Spiritual Patois":
      return { languageFlavor: "Jamaican Patois", dialectStyle: "Jamaican Spiritual" };
    case "Mixed / Blend":
      return { languageFlavor: "Mixed / Blend", dialectStyle: undefined };
    default:
      return { languageFlavor: "Global English", dialectStyle: undefined };
  }
}

export default function Studio() {
  const { toast } = useToast();
  const { isLoggedIn } = useAuth();
  const { saveCurrentSession } = useProjectLibrary();
  const {
    plan,
    hasAccess,
    generationsUsed,
    generationsLimit,
    generationsRemaining,
    audioTrialsLeft,
    collabTrialsLeft,
    canGenerate,
    incrementGeneration,
  } = usePlan();

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
  const [upgradeTo, setUpgradeTo] = useState<Plan>("Pro");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isHardening, setIsHardening] = useState(false);

  const audioStudioRef = useRef<AudioStudioV2Handle>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSendToAudio = (mode: QuickMode) => {
    if (!draft) return;
    const text = formatDraftForClipboard(draft, genre, mood);
    audioStudioRef.current?.sendLyrics(text, mode);
    setTimeout(() => {
      const el = document.getElementById("audio-studio-v2");
      if (el) {
        const offset = 80;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }, 120);
  };

  useEffect(() => {
    if (status === "generating") {
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % generatingSteps.length;
        setGeneratingStep(i);
      }, 700);
      return () => clearInterval(interval);
    }
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
      toast({
        title: "Topic required",
        description: "Please enter a topic or theme for your song.",
        variant: "destructive",
      });
      return;
    }
    if (!canGenerate()) {
      setUpgradeTo("Pro");
      setShowUpgradeModal(true);
      return;
    }
    setSeed((s) => s + 1);
    runGeneration();
    setTimeout(() => {
      if (resultsRef.current) {
        const offset = 80;
        const top = resultsRef.current.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }, 50);
  };

  const handleRegenerate = () => {
    if (!canGenerate()) {
      setUpgradeTo("Pro");
      setShowUpgradeModal(true);
      return;
    }
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
          draft,
          genre,
          mood,
          languageFlavor: apiLanguageFlavor,
          dialectDepth,
          clarityMode,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? "Rewrite failed");
      }
      const data = await res.json() as { draft: SongDraft };
      setDraft(data.draft);
      toast({ title: "Lyrics humanized!", description: "AI lines rewritten by your session songwriter." });
    } catch (err) {
      toast({
        title: "Humanize failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsHumanizing(false);
    }
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
          draft,
          genre,
          mood,
          languageFlavor: apiLanguageFlavor,
          dialectDepth,
          clarityMode,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? "Rewrite failed");
      }
      const data = await res.json() as { draft: SongDraft };
      setDraft(data.draft);
      toast({ title: "Lyrics hit harder now.", description: "Your session songwriter punched up every line." });
    } catch (err) {
      toast({
        title: "Make It Harder failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsHardening(false);
    }
  };

  const handleClear = () => {
    setTopic("");
    setGenre("Afrobeats");
    setMood("Uplifting");
    setSongLength("Standard");
    setLanguageFlavor("English");
    setDialectStyle("Auto");
    setCustomFlavor("");
    setDialectDepth("Balanced Native");
    setClarityMode("Artist Real");
    setBlendBalance("Balanced Mix");
    setVoiceTexture("");
    setStyle("");
    setNotes("");
    setCommercialMode(false);
    setLyricalDepth("Balanced");
    setHookRepeat("Medium");
    setLyricsSource("Studio Lyrics");
    setGenderVoiceModel("Random");
    setPerformanceFeel("Smooth");
    setStatus("idle");
    setDraft(null);
    setSeed(0);
    setSaved(false);
    setActiveSessionId(null);
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
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    const beatDNA = audioStudioRef.current?.getBeatDNAState();
    try {
      const persistedSession = await saveCurrentSession({
        sessionId: activeSessionId ?? undefined,
        topic,
        genre,
        mood,
        songLength,
        lyricsSource,
        languageFlavor,
        dialectStyle,
        customFlavor,
        style,
        notes,
        commercialMode,
        lyricalDepth,
        hookRepeat,
        genderVoiceModel,
        performanceFeel,
        bounceStyle: beatDNA?.bounceStyle,
        melodyDensity: beatDNA?.melodyDensity,
        drumCharacter: beatDNA?.drumCharacter,
        hookLift: beatDNA?.hookLift,
        draft,
      });
      setActiveSessionId(persistedSession.sessionId);
      setSaved(true);
      toast({
        title: "Session saved!",
        description: `"${draft.title}" saved to your Project Library.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401")) {
        setShowLoginModal(true);
      } else {
        toast({
          title: "Save failed",
          description: "Could not save your project. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleResume = (session: SavedSession) => {
    const state = extractResumeState(session);
    setTopic(state.topic);
    setGenre(state.genre);
    setMood(state.mood);
    setSongLength(state.songLength as SongLength);
    setLyricsSource(state.lyricsSource as "Studio Lyrics" | "Paste My Own" | "Instrumental Only");
    setLanguageFlavor(state.languageFlavor);
    setDialectStyle(state.dialectStyle ?? "Auto");
    setCustomFlavor(state.customFlavor);
    setStyle(state.style);
    setNotes(state.notes);
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
        bounceStyle: state.bounceStyle,
        melodyDensity: state.melodyDensity,
        drumCharacter: state.drumCharacter,
        hookLift: state.hookLift,
      });
    }
    toast({
      title: "Session resumed",
      description: `"${state.sessionTitle}" loaded into the studio.`,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-background relative overflow-x-hidden">
      {/* Ambient glows */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-secondary/8 blur-[180px] pointer-events-none rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[180px] pointer-events-none rounded-full translate-x-1/3 translate-y-1/3" />

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-sm rounded-3xl border shadow-2xl p-8 text-center relative overflow-hidden ${
                upgradeTo === "Gold" ? "border-yellow-500/30 bg-[#0f0f0a]" : "border-primary/30 bg-[#0d0d1a]"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 blur-3xl pointer-events-none ${upgradeTo === "Gold" ? "bg-yellow-500/20" : "bg-primary/20"}`} />
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${upgradeTo === "Gold" ? "bg-yellow-500/15 border border-yellow-500/30" : "bg-primary/10 border border-primary/20"}`}>
                  <Sparkles className={`w-6 h-6 ${upgradeTo === "Gold" ? "text-yellow-400" : "text-primary"}`} />
                </div>
                <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border mb-4 ${upgradeTo === "Gold" ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400" : "bg-primary/15 border-primary/30 text-primary"}`}>
                  Upgrade to {upgradeTo}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {upgradeTo === "Gold" ? "Unlock Gold Features" : "You've Hit Your Limit"}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  {upgradeTo === "Gold"
                    ? "Collaboration mode, custom instrumentals, and voice cloning are all waiting for you on Gold."
                    : plan === "Free"
                      ? `You've used all ${PLAN_LIMITS.Free} Free generations. Upgrade to Pro for up to ${PLAN_LIMITS.Pro} per month.`
                      : `Upgrade to Gold for unlimited song generations and the full creator toolkit.`}
                </p>
                <div className="flex flex-col gap-3">
                  <Link href="/pricing">
                    <button className={`w-full h-12 rounded-xl font-semibold text-sm transition-all ${upgradeTo === "Gold" ? "bg-gradient-to-r from-yellow-500 to-amber-400 text-black hover:from-yellow-400 hover:to-amber-300 shadow-[0_0_20px_rgba(234,179,8,0.3)]" : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(245,158,11,0.25)]"}`}>
                      See Plans & Pricing
                    </button>
                  </Link>
                  <button onClick={() => setShowUpgradeModal(false)} className="w-full h-10 rounded-xl border border-white/8 text-sm text-muted-foreground hover:text-white hover:border-white/20 transition-all">
                    Maybe Later
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Gate Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
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
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Log in to save your work</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Save your song drafts and access them from anywhere. Create a free account to get started.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/auth?from=/studio">
                  <button className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all">
                    Log In or Sign Up
                  </button>
                </Link>
                <button onClick={() => setShowLoginModal(false)} className="w-full h-10 rounded-xl border border-white/8 text-sm text-muted-foreground hover:text-white hover:border-white/20 transition-all">
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">

        {/* PAGE HEADER */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <Mic2 className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[11px] font-bold tracking-widest text-primary/70 uppercase">AfroMuse Studio</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 leading-tight">
                Your Creative Workspace
              </h1>
              <p className="text-muted-foreground text-sm md:text-base max-w-lg">
                Describe your vibe, pick your sound, and get a full song structure — hook, verses, bridge, and production notes — in seconds.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {commercialMode && status !== "generating" && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-[10px] font-bold tracking-widest uppercase text-primary">
                  <Zap className="w-3 h-3" />
                  Hitmaker Mode
                </div>
              )}
              <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-semibold transition-all ${
                status === "idle" ? "bg-white/3 border-white/8 text-muted-foreground" :
                status === "generating" ? "bg-amber-500/10 border-amber-500/25 text-amber-400" :
                "bg-green-500/10 border-green-500/25 text-green-400"
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  status === "idle" ? "bg-muted-foreground/50" :
                  status === "generating" ? "bg-amber-400 animate-pulse" :
                  "bg-green-400"
                }`} />
                {status === "idle" && "Ready to Create"}
                {status === "generating" && "Composing..."}
                {status === "done" && "Draft Ready"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 xl:gap-8 items-start">

          {/* ── LEFT PANEL: Library + Form ───────────────────────────── */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-4">

            {/* Project Library Panel */}
            <ProjectLibraryPanel onResume={handleResume} />

            <div className="rounded-3xl border border-white/8 bg-gradient-to-b from-[#0e0e1a] to-[#090912] backdrop-blur-xl shadow-2xl overflow-hidden">

              {/* Form header */}
              <div className="px-6 pt-6 pb-5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-white">Song Details</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Tell AfroMuse your story</p>
              </div>

              <form onSubmit={handleGenerate} className="p-6 space-y-5">

                {/* Topic */}
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                    Your Song Idea <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. love in Lagos, hustle, heartbreak at 3am"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full h-12 rounded-xl bg-white/4 border border-white/10 px-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  <p className="text-[11px] text-white/25 mt-1.5">The theme or story at the heart of the song</p>
                </div>

                {/* Genre + Mood grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5">Genre</label>
                    <div className="relative">
                      <select
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="w-full h-12 rounded-xl bg-[#13131f] border border-white/10 px-3 pr-8 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                      >
                        {GENRES.map((g) => (
                          <option key={g.value} value={g.value} className="bg-[#13131f]">{g.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5">Mood</label>
                    <div className="relative">
                      <select
                        value={mood}
                        onChange={(e) => setMood(e.target.value)}
                        className="w-full h-12 rounded-xl bg-[#13131f] border border-white/10 px-3 pr-8 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                      >
                        {MOODS.map((m) => (
                          <option key={m.value} value={m.value} className="bg-[#13131f]">{m.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Song Length */}
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                    Song Length
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SONG_LENGTHS.map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        onClick={() => setSongLength(l.value)}
                        className={`h-10 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                          songLength === l.value
                            ? "bg-primary/15 border-primary/50 text-primary shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                            : "bg-white/3 border-white/8 text-white/40 hover:text-white/70 hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/25 mt-1.5">
                    {SONG_LENGTHS.find((l) => l.value === songLength)?.hint}
                  </p>
                </div>

                {/* Language & Voice */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-white/80 uppercase tracking-wider">Language &amp; Voice</p>
                    <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">Choose how the lyrics should sound culturally, emotionally, and street-wise. Controls vocabulary, phrasing, realism, and dialect depth.</p>
                  </div>

                  {/* Field 1 — Language Style */}
                  <div>
                    <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">Language Style</label>
                    <div className="relative">
                      <select
                        value={languageFlavor}
                        onChange={(e) => setLanguageFlavor(e.target.value)}
                        className="w-full h-12 rounded-xl bg-[#13131f] border border-white/10 px-3 pr-8 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                      >
                        {LANGUAGE_FLAVORS.map((f) => (
                          <option key={f.value} value={f.value} className="bg-[#13131f]">{f.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    </div>
                  </div>

                  {/* Field 2 — Dialect Depth */}
                  <div>
                    <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Dialect Depth</label>
                    <p className="text-[11px] text-white/25 mb-1.5">How native should the language feel?</p>
                    <div className="flex gap-1.5">
                      {DIALECT_DEPTH_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDialectDepth(opt.value)}
                          title={opt.hint}
                          className={`flex-1 h-9 rounded-xl text-[11px] font-bold tracking-wide transition-all border truncate px-1 ${
                            dialectDepth === opt.value
                              ? "bg-primary/15 border-primary/45 text-primary shadow-[0_0_10px_rgba(251,191,36,0.1)]"
                              : "bg-white/3 border-white/8 text-white/35 hover:text-white/60 hover:border-white/20 hover:bg-white/5"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-white/20 mt-1">
                      {DIALECT_DEPTH_OPTIONS.find(o => o.value === dialectDepth)?.hint}
                    </p>
                  </div>

                  {/* Field 3 — Clarity Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Clarity Mode</label>
                    <p className="text-[11px] text-white/25 mb-1.5">How polished or raw should the lyrics sound?</p>
                    <div className="flex gap-1.5">
                      {CLARITY_MODE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setClarityMode(opt.value)}
                          title={opt.hint}
                          className={`flex-1 h-9 rounded-xl text-[11px] font-bold tracking-wide transition-all border truncate px-1 ${
                            clarityMode === opt.value
                              ? "bg-primary/15 border-primary/45 text-primary shadow-[0_0_10px_rgba(251,191,36,0.1)]"
                              : "bg-white/3 border-white/8 text-white/35 hover:text-white/60 hover:border-white/20 hover:bg-white/5"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-white/20 mt-1">
                      {CLARITY_MODE_OPTIONS.find(o => o.value === clarityMode)?.hint}
                    </p>
                  </div>

                  {/* Field 4 — Blend Balance (only when Mixed / Blend selected) */}
                  {languageFlavor === "Mixed / Blend" && (
                    <div>
                      <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Blend Balance</label>
                      <p className="text-[11px] text-white/25 mb-1.5">Control how much local language appears versus clean English.</p>
                      <div className="flex gap-1.5">
                        {BLEND_BALANCE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setBlendBalance(opt.value)}
                            className={`flex-1 h-9 rounded-xl text-[11px] font-bold tracking-wide transition-all border truncate px-1 ${
                              blendBalance === opt.value
                                ? "bg-secondary/15 border-secondary/45 text-secondary shadow-[0_0_10px_rgba(139,92,246,0.12)]"
                                : "bg-white/3 border-white/8 text-white/35 hover:text-white/60 hover:border-white/20 hover:bg-white/5"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Field 5 — Voice Texture (optional) */}
                  <div>
                    <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">
                      Voice Texture <span className="text-white/25 font-normal normal-case tracking-normal">optional</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {VOICE_TEXTURE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setVoiceTexture(voiceTexture === opt.value ? "" : opt.value)}
                          className={`h-8 px-3 rounded-xl text-[11px] font-bold tracking-wide transition-all border ${
                            voiceTexture === opt.value
                              ? "bg-secondary/15 border-secondary/45 text-secondary shadow-[0_0_10px_rgba(139,92,246,0.12)]"
                              : "bg-white/3 border-white/8 text-white/35 hover:text-white/60 hover:border-white/20 hover:bg-white/5"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-white/20 mt-1">Shapes the emotional phrasing style inside the dialect</p>
                  </div>
                </div>


                {/* Style / Sound Reference */}
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                    Sound Reference <span className="text-white/30 font-normal normal-case tracking-normal">optional</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Burna Boy energy, late-night slow wave"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full h-12 rounded-xl bg-white/4 border border-white/10 px-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  <p className="text-[11px] text-white/25 mt-1.5">Captures sonic feel, not exact style cloning</p>
                </div>

                {/* Extra Direction / Notes */}
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                    Extra Direction <span className="text-white/30 font-normal normal-case tracking-normal">optional</span>
                  </label>
                  <textarea
                    placeholder="A specific line you want, language preference (Pidgin, Patois...), a story to tell, a feeling to chase..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl bg-white/4 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none min-h-[90px]"
                  />
                </div>

                {/* ── Creative Controls ─────────────────────── */}
                <div className="rounded-2xl border border-white/8 bg-white/[0.015] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                    <Zap className="w-3.5 h-3.5 text-primary/60" />
                    <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Creative Controls</span>
                  </div>

                  <div className="px-4 py-4 space-y-5">

                    {/* Commercial / Hitmaker Mode */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Hitmaker / Commercial Mode</p>
                          <p className="text-[11px] text-white/25 mt-0.5">Max hooks, singability & replay value</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCommercialMode((v) => !v)}
                          className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 ${commercialMode ? "bg-primary shadow-[0_0_14px_rgba(245,158,11,0.45)]" : "bg-white/10"}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm ${commercialMode ? "left-[26px]" : "left-1"}`} />
                        </button>
                      </div>
                      {commercialMode && (
                        <div className="flex items-center gap-1.5 text-[10px] bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5 mt-2">
                          <Zap className="w-3 h-3 shrink-0 text-primary" />
                          <span className="font-bold text-primary">HITMAKER MODE ON</span>
                          <span className="text-primary/55">— keeper line first, short hooks</span>
                        </div>
                      )}
                    </div>

                    {/* Lyrical Depth */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Lyrical Depth</label>
                        <span className="text-[10px] text-white/25">
                          {lyricalDepth === "Simple" ? "Mainstream" : lyricalDepth === "Deep" ? "Artistic" : "Balanced"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["Simple", "Balanced", "Deep"] as const).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setLyricalDepth(d)}
                            className={`h-9 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                              lyricalDepth === d
                                ? "bg-primary/15 border-primary/50 text-primary shadow-[0_0_10px_rgba(245,158,11,0.12)]"
                                : "bg-white/3 border-white/8 text-white/35 hover:text-white/60 hover:border-white/20 hover:bg-white/5"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-white/20 mt-1.5">
                        {lyricalDepth === "Simple" ? "Clean, easy lines — most mainstream & singable" : lyricalDepth === "Deep" ? "Layered meaning, richer imagery & introspection" : "Best middle ground — commercial with artistic depth"}
                      </p>
                    </div>

                    {/* Hook Repeat Level */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Hook Repeat Level</label>
                        <span className="text-[10px] text-white/25">
                          {hookRepeat === "Low" ? "More variation" : hookRepeat === "High" ? "Max chant" : "Balanced"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["Low", "Medium", "High"] as const).map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setHookRepeat(h)}
                            className={`h-9 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                              hookRepeat === h
                                ? "bg-primary/15 border-primary/50 text-primary shadow-[0_0_10px_rgba(245,158,11,0.12)]"
                                : "bg-white/3 border-white/8 text-white/35 hover:text-white/60 hover:border-white/20 hover:bg-white/5"
                            }`}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-white/20 mt-1.5">
                        {hookRepeat === "Low" ? "More lyrical variation per chorus pass" : hookRepeat === "High" ? "Maximum chantability — built to stick on first listen" : "Balanced repetition and lyrical development"}
                      </p>
                    </div>

                    {/* Gender / Voice Model */}
                    <div>
                      <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Gender / Voice Model</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(["Male", "Female", "Mixed", "Random"] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGenderVoiceModel(g)}
                            className={`h-9 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                              genderVoiceModel === g
                                ? "bg-violet-500/15 border-violet-500/45 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.12)]"
                                : "bg-white/3 border-white/8 text-white/35 hover:text-white/60 hover:border-white/20 hover:bg-white/5"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-white/20 mt-1.5">Shapes vocal delivery cues and ad-lib placement in the draft</p>
                    </div>

                    {/* Performance Feel */}
                    <div>
                      <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Performance Feel</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {["Smooth", "Melodic", "Gritty", "Emotional", "Soulful", "Intimate", "Confident", "Airy", "Prayerful", "Street"].map((feel) => (
                          <button
                            key={feel}
                            type="button"
                            onClick={() => setPerformanceFeel(feel)}
                            className={`h-8 rounded-xl text-[10px] font-bold tracking-wide transition-all border ${
                              performanceFeel === feel
                                ? "bg-sky-500/15 border-sky-500/45 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.12)]"
                                : "bg-white/3 border-white/8 text-white/35 hover:text-white/60 hover:border-white/20 hover:bg-white/5"
                            }`}
                          >
                            {feel}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-white/20 mt-1.5">Sets the energy and delivery register for vocal direction</p>
                    </div>

                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  {!canGenerate() ? (
                    <button
                      type="button"
                      onClick={() => { setUpgradeTo("Pro"); setShowUpgradeModal(true); }}
                      className="w-full h-14 rounded-2xl border border-primary/30 bg-primary/10 text-primary font-bold text-sm tracking-wide transition-all hover:bg-primary/20 flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      Upgrade to Generate More
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={status === "generating"}
                      className="relative overflow-hidden w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base tracking-wide transition-all duration-200 shadow-[0_4px_30px_rgba(245,158,11,0.28)] hover:shadow-[0_4px_40px_rgba(245,158,11,0.42)] hover:scale-[1.02] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2.5"
                    >
                      <motion.div
                        className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                      />
                      {status === "generating" ? (
                        <><Loader2 className="w-5 h-5 animate-spin relative z-10" /><span className="relative z-10">Composing your draft...</span></>
                      ) : (
                        <><Sparkles className="w-5 h-5 relative z-10" /><span className="relative z-10">{draft ? "Generate Again" : commercialMode ? "Write a Hit" : "Write My Song"}</span></>
                      )}
                    </button>
                  )}

                  {draft && status !== "generating" && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="w-full h-10 rounded-xl border border-white/7 text-xs text-white/35 hover:text-white/60 hover:border-white/15 transition-all bg-transparent flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Clear & Start Over
                    </button>
                  )}

                  {/* Usage indicator */}
                  {generationsLimit !== Infinity && (
                    <div className="rounded-xl bg-white/[0.02] border border-white/6 p-3.5 mt-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Generations</span>
                        <span className={`text-[10px] font-bold ${generationsRemaining <= 1 ? "text-red-400" : "text-white/40"}`}>
                          {generationsUsed}/{generationsLimit} used
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            generationsRemaining === 0 ? "bg-red-500" :
                            generationsRemaining <= 1 ? "bg-amber-500" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min(100, (generationsUsed / generationsLimit) * 100)}%` }}
                        />
                      </div>
                      <p className={`text-[10px] mt-2 ${generationsRemaining === 0 ? "text-red-400/80" : generationsRemaining === 1 ? "text-amber-400/70" : "text-white/25"}`}>
                        {generationsRemaining === 0
                          ? <><span>Limit reached · </span><button onClick={() => { setUpgradeTo("Pro"); setShowUpgradeModal(true); }} className="underline">Upgrade to Pro</button></>
                          : generationsRemaining === 1
                            ? <><span>1 generation left · </span><button onClick={() => { setUpgradeTo("Pro"); setShowUpgradeModal(true); }} className="underline">Upgrade</button></>
                            : `${generationsRemaining} remaining on Free`}
                      </p>
                    </div>
                  )}
                  {generationsLimit === Infinity && (
                    <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/5 px-3 py-2">
                      <Sparkles className="w-3 h-3 text-yellow-400 shrink-0" />
                      <span className="text-[10px] text-yellow-400/70 font-medium">Unlimited generations · Gold</span>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* ── RIGHT PANEL: Output ──────────────────────────────────── */}
          <div ref={resultsRef} className="lg:col-span-8 min-h-[400px]">
            <AnimatePresence mode="wait">

              {/* IDLE STATE */}
              {status === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex flex-col items-center justify-center p-10 md:p-20 text-center rounded-3xl border border-dashed border-white/7 bg-white/[0.012] min-h-[400px] md:min-h-[640px]"
                >
                  <div className="relative w-20 h-20 mb-8">
                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-40" style={{ animationDuration: "2.5s" }} />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.1)]">
                      <Music className="w-9 h-9 text-primary/60" />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Your canvas is blank</h3>
                  <p className="text-muted-foreground text-sm md:text-base max-w-sm leading-relaxed mb-2">
                    Fill in your song idea on the left. AfroMuse will craft a full song structure in seconds.
                  </p>
                  <p className="text-white/20 text-xs mb-8 italic">Hooks · Verses · Bridge · Chorus · Production Notes</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["Intro", "Verse 1", "Chorus", "Verse 2", "Bridge", "Outro", "Keeper Line", "Metadata Panel", "Instrumental Guide", "Vocal Demo Guide"].map((tag) => (
                      <span key={tag} className="text-[11px] px-3 py-1 rounded-full bg-white/4 border border-white/7 text-white/35">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* GENERATING STATE */}
              {status === "generating" && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex flex-col items-center justify-center p-10 md:p-20 text-center rounded-3xl border border-white/7 bg-[#07070f] min-h-[400px] md:min-h-[640px] shadow-2xl"
                >
                  <div className="relative w-24 h-24 mb-10">
                    <div className="absolute inset-0 rounded-full border-[2px] border-white/5 border-t-primary/70 animate-spin" />
                    <div className="absolute inset-3 rounded-full border-[2px] border-white/5 border-b-secondary/70 animate-[spin_2s_linear_infinite_reverse]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-primary/80 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-2">
                    {commercialMode ? "Engineering your hit..." : "Writing your song..."}
                  </h3>
                  <p className="text-white/40 text-sm mb-8 max-w-xs">
                    {commercialMode
                      ? "AfroMuse V5 Hitmaker is finding your keeper line and building a hook-first record."
                      : "AfroMuse AI is channeling your vibe into a full song structure."}
                  </p>
                  <div className="w-52 h-[3px] bg-white/6 rounded-full overflow-hidden mb-4">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                      animate={{ width: ["0%", "100%"] }}
                      transition={{ duration: 3, ease: "easeInOut" }}
                    />
                  </div>
                  <div className="h-6 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={generatingStep}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm text-white/50 font-medium"
                      >
                        {generatingSteps[generatingStep]}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* DONE STATE */}
              {status === "done" && draft && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  {/* Song title + action bar */}
                  <div className="rounded-2xl border border-white/8 bg-gradient-to-r from-[#0d0d1a] to-[#0a0a14] px-5 py-5">
                    <div className="flex items-start gap-3 mb-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-primary/80 bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                            <Sparkles className="w-2.5 h-2.5" /> AI Draft
                          </span>
                          {commercialMode && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-primary bg-primary/15 border border-primary/30 px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                              <Zap className="w-2.5 h-2.5" /> Hitmaker
                            </span>
                          )}
                          <span className="text-[11px] text-white/35">{genre}</span>
                          <span className="text-[11px] text-white/20">·</span>
                          <span className="text-[11px] text-white/35">{mood}</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-display font-bold text-white capitalize leading-tight">
                          {draft.title}
                        </h2>
                      </div>
                      <span className="text-[10px] text-white/20 font-mono bg-white/3 border border-white/6 px-2 py-1 rounded-lg shrink-0">
                        v{seed}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleRegenerate}
                        disabled={status === "generating" || isHumanizing || isHardening}
                        className="flex items-center gap-1.5 rounded-xl h-10 px-4 text-sm border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all disabled:opacity-40"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Regenerate
                      </button>
                      <button
                        onClick={handleHumanizeLyrics}
                        disabled={isHumanizing || isHardening || status === "generating"}
                        className={`flex items-center gap-1.5 rounded-xl h-10 px-4 text-sm border transition-all disabled:opacity-40 ${
                          isHumanizing
                            ? "border-secondary/40 bg-secondary/10 text-secondary/70 cursor-wait"
                            : "border-secondary/30 bg-secondary/8 text-secondary hover:bg-secondary/15 hover:border-secondary/50 shadow-[0_0_14px_rgba(139,92,246,0.1)] hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                        }`}
                      >
                        {isHumanizing
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Humanizing...</>
                          : <><Pen className="w-3.5 h-3.5" /> Humanize Lyrics</>
                        }
                      </button>
                      <button
                        onClick={handleMakeItHarder}
                        disabled={isHardening || isHumanizing || status === "generating"}
                        className={`flex items-center gap-1.5 rounded-xl h-10 px-4 text-sm border transition-all disabled:opacity-40 ${
                          isHardening
                            ? "border-orange-700/50 bg-orange-950/30 text-orange-400/70 cursor-wait"
                            : "border-orange-700/40 bg-orange-950/20 text-orange-400 hover:bg-orange-950/40 hover:border-orange-600/60 shadow-[0_0_14px_rgba(194,65,12,0.12)] hover:shadow-[0_0_20px_rgba(194,65,12,0.22)]"
                        }`}
                      >
                        {isHardening
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Making it harder...</>
                          : <><Flame className="w-3.5 h-3.5" /> Make It Harder</>
                        }
                      </button>
                      <button
                        onClick={copyToClipboard}
                        className={`flex items-center gap-1.5 rounded-xl h-10 px-4 text-sm border transition-all ${
                          copied
                            ? "border-green-500/40 bg-green-500/10 text-green-400"
                            : "border-white/10 hover:bg-white/5 text-white/50 hover:text-white"
                        }`}
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied!" : "Copy Lyrics"}
                      </button>
                      <button
                        onClick={saveProject}
                        disabled={saved}
                        className={`flex items-center gap-1.5 rounded-xl h-10 px-5 text-sm font-semibold transition-all ${
                          saved
                            ? "bg-green-500/15 border border-green-500/25 text-green-400 cursor-default"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_2px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_2px_30px_rgba(245,158,11,0.4)] hover:-translate-y-0.5"
                        }`}
                      >
                        {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><Save className="w-3.5 h-3.5" /> Save Project</>}
                      </button>
                    </div>
                  </div>

                  {/* ── LYRICS CARD ─────────────────────────────────── */}
                  <div className={`rounded-3xl border bg-[#06060e] overflow-hidden shadow-2xl transition-all duration-300 ${isHumanizing ? "border-secondary/30 shadow-[0_0_40px_rgba(139,92,246,0.08)]" : isHardening ? "border-orange-700/30 shadow-[0_0_40px_rgba(194,65,12,0.08)]" : "border-white/8"}`}>

                    {/* Card toolbar */}
                    <div className="flex items-center justify-between bg-[#0c0c18] border-b border-white/5 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                        </div>
                        <span className="font-mono text-[11px] text-white/30">
                          {draft.title.toLowerCase().replace(/\s+/g, "_")}.draft
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isHumanizing ? (
                          <>
                            <Loader2 className="w-3 h-3 text-secondary/70 animate-spin" />
                            <span className="text-[10px] text-secondary/70 font-medium">Humanizing lyrics...</span>
                          </>
                        ) : isHardening ? (
                          <>
                            <Loader2 className="w-3 h-3 text-orange-400/70 animate-spin" />
                            <span className="text-[10px] text-orange-400/70 font-medium">Making lyrics harder...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3 h-3 text-white/20" />
                            <span className="text-[10px] text-white/25 font-medium">Lyrics Document</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Lyrics content */}
                    <div className="p-6 md:p-10 space-y-10">

                      {/* INTRO */}
                      {draft.intro && draft.intro.length > 0 && (
                        <LyricsSection
                          sectionNumber="00"
                          label="Intro"
                          color="ghost"
                          lines={draft.intro}
                          italic
                        />
                      )}

                      {/* CHORUS — first hit */}
                      <LyricsSection
                        sectionNumber="01"
                        label="Chorus"
                        color="gold"
                        lines={draft.hook}
                        isHook
                      />

                      {/* VERSE 1 */}
                      <LyricsSection
                        sectionNumber="02"
                        label="Verse 1"
                        color="blue"
                        lines={draft.verse1}
                      />

                      {/* CHORUS REPEAT */}
                      <LyricsSection
                        sectionNumber="03"
                        label="Chorus"
                        color="gold"
                        lines={draft.hook}
                        isHook
                        repeat
                      />

                      {/* VERSE 2 */}
                      <LyricsSection
                        sectionNumber="04"
                        label="Verse 2"
                        color="blue"
                        lines={draft.verse2}
                      />

                      {/* CHORUS REPEAT */}
                      <LyricsSection
                        sectionNumber="05"
                        label="Chorus"
                        color="gold"
                        lines={draft.hook}
                        isHook
                        repeat
                      />

                      {/* BRIDGE */}
                      {draft.bridge && draft.bridge.length > 0 && (
                        <LyricsSection
                          sectionNumber="06"
                          label="Bridge"
                          color="violet"
                          lines={draft.bridge}
                          italic
                        />
                      )}

                      {/* FINAL CHORUS / OUTRO */}
                      {draft.outro && draft.outro.length > 0 ? (
                        <LyricsSection
                          sectionNumber="07"
                          label="Final Chorus / Outro"
                          color="gold"
                          lines={draft.outro}
                          isHook
                        />
                      ) : (
                        <LyricsSection
                          sectionNumber="07"
                          label="Final Chorus"
                          color="gold"
                          lines={draft.hook}
                          isHook
                          repeat
                        />
                      )}

                      {/* KEEPER LINE — V2 */}
                      {draft.keeperLine && (
                        <div className="border-t border-white/6 pt-8">
                          <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-4 h-4 text-primary/60" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Keeper Line</span>
                          </div>
                          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
                            <p className="text-base font-semibold text-white/90 italic mb-3">"{draft.keeperLine}"</p>
                            {draft.keeperLineBackups && draft.keeperLineBackups.length > 0 && (
                              <div className="space-y-1 border-t border-primary/10 pt-3 mt-3">
                                <p className="text-[10px] font-bold tracking-widest uppercase text-primary/40 mb-2">Backup Lines</p>
                                {draft.keeperLineBackups.map((b, i) => (
                                  <p key={i} className="text-xs text-white/45 italic">"{b}"</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* METADATA PANEL — V2 */}
                      {draft.productionNotes && (draft.productionNotes.key || draft.productionNotes.bpm || draft.productionNotes.energy || draft.productionNotes.hookStrength || draft.productionNotes.lyricalDepth) && (
                        <div className="border-t border-white/6 pt-8">
                          <div className="flex items-center gap-2 mb-4">
                            <Radio className="w-4 h-4 text-white/30" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Metadata Panel</span>
                          </div>
                          {/* Row 1: Key, BPM, Energy */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {draft.productionNotes.key && (
                              <div className="rounded-2xl border border-primary/10 bg-primary/3 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-primary mb-2">Key</div>
                                <p className="text-sm font-semibold text-white/80">{draft.productionNotes.key}</p>
                              </div>
                            )}
                            {draft.productionNotes.bpm && (
                              <div className="rounded-2xl border border-sky-500/10 bg-sky-500/3 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-sky-400 mb-2">BPM</div>
                                <p className="text-sm font-semibold text-white/80">{draft.productionNotes.bpm}</p>
                              </div>
                            )}
                            {draft.productionNotes.energy && (
                              <div className="rounded-2xl border border-violet-500/10 bg-violet-500/3 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-violet-400 mb-2">Energy</div>
                                <p className="text-sm font-semibold text-white/80">{draft.productionNotes.energy}</p>
                              </div>
                            )}
                          </div>
                          {/* Row 2: Hook Strength, Lyrical Depth */}
                          {(draft.productionNotes.hookStrength || draft.productionNotes.lyricalDepth) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              {draft.productionNotes.hookStrength && (
                                <div className="rounded-2xl border border-primary/10 bg-primary/3 p-4">
                                  <div className="text-[10px] font-bold tracking-widest uppercase text-primary mb-2">Hook Strength</div>
                                  <p className="text-sm text-white/70 leading-relaxed">{draft.productionNotes.hookStrength}</p>
                                </div>
                              )}
                              {draft.productionNotes.lyricalDepth && (
                                <div className="rounded-2xl border border-green-500/10 bg-green-500/3 p-4">
                                  <div className="text-[10px] font-bold tracking-widest uppercase text-green-400 mb-2">Lyrical Depth</div>
                                  <p className="text-sm text-white/70 leading-relaxed">{draft.productionNotes.lyricalDepth}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Row 3: Melody Direction, Arrangement */}
                          {(draft.productionNotes.melodyDirection || draft.productionNotes.arrangement) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              {draft.productionNotes.melodyDirection && (
                                <ProductionNoteCard color="violet" title="Melody Direction" content={draft.productionNotes.melodyDirection} />
                              )}
                              {draft.productionNotes.arrangement && (
                                <ProductionNoteCard color="blue" title="Arrangement" content={draft.productionNotes.arrangement} />
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* PRODUCTION NOTES (fallback for older V1 format) */}
                      {!draft.productionNotes && (
                        <div className="border-t border-white/6 pt-8">
                          <div className="flex items-center gap-2 mb-5">
                            <Sliders className="w-4 h-4 text-white/30" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Production Notes</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <ProductionNoteCard color="gold" title="Chord / Vibe" content={draft.chordVibe} />
                            <ProductionNoteCard color="violet" title="Melody Direction" content={draft.melodyDirection} />
                            <ProductionNoteCard color="blue" title="Arrangement" content={draft.arrangement} />
                          </div>
                        </div>
                      )}

                      {/* INSTRUMENTAL GUIDANCE — V2 */}
                      {draft.instrumentalGuidance && (
                        <div className="border-t border-white/6 pt-8">
                          <div className="flex items-center gap-2 mb-4">
                            <Guitar className="w-4 h-4 text-sky-400/60" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Instrumental Guidance</span>
                          </div>
                          <div className="rounded-2xl border border-sky-500/10 bg-sky-500/3 p-5">
                            <p className="text-sm text-white/60 leading-relaxed">{draft.instrumentalGuidance}</p>
                          </div>
                        </div>
                      )}

                      {/* VOCAL DEMO GUIDANCE — V2 */}
                      {draft.vocalDemoGuidance && (
                        <div className="border-t border-white/6 pt-8">
                          <div className="flex items-center gap-2 mb-4">
                            <Mic2 className="w-4 h-4 text-violet-400/60" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Vocal Demo Guidance</span>
                          </div>
                          <div className="rounded-2xl border border-violet-500/10 bg-violet-500/3 p-5">
                            <p className="text-sm text-white/60 leading-relaxed">{draft.vocalDemoGuidance}</p>
                          </div>
                        </div>
                      )}

                      {/* STEMS BREAKDOWN — V2 */}
                      {draft.stemsBreakdown && Object.values(draft.stemsBreakdown).some(Boolean) && (
                        <div className="border-t border-white/6 pt-8">
                          <div className="flex items-center gap-2 mb-4">
                            <svg className="w-4 h-4 text-sky-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="8" width="4" height="8" rx="1"/><rect x="9" y="4" width="4" height="16" rx="1"/><rect x="16" y="10" width="4" height="6" rx="1"/></svg>
                            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Stems Breakdown</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {draft.stemsBreakdown.kick && (
                              <div className="rounded-2xl border border-white/6 bg-white/2 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-primary mb-2">Kick</div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.stemsBreakdown.kick}</p>
                              </div>
                            )}
                            {draft.stemsBreakdown.snare && (
                              <div className="rounded-2xl border border-white/6 bg-white/2 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-sky-400 mb-2">Snare</div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.stemsBreakdown.snare}</p>
                              </div>
                            )}
                            {draft.stemsBreakdown.bass && (
                              <div className="rounded-2xl border border-white/6 bg-white/2 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-violet-400 mb-2">Bass</div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.stemsBreakdown.bass}</p>
                              </div>
                            )}
                            {draft.stemsBreakdown.pads && (
                              <div className="rounded-2xl border border-white/6 bg-white/2 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-green-400 mb-2">Pads</div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.stemsBreakdown.pads}</p>
                              </div>
                            )}
                            {draft.stemsBreakdown.leadSynth && (
                              <div className="rounded-2xl border border-white/6 bg-white/2 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-primary mb-2">Lead Synth</div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.stemsBreakdown.leadSynth}</p>
                              </div>
                            )}
                            {draft.stemsBreakdown.guitarOther && (
                              <div className="rounded-2xl border border-white/6 bg-white/2 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-orange-400 mb-2">Guitar / Other</div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.stemsBreakdown.guitarOther}</p>
                              </div>
                            )}
                          </div>
                          {draft.stemsBreakdown.effects && (
                            <div className="mt-3 rounded-2xl border border-sky-500/10 bg-sky-500/3 p-4">
                              <div className="text-[10px] font-bold tracking-widest uppercase text-sky-400 mb-2">Effects & Panning</div>
                              <p className="text-xs text-white/60 leading-relaxed">{draft.stemsBreakdown.effects}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* EXPORT NOTES — V2 */}
                      {draft.exportNotes && (
                        <div className="border-t border-white/6 pt-8">
                          <div className="flex items-center gap-2 mb-4">
                            <svg className="w-4 h-4 text-primary/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Export Notes</span>
                          </div>
                          <div className="rounded-2xl border border-primary/10 bg-primary/3 p-5">
                            <p className="text-sm text-white/60 leading-relaxed">{draft.exportNotes}</p>
                          </div>
                        </div>
                      )}

                      {/* SESSION NOTES — V5 */}
                      {draft.sessionNotes && (
                        <div className="border-t border-white/6 pt-8">
                          <div className="flex items-center gap-2 mb-4">
                            <Radio className="w-4 h-4 text-primary/60" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Session Brief</span>
                          </div>
                          <div className="rounded-2xl border border-primary/10 bg-primary/4 p-5">
                            <p className="text-sm text-white/65 leading-relaxed italic">{draft.sessionNotes}</p>
                          </div>
                        </div>
                      )}

                      {/* SONIC IDENTITY — V5 */}
                      {draft.sonicIdentity && Object.values(draft.sonicIdentity).some(Boolean) && (
                        <div className="border-t border-white/6 pt-8">
                          <div className="flex items-center gap-2 mb-4">
                            <Key className="w-4 h-4 text-sky-400/60" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Sonic Identity</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {draft.sonicIdentity.coreBounce && (
                              <div className="rounded-2xl border border-sky-500/12 bg-sky-500/3 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-sky-400 mb-2">Core Bounce</div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.sonicIdentity.coreBounce}</p>
                              </div>
                            )}
                            {draft.sonicIdentity.atmosphere && (
                              <div className="rounded-2xl border border-violet-500/12 bg-violet-500/3 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-violet-400 mb-2">Atmosphere</div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.sonicIdentity.atmosphere}</p>
                              </div>
                            )}
                            {draft.sonicIdentity.mainTexture && (
                              <div className="rounded-2xl border border-primary/12 bg-primary/3 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-primary mb-2">Main Texture</div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.sonicIdentity.mainTexture}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* VOCAL IDENTITY — V5 */}
                      {draft.vocalIdentity && Object.values(draft.vocalIdentity).some(Boolean) && (
                        <div className="border-t border-white/6 pt-8">
                          <div className="flex items-center gap-2 mb-4">
                            <Mic2 className="w-4 h-4 text-violet-400/60" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Vocal Identity</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {draft.vocalIdentity.leadType && (
                              <div className="rounded-2xl border border-violet-500/12 bg-violet-500/3 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-violet-400 mb-2">Lead Type</div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.vocalIdentity.leadType}</p>
                              </div>
                            )}
                            {draft.vocalIdentity.deliveryStyle && (
                              <div className="rounded-2xl border border-sky-500/12 bg-sky-500/3 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-sky-400 mb-2">Delivery Style</div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.vocalIdentity.deliveryStyle}</p>
                              </div>
                            )}
                            {draft.vocalIdentity.emotionalTone && (
                              <div className="rounded-2xl border border-green-500/12 bg-green-500/3 p-4">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-green-400 mb-2">Emotional Tone</div>
                                <p className="text-xs text-white/60 leading-relaxed">{draft.vocalIdentity.emotionalTone}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ARRANGEMENT BLUEPRINT — V5 */}
                      {draft.arrangementBlueprint && (
                        <div className="border-t border-white/6 pt-8">
                          <div className="flex items-center gap-2 mb-4">
                            <Music2 className="w-4 h-4 text-sky-400/60" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Arrangement Blueprint</span>
                          </div>
                          <div className="rounded-2xl border border-sky-500/10 bg-sky-500/3 p-5">
                            <p className="text-sm text-white/60 leading-relaxed">{draft.arrangementBlueprint}</p>
                          </div>
                        </div>
                      )}

                      {/* Bottom actions */}
                      <div className="border-t border-white/4 pt-6 flex flex-wrap gap-2 justify-center">
                        <button
                          onClick={copyToClipboard}
                          className={`flex items-center gap-1.5 rounded-xl h-9 px-4 text-xs border transition-all ${
                            copied ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-white/8 hover:bg-white/5 text-white/40 hover:text-white"
                          }`}
                        >
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied ? "Copied!" : "Copy Full Draft"}
                        </button>
                        <button
                          onClick={saveProject}
                          disabled={saved}
                          className={`flex items-center gap-1.5 rounded-xl h-9 px-4 text-xs border transition-all ${
                            saved ? "border-green-500/30 bg-green-500/8 text-green-400 cursor-default" : "border-white/8 hover:bg-white/5 text-white/40 hover:text-white"
                          }`}
                        >
                          {saved ? <><Check className="w-3 h-3" /> Saved</> : <><Save className="w-3 h-3" /> Save to Projects</>}
                        </button>
                        <button
                          onClick={handleRegenerate}
                          className="flex items-center gap-1.5 rounded-xl h-9 px-4 text-xs border border-white/8 hover:bg-white/5 text-white/40 hover:text-white transition-all"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Generate Again
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* SEND TO AUDIO BRIDGE */}
                  <SendToAudioCard
                    draft={draft}
                    genre={genre}
                    mood={mood}
                    onSendToAudio={handleSendToAudio}
                  />

                  {/* BRING IT TO LIFE — V2 AUDIO MVP */}
                  <BringToLifeCard
                    draft={draft}
                    genre={genre}
                    mood={mood}
                    topic={topic}
                    songLength={songLength}
                    languageFlavor={languageFlavor}
                    style={style}
                    commercialMode={commercialMode}
                    lyricalDepth={lyricalDepth}
                    hookRepeat={hookRepeat}
                    customFlavor={customFlavor}
                  />

                  {/* PLAN-GATED FEATURES PANEL */}
                  <PlanFeaturesPanel
                    plan={plan}
                    hasAccess={hasAccess}
                    audioTrialsLeft={audioTrialsLeft}
                    collabTrialsLeft={collabTrialsLeft}
                    onUpgrade={(target) => { setUpgradeTo(target); setShowUpgradeModal(true); }}
                  />

                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* ── V2 AUDIO STUDIO — full width below main grid ── */}
        <AudioStudioV2 ref={audioStudioRef} draft={draft} genre={genre} mood={mood} />

      </div>
    </div>
  );
}

// ── LyricsSection component ─────────────────────────────────────────────────

type SectionColor = "gold" | "blue" | "violet" | "ghost";

const colorMap: Record<SectionColor, {
  label: string;
  labelBg: string;
  labelBorder: string;
  labelText: string;
  cardBg: string;
  cardBorder: string;
  leftBorder: string;
  numColor: string;
}> = {
  gold: {
    label: "",
    labelBg: "bg-primary/12",
    labelBorder: "border-primary/25",
    labelText: "text-primary",
    cardBg: "bg-gradient-to-br from-primary/8 via-primary/4 to-transparent",
    cardBorder: "border-primary/15",
    leftBorder: "border-primary/30",
    numColor: "text-primary/40",
  },
  blue: {
    label: "",
    labelBg: "bg-sky-500/10",
    labelBorder: "border-sky-500/20",
    labelText: "text-sky-400",
    cardBg: "",
    cardBorder: "",
    leftBorder: "border-sky-500/20",
    numColor: "text-sky-500/30",
  },
  violet: {
    label: "",
    labelBg: "bg-violet-500/10",
    labelBorder: "border-violet-500/20",
    labelText: "text-violet-400",
    cardBg: "bg-gradient-to-br from-violet-500/6 to-transparent",
    cardBorder: "border-violet-500/12",
    leftBorder: "border-violet-500/25",
    numColor: "text-violet-500/30",
  },
  ghost: {
    label: "",
    labelBg: "bg-white/5",
    labelBorder: "border-white/10",
    labelText: "text-white/40",
    cardBg: "",
    cardBorder: "",
    leftBorder: "border-white/10",
    numColor: "text-white/20",
  },
};

function LyricsSection({
  sectionNumber,
  label,
  color,
  lines,
  isHook = false,
  repeat = false,
  italic = false,
}: {
  sectionNumber: string;
  label: string;
  color: SectionColor;
  lines: string[];
  isHook?: boolean;
  repeat?: boolean;
  italic?: boolean;
}) {
  const c = colorMap[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`font-mono text-[10px] font-bold ${c.numColor}`}>{sectionNumber}</span>
        <span className={`inline-flex items-center text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${c.labelBg} ${c.labelBorder} ${c.labelText}`}>
          {label}
        </span>
        {repeat && <span className="text-[10px] text-white/20 italic">— repeat</span>}
        <div className="flex-1 h-px bg-white/4" />
      </div>

      {/* Chorus / Hook — special card treatment */}
      {isHook ? (
        <div className={`relative rounded-2xl border p-6 md:p-8 overflow-hidden ${c.cardBg} ${c.cardBorder}`}>
          {color === "gold" && (
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          )}
          <div className="absolute top-3 left-5 text-primary/10 text-6xl font-serif leading-none select-none">"</div>
          <div className="relative space-y-2 pl-4">
            {lines.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className={`text-lg md:text-xl leading-relaxed font-semibold text-white/90 ${italic ? "italic" : ""}`}
              >
                {line}
              </motion.p>
            ))}
          </div>
          <div className="absolute bottom-2 right-5 text-primary/8 text-5xl font-serif leading-none select-none rotate-180">"</div>
        </div>
      ) : (
        /* Verse / Intro / Bridge — line-by-line */
        <div className={`pl-5 border-l-2 ${c.leftBorder} space-y-2`}>
          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className="flex items-baseline gap-3 group"
            >
              <span className={`text-[10px] font-mono shrink-0 w-4 text-right ${c.numColor} group-hover:opacity-70 transition-opacity select-none`}>
                {i + 1}
              </span>
              <p className={`text-sm md:text-base text-white/75 leading-relaxed ${italic ? "italic text-white/50" : ""} group-hover:text-white/90 transition-colors`}>
                {line}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Production Note Card ─────────────────────────────────────────────────────

function ProductionNoteCard({
  color,
  title,
  content,
}: {
  color: "gold" | "violet" | "blue";
  title: string;
  content: string;
}) {
  const styles = {
    gold: { title: "text-primary", border: "border-primary/10 hover:border-primary/20", bg: "bg-primary/3" },
    violet: { title: "text-violet-400", border: "border-violet-500/10 hover:border-violet-500/20", bg: "bg-violet-500/3" },
    blue: { title: "text-sky-400", border: "border-sky-500/10 hover:border-sky-500/20", bg: "bg-sky-500/3" },
  }[color];

  return (
    <div className={`rounded-2xl border p-5 transition-colors ${styles.bg} ${styles.border}`}>
      <div className={`text-[10px] font-bold tracking-widest uppercase mb-3 ${styles.title}`}>{title}</div>
      <p className="text-xs text-white/50 leading-relaxed">{content}</p>
    </div>
  );
}

// ── Plan-gated features panel ───────────────────────────────────────────────

function PlanFeaturesPanel({
  plan,
  hasAccess,
  audioTrialsLeft,
  collabTrialsLeft,
  onUpgrade,
}: {
  plan: Plan;
  hasAccess: (p: Plan) => boolean;
  audioTrialsLeft: number;
  collabTrialsLeft: number;
  onUpgrade: (target: Plan) => void;
}) {
  const isPro = hasAccess("Pro");
  const isGold = hasAccess("Gold");

  const proFeatures = [
    { icon: <Volume2 className="w-4 h-4 text-amber-400" />, title: "AI Audio Generation", desc: "Turn lyrics into a full audio track", trial: plan === "Free" ? `${audioTrialsLeft} trial${audioTrialsLeft !== 1 ? "s" : ""} left` : null, locked: !isPro, upgradeTarget: "Pro" as Plan },
    { icon: <Music2 className="w-4 h-4 text-purple-400" />, title: "Downloadable Stems", desc: "Vocal, beat & melody as separate tracks", trial: null, locked: !isPro, upgradeTarget: "Pro" as Plan },
    { icon: <Download className="w-4 h-4 text-emerald-400" />, title: "Priority Access", desc: "First access to all upcoming features", trial: null, locked: !isPro, upgradeTarget: "Pro" as Plan },
  ];

  const goldFeatures = [
    { icon: <span className="text-base">🤝</span>, title: "Collaboration Mode", desc: "Co-write with producers in real-time", trial: plan !== "Gold" ? `${collabTrialsLeft} trial${collabTrialsLeft !== 1 ? "s" : ""} left` : null, locked: !isGold },
    { icon: <span className="text-base">🎹</span>, title: "Upload Instrumental", desc: "Generate lyrics fitted to your beat", trial: null, locked: !isGold },
    { icon: <span className="text-base">🎤</span>, title: "Voice Clone", desc: "Hear lyrics in a generated vocal style", trial: null, locked: !isGold },
  ];

  return (
    <div className="space-y-4">
      {!isPro && (
        <div className="rounded-3xl border border-amber-500/12 bg-gradient-to-br from-amber-500/4 via-background to-primary/4 p-5 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-24 bg-amber-500/8 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-amber-500/12 border border-amber-500/25 text-amber-400 mb-2">
                  <Sparkles className="w-2.5 h-2.5" /> Pro Features
                </div>
                <p className="text-white/40 text-xs">Unlock with AfroMuse Pro · $20/mo</p>
              </div>
              <button onClick={() => onUpgrade("Pro")} className="shrink-0 h-9 px-4 rounded-xl bg-primary/12 border border-primary/25 text-primary text-xs font-semibold hover:bg-primary/22 transition-all">
                Upgrade →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {proFeatures.map((f) => (
                <div key={f.title} className="rounded-2xl bg-white/[0.025] border border-white/7 p-4 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 opacity-45">{f.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-white/45 text-sm mb-0.5 flex items-center gap-1.5">{f.title}<Lock className="w-3 h-3 text-white/20" /></h5>
                    <p className="text-xs text-white/25">{f.desc}</p>
                    {f.trial && <span className="text-[10px] inline-block mt-2 bg-amber-500/8 border border-amber-500/18 text-amber-400/60 px-2 py-0.5 rounded-full">{f.trial}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isPro && !isGold && (
        <div className="rounded-3xl border border-primary/18 bg-gradient-to-br from-primary/4 via-background to-transparent p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-primary/12 border border-primary/25 text-primary">
              <Sparkles className="w-2.5 h-2.5" /> Pro — Active
            </div>
            <span className="text-xs text-white/30">You have full Pro access</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {proFeatures.map((f) => (
              <div key={f.title} className="rounded-2xl bg-primary/4 border border-primary/12 p-4 flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{f.icon}</div>
                <div>
                  <h5 className="font-semibold text-white text-sm mb-0.5">{f.title}</h5>
                  <p className="text-xs text-white/40">{f.desc}</p>
                  <span className="text-[10px] inline-block mt-2 bg-primary/12 border border-primary/20 text-primary px-2 py-0.5 rounded-full">Unlocked</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isGold && (
        <div className="rounded-3xl border border-yellow-500/12 bg-gradient-to-br from-yellow-500/4 via-background to-amber-500/4 p-5 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-24 bg-yellow-500/8 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-yellow-500/12 border border-yellow-500/25 text-yellow-400 mb-2">
                  ✦ Gold Features
                </div>
                <p className="text-white/40 text-xs">Unlock with AfroMuse Gold · $40/mo</p>
              </div>
              <button onClick={() => onUpgrade("Gold")} className="shrink-0 h-9 px-4 rounded-xl bg-yellow-500/12 border border-yellow-500/25 text-yellow-400 text-xs font-semibold hover:bg-yellow-500/22 transition-all">
                Go Gold →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {goldFeatures.map((f) => (
                <div key={f.title} className="rounded-2xl bg-white/[0.018] border border-yellow-500/8 p-4 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 opacity-35">{f.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-white/35 text-sm mb-0.5 flex items-center gap-1.5">{f.title}<Lock className="w-3 h-3 text-white/18" /></h5>
                    <p className="text-xs text-white/22">{f.desc}</p>
                    {f.trial && <span className="text-[10px] inline-block mt-2 bg-yellow-500/8 border border-yellow-500/18 text-yellow-400/60 px-2 py-0.5 rounded-full">{f.trial}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isGold && (
        <div className="rounded-3xl border border-yellow-500/18 bg-gradient-to-br from-yellow-500/6 via-background to-amber-500/4 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-yellow-500/12 border border-yellow-500/25 text-yellow-400">
              ✦ Gold — All Features Unlocked
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {goldFeatures.map((f) => (
              <div key={f.title} className="rounded-2xl bg-yellow-500/4 border border-yellow-500/12 p-4 flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{f.icon}</div>
                <div>
                  <h5 className="font-semibold text-white text-sm mb-0.5">{f.title}</h5>
                  <p className="text-xs text-white/40">{f.desc}</p>
                  <span className="text-[10px] inline-block mt-2 bg-yellow-500/12 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Unlocked</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
