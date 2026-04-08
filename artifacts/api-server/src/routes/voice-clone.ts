/**
 * /api/voice-clone — Artist Pro feature (Coming Soon placeholder)
 *
 * Voice clone feature — Artist Pro only. Currently a placeholder
 * that returns a structured response indicating the feature is in development.
 */

import { Router } from "express";
import { requireAuth, attachPlanFromDb, requireFeature } from "../access/middleware.js";

const router = Router();

router.post(
  "/voice-clone",
  requireAuth,
  attachPlanFromDb,
  requireFeature("canUseVoiceClone"),
  async (_req, res) => {
    res.status(200).json({
      status: "coming-soon",
      message: "Voice Clone is available to Artist Pro members and is currently in development. You will be among the first to access it when it launches.",
      estimatedLaunch: "Q3 2025",
      feature: "voice-clone",
    });
  }
);

router.get(
  "/voice-clone/status",
  requireAuth,
  attachPlanFromDb,
  requireFeature("canUseVoiceClone"),
  async (_req, res) => {
    res.json({
      available: false,
      status: "coming-soon",
      message: "Voice Clone is in development. Artist Pro members will get early access.",
    });
  }
);

export default router;
