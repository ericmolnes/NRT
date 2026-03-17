import { notFound } from "next/navigation";
import { getEvaluationLinkByToken } from "@/lib/queries/evaluation-links";
import { getPersonnelForPublicForm } from "@/lib/queries/evaluations";
import { PublicEvaluationForm } from "@/components/skjema/public-evaluation-form";
import { PublicCustomFieldsForm } from "@/components/skjema/public-custom-fields-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicFormPage({ params }: PageProps) {
  const { token } = await params;
  const link = await getEvaluationLinkByToken(token);

  if (!link) {
    notFound();
  }

  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();

  if (!link.active || isExpired) {
    return (
      <div className="w-full max-w-lg space-y-4 px-4">
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h1 className="text-xl font-bold mb-2">
            Skjemaet er ikke tilgjengelig
          </h1>
          <p className="text-muted-foreground">
            {isExpired
              ? "Dette skjemaet har utløpt."
              : "Dette skjemaet er deaktivert."}
          </p>
        </div>
      </div>
    );
  }

  const personnelList = link.personnelId
    ? [{ id: link.personnel!.id, name: link.personnel!.name, role: link.personnel!.role }]
    : await getPersonnelForPublicForm();

  return (
    <div className="w-full max-w-2xl space-y-6 px-4 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{link.title}</h1>
        {link.personnel ? (
          <p className="text-muted-foreground">
            For{" "}
            <span className="font-medium">{link.personnel.name}</span> (
            {link.personnel.role})
          </p>
        ) : (
          <p className="text-muted-foreground">
            Velg personellet du ønsker å fylle ut for nedenfor.
          </p>
        )}
      </div>

      {link.formType === "CUSTOM_FIELDS" && link.category ? (
        <PublicCustomFieldsForm
          token={token}
          personnel={personnelList}
          lockedPersonnelId={link.personnelId}
          category={link.category}
        />
      ) : (
        <PublicEvaluationForm
          token={token}
          personnel={personnelList}
          lockedPersonnelId={link.personnelId}
        />
      )}
    </div>
  );
}
