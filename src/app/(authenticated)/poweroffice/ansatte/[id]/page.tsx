import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function POEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Try to redirect to the linked Personnel page
  const employee = await db.pOEmployee.findUnique({
    where: { id },
    select: { personnelId: true },
  });

  if (employee?.personnelId) {
    redirect(`/personell/${employee.personnelId}?tab=synk`);
  }

  redirect("/personell?sync=po");
}
