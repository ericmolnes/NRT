"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createCustomer } from "@/app/(authenticated)/kunder/[id]/actions";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewCustomerPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const result = await createCustomer({
      name: fd.get("name") as string,
      organizationNumber: (fd.get("organizationNumber") as string) || undefined,
      emailAddress: (fd.get("emailAddress") as string) || undefined,
      phoneNumber: (fd.get("phoneNumber") as string) || undefined,
      address: (fd.get("address") as string) || undefined,
      city: (fd.get("city") as string) || undefined,
      postalCode: (fd.get("postalCode") as string) || undefined,
      industry: (fd.get("industry") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
      syncToPowerOffice: false,
    });

    setSaving(false);
    if (result.success && result.id) {
      router.push(`/kunder/${result.id}`);
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/kunder" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ny kunde
          </h1>
          <p className="text-sm text-muted-foreground">
            Opprett en ny kunde i systemet.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs">Firmanavn *</Label>
              <Input name="name" className="h-9 mt-1" required placeholder="Firmanavn AS" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Org.nummer</Label>
                <Input name="organizationNumber" className="h-9 mt-1" placeholder="123456789" />
              </div>
              <div>
                <Label className="text-xs">Bransje</Label>
                <Input name="industry" className="h-9 mt-1" placeholder="Offshore, Energi..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">E-post</Label>
                <Input name="emailAddress" type="email" className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Telefon</Label>
                <Input name="phoneNumber" className="h-9 mt-1" />
              </div>
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
              <Button type="button" variant="outline" size="sm" render={<Link href="/kunder" />}>
                Avbryt
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Oppretter..." : "Opprett kunde"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
