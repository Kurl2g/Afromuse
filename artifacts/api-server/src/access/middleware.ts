/**
 * AfroMuse Backend Access Control — Middleware
 *
 * Route middleware for feature gating. Import and use on any route that
 * requires a specific feature to be available on the user's plan.
 *
 * Usage:
 *   import { requireFeature } from "../access/middleware.js";
 *
 *   router.post("/some-pro-route", requireFeature("canExportWav"), handler);
 *
 * When real auth is in place the plan is read from the JWT cookie.
 * Until then, unauthenticated requests are treated as "free".
 */

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { checkAccess } from "./featureGate.js";
import type { FeatureKey } from "./types.js";

interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

function extractPlanFromRequest(req: Request): string {
  try {
    const token = req.cookies?.auth_token;
    if (!token) return "free";

    const secret = process.env["SESSION_SECRET"];
    if (!secret) return "free";

    const payload = jwt.verify(token, secret) as JwtPayload & { plan?: string };

    // Plan is not in the JWT payload by default — fall back to DB lookup
    // when real monetization is wired. For now, role=admin → "pro".
    if (payload.role === "admin") return "gold";
    return "free";
  } catch {
    return "free";
  }
}

/**
 * Middleware factory: gates the route behind a feature check.
 * Returns 403 with a JSON error if the feature is not available.
 */
export function requireFeature(feature: FeatureKey) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawPlan = extractPlanFromRequest(req);
    const result = checkAccess(rawPlan, feature);

    if (!result.allowed) {
      res.status(403).json({
        error: result.reason ?? "This feature requires a Pro plan.",
        feature,
        upgradeRequired: result.upgradeRequired,
      });
      return;
    }

    next();
  };
}

/**
 * Attach the resolved plan to the request for use in handlers.
 * Call this early in the middleware chain to avoid repeated JWT parsing.
 */
export function attachPlan(req: Request, _res: Response, next: NextFunction): void {
  (req as Request & { resolvedPlan: string }).resolvedPlan = extractPlanFromRequest(req);
  next();
}
