import { db as prisma } from "@/lib/db";

const DAILY_LIMIT = 200;
const SERVICE = "recman";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Sjekker og inkrementerer daglig teller for Recman API-kall.
 * Kaster feil hvis grensen på 200 kall per dag er nådd.
 */
export async function checkRateLimit(): Promise<void> {
  const date = todayKey();

  const record = await prisma.apiRateLimit.upsert({
    where: { service_date: { service: SERVICE, date } },
    create: { service: SERVICE, date, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (record.count > DAILY_LIMIT) {
    throw new Error(
      `Recman API daglig grense nådd (${DAILY_LIMIT} kall). Prøv igjen i morgen.`
    );
  }
}

/**
 * Returnerer gjeldende bruk for i dag.
 */
export async function getRateLimitStatus(): Promise<{
  count: number;
  limit: number;
  remaining: number;
}> {
  const date = todayKey();
  const record = await prisma.apiRateLimit.findUnique({
    where: { service_date: { service: SERVICE, date } },
  });

  const count = record?.count ?? 0;
  return {
    count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - count),
  };
}
