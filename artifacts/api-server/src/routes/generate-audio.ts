/**
 * AfroMuse Audio Routes
 *
 * All generation logic lives in src/engine/providers/*.
 * Routes here are thin: create job → dispatch to provider → return jobId.
 * The polling endpoint (/audio-job/:jobId) serves the normalized response
 * and maps it back to the legacy shape so existing UI clients continue to work.
 */

import { Router } from "express";
import { logger } from "../lib/logger.js";

// Engine layer
import { createEngineJob, getEngineJob, advanceJob, failJob } from "../engine/jobStore.js";
import { run as runInstrumental, type InstrumentalPayload } from "../engine/providers/instrumental.js";
import { runVocalDemo, runLeadVocal, type VocalDemoPayload, type LeadVocalPayload } from "../engine/providers/vocal.js";
import { run as runMastering, type MasteringPayload } from "../engine/providers/mastering.js";
import { run as runStems, type StemExtractionPayload } from "../engine/providers/stems.js";
import { listProviders, isProviderActive } from "../engine/providers/registry.js";
import {
  canProviderHandleBuildMode,
  canProviderHandleCustomLyrics,
  canProviderHandleStems,
  canProviderHandleMasteredExport,
} from "../engine/compatibility.js";
import { getEngineDiagnostics } from "../engine/diagnostics.js";

// Re-export legacy types so any downstream code that imports them continues to work
export type { InstrumentalPayload };
export type {
  AiSessionData,
  LeadVocalSessionData,
  MixMasterSessionData,
  StemExtractionSessionData,
  StemTrackData,
  InstrumentalMetadata,
  VocalMetadata,
} from "./generate-audio.legacy-types.js";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dispatch(
  jobId: string,
  runner: () => Promise<import("../engine/types.js").NormalizedResponse>,
  errorMessage: string,
): void {
  advanceJob(jobId, "processing");
  runner()
    .then((response) => advanceJob(jobId, "completed", response))
    .catch((err) => {
      logger.error({ err, jobId }, errorMessage);
      failJob(jobId, errorMessage);
    });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post("/generate-instrumental-preview", (req, res) => {
  const payload = req.body as InstrumentalPayload;
  const job = createEngineJob("instrumental", "instrumental");

  dispatch(job.jobId, () => runInstrumental(job.jobId, payload), "Instrumental generation failed");

  logger.info({ jobId: job.jobId, genre: payload.genre, mood: payload.mood }, "Instrumental job created");
  res.json({ success: true, jobId: job.jobId, status: "queued" });
});

router.post("/generate-vocal-demo", (req, res) => {
  const payload = req.body as VocalDemoPayload;
  const job = createEngineJob("vocal", "vocal");

  dispatch(job.jobId, () => runVocalDemo(job.jobId, payload), "Vocal demo generation failed");

  logger.info({ jobId: job.jobId, genre: payload.genre, mood: payload.mood }, "Vocal demo job created");
  res.json({ success: true, jobId: job.jobId, status: "queued" });
});

router.post("/generate-lead-vocals", (req, res) => {
  const payload = req.body as LeadVocalPayload;

  if (!canProviderHandleCustomLyrics("vocal")) {
    res.status(400).json({ error: "Vocal provider does not support custom lyrics in this mode" });
    return;
  }

  if (payload.buildMode && !canProviderHandleBuildMode("vocal", payload.buildMode)) {
    res.status(400).json({ error: `Vocal provider does not support build mode: ${payload.buildMode}` });
    return;
  }

  const job = createEngineJob("lead-vocal", "vocal");

  dispatch(job.jobId, () => runLeadVocal(job.jobId, payload), "Lead vocal generation failed");

  logger.info({ jobId: job.jobId, gender: payload.gender, feel: payload.performanceFeel }, "Lead vocal job created");
  res.json({ success: true, jobId: job.jobId, status: "queued" });
});

router.post("/mix-master", (req, res) => {
  const payload = req.body as MasteringPayload;

  if (!canProviderHandleMasteredExport("mastering")) {
    res.status(400).json({ error: "Mastering provider is not available for this operation" });
    return;
  }

  const job = createEngineJob("mix-master", "mastering");

  dispatch(job.jobId, () => runMastering(job.jobId, payload), "Mix master generation failed");

  logger.info({ jobId: job.jobId, feel: payload.mixFeel, genre: payload.genre }, "Mix master job created");
  res.json({ success: true, jobId: job.jobId, status: "queued" });
});

router.post("/extract-stems", (req, res) => {
  const payload = req.body as StemExtractionPayload;

  if (!canProviderHandleStems("stems")) {
    res.status(400).json({ error: "Stems provider is not available for this operation" });
    return;
  }

  const job = createEngineJob("stem-extraction", "stems");

  dispatch(job.jobId, () => runStems(job.jobId, payload), "Stem extraction failed");

  logger.info({ jobId: job.jobId, stems: payload.stems, genre: payload.genre }, "Stem extraction job created");
  res.json({ success: true, jobId: job.jobId, status: "queued" });
});

// ─── Job Status Polling ───────────────────────────────────────────────────────

router.get("/audio-job/:jobId", (req, res) => {
  const job = getEngineJob(req.params.jobId);

  if (!job) {
    res.status(404).json({ error: "Job not found or expired" });
    return;
  }

  if (job.status === "queued" || job.status === "processing") {
    res.json({ jobId: job.jobId, status: job.status });
    return;
  }

  if (job.status === "failed") {
    res.json({
      jobId: job.jobId,
      status: "failed",
      error: job.response?.error?.message ?? "Unknown error",
    });
    return;
  }

  // Completed — serve normalized response mapped to the legacy UI contract
  const r = job.response!;
  const bp = r.blueprintData ?? {};

  res.json({
    jobId: job.jobId,
    status: "completed",

    // Legacy fields the UI currently reads
    audioUrl: r.audioUrl,
    duration: bp.duration ?? null,
    metadata: bp.audioType ? {
      genre: bp.genre,
      mood: bp.mood,
      bpm: bp.bpm,
      key: bp.key,
      energy: bp.energy,
      duration: bp.duration,
      hitmakerMode: bp.hitmakerMode,
      hookRepeatLevel: bp.hookRepeatLevel,
      audioType: bp.audioType,
      vocalStyle: bp.vocalStyle,
    } : null,
    sessionData: bp.beatSummary ? {
      beatSummary: bp.beatSummary,
      arrangementMap: bp.arrangementMap,
      producerNotes: bp.producerNotes,
      hookFocus: bp.hookFocus,
      arrangementStyle: bp.arrangementStyle,
      sonicIdentity: bp.sonicIdentity,
      sessionBrief: bp.sessionBrief,
    } : null,
    leadVocalSessionData: bp.vocalBrief ? {
      vocalBrief: bp.vocalBrief,
      phrasingGuide: bp.phrasingGuide,
      emotionalArc: bp.emotionalArc,
      syncNotes: bp.syncNotes,
      performanceDirection: bp.performanceDirection,
      deliveryStyle: bp.deliveryStyle,
      vocalProcessingNotes: bp.vocalProcessingNotes,
    } : null,
    mixMasterSessionData: bp.mixBrief ? {
      mixBrief: bp.mixBrief,
      levelBalancing: bp.levelBalancing,
      eqNotes: bp.eqNotes,
      compressionNotes: bp.compressionNotes,
      spatialEffects: bp.spatialEffects,
      masteringChain: bp.masteringChain,
      outputNotes: bp.outputNotes,
      stemsNotes: bp.stemsNotes ?? null,
    } : null,
    stemExtractionSessionData: bp.extractionBrief ? {
      extractionBrief: bp.extractionBrief,
      stems: bp.stems ?? [],
      phaseAlignmentNotes: bp.phaseAlignmentNotes,
      dawImportGuide: bp.dawImportGuide,
      recommendedTool: bp.recommendedTool,
    } : null,

    // New normalized fields
    normalizedResponse: r,
  });
});

// ─── Provider Info & Engine Status ───────────────────────────────────────────

/**
 * GET /engine/providers
 * Returns all provider configs, capability profiles, and live-activation state.
 * Useful for admin tooling, feature flags, and future provider management UI.
 */
router.get("/engine/providers", (_req, res) => {
  const providers = listProviders();
  const anyLive = providers.some((p) => isProviderActive(p.category));
  res.json({
    providers,
    engineMode: anyLive ? "partial-live" : "mock",
  });
});

/**
 * GET /engine/diagnostics
 * Full internal engine state snapshot for admin readiness and debug inspection.
 *
 * Returns:
 *   - Current environment
 *   - Resolved mode per provider (and the source of that decision)
 *   - Provider registry statuses and live-capability flags
 *   - Credential slot readiness (no actual secret values exposed)
 *   - Provider capability profiles
 *   - Fallback configuration
 *   - Overall engine mode classification
 *   - Active safety settings
 *
 * NOTE: This endpoint is for internal / admin use only.
 * In production, protect this route with auth middleware before exposing it.
 */
router.get("/engine/diagnostics", (_req, res) => {
  const diagnostics = getEngineDiagnostics();
  res.json(diagnostics);
});

export default router;
