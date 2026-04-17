"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Pencil,
  Lock,
  Loader2,
  Check,
  HardHat,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { updateCandidate } from "@/app/(authenticated)/personell/kandidater/actions";
import { toggleContractorWithHistory } from "@/app/(authenticated)/personell/innleide/actions";
import { EX_SKILL_KEYWORDS, SAFETY_SKILL_KEYWORDS } from "@/lib/recman/types";
import { ScoreBadge } from "@/components/evaluering/score-badge";

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
  phone: string | null;
  city: string | null;
  country: string | null;
  nationality: string | null;
  gender: string | null;
  dob: Date | null;
  title: string | null;
  description: string | null;
  rating: number;
  isEmployee: boolean;
  isContractor: boolean;
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
  personnel: {
    id: string;
    name: string;
    evaluations?: Array<{
      id: string;
      score: number;
      evaluatorName: string;
      comment: string | null;
      createdAt: Date;
    }>;
  } | null;
  contractorPeriods?: Array<{ id: string; startDate: Date; endDate: Date | null; company: string | null; notes: string | null }>;
};

const levelLabels: Record<string, string> = {
  nativeOrBilingual: "Morsmål",
  professionalWorking: "Profesjonell",
  fullProfessional: "Flytende",
  limitedWorking: "Grunnleggende",
  elementary: "Elementær",
};

function RecManReadOnlyNotice({ field }: { field: string }) {
  return (
    <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
      <Lock className="h-3 w-3" /> {field} kan kun endres direkte i RecMan
    </p>
  );
}

interface CandidateDetailProps {
  candidate: Candidate;
  embedded?: boolean;
  onUpdated?: () => void;
}

export function CandidateDetail({ candidate: c, embedded = false, onUpdated }: CandidateDetailProps) {
  const baseTabs = [
    { id: "oversikt", label: "Oversikt" },
    { id: "kompetanse", label: "Kompetanse" },
    { id: "utdanning", label: "Utdanning" },
    { id: "erfaring", label: "Erfaring" },
    { id: "referanser", label: "Referanser" },
    { id: "evalueringer", label: "Evalueringer" },
  ];
  const tabs = embedded
    ? [...baseTabs, { id: "rediger", label: "Rediger" }]
    : baseTabs;

  const [tab, setTab] = useState("oversikt");
  const [isTogglingContractor, startContractorTransition] = useTransition();

  function handleContractorToggle() {
    const isActivating = !c.isContractor;
    const confirmMsg = isActivating
      ? `Marker ${c.firstName} ${c.lastName} som innleid? De vil bli tilgjengelige for evaluering og skjemaer.`
      : `Fjern innleid-status for ${c.firstName} ${c.lastName}? Aktiv periode lukkes.`;
    if (!window.confirm(confirmMsg)) return;

    startContractorTransition(async () => {
      const result = await toggleContractorWithHistory(c.id);
      if (result.success) {
        onUpdated?.();
      } else if ("error" in result && result.error) {
        alert(result.error);
      }
    });
  }

  const canToggleContractor = !c.isEmployee || c.employeeEnd !== null;

  const skills = (c.skills as Skill[]) || [];
  const education = (c.education as Education[]) || [];
  const experience = (c.experience as Experience[]) || [];
  const languages = (c.languages as Language[]) || [];
  const licenses = (c.driversLicense as string[]) || [];
  const refs = (c.references as Reference[]) || [];
  const attrs = (c.attributes as Attribute[]) || [];
  const contractorPeriods = (c.contractorPeriods || []).sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {!embedded && (
            <Link href="/personell/kandidater" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
              <ArrowLeft className="h-3 w-3" /> Tilbake til kandidater
            </Link>
          )}
          {embedded ? (
            <h2 className="text-2xl font-bold tracking-tight">{c.firstName} {c.lastName}</h2>
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">{c.firstName} {c.lastName}</h1>
          )}
          <p className="text-muted-foreground">{c.title || "Ingen tittel"}</p>
          <div className="flex items-center gap-3 mt-2">
            {c.isEmployee && !c.employeeEnd ? (
              <Badge className="bg-green-600">
                <Briefcase className="h-3 w-3 mr-1" />
                Ansatt{c.employeeNumber ? ` #${c.employeeNumber}` : ""}
              </Badge>
            ) : c.isEmployee && c.employeeEnd ? (
              <Badge variant="destructive">Sluttet</Badge>
            ) : c.isContractor ? (
              <Badge className="bg-blue-600">
                <HardHat className="h-3 w-3 mr-1" />
                Innleid
              </Badge>
            ) : (
              <Badge variant="outline">Kandidat</Badge>
            )}
            {c.rating > 0 && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: c.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            )}
          </div>
        </div>
        {canToggleContractor && (
          <Button
            onClick={handleContractorToggle}
            disabled={isTogglingContractor}
            variant={c.isContractor ? "outline" : "default"}
            size="sm"
            className="shrink-0"
          >
            {isTogglingContractor ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <HardHat className="h-3.5 w-3.5 mr-1.5" />
            )}
            {c.isContractor ? "Fjern innleid-status" : "Marker som innleid"}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.id === "rediger" && <Pencil className="inline h-3 w-3 mr-1" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "oversikt" && (
        <div className={`grid grid-cols-1 ${embedded ? "" : "md:grid-cols-2"} gap-6`}>
          <Card>
            <CardHeader><CardTitle className="text-sm">Kontaktinfo</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {c.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {c.email}</div>}
              {c.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {c.phone}</div>}
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

          {contractorPeriods.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><HardHat className="h-4 w-4" /> Innleid-historikk</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {contractorPeriods.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {!p.endDate ? (
                      <Badge className="text-xs bg-green-600">Aktiv</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Avsluttet</Badge>
                    )}
                    <div>
                      <span>
                        {new Date(p.startDate).toLocaleDateString("nb-NO")}
                        {" \u2013 "}
                        {p.endDate ? new Date(p.endDate).toLocaleDateString("nb-NO") : "P\u00e5g\u00e5ende"}
                      </span>
                      {p.company && (
                        <span className="text-muted-foreground ml-2">({p.company})</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {c.description && (
            <Card className={embedded ? "" : "md:col-span-2"}>
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

          <Card className={embedded ? "" : "md:col-span-2"}>
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
                  const isEx = EX_SKILL_KEYWORDS.some((kw) => s.name.toLowerCase().includes(kw));
                  const isSafety = SAFETY_SKILL_KEYWORDS.some((kw) => s.name.toLowerCase().includes(kw));
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
            {embedded && <RecManReadOnlyNotice field="Kompetanse" />}
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
            {embedded && <RecManReadOnlyNotice field="Utdanning" />}
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
            {embedded && <RecManReadOnlyNotice field="Arbeidserfaring" />}
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
            {embedded && <RecManReadOnlyNotice field="Referanser" />}
          </CardContent>
        </Card>
      )}

      {tab === "evalueringer" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4" /> Evalueringer
              {c.personnel?.evaluations && c.personnel.evaluations.length > 0 && (
                <span className="text-muted-foreground font-normal">({c.personnel.evaluations.length})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!c.personnel ? (
              <p className="text-sm text-muted-foreground">Ikke koblet til personellkort</p>
            ) : !c.personnel.evaluations || c.personnel.evaluations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen evalueringer registrert</p>
            ) : (
              <div className="space-y-3">
                {c.personnel.evaluations.map((ev) => (
                  <div key={ev.id} className="border-l-2 pl-4 py-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{ev.evaluatorName}</span>
                      <ScoreBadge score={ev.score} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(ev.createdAt).toLocaleDateString("nb-NO")}
                    </div>
                    {ev.comment && (
                      <p className="text-sm text-muted-foreground mt-1">{ev.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "rediger" && embedded && (
        <CandidateEditForm candidate={c} onUpdated={onUpdated} />
      )}
    </div>
  );
}

// ─── Edit Form (only shown in embedded/Sheet mode) ─────────────────

function CandidateEditForm({ candidate: c, onUpdated }: { candidate: Candidate; onUpdated?: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; errors?: Record<string, string[]> } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("candidateId", c.id);

    startTransition(async () => {
      const res = await updateCandidate(formData);
      setResult(res);
      if (res.success) {
        onUpdated?.();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Rediger kandidatinfo
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Endringer synkroniseres tilbake til RecMan
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Fornavn</Label>
              <Input id="firstName" name="firstName" defaultValue={c.firstName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Etternavn</Label>
              <Input id="lastName" name="lastName" defaultValue={c.lastName} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Tittel / stilling</Label>
            <Input id="title" name="title" defaultValue={c.title || ""} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input id="email" name="email" type="email" defaultValue={c.email || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" defaultValue={c.phone || ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">By</Label>
              <Input id="city" name="city" defaultValue={c.city || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Land</Label>
              <Input id="country" name="country" defaultValue={c.country || ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nationality">Nasjonalitet</Label>
              <Input id="nationality" name="nationality" defaultValue={c.nationality || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Kjønn</Label>
              <Select name="gender" defaultValue={c.gender || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ikke spesifisert</SelectItem>
                  <SelectItem value="male">Mann</SelectItem>
                  <SelectItem value="female">Kvinne</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dob">Fødselsdato</Label>
              <Input
                id="dob"
                name="dob"
                type="date"
                defaultValue={c.dob ? new Date(c.dob).toISOString().split("T")[0] : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Rating (0–5)</Label>
              <Input id="rating" name="rating" type="number" min={0} max={5} defaultValue={c.rating} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea id="description" name="description" rows={4} defaultValue={c.description || ""} />
          </div>
        </CardContent>
      </Card>

      {/* Read-only notice */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Følgende felter kan kun endres i RecMan:</p>
              <p>Kompetanse/skills, utdanning, arbeidserfaring, språk, førerkort, referanser og kurs.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && !result.success && result.errors && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {Object.values(result.errors).flat().join(". ")}
        </div>
      )}

      {result?.success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4" /> Kandidat oppdatert og synkronisert til RecMan
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Lagre og synkroniser
      </Button>
    </form>
  );
}
