import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjectList } from "@/lib/queries/projects";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FolderKanban } from "lucide-react";

export default async function ProsjekterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const projects = await getProjectList();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Prosjekter</h1>
        <p className="text-sm text-muted-foreground">{projects.length} prosjekter</p>
      </div>

      <div className="grid gap-3">
        {projects.map((project) => (
          <Link key={project.id} href={`/prosjekter/${project.id}`}>
            <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FolderKanban className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium">{project.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {project.customer.name}
                      {project.code && ` · ${project.code}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{project._count.jobs} jobber</span>
                  <Badge variant="outline">{project.status}</Badge>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
