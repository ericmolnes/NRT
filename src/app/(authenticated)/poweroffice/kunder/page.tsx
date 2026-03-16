import Link from "next/link";
import { getPOCustomerList } from "@/lib/queries/poweroffice";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building } from "lucide-react";

export default async function PowerOfficeCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const customers = await getPOCustomerList(search);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kunder</h1>
        <p className="text-muted-foreground">
          {customers.length} kunder fra PowerOffice Go
        </p>
      </div>

      <form>
        <Input
          name="search"
          placeholder="Søk etter kunde..."
          defaultValue={search}
          className="max-w-sm"
        />
      </form>

      {customers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Building className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Ingen kunder funnet</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Kunde</th>
                <th className="p-3 text-left font-medium">Org.nr</th>
                <th className="p-3 text-left font-medium">E-post</th>
                <th className="p-3 text-left font-medium">Telefon</th>
                <th className="p-3 text-center font-medium">Prosjekter</th>
                <th className="p-3 text-center font-medium">Fakturaer</th>
                <th className="p-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <Link
                      href={`/poweroffice/kunder/${customer.id}`}
                      className="font-medium hover:underline"
                    >
                      {customer.name}
                    </Link>
                    {customer.code && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        #{customer.code}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {customer.organizationNumber ?? "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {customer.emailAddress ?? "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {customer.phoneNumber ?? "—"}
                  </td>
                  <td className="p-3 text-center">
                    {customer._count.projects}
                  </td>
                  <td className="p-3 text-center">
                    {customer._count.invoices}
                  </td>
                  <td className="p-3">
                    <Badge variant={customer.isActive ? "default" : "secondary"}>
                      {customer.isActive ? "Aktiv" : "Inaktiv"}
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
