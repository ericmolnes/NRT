"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, ChevronLeft, ChevronRight, Star, Plus, Briefcase, UserMinus, Clock } from "lucide-react";
import { SKILL_CATEGORIES, HIGHLIGHT_SKILL_KEYWORDS } from "@/lib/recman/types";
import { CandidateDetail } from "@/components/recman/candidate-detail";
import { getCandidateDetail } from "@/app/(authenticated)/recman/actions";
import { removeEmployment } from "@/app/(authenticated)/personell/kandidater/actions";
import { CreateCandidateForm } from "./create-candidate-form";

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
  isContractor: boolean;
  employeeNumber: number | null;
  employeeStart: Date | null;
  employeeEnd: Date | null;
  skills: unknown;
  languages: unknown;
  driversLicense: unknown;
  contractorPeriods?: Array<{ id: string; startDate: Date; endDate: Date | null }>;
};

type Filters = {
  q?: string;
  skill?: string;
  city?: string;
  minRating?: string;
  license?: string;
  language?: string;
};

type DetailCandidate = Awaited<ReturnType<typeof getCandidateDetail>>;

const skillCategories = Object.keys(SKILL_CATEGORIES);

export function CandidateListView({
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
  const [selectedCandidate, setSelectedCandidate] = useState<DetailCandidate>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isLoadingDetail, startDetailTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);

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

  function openDetail(candidateId: string) {
    startDetailTransition(async () => {
      const detail = await getCandidateDetail(candidateId);
      setSelectedCandidate(detail);
      setSheetOpen(true);
    });
  }

  function handleDetailUpdated() {
    router.refresh();
    if (selectedCandidate) {
      startDetailTransition(async () => {
        const detail = await getCandidateDetail(selectedCandidate.id);
        setSelectedCandidate(detail);
      });
    }
  }

  async function handleRemoveEmployment(candidateId: string) {
    setPendingAction(candidateId + "-employment");
    try {
      const result = await removeEmployment(candidateId);
      if (!result.success) console.error("[NRT] remove employment failed:", result.error);
    } catch (e) {
      console.error("[NRT] remove employment error:", e);
    } finally {
      setPendingAction(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* Søk + filtre + ny kandidat */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[250px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Søk på navn, tittel, e-post..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm">Søk</Button>
        </form>

        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Ny kandidat
        </Button>

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
          placeholder="Språk..."
          defaultValue={filters.language || ""}
          onBlur={(e) => updateFilter("language", e.target.value.trim() || null)}
          onKeyDown={(e) => { if (e.key === "Enter") updateFilter("language", (e.target as HTMLInputElement).value.trim() || null); }}
        />

        {/* Førerkort-filter */}
        <Select value={filters.license || "all"} onValueChange={(v) => updateFilter("license", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Førerkort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Førerkort</SelectItem>
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
          <Button variant="ghost" size="sm" onClick={() => router.push("/personell/kandidater")} className="text-xs">
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
                  <th className="px-4 py-3 text-left font-medium">Språk</th>
                  <th className="px-4 py-3 text-center font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const skills = (c.skills as Array<{ name: string }>) || [];
                  const exSkills = skills.filter((s) =>
                    HIGHLIGHT_SKILL_KEYWORDS.some((kw) =>
                      s.name.toLowerCase().includes(kw)
                    )
                  );
                  const langs = (c.languages as Array<{ name: string; level: string }>) || [];
                  const isActingOnThis = pendingAction?.startsWith(c.id);

                  return (
                    <tr key={c.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${isActingOnThis ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDetail(c.id)}
                          className="font-medium text-primary hover:underline text-left"
                          disabled={isLoadingDetail}
                        >
                          {c.firstName} {c.lastName}
                        </button>
                        {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm">{c.title || "—"}</td>
                      <td className="px-4 py-3 text-sm">{c.city || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {c.isEmployee && !c.employeeEnd ? (
                          <Badge className="text-xs bg-green-600">
                            <Briefcase className="h-3 w-3 mr-1" />
                            Ansatt
                          </Badge>
                        ) : c.isEmployee && c.employeeEnd ? (
                          <Badge variant="destructive" className="text-xs">Sluttet</Badge>
                        ) : c.contractorPeriods && c.contractorPeriods.length > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Tidligere innleid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Kandidat</Badge>
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
                          {exSkills.length > 3 && (
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
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Fjern ansettelse (kun for aktive ansatte) */}
                          {c.isEmployee && !c.employeeEnd && (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveEmployment(c.id)}
                                    disabled={!!pendingAction}
                                  />
                                }
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Fjern ansettelse (sett sluttdato til i dag)
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      Ingen kandidater funnet. {total === 0 ? "Synkroniser fra RecMan for å hente data." : "Prøv andre filtre."}
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

      {/* Kandidat-detalj Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="sr-only">Kandidatdetaljer</SheetTitle>
          </SheetHeader>
          {selectedCandidate && (
            <CandidateDetail
              candidate={selectedCandidate}
              embedded
              onUpdated={handleDetailUpdated}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Ny kandidat Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Ny kandidat</SheetTitle>
          </SheetHeader>
          <CreateCandidateForm
            onCreated={() => {
              setCreateOpen(false);
              router.refresh();
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
