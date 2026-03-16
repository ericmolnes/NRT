import { db } from "@/lib/db";

export async function getEvaluationLinks() {
  return db.evaluationLink.findMany({
    include: {
      personnel: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEvaluationLinkByToken(token: string) {
  return db.evaluationLink.findUnique({
    where: { token },
    include: {
      personnel: true,
      category: {
        include: {
          fields: { orderBy: { order: "asc" } },
        },
      },
    },
  });
}

export async function getEvaluationLinksByPersonnel(personnelId: string) {
  return db.evaluationLink.findMany({
    where: { personnelId },
    orderBy: { createdAt: "desc" },
  });
}
