"use client";

// Klikkbart bjelle-ikon i headeren. Viser badge med antall uleste
// notifikasjoner og en dropdown med de siste 20 (uavhengig av lest-status,
// med visuell skille). Når dropdownen åpnes markerer vi alle uleste som
// lest via server action.
//
// Vi henter data en gang ved mount (lazy) og refresher etter
// markNotificationsRead. Dette er en bevisst enkel modell — for live-
// oppdateringer ville vi trengt en realtime-kanal eller polling, men det er
// utenfor scope for denne foundation-tasken.

import { useEffect, useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  kind: string;
  severity: "INFO" | "WARNING" | "ERROR";
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
};

interface NotificationBellProps {
  initialItems: NotificationItem[];
  initialUnread: number;
  markRead: (ids: string[]) => Promise<{ ok: boolean }>;
}

export function NotificationBell({
  initialItems,
  initialUnread,
  markRead,
}: NotificationBellProps) {
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function handleOpenChange(open: boolean) {
    if (!open) return;
    const unreadIds = items.filter((i) => i.readAt === null).map((i) => i.id);
    if (unreadIds.length === 0) return;
    // Optimistisk oppdatering: vi merker raskt og lar server action
    // bekrefte i bakgrunnen. Hvis kallet feiler (uautentisert osv.) vil
    // sidens neste fetch likevel rette det opp.
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((it) =>
        it.readAt === null ? { ...it, readAt: now } : it
      )
    );
    setUnread(0);
    startTransition(async () => {
      try {
        await markRead(unreadIds);
      } catch (err) {
        console.error("[notifications] markRead failed:", err);
      }
    });
  }

  if (!mounted) {
    // SSR-safe placeholder: viser bjellen uten badge inntil vi vet om
    // brukeren faktisk har uleste varsler. Unngår hydration-mismatch når
    // initialUnread er > 0.
    return (
      <button
        type="button"
        aria-label="Varsler"
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Bell className="h-4 w-4" />
      </button>
    );
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Varsler"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={8} className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">Varsler</span>
          {unread > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {unread} ulest{unread === 1 ? "" : "e"}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground">
            Ingen varsler ennå.
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "px-2 py-1.5 text-xs",
                  item.readAt === null && "bg-accent/30"
                )}
              >
                <div className="flex items-start gap-2">
                  {item.readAt === null && (
                    <span
                      aria-hidden
                      className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{item.title}</p>
                    {item.body && (
                      <p className="text-muted-foreground truncate">
                        {item.body}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                      {new Date(item.createdAt).toLocaleString("nb-NO")}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
