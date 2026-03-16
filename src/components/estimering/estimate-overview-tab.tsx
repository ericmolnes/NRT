"use client";

import { useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Cable, Clock, Package, Banknote, CheckCheck, Calculator, Loader2, Settings } from "lucide-react";
import {
  verifyAllItems,
  updateEstimateStatus,
  calculateEstimate,
  updateEstimateSettings,
} from "@/app/(authenticated)/estimering/[id]/actions";

type Estimate = {
  id: string;
  name: string;
  projectNumber: string | null;
  description: string | null;
  status: string;
  aiParseStatus: string;
  sourceFileName: string | null;
  totalLaborHours: number;
  totalLaborCost: number;
  totalMaterialCost: number;
  totalCost: number;
  markupPercent: number;
  contingencyPercent: number;
  fieldEngineerPercent: number;
  mobDemobCost: number;
  equipmentRentalCost: number;
  createdByName: string;
  createdAt: Date;
  rateProfile: { name: string } | null;
  _count: {
    cables: number;
    equipment: number;
    lineItems: number;
    scopeItems: number;
  };
};

const statusLabels: Record<string, string> = {
  DRAFT: "Utkast",
  AI_PARSING: "AI-analyse",
  REVIEW: "Til gjennomgang",
  APPROVED: "Godkjent",
  COMPLETED: "Fullfort",
  ARCHIVED: "Arkivert",
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  AI_PARSING: "outline",
  REVIEW: "default",
  APPROVED: "default",
  COMPLETED: "default",
  ARCHIVED: "secondary",
};

const aiStatusLabels: Record<string, string> = {
  PENDING: "Venter",
  PROCESSING: "Analyserer...",
  COMPLETED: "Fullfort",
  FAILED: "Feilet",
};

const formatNOK = (amount: number) =>
  new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(amount);

export function EstimateOverviewTab({ estimate }: { estimate: Estimate }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Auto-refresh mens AI-parsing pagar
  useEffect(() => {
    if (estimate.aiParseStatus === "PROCESSING") {
      const interval = setInterval(() => {
        router.refresh();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [estimate.aiParseStatus, router]);

  function handleVerifyAll() {
    startTransition(() => {
      verifyAllItems(estimate.id);
    });
  }

  function handleStatusChange(status: "DRAFT" | "REVIEW" | "APPROVED" | "ARCHIVED") {
    startTransition(() => {
      updateEstimateStatus(estimate.id, status);
    });
  }

  function handleCalculate() {
    startTransition(() => {
      calculateEstimate(estimate.id);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{estimate.name}</h2>
          {estimate.projectNumber && (
            <p className="text-muted-foreground">
              Prosjekt {estimate.projectNumber}
            </p>
          )}
          {estimate.description && (
            <p className="mt-2 text-sm">{estimate.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCalculate}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-4 w-4" />
            )}
            Beregn totaler
          </Button>
          <Badge variant={statusVariant[estimate.status] || "secondary"}>
            {statusLabels[estimate.status] || estimate.status}
          </Badge>
          {estimate.status === "REVIEW" && (
            <Button
              size="sm"
              onClick={handleVerifyAll}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 h-4 w-4" />
              )}
              Verifiser alle og godkjenn
            </Button>
          )}
          {estimate.status === "DRAFT" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange("REVIEW")}
              disabled={isPending}
            >
              Send til gjennomgang
            </Button>
          )}
        </div>
      </div>

      {estimate.aiParseStatus !== "PENDING" && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">AI-analyse:</span>
              <Badge variant={estimate.aiParseStatus === "COMPLETED" ? "default" : "secondary"}>
                {aiStatusLabels[estimate.aiParseStatus] || estimate.aiParseStatus}
              </Badge>
              {estimate.aiParseStatus === "COMPLETED" && (
                <span className="text-muted-foreground">
                  Fant {estimate._count.cables} kabler, {estimate._count.equipment} utstyr, {estimate._count.scopeItems} omfangsposter
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timer totalt</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estimate.totalLaborHours.toFixed(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arbeidskostnad</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNOK(estimate.totalLaborCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materialkostnad</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNOK(estimate.totalMaterialCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <Cable className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNOK(estimate.totalCost)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Detaljer</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Opprettet av</dt>
              <dd className="font-medium">{estimate.createdByName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dato</dt>
              <dd className="font-medium">
                {new Date(estimate.createdAt).toLocaleDateString("nb-NO")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rateprofil</dt>
              <dd className="font-medium">
                {estimate.rateProfile?.name || "Ikke valgt"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paslag materialer</dt>
              <dd className="font-medium">{estimate.markupPercent}%</dd>
            </div>
            {estimate.sourceFileName && (
              <div>
                <dt className="text-muted-foreground">Kildedokument</dt>
                <dd className="font-medium">{estimate.sourceFileName}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Settings className="h-4 w-4" />
            Prosjektinnstillinger
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Feltingenior %</label>
              <Input
                className="h-8 text-sm font-mono"
                type="number"
                step="1"
                min="0"
                max="100"
                defaultValue={estimate.fieldEngineerPercent}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val !== estimate.fieldEngineerPercent) {
                    startTransition(() => {
                      updateEstimateSettings(estimate.id, { fieldEngineerPercent: val });
                    });
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Reserve/uforutsett %</label>
              <Input
                className="h-8 text-sm font-mono"
                type="number"
                step="1"
                min="0"
                defaultValue={estimate.contingencyPercent}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val !== estimate.contingencyPercent) {
                    startTransition(() => {
                      updateEstimateSettings(estimate.id, { contingencyPercent: val });
                    });
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Mob/Demob (NOK)</label>
              <Input
                className="h-8 text-sm font-mono"
                type="number"
                step="1000"
                min="0"
                defaultValue={estimate.mobDemobCost}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val !== estimate.mobDemobCost) {
                    startTransition(() => {
                      updateEstimateSettings(estimate.id, { mobDemobCost: val });
                    });
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Utstyrsleie (NOK)</label>
              <Input
                className="h-8 text-sm font-mono"
                type="number"
                step="1000"
                min="0"
                defaultValue={estimate.equipmentRentalCost}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val !== estimate.equipmentRentalCost) {
                    startTransition(() => {
                      updateEstimateSettings(estimate.id, { equipmentRentalCost: val });
                    });
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
