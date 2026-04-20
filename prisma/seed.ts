import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { randomBytes, createCipheriv } from "node:crypto";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

/** Krypterer clientKey med AES-256-GCM (samme logikk som lib/poweroffice/crypto.ts) */
function encryptClientKey(plaintext: string): string {
  const hex = process.env.POWEROFFICE_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "POWEROFFICE_ENCRYPTION_KEY mangler. Generer med: openssl rand -hex 32"
    );
  }
  const key = Buffer.from(hex, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

async function main() {
  console.log("Seeder arbeidsnormer og rateprofiler...");

  // ─── PowerOffice demo-klient ─────────────────────────────────────
  const appKey = process.env.POWEROFFICE_APPLICATION_KEY;
  const clientKey = process.env.POWEROFFICE_CLIENT_KEY;
  const subKey = process.env.POWEROFFICE_SUBSCRIPTION_KEY;
  const encKey = process.env.POWEROFFICE_ENCRYPTION_KEY;

  if (appKey && clientKey && subKey && encKey) {
    await prisma.powerOfficeClient.upsert({
      where: { tenantSlug: "demo-nrt" },
      update: {
        applicationKey: appKey,
        subscriptionKey: subKey,
        encryptedClientKey: encryptClientKey(clientKey),
      },
      create: {
        tenantSlug: "demo-nrt",
        displayName: "Nordic Rig Tech AS - API Test Client",
        environment: "demo",
        applicationKey: appKey,
        subscriptionKey: subKey,
        encryptedClientKey: encryptClientKey(clientKey),
        onboardedBy: "seed-script",
        onboardedAt: new Date(),
      },
    });
    console.log("PowerOffice demo-klient seedet (demo-nrt).");
  } else {
    console.log(
      "Hopper over PowerOffice seed — mangler POWEROFFICE_APPLICATION_KEY, POWEROFFICE_CLIENT_KEY, POWEROFFICE_SUBSCRIPTION_KEY eller POWEROFFICE_ENCRYPTION_KEY."
    );
  }

  // ─── Arbeidsnormer ──────────────────────────────────────────────────

  const kabelinstallasjon = await prisma.normCategory.upsert({
    where: { name: "Kabelinstallasjon" },
    update: {},
    create: {
      name: "Kabelinstallasjon",
      description: "Normer for trekking og legging av kabel",
      discipline: "ELECTRICAL",
      order: 1,
    },
  });

  const terminering = await prisma.normCategory.upsert({
    where: { name: "Terminering" },
    update: {},
    create: {
      name: "Terminering",
      description: "Normer for terminering av kabler",
      discipline: "ELECTRICAL",
      order: 2,
    },
  });

  const utstyrsinstallasjon = await prisma.normCategory.upsert({
    where: { name: "Utstyrsinstallasjon" },
    update: {},
    create: {
      name: "Utstyrsinstallasjon",
      description: "Normer for installasjon av utstyr og komponenter",
      discipline: "ELECTRICAL",
      order: 3,
    },
  });

  const instrumentinstallasjon = await prisma.normCategory.upsert({
    where: { name: "Instrumentinstallasjon" },
    update: {},
    create: {
      name: "Instrumentinstallasjon",
      description: "Normer for installasjon av instrumenter",
      discipline: "INSTRUMENT",
      order: 4,
    },
  });

  const engineering = await prisma.normCategory.upsert({
    where: { name: "Engineering" },
    update: {},
    create: {
      name: "Engineering",
      description: "Normer for engineering-dokumenter og tegninger",
      discipline: "ENGINEERING",
      order: 5,
    },
  });

  // Kabelnormer basert pa estimatmalen
  const cableNorms = [
    { name: "Kabel trekk i gate < 6mm2", hoursPerUnit: 0.07, unit: "meter", sizeRange: "< 6mm2", order: 1 },
    { name: "Kabel trekk i gate 6-50mm2", hoursPerUnit: 0.12, unit: "meter", sizeRange: "6-50mm2", order: 2 },
    { name: "Kabel trekk i gate > 50mm2", hoursPerUnit: 0.20, unit: "meter", sizeRange: "> 50mm2", order: 3 },
    { name: "Kabel trekk i ror < 6mm2", hoursPerUnit: 0.15, unit: "meter", sizeRange: "< 6mm2", order: 4 },
    { name: "Kabel trekk i ror 6-50mm2", hoursPerUnit: 0.25, unit: "meter", sizeRange: "6-50mm2", order: 5 },
    { name: "Kabel trekk i ror > 50mm2", hoursPerUnit: 0.35, unit: "meter", sizeRange: "> 50mm2", order: 6 },
  ];

  for (const norm of cableNorms) {
    await prisma.workNorm.upsert({
      where: { categoryId_name: { categoryId: kabelinstallasjon.id, name: norm.name } },
      update: { hoursPerUnit: norm.hoursPerUnit },
      create: { ...norm, categoryId: kabelinstallasjon.id },
    });
  }

  // Termineringsnormer
  const termNorms = [
    { name: "Terminering enkel (1-4 ledere)", hoursPerUnit: 0.5, unit: "stk", order: 1 },
    { name: "Terminering dobbel (5-12 ledere)", hoursPerUnit: 1.0, unit: "stk", order: 2 },
    { name: "Terminering kompleks (> 12 ledere)", hoursPerUnit: 1.5, unit: "stk", order: 3 },
  ];

  for (const norm of termNorms) {
    await prisma.workNorm.upsert({
      where: { categoryId_name: { categoryId: terminering.id, name: norm.name } },
      update: { hoursPerUnit: norm.hoursPerUnit },
      create: { ...norm, categoryId: terminering.id },
    });
  }

  // Utstyrsinstallasjon
  const equipNorms = [
    { name: "Koblingsboks installasjon", hoursPerUnit: 1.5, unit: "stk", order: 1 },
    { name: "Lysarmatur installasjon", hoursPerUnit: 1.0, unit: "stk", order: 2 },
    { name: "Bryter/stikkontakt installasjon", hoursPerUnit: 0.5, unit: "stk", order: 3 },
    { name: "Tavle/panel installasjon", hoursPerUnit: 4.0, unit: "stk", order: 4 },
    { name: "Kabelgate/bro installasjon", hoursPerUnit: 0.3, unit: "meter", order: 5 },
    { name: "MCT (kabelgjennomforing)", hoursPerUnit: 2.0, unit: "stk", order: 6 },
    { name: "Demontering utstyr", hoursPerUnit: 0.8, unit: "stk", order: 7 },
  ];

  for (const norm of equipNorms) {
    await prisma.workNorm.upsert({
      where: { categoryId_name: { categoryId: utstyrsinstallasjon.id, name: norm.name } },
      update: { hoursPerUnit: norm.hoursPerUnit },
      create: { ...norm, categoryId: utstyrsinstallasjon.id },
    });
  }

  // Instrumentinstallasjon
  const instrNorms = [
    { name: "Instrument installasjon (standard)", hoursPerUnit: 2.0, unit: "stk", order: 1 },
    { name: "Instrument installasjon (kompleks)", hoursPerUnit: 4.0, unit: "stk", order: 2 },
    { name: "Fotocelle/sensor installasjon", hoursPerUnit: 1.5, unit: "stk", order: 3 },
    { name: "Signalflagg/horn installasjon", hoursPerUnit: 1.0, unit: "stk", order: 4 },
  ];

  for (const norm of instrNorms) {
    await prisma.workNorm.upsert({
      where: { categoryId_name: { categoryId: instrumentinstallasjon.id, name: norm.name } },
      update: { hoursPerUnit: norm.hoursPerUnit },
      create: { ...norm, categoryId: instrumentinstallasjon.id },
    });
  }

  // Engineering-normer
  const engNorms = [
    { name: "Kabelplan", hoursPerUnit: 4.0, unit: "dokument", order: 1 },
    { name: "Termineringsplan", hoursPerUnit: 3.0, unit: "dokument", order: 2 },
    { name: "Instrumentdatablad", hoursPerUnit: 2.0, unit: "dokument", order: 3 },
    { name: "Layout tegning", hoursPerUnit: 8.0, unit: "dokument", order: 4 },
    { name: "Koblingsskjema", hoursPerUnit: 6.0, unit: "dokument", order: 5 },
    { name: "Enlinjeskjema", hoursPerUnit: 4.0, unit: "dokument", order: 6 },
    { name: "Teknisk revisjon", hoursPerUnit: 2.0, unit: "dokument", order: 7 },
    { name: "As-built dokumentasjon", hoursPerUnit: 3.0, unit: "dokument", order: 8 },
  ];

  for (const norm of engNorms) {
    await prisma.workNorm.upsert({
      where: { categoryId_name: { categoryId: engineering.id, name: norm.name } },
      update: { hoursPerUnit: norm.hoursPerUnit },
      create: { ...norm, categoryId: engineering.id },
    });
  }

  console.log("Arbeidsnormer seedet.");

  // ─── Rateprofiler ───────────────────────────────────────────────────

  // Standard Offshore (basert pa tilbudsmalen)
  const offshoreProfile = await prisma.rateProfile.upsert({
    where: { name: "Standard Offshore" },
    update: {},
    create: {
      name: "Standard Offshore",
      description: "Standard timerater for offshore-arbeid (extended dayshift 07-19)",
      active: true,
    },
  });

  const offshoreRates = [
    { roleCode: "ENGINEER", roleName: "Engineering", hourlyRateNOK: 900 },
    { roleCode: "PROJECT_MANAGER", roleName: "Prosjektleder", hourlyRateNOK: 990 },
    { roleCode: "FIELD_ENGINEER_EX", roleName: "Feltingenior (IECEx)", hourlyRateNOK: 1190 },
    { roleCode: "FIELD_ENGINEER", roleName: "Feltingenior", hourlyRateNOK: 990 },
    { roleCode: "ELECTRICIAN", roleName: "Elektriker", hourlyRateNOK: 790 },
  ];

  for (const rate of offshoreRates) {
    await prisma.rate.upsert({
      where: { profileId_roleCode: { profileId: offshoreProfile.id, roleCode: rate.roleCode } },
      update: { hourlyRateNOK: rate.hourlyRateNOK },
      create: { ...rate, profileId: offshoreProfile.id },
    });
  }

  // Standard Onshore
  const onshoreProfile = await prisma.rateProfile.upsert({
    where: { name: "Standard Onshore" },
    update: {},
    create: {
      name: "Standard Onshore",
      description: "Standard timerater for onshore-arbeid (dagskift 07-15)",
      active: true,
    },
  });

  const onshoreRates = [
    { roleCode: "ENGINEER", roleName: "Engineering", hourlyRateNOK: 900 },
    { roleCode: "PROJECT_MANAGER", roleName: "Prosjektleder", hourlyRateNOK: 900 },
    { roleCode: "FIELD_ENGINEER", roleName: "Feltingenior", hourlyRateNOK: 900 },
    { roleCode: "ELECTRICIAN", roleName: "Elektriker", hourlyRateNOK: 690 },
  ];

  for (const rate of onshoreRates) {
    await prisma.rate.upsert({
      where: { profileId_roleCode: { profileId: onshoreProfile.id, roleCode: rate.roleCode } },
      update: { hourlyRateNOK: rate.hourlyRateNOK },
      create: { ...rate, profileId: onshoreProfile.id },
    });
  }

  console.log("Rateprofiler seedet.");
  console.log("Seeding fullfort!");
}

main()
  .catch((e) => {
    console.error("Feil ved seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
