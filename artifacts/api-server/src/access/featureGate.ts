/**
 * AfroMuse Backend Access Control — Feature Gate
 *
 * Server-side feature checks. Use these in route handlers to guard
 * premium endpoints. When real billing is added, replace resolveServerPlan
 * with a DB lookup — nothing in the route handlers needs to change.
 */

import { resolveServerPlan, getPlanFeatures } from "./plans.js";
import type { AccessCheckResult, FeatureKey } from "./types.js";

const FEATURE_LABELS: Record<FeatureKey, string> = {
  canGenerateInstrumental:  "Instrumental Generation",
  canGenerateVocals:        "Vocal Generation",
  canGenerateBlueprint:     "Arrangement Blueprint",
  canExportMp3:             "MP3 Export",
  canExportWav:             "WAV Export",
  canExportStems:           "Stems Export",
  canUsePremiumMixFeels:    "Premium Mix Feels",
  canUseProTools:           "Pro Tools",
  canSaveProjects:          "Project Saving",
  canGenerateLeadVocals:    "Lead Vocal Generation",
  canUseMixMaster:          "Mix & Master",
  canUseHitmakerMode:       "Hitmaker Mode",
};

/**
 * Check whether a raw plan string (from JWT/DB) has access to a feature.
 */
export function checkAccess(rawPlan: string, feature: FeatureKey): AccessCheckResult {
  const planId = resolveServerPlan(rawPlan);
  const features = getPlanFeatures(planId);
  const allowed = features[feature] ?? false;

  if (!allowed) {
    return {
      allowed: false,
      reason: `${FEATURE_LABELS[feature]} requires a Pro plan.`,
      upgradeRequired: planId === "free",
    };
  }

  return { allowed: true, reason: null, upgradeRequired: false };
}

/**
 * Simple boolean check for inline guards.
 */
export function isAllowed(rawPlan: string, feature: FeatureKey): boolean {
  return checkAccess(rawPlan, feature).allowed;
}
