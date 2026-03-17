"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createDocument } from "@/app/(authenticated)/dokumenter/[id]/actions";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewDocumentPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const result = await createDocument({
      title: fd.get("title") as string,
      category: fd.get("category") as string,
      responsibleName: fd.get("responsibleName") as string,
      reviewCycleMonths: parseInt(fd.get("reviewCycleMonths") as string) || 12,
    });

    setSaving(false);
    if (result.success && result.id) {
      router.push(`/dokumenter/${result.id}`);
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/dokumenter" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Nytt dokument
          </h1>
          <p className="text-sm text-muted-foreground">
            Opprett et nytt dokument i dokumentkontrollsystemet. Dokumentnummer genereres automatisk.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs">Tittel *</Label>
              <Input name="title" className="h-9 mt-1" required placeholder="Prosedyre for leverandørkontroll" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Kategori *</Label>
                <select
                  name="category"
                  required
                  className="flex h-9 mt-1 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Velg kategori...</option>
                  <option value="PROCEDURE">Prosedyre</option>
                  <option value="WORK_INSTRUCTION">Arbeidsinstruks</option>
                  <option value="FORM_TEMPLATE">Skjema/Mal</option>
                  <option value="POLICY">Retningslinje</option>
                  <option value="RECORD">Registrering</option>
                  <option value="EXTERNAL">Eksternt</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Revisjonssyklus (mnd)</Label>
                <Input
                  name="reviewCycleMonths"
                  type="number"
                  min="1"
                  max="120"
                  defaultValue="12"
                  className="h-9 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Ansvarlig *</Label>
              <Input name="responsibleName" className="h-9 mt-1" required placeholder="Ola Nordmann" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" render={<Link href="/dokumenter" />}>
                Avbryt
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Oppretter..." : "Opprett dokument"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
