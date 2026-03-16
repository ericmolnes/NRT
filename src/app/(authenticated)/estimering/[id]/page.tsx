import { notFound } from "next/navigation";
import { getEstimateById, getNormCategories } from "@/lib/queries/estimates";
import { EstimateTabs } from "@/components/estimering/estimate-tabs";
import { EstimateOverviewTab } from "@/components/estimering/estimate-overview-tab";
import { EstimateCablesTab } from "@/components/estimering/estimate-cables-tab";
import { EstimateEquipmentTab } from "@/components/estimering/estimate-equipment-tab";
import { EstimateScopeTab } from "@/components/estimering/estimate-scope-tab";
import { EstimateMaterialsTab } from "@/components/estimering/estimate-materials-tab";
import { EstimateSummaryTab } from "@/components/estimering/estimate-summary-tab";
import { EstimateActualTimeTab } from "@/components/estimering/estimate-actual-time-tab";
import { EstimateCalculatorTab } from "@/components/estimering/estimate-calculator-tab";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function EstimateDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab ?? "oversikt";

  const needsNorms = activeTab === "omfang" || activeTab === "kalkyle";

  const [estimate, normCategories] = await Promise.all([
    getEstimateById(id),
    needsNorms ? getNormCategories() : Promise.resolve([]),
  ]);

  if (!estimate) notFound();

  const countData = {
    cables: estimate.cables.length,
    equipment: estimate.equipment.length,
    lineItems: estimate.lineItems.length,
    scopeItems: estimate.scopeItems.length,
  };

  return (
    <div className="space-y-6">
      <EstimateTabs estimateStatus={estimate.status} />

      {activeTab === "oversikt" && (
        <EstimateOverviewTab
          estimate={{
            ...estimate,
            _count: countData,
          }}
        />
      )}

      {activeTab === "kalkyle" && (
        <EstimateCalculatorTab
          estimate={estimate}
          normCategories={normCategories}
        />
      )}

      {activeTab === "kabler" && (
        <EstimateCablesTab cables={estimate.cables} estimateId={estimate.id} />
      )}

      {activeTab === "utstyr" && (
        <EstimateEquipmentTab equipment={estimate.equipment} estimateId={estimate.id} />
      )}

      {activeTab === "omfang" && (
        <EstimateScopeTab
          scopeItems={estimate.scopeItems}
          estimateId={estimate.id}
          normCategories={normCategories}
        />
      )}

      {activeTab === "materialer" && (
        <EstimateMaterialsTab
          lineItems={estimate.lineItems}
          estimateId={estimate.id}
        />
      )}

      {activeTab === "sammendrag" && (
        <EstimateSummaryTab estimate={estimate} />
      )}

      {activeTab === "faktisk-tid" && (
        <EstimateActualTimeTab
          estimate={{
            id: estimate.id,
            status: estimate.status,
            totalLaborHours: estimate.totalLaborHours,
            actualLaborHours: estimate.actualLaborHours,
            laborSummary: estimate.laborSummary,
            cables: estimate.cables,
            scopeItems: estimate.scopeItems,
            actualTimeEntries: estimate.actualTimeEntries,
          }}
        />
      )}
    </div>
  );
}
