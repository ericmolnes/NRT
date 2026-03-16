import type {
  RecmanGetResponse,
  RecmanPostResponse,
  RecmanCandidate,
  RecmanCompany,
  RecmanProject,
  RecmanJob,
} from "./types";
import { COMPANY_FIELDS, PROJECT_FIELDS, JOB_FIELDS } from "./types";

const API_KEY = () => process.env.RECMAN_API_KEY;
const API_URL = () => process.env.RECMAN_API_URL || "https://api.recman.io";

// ─── GET endpoint ───────────────────────────────────────────────────

type GetOptions = {
  page?: number;
  candidateIds?: string[];
};

export async function recmanGet<T = RecmanCandidate>(
  scope: string,
  fields: string,
  opts?: GetOptions
): Promise<RecmanGetResponse<T>> {
  const key = API_KEY();
  if (!key) throw new Error("RECMAN_API_KEY er ikke satt");

  const params = new URLSearchParams({
    key,
    scope,
    fields,
  });

  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.candidateIds?.length) {
    params.set("candidateIds", opts.candidateIds.join(","));
  }

  const url = `${API_URL()}/v2/get/?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) {
    throw new Error(`Recman API feil: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ─── POST endpoint ──────────────────────────────────────────────────

export async function recmanPost(
  scope: string,
  operation: "insert" | "update" | "delete",
  data: Record<string, unknown>
): Promise<RecmanPostResponse> {
  const key = API_KEY();
  if (!key) throw new Error("RECMAN_API_KEY er ikke satt");

  const res = await fetch(`${API_URL()}/v2/post/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, scope, operation, data }),
  });

  if (!res.ok) {
    throw new Error(`Recman API feil: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ─── High-level helpers ─────────────────────────────────────────────

export async function getAllCandidates(fields: string): Promise<RecmanCandidate[]> {
  const all: RecmanCandidate[] = [];
  let page = 1;

  while (true) {
    const result = await recmanGet<RecmanCandidate>("candidate", fields, { page });
    if (!result.success || !result.data) break;

    const entries = Object.values(result.data);
    if (entries.length === 0) break;

    all.push(...entries);

    if (all.length >= result.numRows) break;
    page++;
  }

  return all;
}

async function getAllPaginated<T>(scope: string, fields: string): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  while (true) {
    const result = await recmanGet<T>(scope, fields, { page });
    if (!result.success || !result.data) break;
    const entries = Object.values(result.data);
    if (entries.length === 0) break;
    all.push(...entries);
    if (all.length >= result.numRows) break;
    page++;
  }
  return all;
}

export function getAllCompanies(): Promise<RecmanCompany[]> {
  return getAllPaginated<RecmanCompany>("company", COMPANY_FIELDS);
}

export function getAllProjects(): Promise<RecmanProject[]> {
  return getAllPaginated<RecmanProject>("project", PROJECT_FIELDS);
}

export function getAllJobs(): Promise<RecmanJob[]> {
  return getAllPaginated<RecmanJob>("job", JOB_FIELDS);
}

export async function getCandidateById(
  candidateId: string,
  fields: string
): Promise<RecmanCandidate | null> {
  const result = await recmanGet<RecmanCandidate>("candidate", fields, {
    candidateIds: [candidateId],
  });

  if (!result.success || !result.data) return null;

  const entries = Object.values(result.data);
  return entries[0] || null;
}
