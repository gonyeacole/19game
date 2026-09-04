import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { NFL_TEAMS, logoUrlFor } from "./teams";

const libsql = createClient({
  url:
    process.env.TURSO_DATABASE_URL ??
    `file:${path.join(process.cwd(), "prisma", "dev.db")}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter: new PrismaLibSQL(libsql) });

async function main() {
  for (const team of NFL_TEAMS) {
    await prisma.team.upsert({
      where: { abbreviation: team.abbreviation },
      update: {
        name: team.name,
        espnId: team.espnId,
        logoUrl: logoUrlFor(team.abbreviation),
      },
      create: {
        name: team.name,
        abbreviation: team.abbreviation,
        espnId: team.espnId,
        logoUrl: logoUrlFor(team.abbreviation),
      },
    });
  }
  console.log(`Seeded ${NFL_TEAMS.length} NFL teams.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
