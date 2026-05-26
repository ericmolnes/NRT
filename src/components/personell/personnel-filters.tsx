"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Department } from "@/lib/queries/personnel";
import { SKILL_CATEGORIES } from "@/lib/recman/types";

interface PersonnelFiltersProps {
  departments: Department[];
}

const skillCategories = Object.keys(SKILL_CATEGORIES);

const activeFilterLabels: Record<string, string> = {
  search: "Søk",
  role: "Rolle",
  department: "Avdeling",
  status: "Status",
  sync: "Kobling",
  category: "Kategori",
  city: "By",
  company: "Bedrift",
  skill: "Kompetanse",
  minRating: "Rating",
  license: "Førerkort",
  language: "Språk",
  evals: "Evaluering",
  sort: "Sortering",
  dir: "Retning",
};

function getDepartmentLabel(departments: Department[], value: string | null) {
  if (!value) return "Alle avdelinger";
  return departments.find((department) => department.value === value)?.label ?? value;
}

export function PersonnelFilters({ departments }: PersonnelFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryValue = searchParams.get("category") ?? "ANSATT";
  const statusValue = searchParams.get("status") ?? "ACTIVE";
  const syncValue = searchParams.get("sync") ?? "all";
  const departmentValue = searchParams.get("department");
  const skillValue = searchParams.get("skill") ?? "all";
  const licenseValue = searchParams.get("license") ?? "all";
  const ratingValue = searchParams.get("minRating") ?? "all";
  const evalsValue = searchParams.get("evals") ?? "all";
  const sortValue = searchParams.get("sort") ?? "name";
  const directionValue = searchParams.get("dir") ?? "asc";

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  }

  function resetFilters() {
    router.push("/personell");
  }

  const activeFilters = Array.from(searchParams.entries()).filter(
    ([key, value]) => value && activeFilterLabels[key]
  );

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          Filter
        </div>
        {activeFilters.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={resetFilters}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Nullstill
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            key={searchParams.get("search") ?? ""}
            placeholder="Søk navn, e-post eller tittel"
            defaultValue={searchParams.get("search") ?? ""}
            onChange={(e) => updateParam("search", e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={categoryValue}
          onValueChange={(value) =>
            updateParam("category", value === "ANSATT" ? null : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kategori">
              {categoryValue === "ALL"
                ? "Alle kategorier"
                : categoryValue === "INNLEID"
                  ? "Innleide"
                  : categoryValue === "KANDIDAT"
                    ? "Kandidater"
                    : "Ansatte"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ANSATT">Ansatte</SelectItem>
            <SelectItem value="ALL">Alle kategorier</SelectItem>
            <SelectItem value="INNLEID">Innleide</SelectItem>
            <SelectItem value="KANDIDAT">Kandidater</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusValue}
          onValueChange={(value) =>
            updateParam("status", value === "ACTIVE" ? null : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status">
              {statusValue === "ALL"
                ? "Alle statuser"
                : statusValue === "INACTIVE"
                  ? "Inaktive"
                  : statusValue === "ARCHIVED"
                    ? "Arkiverte"
                    : "Aktive"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Aktive</SelectItem>
            <SelectItem value="ALL">Alle statuser</SelectItem>
            <SelectItem value="INACTIVE">Inaktive</SelectItem>
            <SelectItem value="ARCHIVED">Arkiverte</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={syncValue}
          onValueChange={(value) => updateParam("sync", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kobling">
              {syncValue === "po"
                ? "PowerOffice"
                : syncValue === "recman"
                  ? "RecMan"
                  : syncValue === "unlinked"
                    ? "Ikke koblet"
                    : "Alle koblinger"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle koblinger</SelectItem>
            <SelectItem value="po">PowerOffice</SelectItem>
            <SelectItem value="recman">RecMan</SelectItem>
            <SelectItem value="unlinked">Ikke koblet</SelectItem>
          </SelectContent>
        </Select>

        {departments.length > 0 && (
          <Select
            value={departmentValue ?? "all"}
            onValueChange={(value) => updateParam("department", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Avdeling">
                {getDepartmentLabel(departments, departmentValue)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle avdelinger</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.value} value={dept.value}>
                  {dept.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          key={searchParams.get("role") ?? "role"}
          placeholder="Rolle eller stilling"
          defaultValue={searchParams.get("role") ?? ""}
          onBlur={(e) => updateParam("role", e.target.value.trim() || null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParam(
                "role",
                (e.target as HTMLInputElement).value.trim() || null
              );
            }
          }}
        />

        <Input
          key={searchParams.get("city") ?? "city"}
          placeholder="By"
          defaultValue={searchParams.get("city") ?? ""}
          onBlur={(e) => updateParam("city", e.target.value.trim() || null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParam(
                "city",
                (e.target as HTMLInputElement).value.trim() || null
              );
            }
          }}
        />

        <Input
          key={searchParams.get("company") ?? "company"}
          placeholder="Bedrift"
          defaultValue={searchParams.get("company") ?? ""}
          onBlur={(e) => updateParam("company", e.target.value.trim() || null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParam(
                "company",
                (e.target as HTMLInputElement).value.trim() || null
              );
            }
          }}
        />

        <Select
          value={skillValue}
          onValueChange={(value) => updateParam("skill", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kompetanse">
              {skillValue === "all" ? "Alle kompetanser" : skillValue}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kompetanser</SelectItem>
            {skillCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={licenseValue}
          onValueChange={(value) => updateParam("license", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Førerkort">
              {licenseValue === "all" ? "Alle førerkort" : licenseValue}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle førerkort</SelectItem>
            <SelectItem value="B">B</SelectItem>
            <SelectItem value="BE">BE</SelectItem>
            <SelectItem value="C">C</SelectItem>
            <SelectItem value="CE">CE</SelectItem>
            <SelectItem value="D">D</SelectItem>
          </SelectContent>
        </Select>

        <Input
          key={searchParams.get("language") ?? "language"}
          placeholder="Språk"
          defaultValue={searchParams.get("language") ?? ""}
          onBlur={(e) => updateParam("language", e.target.value.trim() || null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParam(
                "language",
                (e.target as HTMLInputElement).value.trim() || null
              );
            }
          }}
        />

        <Select
          value={ratingValue}
          onValueChange={(value) => updateParam("minRating", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Rating">
              {ratingValue === "all"
                ? "Alle ratings"
                : ratingValue === "5"
                  ? "5 stjerner"
                  : `Min ${ratingValue} stjerner`}
            </SelectValue>
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

        <Select
          value={evalsValue}
          onValueChange={(value) => updateParam("evals", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Evaluering">
              {evalsValue === "yes"
                ? "Har evaluering"
                : evalsValue === "no"
                  ? "Uten evaluering"
                  : "Alle evalueringer"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle evalueringer</SelectItem>
            <SelectItem value="yes">Har evaluering</SelectItem>
            <SelectItem value="no">Uten evaluering</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortValue}
          onValueChange={(value) =>
            updateParam("sort", value === "name" ? null : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sorter">
              {sortValue === "category"
                ? "Kategori"
                : sortValue === "role"
                  ? "Rolle"
                  : sortValue === "department"
                    ? "Avdeling"
                    : sortValue === "sync"
                      ? "Kobling"
                      : sortValue === "score"
                        ? "Snitt-score"
                        : sortValue === "evaluations"
                          ? "Evalueringer"
                          : sortValue === "lastSynced"
                            ? "Sist synket"
                            : "Navn"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Navn</SelectItem>
            <SelectItem value="category">Kategori</SelectItem>
            <SelectItem value="role">Rolle</SelectItem>
            <SelectItem value="department">Avdeling</SelectItem>
            <SelectItem value="sync">Kobling</SelectItem>
            <SelectItem value="score">Snitt-score</SelectItem>
            <SelectItem value="evaluations">Evalueringer</SelectItem>
            <SelectItem value="lastSynced">Sist synket</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={directionValue}
          onValueChange={(value) =>
            updateParam("dir", value === "asc" ? null : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Retning">
              {directionValue === "desc" ? "Synkende" : "Stigende"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">
              <ArrowDownAZ className="h-4 w-4" />
              Stigende
            </SelectItem>
            <SelectItem value="desc">
              <ArrowUpAZ className="h-4 w-4" />
              Synkende
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeFilters.map(([key, value]) => (
            <Badge
              key={key}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => updateParam(key, null)}
            >
              {activeFilterLabels[key]}: {value} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
