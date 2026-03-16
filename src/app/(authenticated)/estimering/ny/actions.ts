"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { put } from "@vercel/blob";
import {
  extractTextFromDocx,
  parseWorkPackageWithAI,
  classifyCableSize,
} from "@/lib/ai/parse-work-package";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

const createEstimateSchema = z.object({
  name: z.string().min(1, "Navn er pakrevd"),
  projectNumber: z.string().optional(),
  description: z.string().optional(),
  rateProfileId: z.string().optional(),
});

export async function createEstimate(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const raw = {
    name: formData.get("name") as string,
    projectNumber: (formData.get("projectNumber") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
    rateProfileId: (formData.get("rateProfileId") as string) || undefined,
  };

  const parsed = createEstimateSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const estimate = await db.estimate.create({
    data: {
      name: parsed.data.name,
      projectNumber: parsed.data.projectNumber || null,
      description: parsed.data.description || null,
      rateProfileId: parsed.data.rateProfileId || null,
      createdById: session.user.id ?? "unknown",
      createdByName: session.user.name ?? "Ukjent",
    },
  });

  revalidatePath("/estimering");
  redirect(`/estimering/${estimate.id}`);
}

// Bakgrunnsjobb: kjor AI-parsing uten a blokkere klienten
async function runAiParsingInBackground(
  estimateId: string,
  fileBuffer: Buffer,
  fileName: string,
  rateProfileId: string | null
) {
  try {
    // Last opp fil til Vercel Blob (hvis konfigurert)
    let fileUrl: string | null = null;
    try {
      const blob = await put(
        `arbeidspakker/${estimateId}/${fileName}`,
        fileBuffer,
        { access: "public" }
      );
      fileUrl = blob.url;
    } catch {
      console.warn("Vercel Blob ikke konfigurert, hopper over fillagring");
    }

    // Ekstraher tekst fra DOCX
    const documentText = await extractTextFromDocx(fileBuffer);

    if (!documentText.trim()) {
      await db.estimate.update({
        where: { id: estimateId },
        data: {
          status: "DRAFT",
          aiParseStatus: "FAILED",
          aiRawOutput: "Tomt dokument - ingen tekst funnet",
        },
      });
      return;
    }

    // Kall Claude API for parsing
    const { result, rawOutput, confidence } =
      await parseWorkPackageWithAI(documentText);

    // Oppdater estimat med metadata
    await db.estimate.update({
      where: { id: estimateId },
      data: {
        projectNumber: result.projectNumber || null,
        sourceFileUrl: fileUrl,
        aiParseStatus: "COMPLETED",
        aiRawOutput: rawOutput,
        aiConfidence: confidence,
        status: "REVIEW",
        rateProfileId: rateProfileId,
      },
    });

    // Opprett kabler
    if (result.cables.length > 0) {
      await db.estimateCable.createMany({
        data: result.cables.map((cable) => ({
          estimateId,
          tagNumber: cable.tagNumber || null,
          cableType: cable.cableType,
          fromLocation: cable.fromLocation || null,
          toLocation: cable.toLocation || null,
          lengthMeters: cable.lengthMeters,
          sizeCategory:
            cable.sizeCategory || classifyCableSize(cable.cableType),
          aiConfidence: 0.7,
        })),
      });
    }

    // Opprett utstyr
    if (result.equipment.length > 0) {
      await db.estimateEquipment.createMany({
        data: result.equipment.map((equip) => ({
          estimateId,
          tagNumber: equip.tagNumber || null,
          name: equip.name,
          type: equip.type,
          action: equip.action,
          quantity: equip.quantity,
          aiConfidence: 0.7,
        })),
      });
    }

    // Opprett omfangsposter
    if (result.scopeItems.length > 0) {
      await db.estimateScopeItem.createMany({
        data: result.scopeItems.map((item) => ({
          estimateId,
          description: item.description,
          discipline: item.discipline,
          quantity: item.quantity,
          unit: item.unit,
          aiConfidence: 0.6,
        })),
      });
    }

    // Opprett forutsetninger
    if (result.assumptions && result.assumptions.length > 0) {
      await db.estimateAssumption.createMany({
        data: result.assumptions.map((a) => ({
          estimateId,
          key: a.key,
          value: a.value,
        })),
      });
    }
  } catch (error) {
    console.error("Feil ved AI-parsing:", error);
    await db.estimate.update({
      where: { id: estimateId },
      data: {
        status: "DRAFT",
        aiParseStatus: "FAILED",
        aiRawOutput:
          error instanceof Error
            ? error.message
            : "Ukjent feil ved AI-parsing",
      },
    });
  }
}

export async function uploadAndParseWorkPackage(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string) || "";
  const rateProfileId =
    (formData.get("rateProfileId") as string) || undefined;

  if (!file || file.size === 0) {
    return { errors: { file: ["Velg en fil a laste opp"] } };
  }

  if (!name) {
    return { errors: { name: ["Navn er pakrevd"] } };
  }

  // Sjekk filtype
  const isDocx =
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx");

  if (!isDocx) {
    return { errors: { file: ["Kun .docx-filer stottet for oyeblikket"] } };
  }

  // Les filinnhold for vi oppretter estimatet (File-objektet er ikke tilgjengelig etter redirect)
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // Opprett estimat med AI_PARSING-status
  const estimate = await db.estimate.create({
    data: {
      name,
      status: "AI_PARSING",
      aiParseStatus: "PROCESSING",
      sourceFileName: file.name,
      sourceFileType: file.type,
      rateProfileId: rateProfileId || null,
      createdById: session.user.id ?? "unknown",
      createdByName: session.user.name ?? "Ukjent",
    },
  });

  // Start AI-parsing i bakgrunnen - IKKE await!
  // Dette lar klienten redirectes umiddelbart istedenfor a vente pa AI-respons
  runAiParsingInBackground(
    estimate.id,
    fileBuffer,
    file.name,
    rateProfileId || null
  ).catch((err) => {
    console.error("Bakgrunn AI-parsing feilet:", err);
  });

  revalidatePath("/estimering");
  redirect(`/estimering/${estimate.id}`);
}
