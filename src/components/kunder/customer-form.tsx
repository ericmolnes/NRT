"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCustomer } from "@/app/(authenticated)/kunder/[id]/actions";
import { useRouter } from "next/navigation";

interface CustomerFormProps {
  onClose: () => void;
}

export function CustomerForm({ onClose }: CustomerFormProps) {
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
      syncToPowerOffice: true,
    });

    setSaving(false);
    if (result.success) {
      router.refresh();
      if (result.id) router.push(`/kunder/${result.id}`);
      onClose();
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h2 className="text-base font-semibold">Ny kunde</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-3">
          <div>
            <Label className="text-xs">Firmanavn *</Label>
            <Input name="name" className="h-8" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Org.nummer</Label>
              <Input name="organizationNumber" className="h-8" />
            </div>
            <div>
              <Label className="text-xs">Bransje</Label>
              <Input name="industry" className="h-8" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">E-post</Label>
              <Input name="emailAddress" type="email" className="h-8" />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input name="phoneNumber" className="h-8" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Adresse</Label>
            <Input name="address" className="h-8" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Postnummer</Label>
              <Input name="postalCode" className="h-8" />
            </div>
            <div>
              <Label className="text-xs">By</Label>
              <Input name="city" className="h-8" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notater</Label>
            <Textarea name="notes" rows={2} className="text-sm" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Avbryt</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Oppretter..." : "Opprett kunde"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
