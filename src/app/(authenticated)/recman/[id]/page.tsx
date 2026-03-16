import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const candidate = await db.recmanCandidate.findUnique({
    where: { id },
    select: { personnelId: true },
  });

  if (candidate?.personnelId) {
    redirect(`/personell/${candidate.personnelId}?tab=kompetanse`);
  }

  redirect("/personell?sync=recman");
}
