"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createProject } from "@/app/(authenticated)/prosjekter/[id]/actions";

interface NewProjectFormProps {
  customerId: string;
  customerName: string;
}

export function NewProjectForm({ customerId, customerName }: NewProjectFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncToPO, setSyncToPO] = useState(true);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const result = await createProject({
      name: fd.get("name") as string,
      code: (fd.get("code") as string) || undefined,
      description: (fd.get("description") as string) || undefined,
      location: (fd.get("location") as string) || undefined,
      customerId,
      syncToPowerOffice: syncToPO,
    });

    setSaving(false);
    if (result.success && result.id) {
      router.push(`/prosjekter/${result.id}`);
    } else if (result.success) {
      router.push(`/kunder/${customerId}`);
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/kunder/${customerId}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Nytt prosjekt</h1>
          <p className="text-sm text-muted-foreground">{customerName}</p>
        </div>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs">Prosjektnavn *</Label>
            <Input name="name" className="h-8" required placeholder="F.eks. Johan Sverdrup fase 2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Prosjektkode</Label>
              <Input name="code" className="h-8" placeholder="JSV-002" />
            </div>
            <div>
              <Label className="text-xs">Lokasjon</Label>
              <Input name="location" className="h-8" placeholder="Nordsjøen" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Beskrivelse</Label>
            <Textarea name="description" className="min-h-[80px] text-sm" placeholder="Kort beskrivelse av prosjektet..." />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="syncToPO"
              checked={syncToPO}
              onChange={(e) => setSyncToPO(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="syncToPO" className="text-xs cursor-pointer">
              Synkroniser til PowerOffice
            </Label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Link href={`/kunder/${customerId}`}>
              <Button type="button" variant="outline" size="sm">Avbryt</Button>
            </Link>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Oppretter..." : "Opprett prosjekt"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
