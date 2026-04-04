/**
 * AfroMuse Backend Access Control — Plan Definitions
 *
 * Server-side plan feature maps.
 * Mirrors the client-side plans.ts — both must stay in sync.
 */

import type { FeatureAccessMap, ServerPlanId } from "./types.js";

const FREE_FEATURES: FeatureAccessMap = {
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
};

const PRO_FEATURES: FeatureAccessMap = {
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
};

const PLAN_FEATURES: Record<ServerPlanId, FeatureAccessMap> = {
  free: FREE_FEATURES,
  pro: PRO_FEATURES,
};

/**
 * Resolve a raw DB/JWT plan string to the internal ServerPlanId.
 * "Gold" is treated as "pro" since it includes all pro features.
 */
export function resolveServerPlan(rawPlan: string): ServerPlanId {
  const lower = rawPlan?.toLowerCase() ?? "free";
  if (lower === "pro" || lower === "gold") return "pro";
  return "free";
}

export function getPlanFeatures(planId: ServerPlanId): FeatureAccessMap {
  return PLAN_FEATURES[planId];
}
