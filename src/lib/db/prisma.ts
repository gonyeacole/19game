import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Turso (libSQL) in production/deployed environments; a local SQLite file
// otherwise. Same client code path either way via the libSQL driver adapter,
// since a plain "file:" URL works for local dev too.
const libsql = createClient({
  url:
    process.env.TURSO_DATABASE_URL ??
    `file:${path.join(process.cwd(), "prisma", "dev.db")}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const adapter = new PrismaLibSQL(libsql);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
