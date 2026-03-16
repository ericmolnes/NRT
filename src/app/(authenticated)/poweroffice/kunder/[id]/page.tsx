import Link from "next/link";
import { notFound } from "next/navigation";
import { getPOCustomerById } from "@/lib/queries/poweroffice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default async function POCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getPOCustomerById(id);

  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/poweroffice/kunder" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-muted-foreground">
            {customer.code && `#${customer.code} · `}
            {customer.organizationNumber ?? "Ingen org.nr"}
          </p>
        </div>
        <Badge variant={customer.isActive ? "default" : "secondary"} className="ml-auto">
          {customer.isActive ? "Aktiv" : "Inaktiv"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Kontaktinfo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">E-post</span>
              <span>{customer.emailAddress ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telefon</span>
              <span>{customer.phoneNumber ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kontaktperson</span>
              <span>{customer.contactPersonName ?? "—"}</span>
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
              <span>{customer.poId.toString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sist synkronisert</span>
              <span>{customer.lastSyncedAt.toLocaleDateString("nb-NO")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {customer.projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Prosjekter ({customer.projects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {customer.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/poweroffice/prosjekter/${project.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/30"
                >
                  <div>
                    <span className="font-medium">{project.name}</span>
                    {project.code && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {project.code}
                      </span>
                    )}
                  </div>
                  <Badge variant={project.isCompleted ? "secondary" : "default"}>
                    {project.isCompleted ? "Fullført" : "Aktiv"}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {customer.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Siste fakturaer ({customer.invoices.length})
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
                  {customer.invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="p-2">
                        <Link
                          href={`/poweroffice/fakturaer/${invoice.id}`}
                          className="hover:underline"
                        >
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
