"use client";

import { useActionState, useState, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createEvaluationLink,
  saveTemplate,
  deleteTemplate,
  type ActionState,
} from "@/app/(authenticated)/skjema/actions";
import type { Department } from "@/lib/queries/personnel";
import { Lock, Globe, Shield, Plus, X, ChevronDown, ChevronRight, FileText, ListChecks, Save, Trash2, BookOpen } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { DEFAULT_CRITERIA, type Criterion } from "@/lib/validations/evaluation";

interface Personnel {
  id: string;
  name: string;
  role: string;
  recmanCandidate: { corporationId: string | null } | null;
}

interface Category {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  criteria: Criterion[];
}

interface CreateLinkFormProps {
  personnel: Personnel[];
  categories: Category[];
  departments: Department[];
  templates?: Template[];
}

const AUTH_MODES = [
  { value: "NONE", label: "Åpent", description: "Alle med lenken", icon: Globe },
  { value: "PASSWORD", label: "Passord", description: "Krever passord", icon: Lock },
  { value: "MICROSOFT", label: "Microsoft", description: "Sporer innlogging", icon: Shield },
] as const;

/* ───── Sub-criteria (underpunkter) editor ───── */
function SubCriteriaList({
  items,
  onChange,
}: {
  items: Criterion[];
  onChange: (items: Criterion[]) => void;
}) {
  function update(i: number, field: keyof Criterion, value: string) {
    const copy = [...items];
    copy[i] = { ...copy[i], [field]: value };
    if (field === "label") {
      copy[i].key = value.toLowerCase().replace(/[^a-zæøå0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || `sub_${i}`;
    }
    onChange(copy);
  }

  return (
    <div className="ml-5 mt-2 space-y-1.5 border-l-2 border-[oklch(0.68_0.155_220_/_20%)] pl-3">
      {items.map((sub, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[oklch(0.68_0.155_220_/_40%)] shrink-0" />
          <Input
            value={sub.label}
            onChange={(e) => update(i, "label", e.target.value)}
            placeholder="Underpunkt..."
            className="h-7 text-xs flex-1"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="text-muted-foreground hover:text-destructive p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...items, { key: `sub_${items.length}`, label: "", description: "" }])
        }
        className="flex items-center gap-1 text-[11px] text-[oklch(0.50_0.10_220)] hover:text-[oklch(0.40_0.14_220)] font-medium mt-1"
      >
        <Plus className="h-3 w-3" />
        Legg til underpunkt
      </button>
    </div>
  );
}

/* ───── Main criteria editor ───── */
function CriteriaEditor({
  criteria,
  onChange,
}: {
  criteria: Criterion[];
  onChange: (criteria: Criterion[]) => void;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  function updateCriterion(index: number, field: keyof Criterion, value: string) {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "label") {
      const autoKey = value
        .toLowerCase()
        .replace(/[^a-zæøå0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 30);
      updated[index].key = autoKey || `criterion_${index}`;
    }
    onChange(updated);
  }

  function updateChildren(index: number, children: Criterion[]) {
    const updated = [...criteria];
    updated[index] = { ...updated[index], children };
    onChange(updated);
  }

  function removeCriterion(index: number) {
    onChange(criteria.filter((_, i) => i !== index));
    if (expandedIdx === index) setExpandedIdx(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Evalueringskriterier</Label>
        <span className="text-[11px] text-muted-foreground tabular-nums">{criteria.length} kriterier</span>
      </div>

      <div className="rounded-xl border border-[oklch(0.90_0.012_250)] bg-[oklch(0.985_0.003_250)] overflow-hidden divide-y divide-[oklch(0.93_0.008_250)]">
        {criteria.map((criterion, index) => {
          const isExpanded = expandedIdx === index;
          const hasChildren = criterion.children && criterion.children.length > 0;

          return (
            <div key={index} className="group">
              <div className="flex items-center gap-2 px-3 py-2.5">
                {/* Number badge */}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[oklch(0.18_0.035_250)] text-[10px] font-bold text-white">
                  {index + 1}
                </span>

                {/* Expand toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedIdx(isExpanded ? null : index)}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {/* Inputs */}
                <div className="flex-1 grid gap-1.5 sm:grid-cols-2 min-w-0">
                  <Input
                    value={criterion.label}
                    onChange={(e) => updateCriterion(index, "label", e.target.value)}
                    placeholder="Kriterium..."
                    className="h-7 text-sm font-medium border-transparent bg-transparent hover:bg-white hover:border-input focus:bg-white focus:border-input transition-colors"
                  />
                  <Input
                    value={criterion.description}
                    onChange={(e) => updateCriterion(index, "description", e.target.value)}
                    placeholder="Beskrivelse (valgfri)"
                    className="h-7 text-xs text-muted-foreground border-transparent bg-transparent hover:bg-white hover:border-input focus:bg-white focus:border-input transition-colors"
                  />
                </div>

                {/* Sub-count badge */}
                {hasChildren && !isExpanded && (
                  <span className="text-[10px] text-[oklch(0.50_0.10_220)] bg-[oklch(0.68_0.155_220_/_10%)] px-1.5 py-0.5 rounded-full font-medium shrink-0">
                    {criterion.children!.length} under
                  </span>
                )}

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeCriterion(index)}
                  disabled={criteria.length <= 1}
                  className="text-muted-foreground hover:text-destructive p-0.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Expanded: sub-criteria */}
              {isExpanded && (
                <div className="px-3 pb-3">
                  <SubCriteriaList
                    items={criterion.children ?? []}
                    onChange={(children) => updateChildren(index, children)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const newIndex = criteria.length;
          onChange([
            ...criteria,
            { key: `criterion_${newIndex}`, label: "", description: "", children: [] },
          ]);
          setExpandedIdx(newIndex);
        }}
        className="gap-1.5 text-xs"
      >
        <Plus className="h-3.5 w-3.5" />
        Legg til kriterium
      </Button>
    </div>
  );
}

/* ───── Main form ───── */
export function CreateLinkForm({ personnel, categories, departments, templates = [] }: CreateLinkFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createEvaluationLink,
    {}
  );
  const [formType, setFormType] = useState("EVALUATION");
  const [authMode, setAuthMode] = useState("NONE");
  const [deptFilter, setDeptFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>(DEFAULT_CRITERIA);
  const [activeTemplateId, setActiveTemplateId] = useState<string>("default");
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [personnelSearch, setPersonnelSearch] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [, templateAction, templatePending] = useActionState<ActionState, FormData>(saveTemplate, {});
  const [, deleteTemplateAction] = useActionState<ActionState, FormData>(deleteTemplate, {});
  const [, startTransition] = useTransition();

  const filteredPersonnel = useMemo(() => {
    let result = personnel;
    if (deptFilter) {
      result = result.filter((p) => p.recmanCandidate?.corporationId === deptFilter);
    }
    if (roleFilter) {
      result = result.filter((p) => p.role === roleFilter);
    }
    return result;
  }, [personnel, deptFilter, roleFilter]);

  return (
    <div className="rounded-xl border border-[oklch(0.90_0.012_250)] bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 sm:px-6 border-b border-[oklch(0.92_0.01_250)] bg-[oklch(0.985_0.003_250)]">
        <h2 className="font-display text-lg font-bold tracking-tight">Opprett nytt skjema</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Konfigurer innhold, tilgangskontroll og distribusjon.</p>
      </div>

      <form
        action={(formData) => {
          formData.set("criteria", JSON.stringify(criteria));
          formAction(formData);
        }}
        className="divide-y divide-[oklch(0.94_0.008_250)]"
      >
        {/* ─── Section 1: Basics ─── */}
        <div className="px-5 py-5 sm:px-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tittel</Label>
              <Input
                id="title"
                name="title"
                placeholder="F.eks. Formannevaluering Q1 2026"
                required
                className="h-10"
              />
              {state.errors?.title && (
                <p className="text-xs text-destructive">{state.errors.title[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skjematype</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "EVALUATION", label: "Evaluering", icon: ListChecks, desc: "Score 1-10" },
                  { value: "CUSTOM_FIELDS", label: "Egendefinert", icon: FileText, desc: "Frie felt" },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormType(type.value)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all",
                      formType === type.value
                        ? "border-[oklch(0.68_0.155_220)] bg-[oklch(0.68_0.155_220_/_5%)] ring-1 ring-[oklch(0.68_0.155_220_/_30%)]"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <type.icon className={cn("h-4 w-4 shrink-0", formType === type.value ? "text-[oklch(0.50_0.14_220)]" : "text-muted-foreground")} />
                    <div>
                      <div className="text-sm font-medium">{type.label}</div>
                      <div className="text-[10px] text-muted-foreground">{type.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <input type="hidden" name="formType" value={formType} />
            </div>
          </div>

          {formType === "CUSTOM_FIELDS" && (
            <div className="space-y-1.5">
              <Label htmlFor="categoryId" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feltkategori</Label>
              <select
                id="categoryId"
                name="categoryId"
                className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                defaultValue=""
                required
              >
                <option value="" disabled>Velg kategori...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {state.errors?.categoryId && (
                <p className="text-xs text-destructive">{state.errors.categoryId[0]}</p>
              )}
            </div>
          )}
        </div>

        {/* ─── Section 2: Criteria ─── */}
        {formType === "EVALUATION" && (
          <div className="px-5 py-5 sm:px-6 space-y-4">
            {/* Template selector */}
            {templates.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">Mal:</span>
                <button
                  type="button"
                  onClick={() => { setCriteria(DEFAULT_CRITERIA); setActiveTemplateId("default"); }}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    activeTemplateId === "default"
                      ? "border-[oklch(0.68_0.155_220)] bg-[oklch(0.68_0.155_220_/_8%)] text-[oklch(0.40_0.12_220)] font-medium"
                      : "border-border text-muted-foreground hover:border-muted-foreground/40"
                  )}
                >
                  Standard
                </button>
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => { setCriteria(t.criteria); setActiveTemplateId(t.id); }}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-l-full border transition-colors",
                        activeTemplateId === t.id
                          ? "border-[oklch(0.68_0.155_220)] bg-[oklch(0.68_0.155_220_/_8%)] text-[oklch(0.40_0.12_220)] font-medium"
                          : "border-border text-muted-foreground hover:border-muted-foreground/40"
                      )}
                    >
                      {t.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("id", t.id);
                        startTransition(() => deleteTemplateAction(fd));
                      }}
                      className="text-xs px-1.5 py-1 rounded-r-full border border-l-0 border-border text-muted-foreground hover:text-destructive hover:border-red-300 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <CriteriaEditor criteria={criteria} onChange={(c) => { setCriteria(c); setActiveTemplateId("custom"); }} />

            {/* Save as template */}
            <div className="flex items-center gap-2">
              {showSaveTemplate ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Navn på malen..."
                    className="h-8 text-sm flex-1 max-w-xs"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={templatePending || !templateName.trim()}
                    className="gap-1.5 text-xs h-8"
                    onClick={() => {
                      const fd = new FormData();
                      fd.set("templateName", templateName);
                      fd.set("templateCriteria", JSON.stringify(criteria));
                      startTransition(() => templateAction(fd));
                      setShowSaveTemplate(false);
                      setTemplateName("");
                    }}
                  >
                    <Save className="h-3 w-3" />
                    Lagre
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowSaveTemplate(false)} className="text-xs h-8">
                    Avbryt
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSaveTemplate(true)}
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <Save className="h-3 w-3" />
                  Lagre som mal
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ─── Section 3: Auth ─── */}
        <div className="px-5 py-5 sm:px-6 space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tilgangskontroll</Label>
          <input type="hidden" name="authMode" value={authMode} />
          <div className="grid grid-cols-3 gap-2">
            {AUTH_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setAuthMode(mode.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-all",
                  authMode === mode.value
                    ? "border-[oklch(0.68_0.155_220)] bg-[oklch(0.68_0.155_220_/_5%)] ring-1 ring-[oklch(0.68_0.155_220_/_30%)]"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <mode.icon className={cn("h-4 w-4", authMode === mode.value ? "text-[oklch(0.50_0.14_220)]" : "text-muted-foreground")} />
                <span className={cn("text-xs font-medium", authMode === mode.value ? "text-foreground" : "text-muted-foreground")}>{mode.label}</span>
                <span className="text-[9px] leading-tight text-muted-foreground">{mode.description}</span>
              </button>
            ))}
          </div>

          {authMode === "PASSWORD" && (
            <div className="space-y-1.5 mt-2">
              <Input
                name="password"
                type="text"
                placeholder="Velg et passord (minst 4 tegn)"
                required
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground">Del dette passordet med de som skal fylle ut.</p>
              {state.errors?.password && (
                <p className="text-xs text-destructive">{state.errors.password[0]}</p>
              )}
            </div>
          )}

          {authMode === "MICROSOFT" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-2.5 mt-2">
              <p className="text-[11px] text-blue-700">
                Krever Microsoft-innlogging. E-post, navn og tidspunkt lagres.
              </p>
            </div>
          )}
        </div>

        {/* ─── Section 4: Distribution ─── */}
        <div className="px-5 py-5 sm:px-6 space-y-4">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distribusjon</Label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {departments.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Avdeling</label>
                <select
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option value="">Alle</option>
                  {departments.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Rolle</label>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">Alle roller</option>
                <option value="Ansatt">Ansatte</option>
                <option value="Innleid">Innleide</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">
                Begrens til personell {selectedPersonnel.length > 0 && (
                  <span className="text-[oklch(0.50_0.10_220)] font-medium">({selectedPersonnel.length} valgt)</span>
                )}
              </label>
              <input type="hidden" name="personnelIds" value={JSON.stringify(selectedPersonnel)} />
              <div className="rounded-lg border border-input">
                {/* Selected pills */}
                {selectedPersonnel.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-2.5 pt-2">
                    {selectedPersonnel.map((id) => {
                      const p = personnel.find((pp) => pp.id === id);
                      if (!p) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.68_0.155_220_/_10%)] pl-2.5 pr-1 py-0.5 text-xs font-medium text-[oklch(0.35_0.08_220)]"
                        >
                          {p.name}
                          <button
                            type="button"
                            onClick={() => setSelectedPersonnel((prev) => prev.filter((x) => x !== id))}
                            className="rounded-full p-0.5 hover:bg-[oklch(0.68_0.155_220_/_20%)] transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Search input */}
                <input
                  type="text"
                  placeholder={selectedPersonnel.length === 0 ? "Alle kan velges — søk for å begrense..." : "Legg til flere..."}
                  value={personnelSearch}
                  onChange={(e) => setPersonnelSearch(e.target.value)}
                  className="w-full h-9 bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              {/* Dropdown results */}
              {personnelSearch && (() => {
                const searchResults = filteredPersonnel.filter(
                  (p) =>
                    !selectedPersonnel.includes(p.id) &&
                    p.name.toLowerCase().includes(personnelSearch.toLowerCase())
                );
                return (
                <div className="rounded-lg border bg-card shadow-md max-h-40 overflow-y-auto mt-1">
                  {searchResults
                    .slice(0, 20)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPersonnel((prev) => [...prev, p.id]);
                          setPersonnelSearch("");
                        }}
                        className="flex w-full items-center gap-2 px-2.5 py-2 text-sm text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[oklch(0.18_0.035_250)] text-[9px] font-bold text-white">
                          {getInitials(p.name)}
                        </div>
                        {p.name}
                      </button>
                    ))}
                  {searchResults.length === 0 && (
                    <div className="px-2.5 py-3 text-xs text-muted-foreground text-center">Ingen treff</div>
                  )}
                </div>
                );
              })()}
              <p className="text-[10px] text-muted-foreground">La stå tomt for å la evaluator velge fritt.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Utløpsdato</label>
              <Input name="expiresAt" type="date" className="h-9" />
            </div>
          </div>
        </div>

        {/* ─── Submit ─── */}
        <div className="px-5 py-4 sm:px-6 bg-[oklch(0.975_0.005_250)]">
          {state.message && (
            <p className={`text-xs mb-2 ${state.success ? "text-emerald-600" : "text-destructive"}`}>
              {state.message}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="h-10 px-8 font-semibold text-sm bg-[oklch(0.18_0.035_250)] hover:bg-[oklch(0.24_0.035_250)]"
          >
            {isPending ? "Oppretter..." : "Opprett skjemalink"}
          </Button>
        </div>
      </form>
    </div>
  );
}
