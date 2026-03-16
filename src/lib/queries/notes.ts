import { db } from "@/lib/db";

export async function getNotesByPersonnel(personnelId: string) {
  return db.note.findMany({
    where: { personnelId },
    orderBy: { createdAt: "desc" },
  });
}
