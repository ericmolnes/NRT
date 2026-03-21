"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search } from "lucide-react";

export function EvaluationFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Søk etter navn..."
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => updateParam("search", e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <Select
        value={searchParams.get("role") ?? ""}
        onValueChange={(val) => updateParam("role", val as string)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Alle roller" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Alle roller</SelectItem>
          <SelectItem value="Ansatt">Ansatte</SelectItem>
          <SelectItem value="Innleid">Innleide</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("score") ?? ""}
        onValueChange={(val) => updateParam("score", val as string)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Alle scorer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Alle scorer</SelectItem>
          <SelectItem value="high">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
            Høy (8–10)
          </SelectItem>
          <SelectItem value="mid">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
            Middels (5–7)
          </SelectItem>
          <SelectItem value="low">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />
            Lav (1–4)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
