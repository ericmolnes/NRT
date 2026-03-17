"use client";

import { useActionState, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createEvaluationLink,
  type ActionState,
} from "@/app/(authenticated)/skjema/actions";
import type { Department } from "@/lib/queries/personnel";

interface Personnel {
  id: string;
  name: string;
  recmanCandidate: { corporationId: string | null } | null;
}

interface Category {
  id: string;
  name: string;
}

interface CreateLinkFormProps {
  personnel: Personnel[];
  categories: Category[];
  departments: Department[];
}

export function CreateLinkForm({ personnel, categories, departments }: CreateLinkFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createEvaluationLink,
    {}
  );
  const [formType, setFormType] = useState("EVALUATION");
  const [deptFilter, setDeptFilter] = useState("");

  const filteredPersonnel = useMemo(() => {
    if (!deptFilter) return personnel;
    return personnel.filter((p) => p.recmanCandidate?.corporationId === deptFilter);
  }, [personnel, deptFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opprett nytt skjema</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="title">Tittel *</Label>
              <Input
                id="title"
                name="title"
                placeholder="F.eks. Formannevaluering Q1 2026"
                required
              />
              {state.errors?.title && (
                <p className="text-sm text-destructive">
                  {state.errors.title[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="formType">Skjematype *</Label>
              <select
                id="formType"
                name="formType"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                <option value="EVALUATION">Evaluering</option>
                <option value="CUSTOM_FIELDS">Egendefinerte felt</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {formType === "EVALUATION"
                  ? "Evalueringsskjema med HMS, kompetanse, samarbeid osv."
                  : "Samle inn data for en egendefinert feltkategori (f.eks. klesstørrelser)."}
              </p>
            </div>
            {formType === "CUSTOM_FIELDS" && (
              <div className="space-y-1">
                <Label htmlFor="categoryId">Feltkategori *</Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    Velg kategori...
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {state.errors?.categoryId && (
                  <p className="text-sm text-destructive">
                    {state.errors.categoryId[0]}
                  </p>
                )}
              </div>
            )}
            {departments.length > 0 && (
              <div className="space-y-1">
                <Label htmlFor="deptFilter">Filtrer på avdeling</Label>
                <select
                  id="deptFilter"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option value="">Alle avdelinger</option>
                  {departments.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="personnelId">
                Fastlåst til personell (valgfri)
              </Label>
              <select
                id="personnelId"
                name="personnelId"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                defaultValue=""
              >
                <option value="">Brukeren velger selv</option>
                {filteredPersonnel.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="expiresAt">Utløpsdato (valgfri)</Label>
              <Input id="expiresAt" name="expiresAt" type="date" />
            </div>
          </div>
          {state.message && (
            <p
              className={`text-sm ${state.success ? "text-emerald-600" : "text-destructive"}`}
            >
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Oppretter..." : "Opprett skjemalink"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
