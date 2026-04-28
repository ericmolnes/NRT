import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Brukere med MINIMUM-tilgang (eller uten oppløst nivå) skal ikke kunne
  // se noe under (authenticated). Send dem til ventesiden i stedet. Selve
  // /waiting-access-siden ligger utenfor (authenticated)-gruppen for å
  // unngå rekursiv redirect.
  const level = session.user.accessLevel ?? "MINIMUM";
  if (level === "MINIMUM") {
    redirect("/waiting-access");
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset>
        <AppHeader user={session.user} />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
