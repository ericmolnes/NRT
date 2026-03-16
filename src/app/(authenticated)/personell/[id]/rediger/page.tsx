import { notFound } from "next/navigation";
import { getPersonnelById } from "@/lib/queries/personnel";
import { getFieldCategories } from "@/lib/queries/custom-fields";
import { PersonnelInfoTab } from "@/components/personell/personnel-info-tab";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonnelEditPage({ params }: PageProps) {
  const { id } = await params;

  const [personnel, categories] = await Promise.all([
    getPersonnelById(id),
    getFieldCategories(),
  ]);

  if (!personnel) notFound();

  const fieldValueMap: Record<string, string> = {};
  for (const fv of personnel.fieldValues) {
    fieldValueMap[fv.fieldId] = fv.value;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href={`/personell/${id}`} />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Rediger {personnel.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Oppdater basisinformasjon og egendefinerte felter.
          </p>
        </div>
      </div>

      <PersonnelInfoTab
        personnel={personnel}
        categories={categories}
        fieldValueMap={fieldValueMap}
        poEmployee={personnel.poEmployee}
        recmanCandidate={personnel.recmanCandidate}
      />
    </div>
  );
}
