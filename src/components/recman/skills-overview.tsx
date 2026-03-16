"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Search, Briefcase, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

type CandidateMatch = {
  id: string;
  name: string;
  title: string | null;
  isEmployee: boolean;
  matchingSkills: string[];
};

type SkillsData = {
  overview: Record<string, CandidateMatch[]>;
  allSkills: Array<{ name: string; count: number }>;
  totalCandidates: number;
};

export function SkillsOverview({
  data,
  employeesOnly,
}: {
  data: SkillsData;
  employeesOnly: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [skillSearch, setSkillSearch] = useState("");

  function toggleEmployees() {
    const params = new URLSearchParams(searchParams.toString());
    if (employeesOnly) {
      params.delete("employees");
    } else {
      params.set("employees", "true");
    }
    router.push(`?${params.toString()}`);
  }

  const filteredSkills = skillSearch
    ? data.allSkills.filter((s) =>
        s.name.toLowerCase().includes(skillSearch.toLowerCase())
      )
    : data.allSkills.slice(0, 50);

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Button
          variant={employeesOnly ? "default" : "outline"}
          size="sm"
          onClick={toggleEmployees}
        >
          <Briefcase className="h-4 w-4 mr-2" />
          {employeesOnly ? "Viser kun ansatte" : "Vis kun ansatte"}
        </Button>
      </div>

      {/* Kategori-kort */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(data.overview).map(([category, candidates]) => (
          <Card
            key={category}
            className={`cursor-pointer transition-all hover:shadow-md ${
              expandedCategory === category ? "ring-2 ring-primary" : ""
            }`}
            onClick={() =>
              setExpandedCategory(
                expandedCategory === category ? null : category
              )
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                {category}
                {expandedCategory === category ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{candidates.length}</span>
                <span className="text-sm text-muted-foreground">
                  {employeesOnly ? "ansatte" : "kandidater"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Utvidet kategori */}
      {expandedCategory && data.overview[expandedCategory] && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {expandedCategory} ({data.overview[expandedCategory].length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Navn</th>
                    <th className="px-4 py-2 text-left font-medium">Stilling</th>
                    <th className="px-4 py-2 text-center font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">
                      Matchende kompetanse
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.overview[expandedCategory].map((c) => (
                    <tr
                      key={c.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/recman/${c.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{c.title || "-"}</td>
                      <td className="px-4 py-2 text-center">
                        {c.isEmployee ? (
                          <Badge className="bg-green-600 text-xs">Ansatt</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Kandidat
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {c.matchingSkills.map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alle skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Alle kompetanser ({data.allSkills.length})</span>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-xs"
                placeholder="Sok i kompetanser..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {filteredSkills.map((s) => (
              <Link
                key={s.name}
                href={`/recman?skill=${encodeURIComponent(s.name)}`}
              >
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                  {s.name}{" "}
                  <span className="ml-1 text-muted-foreground">({s.count})</span>
                </Badge>
              </Link>
            ))}
            {data.allSkills.length > 50 && !skillSearch && (
              <span className="text-xs text-muted-foreground self-center">
                +{data.allSkills.length - 50} til...
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
