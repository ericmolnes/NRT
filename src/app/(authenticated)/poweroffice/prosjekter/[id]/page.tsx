import Link from "next/link";
import { notFound } from "next/navigation";
import { getPOProjectById } from "@/lib/queries/poweroffice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default async function POProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getPOProjectById(id);

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/poweroffice/prosjekter" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground">
            {project.code && `Kode: ${project.code}`}
          </p>
        </div>
        <Badge variant={project.isCompleted ? "secondary" : "default"} className="ml-auto">
          {project.isCompleted ? "Fullført" : "Aktiv"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Detaljer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Beskrivelse</span>
              <span>{project.description ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kunde</span>
              <span>
                {project.customer ? (
                  <Link href={`/poweroffice/kunder/${project.customer.id}`} className="hover:underline">
                    {project.customer.name}
                  </Link>
                ) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Synk-info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">PowerOffice ID</span>
              <span>{project.poId.toString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sist synkronisert</span>
              <span>{project.lastSyncedAt.toLocaleDateString("nb-NO")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {project.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Fakturaer ({project.invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">Fakturanr</th>
                    <th className="p-2 text-left font-medium">Dato</th>
                    <th className="p-2 text-right font-medium">Beløp</th>
                    <th className="p-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {project.invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="p-2">
                        <Link href={`/poweroffice/fakturaer/${invoice.id}`} className="hover:underline">
                          {invoice.invoiceNumber ?? "—"}
                        </Link>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {invoice.invoiceDate
                          ? new Date(invoice.invoiceDate).toLocaleDateString("nb-NO")
                          : "—"}
                      </td>
                      <td className="p-2 text-right">
                        {invoice.totalAmount != null
                          ? `${invoice.totalAmount.toLocaleString("nb-NO")} ${invoice.currencyCode ?? "NOK"}`
                          : "—"}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">{invoice.status ?? "—"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
