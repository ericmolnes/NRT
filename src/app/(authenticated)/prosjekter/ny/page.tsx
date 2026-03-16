import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getCustomerById } from "@/lib/queries/customers";
import { NewProjectForm } from "@/components/prosjekter/new-project-form";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { customerId } = await searchParams;
  if (!customerId) redirect("/kunder");

  const customer = await getCustomerById(customerId);
  if (!customer) notFound();

  return (
    <div className="p-6 max-w-lg mx-auto">
      <NewProjectForm
        customerId={customer.id}
        customerName={customer.name}
      />
    </div>
  );
}
