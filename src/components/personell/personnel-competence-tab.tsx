"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Briefcase,
  Languages,
  Car,
  Users,
  Wrench,
} from "lucide-react";

// ─── Type helpers ───

interface Skill {
  name: string;
  level?: string;
}

interface Education {
  institution?: string;
  degree?: string;
  startDate?: string;
  endDate?: string;
}

interface Experience {
  company?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

interface Language {
  name: string;
  level?: string;
}

interface Reference {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
}

function isSkill(v: unknown): v is Skill {
  return typeof v === "object" && v !== null && "name" in v;
}

function isEducation(v: unknown): v is Education {
  return typeof v === "object" && v !== null;
}

function isExperience(v: unknown): v is Experience {
  return typeof v === "object" && v !== null;
}

function isLanguage(v: unknown): v is Language {
  return typeof v === "object" && v !== null && "name" in v;
}

function isReference(v: unknown): v is Reference {
  return typeof v === "object" && v !== null;
}

function castArray<T>(
  raw: unknown,
  guard: (v: unknown) => v is T
): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(guard);
}

function castStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string");
}

// ─── Props ───

interface PersonnelCompetenceTabProps {
  recmanCandidate: {
    title: string | null;
    rating: number;
    skills: unknown;
    education: unknown;
    experience: unknown;
    languages: unknown;
    driversLicense: unknown;
    references: unknown;
  };
}

// ─── Component ───

export function PersonnelCompetenceTab({
  recmanCandidate,
}: PersonnelCompetenceTabProps) {
  const skills = castArray(recmanCandidate.skills, isSkill);
  const education = castArray(recmanCandidate.education, isEducation);
  const experience = castArray(recmanCandidate.experience, isExperience);
  const languages = castArray(recmanCandidate.languages, isLanguage);
  const driversLicense = castStringArray(recmanCandidate.driversLicense);
  const references = castArray(recmanCandidate.references, isReference);

  return (
    <div className="space-y-3">
      {/* Ferdigheter */}
      {skills.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm">Ferdigheter</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, i) => (
                <Badge
                  key={`${skill.name}-${i}`}
                  className="bg-blue-100 text-blue-700 border-blue-200"
                >
                  {skill.name}
                  {skill.level && (
                    <span className="ml-1 opacity-70">({skill.level})</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Utdanning */}
      {education.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-indigo-600" />
              <CardTitle className="text-sm">Utdanning</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="space-y-3">
              {education.map((edu, i) => (
                <div key={i} className="space-y-0.5">
                  {edu.institution && (
                    <p className="text-xs font-medium">{edu.institution}</p>
                  )}
                  {edu.degree && (
                    <p className="text-xs text-foreground">{edu.degree}</p>
                  )}
                  {(edu.startDate || edu.endDate) && (
                    <p className="text-[10px] text-muted-foreground">
                      {edu.startDate ?? ""}
                      {edu.startDate && edu.endDate ? " – " : ""}
                      {edu.endDate ?? ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Arbeidserfaring */}
      {experience.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-600" />
              <CardTitle className="text-sm">Arbeidserfaring</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="divide-y">
              {experience.map((exp, i) => (
                <div key={i} className="space-y-0.5 py-2.5 first:pt-0 last:pb-0">
                  {exp.company && (
                    <p className="text-xs font-medium">{exp.company}</p>
                  )}
                  {exp.title && (
                    <p className="text-xs text-foreground">{exp.title}</p>
                  )}
                  {(exp.startDate || exp.endDate) && (
                    <p className="text-[10px] text-muted-foreground">
                      {exp.startDate ?? ""}
                      {exp.startDate && exp.endDate ? " – " : ""}
                      {exp.endDate ?? ""}
                    </p>
                  )}
                  {exp.description && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Språk */}
      {languages.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm">Språk</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="flex flex-wrap gap-1.5">
              {languages.map((lang, i) => (
                <Badge
                  key={`${lang.name}-${i}`}
                  className="bg-purple-100 text-purple-700 border-purple-200"
                >
                  {lang.name}
                  {lang.level && (
                    <span className="ml-1 opacity-70">({lang.level})</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Førerkort */}
      {driversLicense.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-sm">Førerkort</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="flex flex-wrap gap-1.5">
              {driversLicense.map((license, i) => (
                <Badge
                  key={`${license}-${i}`}
                  className="bg-amber-100 text-amber-700 border-amber-200"
                >
                  {license}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referanser */}
      {references.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600" />
              <CardTitle className="text-sm">Referanser</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="space-y-2">
              {references.map((ref, i) => (
                <details key={i} className="group">
                  <summary className="cursor-pointer text-xs font-medium hover:text-foreground/80 list-none flex items-center gap-1">
                    <span className="text-muted-foreground group-open:rotate-90 transition-transform">
                      &#9654;
                    </span>
                    {ref.name ?? "Referanse"}
                    {ref.company && (
                      <span className="text-muted-foreground font-normal">
                        &mdash; {ref.company}
                      </span>
                    )}
                  </summary>
                  <div className="pl-4 mt-1.5 space-y-0.5">
                    {ref.phone && (
                      <p className="text-xs text-muted-foreground">
                        Telefon:{" "}
                        <span className="text-foreground">{ref.phone}</span>
                      </p>
                    )}
                    {ref.email && (
                      <p className="text-xs text-muted-foreground">
                        E-post:{" "}
                        <a
                          href={`mailto:${ref.email}`}
                          className="text-foreground underline underline-offset-2"
                        >
                          {ref.email}
                        </a>
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {skills.length === 0 &&
        education.length === 0 &&
        experience.length === 0 &&
        languages.length === 0 &&
        driversLicense.length === 0 &&
        references.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-xs text-muted-foreground">
              Ingen kompetansedata fra Recman.
            </p>
          </div>
        )}
    </div>
  );
}
