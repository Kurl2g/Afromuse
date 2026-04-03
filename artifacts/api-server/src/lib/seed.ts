import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcryptjs from "bcryptjs";
import { logger } from "./logger";

export async function seedAdminAccount() {
  const email = "afromuseai@gmail.com";
  const name = "AfroMuse Admin";
  const password = "naesakim";
  const plan = "Gold";
  const role = "admin";

  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing.length > 0) {
      logger.info({ email }, "Admin account already exists — skipping seed");
      return;
    }

    const passwordHash = await bcryptjs.hash(password, 12);

    await db.insert(usersTable).values({ name, email, passwordHash, role, plan });

    logger.info({ email, role, plan }, "Admin account seeded successfully");
  } catch (err) {
    logger.error({ err }, "Failed to seed admin account");
  }
}
