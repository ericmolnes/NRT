import Link from "next/link";
import { getPOInvoiceList } from "@/lib/queries/poweroffice";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Receipt } from "lucide-react";

export default async function PowerOfficeInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const invoices = await getPOInvoiceList(search);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fakturaer</h1>
        <p className="text-muted-foreground">
          {invoices.length} utgående fakturaer fra PowerOffice Go
        </p>
      </div>

      <form>
        <Input
          name="search"
          placeholder="Søk etter fakturanr eller kunde..."
          defaultValue={search}
          className="max-w-sm"
        />
      </form>

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Ingen fakturaer funnet</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Fakturanr</th>
                <th className="p-3 text-left font-medium">Kunde</th>
                <th className="p-3 text-left font-medium">Prosjekt</th>
                <th className="p-3 text-left font-medium">Dato</th>
                <th className="p-3 text-left font-medium">Forfall</th>
                <th className="p-3 text-right font-medium">Netto</th>
                <th className="p-3 text-right font-medium">Totalt</th>
                <th className="p-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <Link
                      href={`/poweroffice/fakturaer/${invoice.id}`}
                      className="font-medium hover:underline"
                    >
                      {invoice.invoiceNumber ?? "—"}
                    </Link>
                  </td>
                  <td className="p-3">
                    {invoice.customer ? (
                      <Link
                        href={`/poweroffice/kunder/${invoice.customer.id}`}
                        className="text-muted-foreground hover:underline"
                      >
                        {invoice.customer.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {invoice.project ? (
                      <Link
                        href={`/poweroffice/prosjekter/${invoice.project.id}`}
                        className="text-muted-foreground hover:underline"
                      >
                        {invoice.project.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {invoice.invoiceDate
                      ? new Date(invoice.invoiceDate).toLocaleDateString("nb-NO")
                      : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {invoice.dueDate
                      ? new Date(invoice.dueDate).toLocaleDateString("nb-NO")
                      : "—"}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">
                    {invoice.netAmount != null
                      ? invoice.netAmount.toLocaleString("nb-NO")
                      : "—"}
                  </td>
                  <td className="p-3 text-right font-medium">
                    {invoice.totalAmount != null
                      ? `${invoice.totalAmount.toLocaleString("nb-NO")} ${invoice.currencyCode ?? "NOK"}`
                      : "—"}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{invoice.status ?? "—"}</Badge>
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
