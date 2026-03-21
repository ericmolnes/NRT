"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pencil,
  X,
  Settings,
  Eye,
  EyeOff,
  Columns2,
  Square,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import {
  useLayoutPreferences,
  type SectionPreference,
} from "@/lib/hooks/use-layout-preferences";
import {
  updatePersonnel,
  saveFieldValues,
  type ActionState,
} from "@/app/(authenticated)/personell/[id]/actions";

interface Personnel {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  department: string | null;
}

interface FieldCategory {
  id: string;
  name: string;
  fields: {
    id: string;
    name: string;
    type: string;
    options: string | null;
    required: boolean;
  }[];
}

interface FieldValueMap {
  [fieldId: string]: string;
}

interface PoEmployee {
  jobTitle?: string | null;
  department?: string | null;
  [key: string]: unknown;
}

interface RecmanCandidate {
  title?: string | null;
  rating?: number | null;
  [key: string]: unknown;
}

interface PersonnelInfoTabProps {
  personnel: Personnel;
  categories: FieldCategory[];
  fieldValueMap: FieldValueMap;
  poEmployee?: PoEmployee | null;
  recmanCandidate?: RecmanCandidate | null;
}

const basicFields = [
  { key: "name", label: "Navn" },
  { key: "role", label: "Rolle" },
  { key: "email", label: "E-post" },
  { key: "phone", label: "Telefon" },
  { key: "department", label: "Avdeling" },
] as const;

export function PersonnelInfoTab({
  personnel,
  categories,
  fieldValueMap,
  poEmployee,
  recmanCandidate,
}: PersonnelInfoTabProps) {
  const [layoutMode, setLayoutMode] = useState(false);
  const {
    getSectionPref,
    toggleVisibility,
    toggleSize,
    moveSection,
    resetLayout,
  } = useLayoutPreferences();
  const [fieldState, fieldAction, fieldPending] = useActionState<
    ActionState,
    FormData
  >(saveFieldValues, {});

  // Build section list: "basis" + each category
  const allSections = [
    { id: "basis", label: "Basisinformasjon" },
    ...categories
      .filter((c) => c.fields.length > 0)
      .map((c) => ({ id: `cat-${c.id}`, label: c.name })),
  ];
  const allSectionIds = allSections.map((s) => s.id);

  // Sort sections by preference order
  const sortedSections = [...allSections].sort((a, b) => {
    const pa = getSectionPref(a.id, allSections.indexOf(a));
    const pb = getSectionPref(b.id, allSections.indexOf(b));
    return pa.order - pb.order;
  });

  return (
    <div className="space-y-3">
      {/* Enriched data from external sources */}
      {(poEmployee || recmanCandidate) && (
        <div className="flex flex-wrap gap-3">
          {poEmployee && (
            <div className="flex-1 min-w-[200px] rounded-lg border border-blue-200 bg-blue-50/50 p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1.5">PowerOffice</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Stilling</span>
                  <span className="text-xs font-medium text-right truncate">
                    {poEmployee.jobTitle || "\u2013"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Avdeling</span>
                  <span className="text-xs font-medium text-right truncate">
                    {poEmployee.department || "\u2013"}
                  </span>
                </div>
              </div>
            </div>
          )}
          {recmanCandidate && (
            <div className="flex-1 min-w-[200px] rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-1.5">Recman</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Tittel</span>
                  <span className="text-xs font-medium text-right truncate">
                    {recmanCandidate.title || "\u2013"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Rating</span>
                  <span className="text-xs font-medium text-right truncate">
                    {recmanCandidate.rating != null ? recmanCandidate.rating : "\u2013"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Layout mode toggle */}
      <div className="flex items-center justify-end gap-2">
        {layoutMode && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetLayout}
            className="text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Tilbakestill
          </Button>
        )}
        <Button
          type="button"
          variant={layoutMode ? "default" : "outline"}
          size="sm"
          onClick={() => setLayoutMode(!layoutMode)}
          className="text-xs"
        >
          <Settings className="h-3 w-3 mr-1" />
          {layoutMode ? "Ferdig" : "Tilpass visning"}
        </Button>
      </div>

      {/* Sections in a flex-wrap layout for half/full sizing */}
      <div className="flex flex-wrap gap-3">
        {sortedSections.map((section) => {
          const pref = getSectionPref(
            section.id,
            allSections.indexOf(
              allSections.find((s) => s.id === section.id)!
            )
          );

          // In layout mode, show hidden sections as dimmed
          if (!pref.visible && !layoutMode) return null;

          const widthClass =
            pref.size === "half" ? "w-full lg:w-[calc(50%-0.375rem)]" : "w-full";

          if (section.id === "basis") {
            return (
              <div key="basis" className={widthClass}>
                <BasicInfoSection
                  personnel={personnel}
                  layoutMode={layoutMode}
                  pref={pref}
                  sectionId="basis"
                  allSectionIds={allSectionIds}
                  toggleVisibility={toggleVisibility}
                  toggleSize={toggleSize}
                  moveSection={moveSection}
                />
              </div>
            );
          }

          const category = categories.find(
            (c) => `cat-${c.id}` === section.id
          );
          if (!category) return null;

          return (
            <div key={section.id} className={widthClass}>
              <CustomFieldCategory
                category={category}
                personnelId={personnel.id}
                fieldValueMap={fieldValueMap}
                fieldState={fieldState}
                fieldAction={fieldAction}
                fieldPending={fieldPending}
                layoutMode={layoutMode}
                pref={pref}
                sectionId={section.id}
                allSectionIds={allSectionIds}
                toggleVisibility={toggleVisibility}
                toggleSize={toggleSize}
                moveSection={moveSection}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Layout controls bar for each section ─── */
function LayoutControls({
  sectionId,
  pref,
  allSectionIds,
  toggleVisibility,
  toggleSize,
  moveSection,
}: {
  sectionId: string;
  pref: SectionPreference;
  allSectionIds: string[];
  toggleVisibility: (id: string, order: number) => void;
  toggleSize: (id: string, order: number) => void;
  moveSection: (id: string, dir: "up" | "down", ids: string[]) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => toggleVisibility(sectionId, pref.order)}
        title={pref.visible ? "Skjul seksjon" : "Vis seksjon"}
      >
        {pref.visible ? (
          <Eye className="h-3 w-3" />
        ) : (
          <EyeOff className="h-3 w-3" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => toggleSize(sectionId, pref.order)}
        title={pref.size === "full" ? "Halvbredde" : "Full bredde"}
      >
        {pref.size === "full" ? (
          <Columns2 className="h-3 w-3" />
        ) : (
          <Square className="h-3 w-3" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => moveSection(sectionId, "up", allSectionIds)}
        title="Flytt opp"
      >
        <ChevronUp className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => moveSection(sectionId, "down", allSectionIds)}
        title="Flytt ned"
      >
        <ChevronDown className="h-3 w-3" />
      </Button>
    </div>
  );
}

/* ─── Basic info section ─── */
function BasicInfoSection({
  personnel,
  layoutMode,
  pref,
  sectionId,
  allSectionIds,
  toggleVisibility,
  toggleSize,
  moveSection,
}: {
  personnel: Personnel;
  layoutMode: boolean;
  pref: SectionPreference;
  sectionId: string;
  allSectionIds: string[];
  toggleVisibility: (id: string, order: number) => void;
  toggleSize: (id: string, order: number) => void;
  moveSection: (id: string, dir: "up" | "down", ids: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updatePersonnel,
    {}
  );

  return (
    <Card className={!pref.visible ? "opacity-40" : ""}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Basisinformasjon</CardTitle>
          <div className="flex items-center gap-1">
            {layoutMode ? (
              <LayoutControls
                sectionId={sectionId}
                pref={pref}
                allSectionIds={allSectionIds}
                toggleVisibility={toggleVisibility}
                toggleSize={toggleSize}
                moveSection={moveSection}
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setEditing(!editing)}
              >
                {editing ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Pencil className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {pref.visible && (
        <CardContent className="px-4 pb-3 pt-0">
          {editing ? (
            <form action={formAction} className="space-y-3">
              <input type="hidden" name="id" value={personnel.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                {basicFields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={f.key} className="text-xs">
                      {f.label}
                    </Label>
                    <Input
                      id={f.key}
                      name={f.key}
                      defaultValue={
                        (personnel[f.key as keyof Personnel] as string) ?? ""
                      }
                      required={f.key === "name" || f.key === "role"}
                    />
                    {state.errors?.[f.key] && (
                      <p className="text-xs text-destructive">
                        {state.errors[f.key]![0]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {state.message && (
                <p
                  className={`text-xs ${state.success ? "text-emerald-600" : "text-destructive"}`}
                >
                  {state.message}
                </p>
              )}
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Lagrer..." : "Lagre"}
              </Button>
            </form>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
              {basicFields.map((f) => {
                const val = personnel[f.key as keyof Personnel] as
                  | string
                  | null;
                return (
                  <div
                    key={f.key}
                    className="flex justify-between gap-2 py-0.5"
                  >
                    <span className="text-xs text-muted-foreground shrink-0">
                      {f.label}
                    </span>
                    <span className="text-xs font-medium text-right truncate">
                      {val || "–"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/* ─── Custom field category section ─── */
function CustomFieldCategory({
  category,
  personnelId,
  fieldValueMap,
  fieldState,
  fieldAction,
  fieldPending,
  layoutMode,
  pref,
  sectionId,
  allSectionIds,
  toggleVisibility,
  toggleSize,
  moveSection,
}: {
  category: FieldCategory;
  personnelId: string;
  fieldValueMap: FieldValueMap;
  fieldState: ActionState;
  fieldAction: (payload: FormData) => void;
  fieldPending: boolean;
  layoutMode: boolean;
  pref: SectionPreference;
  sectionId: string;
  allSectionIds: string[];
  toggleVisibility: (id: string, order: number) => void;
  toggleSize: (id: string, order: number) => void;
  moveSection: (id: string, dir: "up" | "down", ids: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Card className={!pref.visible ? "opacity-40" : ""}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{category.name}</CardTitle>
          <div className="flex items-center gap-1">
            {layoutMode ? (
              <LayoutControls
                sectionId={sectionId}
                pref={pref}
                allSectionIds={allSectionIds}
                toggleVisibility={toggleVisibility}
                toggleSize={toggleSize}
                moveSection={moveSection}
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setEditing(!editing)}
              >
                {editing ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Pencil className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {pref.visible && (
        <CardContent className="px-4 pb-3 pt-0">
          {editing ? (
            <form action={fieldAction} className="space-y-3">
              <input type="hidden" name="personnelId" value={personnelId} />
              <div className="grid gap-3 sm:grid-cols-2">
                {category.fields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <input type="hidden" name="fieldId" value={field.id} />
                    <Label htmlFor={`field_${field.id}`} className="text-xs">
                      {field.name}
                      {field.required && (
                        <span className="text-destructive ml-0.5">*</span>
                      )}
                    </Label>
                    {field.type === "SELECT" && field.options ? (
                      <select
                        id={`field_${field.id}`}
                        name={`field_${field.id}`}
                        className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                        defaultValue={fieldValueMap[field.id] ?? ""}
                        required={field.required}
                      >
                        <option value="">Velg...</option>
                        {field.options.split(",").map((opt) => (
                          <option key={opt.trim()} value={opt.trim()}>
                            {opt.trim()}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "TEXTAREA" ? (
                      <textarea
                        id={`field_${field.id}`}
                        name={`field_${field.id}`}
                        className="flex min-h-14 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
                        defaultValue={fieldValueMap[field.id] ?? ""}
                        required={field.required}
                      />
                    ) : field.type === "BOOLEAN" ? (
                      <div className="flex items-center gap-2 pt-0.5">
                        <input
                          type="checkbox"
                          id={`field_${field.id}`}
                          name={`field_${field.id}`}
                          value="true"
                          defaultChecked={fieldValueMap[field.id] === "true"}
                          className="h-4 w-4 rounded border-input"
                        />
                        <Label
                          htmlFor={`field_${field.id}`}
                          className="text-xs font-normal"
                        >
                          Ja
                        </Label>
                      </div>
                    ) : (
                      <Input
                        id={`field_${field.id}`}
                        name={`field_${field.id}`}
                        type={
                          field.type === "NUMBER"
                            ? "number"
                            : field.type === "DATE"
                              ? "date"
                              : "text"
                        }
                        defaultValue={fieldValueMap[field.id] ?? ""}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
              {fieldState.message && (
                <p
                  className={`text-xs ${fieldState.success ? "text-emerald-600" : "text-destructive"}`}
                >
                  {fieldState.message}
                </p>
              )}
              <Button type="submit" size="sm" disabled={fieldPending}>
                {fieldPending ? "Lagrer..." : "Lagre"}
              </Button>
            </form>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
              {category.fields.map((field) => {
                const val = fieldValueMap[field.id];
                const display =
                  field.type === "BOOLEAN"
                    ? val === "true"
                      ? "Ja"
                      : "Nei"
                    : val || "–";
                return (
                  <div
                    key={field.id}
                    className="flex justify-between gap-2 py-0.5"
                  >
                    <span className="text-xs text-muted-foreground shrink-0">
                      {field.name}
                    </span>
                    <span className="text-xs font-medium text-right truncate">
                      {display}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
