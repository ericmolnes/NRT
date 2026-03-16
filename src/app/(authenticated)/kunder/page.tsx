import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCustomerList } from "@/lib/queries/customers";
import { CustomerListClient } from "@/components/kunder/customer-list";

export default async function KunderPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const customers = await getCustomerList(params.search);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Kunder</h1>
        <p className="text-sm text-muted-foreground">{customers.length} kunder</p>
      </div>
      <CustomerListClient customers={customers} />
    </div>
  );
}
