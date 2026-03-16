import Link from "next/link";
import { notFound } from "next/navigation";
import { getPOInvoiceById } from "@/lib/queries/poweroffice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default async function POInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getPOInvoiceById(id);

  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/poweroffice/fakturaer" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Faktura {invoice.invoiceNumber ?? "—"}
          </h1>
          <p className="text-muted-foreground">
            {invoice.customer?.name ?? "Ingen kunde"}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto">
          {invoice.status ?? "Ukjent"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Beløp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Netto</span>
              <span>
                {invoice.netAmount != null
                  ? `${invoice.netAmount.toLocaleString("nb-NO")} ${invoice.currencyCode ?? "NOK"}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Totalt</span>
              <span>
                {invoice.totalAmount != null
                  ? `${invoice.totalAmount.toLocaleString("nb-NO")} ${invoice.currencyCode ?? "NOK"}`
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Datoer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fakturadato</span>
              <span>
                {invoice.invoiceDate
                  ? new Date(invoice.invoiceDate).toLocaleDateString("nb-NO")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Forfallsdato</span>
              <span>
                {invoice.dueDate
                  ? new Date(invoice.dueDate).toLocaleDateString("nb-NO")
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Referanser</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kunde</span>
              <span>
                {invoice.customer ? (
                  <Link href={`/poweroffice/kunder/${invoice.customer.id}`} className="hover:underline">
                    {invoice.customer.name}
                  </Link>
                ) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prosjekt</span>
              <span>
                {invoice.project ? (
                  <Link href={`/poweroffice/prosjekter/${invoice.project.id}`} className="hover:underline">
                    {invoice.project.name}
                  </Link>
                ) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PowerOffice ID</span>
              <span>{invoice.poId.toString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
