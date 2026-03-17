"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { approveSupplier } from "@/app/(authenticated)/leverandorer/[id]/actions";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

export function SupplierApprovalForm({
  supplierId,
  currentStatus,
  onDone,
}: {
  supplierId: string;
  currentStatus: string;
  onDone?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (status: "APPROVED" | "CONDITIONAL" | "REJECTED") => {
    const form = document.getElementById("approval-form") as HTMLFormElement;
    const fd = new FormData(form);
    setSaving(true);
    setError(null);

    const result = await approveSupplier({
      id: supplierId,
      status,
      expiresAt: (fd.get("expiresAt") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    });

    setSaving(false);
    if (result.success) {
      onDone?.();
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-5">
        <h3 className="font-display text-sm font-semibold mb-4">
          Godkjenning av leverandør
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Nåværende status: <span className="font-medium">{currentStatus}</span>
        </p>
        <form id="approval-form" className="space-y-3">
          <div>
            <Label className="text-xs">Godkjenning utløper</Label>
            <Input name="expiresAt" type="date" className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Kommentar</Label>
            <Textarea name="notes" rows={2} className="text-sm mt-1" placeholder="Begrunnelse..." />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => handleAction("APPROVED")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              Godkjenn
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => handleAction("CONDITIONAL")}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
              Betinget
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => handleAction("REJECTED")}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <ShieldX className="h-3.5 w-3.5 mr-1.5" />
              Avvis
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
