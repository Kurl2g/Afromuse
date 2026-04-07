import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic2, AlertCircle, Heart, Music2, Headphones, Cpu, Copy, Download, Clock, Radio, Layers } from "lucide-react";

import FinalExportCard from "./components/FinalExportCard";
import ProToolsSection from "./components/ProToolsSection";
import RecentSessionBuild from "./components/RecentSessionBuild";

// Dummy Data for testing
const dummyLeadVocalData = {
  vocalBrief: "This is a dummy vocal brief describing the style and emotion.",
  phrasingGuide: "Follow the phrasing as indicated, keep it smooth.",
  emotionalArc: "Start calm, rise in intensity mid-section, end soft.",
  syncNotes: "Keep in sync with instrumental downbeats.",
  performanceDirection: "Focus on expressive dynamics and slight vibrato.",
  deliveryStyle: "Soulful, with slight raspy tone.",
  vocalProcessingNotes: "Add subtle reverb and compression."
};

const dummyMixMasterData = {
  mixBrief: "Commercial-ready mix guide for balanced clarity.",
  levelBalancing: "Adjust levels to highlight vocals and drums.",
  eqNotes: "Cut muddiness, boost presence range for vocals.",
  compressionNotes: "Gentle bus compression on the mix.",
  spatialEffects: "Add stereo widening and subtle delay.",
  masteringChain: "Limiter, EQ, multiband compression.",
  outputNotes: "44.1kHz / 16-bit MP3 preview ready.",
  stemsNotes: "Each stem exported individually."
};

const dummyStemData = {
  extractionBrief: "Prepare stems for DAW import.",
  recommendedTool: "Use Spleeter or LALAL.AI",
  stems: [
    { name: "Vocals", extractionNotes: "Isolated lead vocals.", gainLevel: "+0dB", fileSpec: "wav 24-bit" },
    { name: "Drums", extractionNotes: "Kick, snare, hi-hat isolated.", gainLevel: "-1dB", fileSpec: "wav 24-bit" },
    { name: "Bass", extractionNotes: "Bass guitar isolated.", gainLevel: "0dB", fileSpec: "wav 24-bit" }
  ],
  phaseAlignmentNotes: "All stems aligned at zero crossing.",
  dawImportGuide: "Import each stem into separate tracks in your DAW."
};

const AudioStudio: React.FC = () => {
  const [leadVocalStatus, setLeadVocalStatus] = useState("success"); // loading | success | error
  const [mixMasterStatus, setMixMasterStatus] = useState("success");
  const [stemStatus, setStemStatus] = useState("success");

  const leadVocalData = dummyLeadVocalData;
  const mixMasterData = dummyMixMasterData;
  const stemData = dummyStemData;

  const hasAnyResult = true;
  const masterExportReady = true;
  const pipelineVisible = true;
  const mixFeel = "Vibrant & Punchy";
  const sessionTitle = "My AfroTrack";
  const modeLabel = "Producer Mode";
  const lastCompletedStage = "Mixing";
  const sessionStartTime = new Date();
  const isProducer = true;

  const copyBlueprint = () => alert("Blueprint copied! (dummy)");

  const toast = ({ title, description }: { title: string; description: string }) =>
    alert(`${title}\n${description}`);

  return (
    <section className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="space-y-6">
        {/* Lead Vocal Panel */}
        <AnimatePresence>
          {(leadVocalStatus === "loading" || leadVocalStatus === "success" || leadVocalStatus === "error") && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="rounded-3xl border p-4 bg-purple-900/5"
            >
              <div className="text-white font-bold mb-2">Lead Vocal Panel (Dummy)</div>
              <pre className="text-xs text-white/60">{JSON.stringify(leadVocalData, null, 2)}</pre>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mix & Master Panel */}
        <AnimatePresence>
          {(mixMasterStatus === "loading" || mixMasterStatus === "success" || mixMasterStatus === "error") && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="rounded-2xl border p-4 bg-green-900/5"
            >
              <div className="text-white font-bold mb-2">Mix & Master Panel (Dummy)</div>
              <pre className="text-xs text-white/60">{JSON.stringify(mixMasterData, null, 2)}</pre>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stem Extraction Panel */}
        <AnimatePresence>
          {(stemStatus === "loading" || stemStatus === "success" || stemStatus === "error") && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="rounded-2xl border p-4 bg-orange-900/5"
            >
              <div className="text-white font-bold mb-2">Stem Extraction Panel (Dummy)</div>
              <pre className="text-xs text-white/60">{JSON.stringify(stemData, null, 2)}</pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default AudioStudio;