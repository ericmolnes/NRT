import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import {
  NotificationBell,
  type NotificationItem,
} from "@/components/layout/notification-bell";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  countUnreadForUser,
  listNotificationsForUser,
} from "@/lib/notifications/list-notifications";
import type { NotificationClient } from "@/lib/notifications/types";
import { markNotificationsRead } from "@/app/(authenticated)/settings/actions";
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

  // Hent siste varsler + ulest-count til notification-bell. Vi bruker
  // session.user.id som "userId" siden det er Entra-id som lagres i
  // SystemNotification.targetUserId. Fallback til null hvis vi ikke har det.
  const notifClient = db as unknown as NotificationClient;
  const [unreadCount, recent] = await Promise.all([
    countUnreadForUser(notifClient, {
      userId: session.user.id ?? null,
      accessLevel: level,
    }),
    listNotificationsForUser(notifClient, {
      userId: session.user.id ?? null,
      accessLevel: level,
      limit: 20,
    }),
  ]);

  const initialItems: NotificationItem[] = recent.map((n) => ({
    id: n.id,
    kind: n.kind,
    severity: n.severity,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt ? n.readAt.toISOString() : null,
  }));

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} accessLevel={level} />
      <SidebarInset>
        <AppHeader
          user={session.user}
          notificationBell={
            <NotificationBell
              initialItems={initialItems}
              initialUnread={unreadCount}
              markRead={markNotificationsRead}
            />
          }
        />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
