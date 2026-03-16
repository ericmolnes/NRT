"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Download } from "lucide-react";

type LaborSummary = {
  id: string;
  discipline: string;
  roleCode: string;
  totalHours: number;
  hourlyRate: number;
  totalCost: number;
};

type Estimate = {
  id: string;
  totalLaborHours: number;
  totalLaborCost: number;
  totalMaterialCost: number;
  totalCost: number;
  markupPercent: number;
  contingencyPercent: number;
  mobDemobCost: number;
  equipmentRentalCost: number;
  laborSummary: LaborSummary[];
};

const disciplineLabels: Record<string, string> = {
  ELECTRICAL: "Elektro",
  INSTRUMENT: "Instrument",
  ENGINEERING: "Engineering",
};

const roleLabels: Record<string, string> = {
  ENGINEER: "Ingenior",
  PROJECT_MANAGER: "Prosjektleder",
  FIELD_ENGINEER_EX: "Feltingenior (IECEx)",
  FIELD_ENGINEER: "Feltingenior",
  ELECTRICIAN: "Elektriker",
};

const formatNOK = (amount: number) =>
  new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(amount);

export function EstimateSummaryTab({ estimate }: { estimate: Estimate }) {
  const materialWithMarkup =
    estimate.totalMaterialCost * (1 + estimate.markupPercent / 100);
  const contingency =
    (estimate.totalLaborCost + materialWithMarkup) * (estimate.contingencyPercent / 100);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          render={<a href={`/estimering/${estimate.id}/export`} download />}
        >
          <Download className="mr-2 h-4 w-4" />
          Eksporter til Excel
        </Button>
      </div>

      {estimate.laborSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Timesammendrag per rolle</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium">Disiplin</th>
                  <th className="pb-2 text-left font-medium">Rolle</th>
                  <th className="pb-2 text-right font-medium">Timer</th>
                  <th className="pb-2 text-right font-medium">Rate</th>
                  <th className="pb-2 text-right font-medium">Kostnad</th>
                </tr>
              </thead>
              <tbody>
                {estimate.laborSummary.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2">
                      {disciplineLabels[row.discipline] || row.discipline}
                    </td>
                    <td className="py-2">
                      {roleLabels[row.roleCode] || row.roleCode}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {row.totalHours.toFixed(1)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {formatNOK(row.hourlyRate)}/t
                    </td>
                    <td className="py-2 text-right font-mono font-medium">
                      {formatNOK(row.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Kostnadssammendrag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Arbeidskostnad ({estimate.totalLaborHours.toFixed(1)} timer)</span>
            <span className="font-mono font-medium">
              {formatNOK(estimate.totalLaborCost)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Materialkostnad</span>
            <span className="font-mono font-medium">
              {formatNOK(estimate.totalMaterialCost)}
            </span>
          </div>
          {estimate.markupPercent > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Paslag materialer ({estimate.markupPercent}%)</span>
              <span className="font-mono">
                {formatNOK(materialWithMarkup - estimate.totalMaterialCost)}
              </span>
            </div>
          )}
          {estimate.contingencyPercent > 0 && (
            <div className="flex justify-between text-sm">
              <span>Uforutsett/reserve ({estimate.contingencyPercent}%)</span>
              <span className="font-mono font-medium">
                {formatNOK(contingency)}
              </span>
            </div>
          )}
          {estimate.mobDemobCost > 0 && (
            <div className="flex justify-between text-sm">
              <span>Mob/Demob</span>
              <span className="font-mono font-medium">
                {formatNOK(estimate.mobDemobCost)}
              </span>
            </div>
          )}
          {estimate.equipmentRentalCost > 0 && (
            <div className="flex justify-between text-sm">
              <span>Utstyrsleie</span>
              <span className="font-mono font-medium">
                {formatNOK(estimate.equipmentRentalCost)}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Totalt</span>
            <span className="font-mono">{formatNOK(estimate.totalCost)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
