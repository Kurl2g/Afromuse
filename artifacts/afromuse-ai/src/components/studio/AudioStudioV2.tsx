// AudioStudio.tsx
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic2, AlertCircle, Headphones, Layers, Copy, Clock } from "lucide-react";

const AudioStudio: React.FC = () => {
  const [leadVocalStatus, setLeadVocalStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mixMasterStatus, setMixMasterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [stemStatus, setStemStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [leadVocalData, setLeadVocalData] = useState<any>(null);
  const [mixMasterData, setMixMasterData] = useState<any>(null);
  const [stemData, setStemData] = useState<any>(null);

  const generateLeadVocal = () => {
    setLeadVocalStatus("loading");
    setTimeout(() => {
      setLeadVocalData({ vocalBrief: "", phrasingGuide: "", emotionalArc: "", syncNotes: "", performanceDirection: "", deliveryStyle: "", vocalProcessingNotes: "" });
      setLeadVocalStatus("success");
    }, 1500);
  };

  const generateMixMaster = () => {
    setMixMasterStatus("loading");
    setTimeout(() => {
      setMixMasterData({ mixBrief: "", levelBalancing: "", eqNotes: "", compressionNotes: "", spatialEffects: "", masteringChain: "", outputNotes: "", stemsNotes: "" });
      setMixMasterStatus("success");
    }, 1500);
  };

  const generateStem = () => {
    setStemStatus("loading");
    setTimeout(() => {
      setStemData({
        extractionBrief: "",
        recommendedTool: "",
        stems: [
          { name: "Lead Vocal", extractionNotes: "", gainLevel: "", fileSpec: "" },
          { name: "Backing Vocals", extractionNotes: "", gainLevel: "", fileSpec: "" },
          { name: "Drums", extractionNotes: "", gainLevel: "", fileSpec: "" },
        ],
        phaseAlignmentNotes: "",
        dawImportGuide: ""
      });
      setStemStatus("success");
    }, 1500);
  };

  return (
    <section className="p-6">
      <div className="space-y-6">
        {/* Lead Vocal Panel */}
        <div className="border rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">Lead Vocal</span>
            <button onClick={generateLeadVocal} className="text-xs px-2 py-1 border rounded">Generate</button>
          </div>
          <AnimatePresence>
            {leadVocalStatus === "loading" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-xs text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" /> Generating…
              </motion.div>
            )}
            {leadVocalStatus === "success" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-gray-600">
                <p>Vocal brief ready. (Empty)</p>
              </motion.div>
            )}
            {leadVocalStatus === "error" && <p className="text-red-400 text-xs">Failed to generate.</p>}
          </AnimatePresence>
        </div>

        {/* Mix & Master Panel */}
        <div className="border rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">Mix & Master</span>
            <button onClick={generateMixMaster} className="text-xs px-2 py-1 border rounded">Generate</button>
          </div>
          <AnimatePresence>
            {mixMasterStatus === "loading" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-xs text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" /> Generating…
              </motion.div>
            )}
            {mixMasterStatus === "success" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-gray-600">
                <p>Mix brief ready. (Empty)</p>
              </motion.div>
            )}
            {mixMasterStatus === "error" && <p className="text-red-400 text-xs">Failed to generate.</p>}
          </AnimatePresence>
        </div>

        {/* Stem Extraction Panel */}
        <div className="border rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">Stem Extraction</span>
            <button onClick={generateStem} className="text-xs px-2 py-1 border rounded">Generate</button>
          </div>
          <AnimatePresence>
            {stemStatus === "loading" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-xs text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" /> Generating…
              </motion.div>
            )}
            {stemStatus === "success" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-gray-600">
                <p>Stem brief ready. (Empty)</p>
              </motion.div>
            )}
            {stemStatus === "error" && <p className="text-red-400 text-xs">Failed to generate.</p>}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default AudioStudio;