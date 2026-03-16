import { getEvaluationLinks } from "@/lib/queries/evaluation-links";
import { getAllPersonnel } from "@/lib/queries/evaluations";
import { getFieldCategories } from "@/lib/queries/custom-fields";
import { CreateLinkForm } from "@/components/skjema/create-link-form";
import { LinkList } from "@/components/skjema/link-list";

export default async function SkjemaPage() {
  const [links, personnel, categories] = await Promise.all([
    getEvaluationLinks(),
    getAllPersonnel(),
    getFieldCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Skjema</h1>
        <p className="text-muted-foreground">
          Opprett delbare skjemaer som kan fylles ut uten innlogging.
        </p>
      </div>

      <CreateLinkForm personnel={personnel} categories={categories} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Aktive skjemalinker</h2>
        <LinkList links={links} />
      </div>
    </div>
  );
}
