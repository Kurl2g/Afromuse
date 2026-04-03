import { Router } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const COOKIE_NAME = "auth_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

function getJwtSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function signToken(payload: { userId: number; email: string; role: string }) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

function effectivePlan(user: { role: string; plan: string }): string {
  return user.role === "admin" ? "Gold" : user.plan;
}

function verifyToken(token: string): { userId: number; email: string; role: string } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { userId: number; email: string; role: string };
  } catch {
    return null;
  }
}

router.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const passwordHash = await bcryptjs.hash(password, 12);
    const [user] = await db
      .insert(usersTable)
      .values({ name, email: email.toLowerCase(), passwordHash, role: "user" })
      .returning();

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, plan: effectivePlan(user) });
  } catch (err) {
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);

    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const valid = await bcryptjs.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, plan: effectivePlan(user) });
  } catch (err) {
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ success: true });
});

router.get("/auth/me", async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.status(401).json({ error: "Session expired. Please log in again." });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user) {
      res.clearCookie(COOKIE_NAME, { path: "/" });
      res.status(401).json({ error: "User not found." });
      return;
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, plan: effectivePlan(user) });
  } catch {
    res.status(500).json({ error: "Failed to fetch user." });
  }
});

export default router;
