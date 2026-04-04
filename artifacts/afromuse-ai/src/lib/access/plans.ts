/**
 * AfroMuse Access Control — Plan Definitions
 *
 * All plan configs live here. Adding a new plan (e.g. "gold", "enterprise")
 * means adding one entry to PLANS — nothing else changes.
 */

import type { Plan, PlanId } from "./types";

// ─── Plan Definitions ─────────────────────────────────────────────────────────

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Free",
    badgeLabel: "FREE",
    description: "Preview generation and basic session building.",
    features: {
      canGenerateInstrumental:  true,
      canGenerateVocals:        true,
      canGenerateBlueprint:     true,
      canExportMp3:             false,
      canExportWav:             false,
      canExportStems:           false,
      canUsePremiumMixFeels:    false,
      canUseProTools:           false,
      canSaveProjects:          false,
      canGenerateLeadVocals:    true,
      canUseMixMaster:          false,
      canUseHitmakerMode:       false,
    },
    limits: {
      sessionsPerDay:                   3,
      instrumentalGenerationsPerDay:    3,
      vocalGenerationsPerDay:           3,
      exportsPerDay:                    0,
    },
  },

  pro: {
    id: "pro",
    label: "Pro",
    badgeLabel: "PRO",
    description: "Full studio access — exports, stems, pro tools, and unlimited sessions.",
    features: {
      canGenerateInstrumental:  true,
      canGenerateVocals:        true,
      canGenerateBlueprint:     true,
      canExportMp3:             true,
      canExportWav:             true,
      canExportStems:           true,
      canUsePremiumMixFeels:    true,
      canUseProTools:           true,
      canSaveProjects:          true,
      canGenerateLeadVocals:    true,
      canUseMixMaster:          true,
      canUseHitmakerMode:       true,
    },
    limits: {
      sessionsPerDay:                   null,
      instrumentalGenerationsPerDay:    null,
      vocalGenerationsPerDay:           null,
      exportsPerDay:                    null,
    },
  },
};

export function getPlan(planId: PlanId): Plan {
  return PLANS[planId];
}

export function getAllPlans(): Plan[] {
  return Object.values(PLANS);
}

// ─── Plan Name Bridge ─────────────────────────────────────────────────────────
// Maps the existing server plan strings ("Free", "Pro", "Gold") to our
// internal PlanId. Gold is treated as Pro since it has all Pro features.

export function resolveServerPlan(serverPlan: string): PlanId {
  const lower = serverPlan?.toLowerCase() ?? "free";
  if (lower === "pro" || lower === "gold") return "pro";
  return "free";
}
