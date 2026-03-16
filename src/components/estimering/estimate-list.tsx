"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Cable, Wrench, Package, FileText } from "lucide-react";

type Estimate = {
  id: string;
  name: string;
  projectNumber: string | null;
  status: string;
  totalLaborHours: number;
  totalCost: number;
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
  ARCHIVED: "Arkivert",
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  AI_PARSING: "outline",
  REVIEW: "default",
  APPROVED: "default",
  ARCHIVED: "secondary",
};

export function EstimateList({ estimates }: { estimates: Estimate[] }) {
  if (estimates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Ingen estimater</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Opprett et nytt estimat for a komme i gang.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {estimates.map((estimate) => (
        <Link key={estimate.id} href={`/estimering/${estimate.id}`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{estimate.name}</CardTitle>
                  {estimate.projectNumber && (
                    <p className="text-sm text-muted-foreground">
                      Prosjekt {estimate.projectNumber}
                    </p>
                  )}
                </div>
                <Badge variant={statusVariant[estimate.status] || "secondary"}>
                  {statusLabels[estimate.status] || estimate.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Cable className="h-4 w-4" />
                  {estimate._count.cables} kabler
                </span>
                <span className="flex items-center gap-1">
                  <Wrench className="h-4 w-4" />
                  {estimate._count.equipment} utstyr
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {estimate._count.lineItems} materialer
                </span>
                {estimate.totalCost > 0 && (
                  <span className="ml-auto font-medium text-foreground">
                    {new Intl.NumberFormat("nb-NO", {
                      style: "currency",
                      currency: "NOK",
                      maximumFractionDigits: 0,
                    }).format(estimate.totalCost)}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Opprettet av {estimate.createdByName}{" "}
                  {new Date(estimate.createdAt).toLocaleDateString("nb-NO")}
                </span>
                {estimate.rateProfile && (
                  <span>{estimate.rateProfile.name}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
