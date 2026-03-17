import { getEvaluationLinks } from "@/lib/queries/evaluation-links";
import { getAllPersonnel } from "@/lib/queries/evaluations";
import { getFieldCategories } from "@/lib/queries/custom-fields";
import { getDistinctDepartments } from "@/lib/queries/personnel";
import { db } from "@/lib/db";
import { CreateLinkForm } from "@/components/skjema/create-link-form";
import { LinkList } from "@/components/skjema/link-list";
import { SkjemaFilters } from "@/components/skjema/skjema-filters";

interface SkjemaPageProps {
  searchParams: Promise<{ department?: string }>;
}

export default async function SkjemaPage({ searchParams }: SkjemaPageProps) {
  const params = await searchParams;
  const [links, personnel, categories, departments, templates] = await Promise.all([
    getEvaluationLinks({ department: params.department }),
    getAllPersonnel(),
    getFieldCategories(),
    getDistinctDepartments(),
    db.evaluationTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serializedTemplates = templates.map((t) => ({
    id: t.id,
    name: t.name,
    criteria: t.criteria as Array<{ key: string; label: string; description: string; children?: Array<{ key: string; label: string; description: string }> }>,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Skjema</h1>
        <p className="text-muted-foreground">
          Opprett delbare skjemaer som kan fylles ut uten innlogging.
        </p>
      </div>

      <CreateLinkForm
        personnel={personnel}
        categories={categories}
        departments={departments}
        templates={serializedTemplates}
      />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Aktive skjemalinker</h2>
        <SkjemaFilters departments={departments} />
        <LinkList links={links} />
      </div>
    </div>
  );
}
