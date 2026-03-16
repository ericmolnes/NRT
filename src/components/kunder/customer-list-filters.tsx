"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

const TYPES = [
  { value: "", label: "Alle typer" },
  { value: "customer", label: "Kunde" },
  { value: "prospect", label: "Prospekt" },
  { value: "collaborator", label: "Samarbeidspartner" },
] as const;

export function CustomerListFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search") ?? "";
  const currentType = searchParams.get("type") ?? "";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams, startTransition]
  );

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Sok etter kunde..."
          className="h-9 pl-9"
          defaultValue={currentSearch}
          onChange={(e) => {
            const val = (e.target as HTMLInputElement).value;
            updateParams("search", val);
          }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        {TYPES.map((t) => (
          <Button
            key={t.value}
            variant={currentType === t.value ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => updateParams("type", t.value)}
          >
            {t.label}
          </Button>
        ))}
        {(currentSearch || currentType) && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={() => {
              startTransition(() => {
                router.push(pathname);
              });
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
