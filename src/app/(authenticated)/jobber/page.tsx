import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getJobList } from "@/lib/queries/jobs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Briefcase } from "lucide-react";

export default async function JobberPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const jobs = await getJobList();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Jobber</h1>
        <p className="text-sm text-muted-foreground">{jobs.length} jobber</p>
      </div>

      <div className="grid gap-3">
        {jobs.map((job) => (
          <Link key={job.id} href={`/jobber/${job.id}`}>
            <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-green-600" />
                  <div>
                    <h3 className="font-medium">{job.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {job.project.customer.name} · {job.project.name} · {job.location}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {job.rotationPattern && (
                    <Badge variant="outline">{job.rotationPattern.name}</Badge>
                  )}
                  <span className="text-muted-foreground">{job._count.assignments} pers.</span>
                  <Badge variant={job.status === "ACTIVE" ? "default" : "secondary"}>
                    {job.status}
                  </Badge>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
