import Link from "next/link";
import { getPOProjectList } from "@/lib/queries/poweroffice";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FolderKanban } from "lucide-react";

export default async function PowerOfficeProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const projects = await getPOProjectList(search);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prosjekter</h1>
        <p className="text-muted-foreground">
          {projects.length} prosjekter fra PowerOffice Go
        </p>
      </div>

      <form>
        <Input
          name="search"
          placeholder="Søk etter prosjekt..."
          defaultValue={search}
          className="max-w-sm"
        />
      </form>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Ingen prosjekter funnet</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Prosjekt</th>
                <th className="p-3 text-left font-medium">Kode</th>
                <th className="p-3 text-left font-medium">Kunde</th>
                <th className="p-3 text-center font-medium">Fakturaer</th>
                <th className="p-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <Link
                      href={`/poweroffice/prosjekter/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {project.code ?? "—"}
                  </td>
                  <td className="p-3">
                    {project.customer ? (
                      <Link
                        href={`/poweroffice/kunder/${project.customer.id}`}
                        className="text-muted-foreground hover:underline"
                      >
                        {project.customer.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">{project._count.invoices}</td>
                  <td className="p-3">
                    <Badge variant={project.isCompleted ? "secondary" : "default"}>
                      {project.isCompleted ? "Fullført" : "Aktiv"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
