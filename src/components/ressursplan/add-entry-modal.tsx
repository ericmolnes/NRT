"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, X, Users } from "lucide-react";
import { addEntry } from "@/app/(authenticated)/ressursplan/actions";

interface Personnel {
  id: string;
  name: string;
  role: string;
  department: string | null;
}

interface AddEntryModalProps {
  planId: string;
  onAdded: () => void;
}

export function AddEntryModal({ planId, onAdded }: AddEntryModalProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && personnel.length === 0) {
      setLoading(true);
      fetch("/api/personell/list")
        .then((r) => r.json())
        .then((data) => setPersonnel(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, personnel.length]);

  const filtered = search
    ? personnel.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.role.toLowerCase().includes(search.toLowerCase())
      )
    : personnel;

  function handleSelect(person: Personnel) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("resourcePlanId", planId);
      fd.set("personnelId", person.id);
      fd.set("displayName", person.name);
      await addEntry({}, fd);
      setOpen(false);
      setSearch("");
      onAdded();
    });
  }

  function handleManualName() {
    const name = search.trim() || "TBA";
    startTransition(async () => {
      const fd = new FormData();
      fd.set("resourcePlanId", planId);
      fd.set("displayName", name);
      await addEntry({}, fd);
      setOpen(false);
      setSearch("");
      onAdded();
    });
  }

  function handleTBA() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("resourcePlanId", planId);
      fd.set("displayName", "TBA");
      await addEntry({}, fd);
      setOpen(false);
      onAdded();
    });
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
        Legg til
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40">
      <div className="w-full max-w-md bg-background rounded-xl shadow-2xl border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Legg til i ressursplan</h3>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setOpen(false);
              setSearch("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Søk ansatt eller skriv navn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 px-3 py-2 border-b bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={isPending}
            onClick={handleTBA}
          >
            TBA
          </Button>
          {search.trim() && !filtered.some((p) => p.name.toLowerCase() === search.trim().toLowerCase()) && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={handleManualName}
            >
              Legg til &quot;{search.trim()}&quot; (manuelt)
            </Button>
          )}
        </div>

        {/* Personnel list */}
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Laster ansatte...
            </p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">
                {search ? "Ingen treff" : "Ingen ansatte"}
              </p>
            </div>
          ) : (
            filtered.slice(0, 20).map((person) => (
              <button
                key={person.id}
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
                disabled={isPending}
                onClick={() => handleSelect(person)}
              >
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-semibold text-muted-foreground">
                    {person.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{person.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {person.role}
                    {person.department && ` · ${person.department}`}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  Velg
                </Badge>
              </button>
            ))
          )}
          {filtered.length > 20 && (
            <p className="text-[10px] text-muted-foreground text-center py-2 border-t">
              Viser 20 av {filtered.length} — søk for å filtrere
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
