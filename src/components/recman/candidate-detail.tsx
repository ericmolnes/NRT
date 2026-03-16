"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Star,
  MapPin,
  Mail,
  Globe,
  Car,
  MessageSquare,
  Wrench,
  Languages,
} from "lucide-react";
import Link from "next/link";

type Skill = { skillId: string; name: string };
type Education = { educationId: string; schoolName: string; type: string; degree: string; location: string; startDate: string; endDate: string };
type Experience = { experienceId: string; companyName: string; title: string; location: string; startDate: string; endDate: string; current: string };
type Language = { languageId: string; name: string; level: string };
type Reference = { referenceId: string; name: string; companyName: string; mobilePhone: string; email: string };
type Attribute = { candidateAttributeId: number; attributeId: number; checkbox: Array<{ checkboxId: number; name: string }> };

type Candidate = {
  id: string;
  recmanId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  city: string | null;
  country: string | null;
  nationality: string | null;
  gender: string | null;
  dob: Date | null;
  title: string | null;
  description: string | null;
  rating: number;
  isEmployee: boolean;
  employeeNumber: number | null;
  employeeStart: Date | null;
  employeeEnd: Date | null;
  skills: unknown;
  education: unknown;
  experience: unknown;
  attributes: unknown;
  languages: unknown;
  driversLicense: unknown;
  references: unknown;
  recmanCreated: Date | null;
  recmanUpdated: Date | null;
  lastSyncedAt: Date;
  personnel: { id: string; name: string } | null;
};

const tabs = [
  { id: "oversikt", label: "Oversikt" },
  { id: "kompetanse", label: "Kompetanse" },
  { id: "utdanning", label: "Utdanning" },
  { id: "erfaring", label: "Erfaring" },
  { id: "referanser", label: "Referanser" },
];

const levelLabels: Record<string, string> = {
  nativeOrBilingual: "Morsmål",
  professionalWorking: "Profesjonell",
  fullProfessional: "Flytende",
  limitedWorking: "Grunnleggende",
  elementary: "Elementær",
};

export function CandidateDetail({ candidate: c }: { candidate: Candidate }) {
  const [tab, setTab] = useState("oversikt");

  const skills = (c.skills as Skill[]) || [];
  const education = (c.education as Education[]) || [];
  const experience = (c.experience as Experience[]) || [];
  const languages = (c.languages as Language[]) || [];
  const licenses = (c.driversLicense as string[]) || [];
  const refs = (c.references as Reference[]) || [];
  const attrs = (c.attributes as Attribute[]) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/recman" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Tilbake til kandidater
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{c.firstName} {c.lastName}</h1>
          <p className="text-muted-foreground">{c.title || "Ingen tittel"}</p>
          <div className="flex items-center gap-3 mt-2">
            {c.isEmployee ? (
              <Badge className="bg-green-600">
                <Briefcase className="h-3 w-3 mr-1" />
                Ansatt #{c.employeeNumber}
              </Badge>
            ) : (
              <Badge variant="outline">Kandidat</Badge>
            )}
            {c.employeeEnd && <Badge variant="destructive">Sluttet</Badge>}
            {c.rating > 0 && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: c.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "oversikt" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Kontaktinfo</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {c.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {c.email}</div>}
              {c.city && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {c.city}{c.country ? `, ${c.country}` : ""}</div>}
              {c.nationality && <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /> {c.nationality}</div>}
              {c.dob && <div>Fodt: {new Date(c.dob).toLocaleDateString("nb-NO")}</div>}
              {c.gender && <div>Kjonn: {c.gender === "male" ? "Mann" : c.gender === "female" ? "Kvinne" : c.gender}</div>}
            </CardContent>
          </Card>

          {c.isEmployee && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Ansattinfo</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>Ansattnr: <span className="font-mono font-medium">{c.employeeNumber}</span></div>
                {c.employeeStart && <div>Startdato: {new Date(c.employeeStart).toLocaleDateString("nb-NO")}</div>}
                {c.employeeEnd ? (
                  <div>Sluttdato: {new Date(c.employeeEnd).toLocaleDateString("nb-NO")}</div>
                ) : (
                  <div className="text-green-600 font-medium">Aktiv ansatt</div>
                )}
              </CardContent>
            </Card>
          )}

          {c.description && (
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-sm">Beskrivelse</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{c.description}</p></CardContent>
            </Card>
          )}

          {languages.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Languages className="h-4 w-4" /> Sprak</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {languages.map((l) => (
                    <div key={l.languageId} className="flex justify-between text-sm">
                      <span className="capitalize">{l.name}</span>
                      <span className="text-muted-foreground">{levelLabels[l.level] || l.level}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {licenses.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Car className="h-4 w-4" /> Forerkort</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {licenses.map((l) => (
                    <Badge key={l} variant="outline">{l}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {attrs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Attributter</CardTitle></CardHeader>
              <CardContent>
                {attrs.map((a) => (
                  <div key={a.candidateAttributeId} className="text-sm">
                    Attributt {a.attributeId}: {a.checkbox.map((cb) => cb.name).join(", ")}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="md:col-span-2">
            <CardContent className="py-3 text-xs text-muted-foreground">
              Recman ID: {c.recmanId} &middot; Opprettet: {c.recmanCreated?.toLocaleDateString("nb-NO")} &middot; Oppdatert: {c.recmanUpdated?.toLocaleDateString("nb-NO")} &middot; Sist synk: {c.lastSyncedAt.toLocaleString("nb-NO")}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "kompetanse" && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Kompetanse ({skills.length})</CardTitle></CardHeader>
          <CardContent>
            {skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen skills registrert</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => {
                  const isEx = ["ex ", "ex-", "atex", "iecex"].some((kw) => s.name.toLowerCase().includes(kw));
                  const isSafety = ["fallsikring", "gsk", "bosiet"].some((kw) => s.name.toLowerCase().includes(kw));
                  return (
                    <Badge
                      key={s.skillId}
                      variant="outline"
                      className={
                        isEx ? "bg-orange-50 text-orange-700 border-orange-200" :
                        isSafety ? "bg-red-50 text-red-700 border-red-200" :
                        ""
                      }
                    >
                      {s.name}
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "utdanning" && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Utdanning ({education.length})</CardTitle></CardHeader>
          <CardContent>
            {education.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen utdanning registrert</p>
            ) : (
              <div className="space-y-4">
                {education.map((e) => (
                  <div key={e.educationId} className="border-l-2 pl-4 py-1">
                    <div className="font-medium">{e.schoolName}</div>
                    <div className="text-sm text-muted-foreground">{e.type} - {e.degree}</div>
                    <div className="text-xs text-muted-foreground">{e.location} &middot; {e.startDate} - {e.endDate}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "erfaring" && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4" /> Arbeidserfaring ({experience.length})</CardTitle></CardHeader>
          <CardContent>
            {experience.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen erfaring registrert</p>
            ) : (
              <div className="space-y-4">
                {experience.map((e) => (
                  <div key={e.experienceId} className="border-l-2 pl-4 py-1">
                    <div className="font-medium">{e.title}</div>
                    <div className="text-sm">{e.companyName}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.location} &middot; {e.startDate} - {e.current === "1" ? "Nåværende" : e.endDate}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "referanser" && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Referanser ({refs.length})</CardTitle></CardHeader>
          <CardContent>
            {refs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen referanser registrert</p>
            ) : (
              <div className="space-y-4">
                {refs.map((r) => (
                  <div key={r.referenceId} className="border-l-2 pl-4 py-1">
                    <div className="font-medium">{r.name}</div>
                    {r.companyName && <div className="text-sm">{r.companyName}</div>}
                    {r.mobilePhone && <div className="text-xs text-muted-foreground">Tlf: {r.mobilePhone}</div>}
                    {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
