"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Star, User, Briefcase } from "lucide-react";
import Link from "next/link";
import { SKILL_CATEGORIES } from "@/lib/recman/types";

type Candidate = {
  id: string;
  recmanId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  city: string | null;
  title: string | null;
  rating: number;
  isEmployee: boolean;
  employeeNumber: number | null;
  employeeStart: Date | null;
  employeeEnd: Date | null;
  skills: unknown;
  languages: unknown;
  driversLicense: unknown;
};

type Filters = {
  q?: string;
  filter?: string;
  skill?: string;
  city?: string;
  minRating?: string;
  license?: string;
  language?: string;
};

const skillCategories = Object.keys(SKILL_CATEGORIES);

export function CandidateTable({
  candidates,
  total,
  totalPages,
  currentPage,
  filters,
}: {
  candidates: Candidate[];
  total: number;
  totalPages: number;
  currentPage: number;
  filters: Filters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(filters.q || "");

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("q", searchInput.trim() || null);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Søk + filtre */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[250px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Sok pa navn, tittel, e-post..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm">Sok</Button>
        </form>

        {/* Ansatt-filter */}
        <Select value={filters.filter || "all"} onValueChange={(v) => updateFilter("filter", v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Alle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kandidater</SelectItem>
            <SelectItem value="employees">Ansatte</SelectItem>
            <SelectItem value="active">Aktive ansatte</SelectItem>
            <SelectItem value="candidates">Kun kandidater</SelectItem>
          </SelectContent>
        </Select>

        {/* Kompetanse-filter */}
        <Select value={filters.skill || "all"} onValueChange={(v) => updateFilter("skill", v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Kompetanse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kompetanser</SelectItem>
            {skillCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* By-filter */}
        <Input
          className="w-[140px]"
          placeholder="By..."
          defaultValue={filters.city || ""}
          onBlur={(e) => updateFilter("city", e.target.value.trim() || null)}
          onKeyDown={(e) => { if (e.key === "Enter") updateFilter("city", (e.target as HTMLInputElement).value.trim() || null); }}
        />

        {/* Språk-filter */}
        <Input
          className="w-[140px]"
          placeholder="Sprak..."
          defaultValue={filters.language || ""}
          onBlur={(e) => updateFilter("language", e.target.value.trim() || null)}
          onKeyDown={(e) => { if (e.key === "Enter") updateFilter("language", (e.target as HTMLInputElement).value.trim() || null); }}
        />

        {/* Førerkort-filter */}
        <Select value={filters.license || "all"} onValueChange={(v) => updateFilter("license", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Forerkort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Forerkort</SelectItem>
            <SelectItem value="B">B</SelectItem>
            <SelectItem value="BE">BE</SelectItem>
            <SelectItem value="C">C</SelectItem>
            <SelectItem value="CE">CE</SelectItem>
            <SelectItem value="D">D</SelectItem>
          </SelectContent>
        </Select>

        {/* Rating-filter */}
        <Select value={filters.minRating || "all"} onValueChange={(v) => updateFilter("minRating", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle ratings</SelectItem>
            <SelectItem value="1">Min 1 stjerne</SelectItem>
            <SelectItem value="2">Min 2 stjerner</SelectItem>
            <SelectItem value="3">Min 3 stjerner</SelectItem>
            <SelectItem value="4">Min 4 stjerner</SelectItem>
            <SelectItem value="5">5 stjerner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Aktive filtre */}
      {Object.entries(filters).some(([k, v]) => v && k !== "page") && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(filters).map(([key, value]) => {
            if (!value || key === "page") return null;
            return (
              <Badge key={key} variant="secondary" className="cursor-pointer" onClick={() => updateFilter(key, null)}>
                {key}: {value} &times;
              </Badge>
            );
          })}
          <Button variant="ghost" size="sm" onClick={() => router.push("/recman")} className="text-xs">
            Nullstill filtre
          </Button>
        </div>
      )}

      {/* Tabell */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Navn</th>
                  <th className="px-4 py-3 text-left font-medium">Stilling</th>
                  <th className="px-4 py-3 text-left font-medium">By</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Rating</th>
                  <th className="px-4 py-3 text-left font-medium">Kompetanse</th>
                  <th className="px-4 py-3 text-left font-medium">Sprak</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const skills = (c.skills as Array<{ name: string }>) || [];
                  const exSkills = skills.filter((s) =>
                    ["ex ", "ex-", "atex", "iecex", "fallsikring", "gsk"].some((kw) =>
                      s.name.toLowerCase().includes(kw)
                    )
                  );
                  const langs = (c.languages as Array<{ name: string; level: string }>) || [];

                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/recman/${c.id}`} className="font-medium text-primary hover:underline">
                          {c.firstName} {c.lastName}
                        </Link>
                        {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm">{c.title || "-"}</td>
                      <td className="px-4 py-3 text-sm">{c.city || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        {c.isEmployee ? (
                          <Badge variant="default" className="text-xs bg-green-600">
                            <Briefcase className="h-3 w-3 mr-1" />
                            Ansatt{c.employeeNumber ? ` #${c.employeeNumber}` : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            Kandidat
                          </Badge>
                        )}
                        {c.employeeEnd && (
                          <Badge variant="destructive" className="text-xs ml-1">Sluttet</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.rating > 0 && (
                          <div className="flex items-center justify-center gap-0.5">
                            {Array.from({ length: c.rating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {exSkills.slice(0, 3).map((s) => (
                            <Badge key={s.name} variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              {s.name}
                            </Badge>
                          ))}
                          {skills.length > 3 && exSkills.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{exSkills.length - 3}</span>
                          )}
                          {exSkills.length === 0 && skills.length > 0 && (
                            <span className="text-xs text-muted-foreground">{skills.length} skills</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {langs.slice(0, 2).map((l) => l.name).join(", ")}
                      </td>
                    </tr>
                  );
                })}
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      Ingen kandidater funnet. {total === 0 ? 'Klikk "Synkroniser fra Recman" for a hente data.' : "Prov andre filtre."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Paginering */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Side {currentPage} av {totalPages} ({total} totalt)
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
