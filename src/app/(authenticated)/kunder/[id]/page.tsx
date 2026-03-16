import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getCustomerById } from "@/lib/queries/customers";
import { CustomerCard } from "@/components/kunder/customer-card";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <CustomerCard customer={customer} />
    </div>
  );
}
