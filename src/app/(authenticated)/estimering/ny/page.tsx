import { getActiveRateProfiles } from "@/lib/queries/rates";
import { NewEstimateForm } from "@/components/estimering/new-estimate-form";

export default async function NewEstimatePage() {
  const rateProfiles = await getActiveRateProfiles();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nytt estimat</h1>
        <p className="text-muted-foreground">
          Opprett et nytt estimat manuelt eller last opp en arbeidspakke for
          AI-analyse.
        </p>
      </div>

      <NewEstimateForm rateProfiles={rateProfiles} />
    </div>
  );
}
