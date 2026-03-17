"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createSupplier } from "@/app/(authenticated)/leverandorer/[id]/actions";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewSupplierPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const result = await createSupplier({
      name: fd.get("name") as string,
      type: fd.get("type") as string,
      organizationNumber: (fd.get("organizationNumber") as string) || undefined,
      email: (fd.get("email") as string) || undefined,
      phone: (fd.get("phone") as string) || undefined,
      contactPerson: (fd.get("contactPerson") as string) || undefined,
      address: (fd.get("address") as string) || undefined,
      city: (fd.get("city") as string) || undefined,
      postalCode: (fd.get("postalCode") as string) || undefined,
      website: (fd.get("website") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    });

    setSaving(false);
    if (result.success && result.id) {
      router.push(`/leverandorer/${result.id}`);
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/leverandorer" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ny leverandør
          </h1>
          <p className="text-sm text-muted-foreground">
            Registrer en ny leverandør i kvalitetssystemet.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs">Firmanavn *</Label>
                <Input name="name" className="h-9 mt-1" required placeholder="Leverandør AS" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs">Type *</Label>
                <select
                  name="type"
                  required
                  className="flex h-9 mt-1 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Velg type...</option>
                  <option value="MATERIAL">Materiell</option>
                  <option value="SERVICE">Tjeneste</option>
                  <option value="EQUIPMENT">Utstyr</option>
                  <option value="RENTAL">Utleie</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Org.nummer</Label>
                <Input name="organizationNumber" className="h-9 mt-1" placeholder="123456789" />
              </div>
              <div>
                <Label className="text-xs">Kontaktperson</Label>
                <Input name="contactPerson" className="h-9 mt-1" placeholder="Ola Nordmann" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">E-post</Label>
                <Input name="email" type="email" className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Telefon</Label>
                <Input name="phone" className="h-9 mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Nettside</Label>
              <Input name="website" className="h-9 mt-1" placeholder="https://example.com" />
            </div>
            <div>
              <Label className="text-xs">Adresse</Label>
              <Input name="address" className="h-9 mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Postnummer</Label>
                <Input name="postalCode" className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">By</Label>
                <Input name="city" className="h-9 mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notater</Label>
              <Textarea name="notes" rows={3} className="text-sm mt-1" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" render={<Link href="/leverandorer" />}>
                Avbryt
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Oppretter..." : "Opprett leverandør"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
