import { prisma } from "./prisma";

export async function ensureWeek(seasonYear: number, weekNumber: number) {
  return prisma.week.upsert({
    where: { seasonYear_weekNumber: { seasonYear, weekNumber } },
    update: {},
    create: { seasonYear, weekNumber },
  });
}
