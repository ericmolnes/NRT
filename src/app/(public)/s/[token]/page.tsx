import { notFound } from "next/navigation";
import { getEvaluationLinkByToken } from "@/lib/queries/evaluation-links";
import { getPersonnelForPublicForm } from "@/lib/queries/evaluations";
import { db } from "@/lib/db";
import { PublicEvaluationForm } from "@/components/skjema/public-evaluation-form";
import { PublicCustomFieldsForm } from "@/components/skjema/public-custom-fields-form";
import { auth } from "@/lib/auth";
import { FormAuthWrapper } from "@/components/skjema/form-auth-wrapper";

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
      <div className="w-full max-w-md space-y-4 px-4">
        <div className="rounded-2xl border border-[oklch(0.90_0.012_250)] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[oklch(0.94_0.01_250)]">
            <span className="text-lg">🔒</span>
          </div>
          <h1 className="font-display text-lg font-bold tracking-tight mb-1">
            Skjemaet er ikke tilgjengelig
          </h1>
          <p className="text-sm text-muted-foreground">
            {isExpired
              ? "Dette skjemaet har utløpt."
              : "Dette skjemaet er deaktivert."}
          </p>
        </div>
      </div>
    );
  }

  // Check Microsoft auth: get session if auth mode requires it
  let microsoftUser: { name: string; email: string; id: string } | null = null;
  if (link.authMode === "MICROSOFT") {
    const session = await auth();
    if (session?.user) {
      microsoftUser = {
        name: session.user.name ?? "Ukjent",
        email: session.user.email ?? "",
        id: session.user.id ?? "",
      };
    }
  }

  // Microsoft auth: block server-side if not logged in
  if (link.authMode === "MICROSOFT" && !microsoftUser) {
    return <FormAuthWrapper token={token} authMode="MICROSOFT">{null}</FormAuthWrapper>;
  }

  // Password auth: gate client-side (form content is children, shown after password verified)
  // Determine personnel list: single lock > multi lock > all
  const personnelIdsArr = link.personnelIds as string[] | null;
  let personnelList: { id: string; name: string; role: string }[];

  if (link.personnelId) {
    // Single person lock (legacy)
    personnelList = [{ id: link.personnel!.id, name: link.personnel!.name, role: link.personnel!.role }];
  } else if (personnelIdsArr && personnelIdsArr.length > 0) {
    // Multi-person lock: fetch only those people directly
    personnelList = await db.personnel.findMany({
      select: { id: true, name: true, role: true },
      where: { id: { in: personnelIdsArr }, status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  } else {
    personnelList = await getPersonnelForPublicForm(link.roleFilter);
  }

  const formContent = (
    <div className="w-full max-w-xl space-y-6 px-4">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.89_0.17_178_/_20%)] bg-[oklch(0.89_0.17_178_/_8%)] px-3.5 py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-[oklch(0.89_0.17_178)]" />
          <span className="text-xs font-medium text-[oklch(0.40_0.10_178)]">Evaluering</span>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[oklch(0.18_0.035_250)]">
          {link.title}
        </h1>
        {link.personnel ? (
          <p className="text-sm text-muted-foreground">
            For{" "}
            <span className="font-medium text-foreground">{link.personnel.name}</span>
            <span className="hidden sm:inline text-muted-foreground"> — {link.personnel.role}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Velg personellet du ønsker å evaluere nedenfor.
          </p>
        )}
        {microsoftUser && (
          <p className="text-xs text-muted-foreground">
            Logget inn som <span className="font-medium">{microsoftUser.email}</span>
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
          microsoftUser={microsoftUser}
          customCriteria={link.criteria as Array<{ key: string; label: string; description: string }> | null}
        />
      )}
    </div>
  );

  // No auth or Microsoft already verified — show form directly
  if (link.authMode === "NONE" || link.authMode === "MICROSOFT") {
    return formContent;
  }

  // Password auth — wrap in client-side gate
  return (
    <FormAuthWrapper
      token={token}
      authMode={link.authMode}
    >
      {formContent}
    </FormAuthWrapper>
  );
}
