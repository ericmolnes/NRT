import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getJobById } from "@/lib/queries/jobs";
import { JobDetail } from "@/components/jobber/job-detail";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <JobDetail job={job} />
    </div>
  );
}
