"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  toggleEvaluationLink,
  deleteEvaluationLink,
  type ActionState,
} from "@/app/(authenticated)/skjema/actions";
import { Copy, Trash2, Pause, Play, Lock, Shield, Globe } from "lucide-react";

interface EvaluationLink {
  id: string;
  token: string;
  title: string;
  formType: string;
  authMode: string;
  personnelIds: unknown;
  active: boolean;
  usageCount: number;
  expiresAt: Date | null;
  createdBy: string;
  createdAt: Date;
  personnel: {
    id: string;
    name: string;
    role: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
}

const AUTH_MODE_BADGE: Record<string, { icon: typeof Globe; label: string; className: string }> = {
  NONE: { icon: Globe, label: "Åpent", className: "bg-gray-100 text-gray-600 border-gray-200" },
  PASSWORD: { icon: Lock, label: "Passord", className: "bg-amber-100 text-amber-700 border-amber-200" },
  MICROSOFT: { icon: Shield, label: "Microsoft", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

interface LinkListProps {
  links: EvaluationLink[];
}

export function LinkList({ links }: LinkListProps) {
  if (links.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          Ingen skjemalinker opprettet ennå. Opprett den første ovenfor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {links.map((link) => (
        <LinkCard key={link.id} link={link} />
      ))}
    </div>
  );
}

function LinkCard({ link }: { link: EvaluationLink }) {
  const [, toggleAction, togglePending] = useActionState<ActionState, FormData>(
    toggleEvaluationLink,
    {}
  );
  const [, deleteAction, deletePending] = useActionState<ActionState, FormData>(
    deleteEvaluationLink,
    {}
  );

  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
  const formUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/s/${link.token}`;

  return (
    <Card>
      <CardContent className="pt-4 pb-4 sm:pt-6">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm sm:text-base">{link.title}</span>
              <Badge variant="secondary" className="text-xs">
                {link.formType === "CUSTOM_FIELDS"
                  ? link.category?.name ?? "Felt"
                  : "Evaluering"}
              </Badge>
              {link.active && !isExpired ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                  Aktiv
                </Badge>
              ) : isExpired ? (
                <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                  Utløpt
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Deaktivert</Badge>
              )}
              {link.authMode && link.authMode !== "NONE" && (() => {
                const mode = AUTH_MODE_BADGE[link.authMode];
                if (!mode) return null;
                const Icon = mode.icon;
                return (
                  <Badge className={`${mode.className} text-xs gap-1`}>
                    <Icon className="h-3 w-3" />
                    {mode.label}
                  </Badge>
                );
              })()}
            </div>
            <p className="text-sm text-muted-foreground">
              {link.personnel ? (
                <>
                  For: <span className="font-medium">{link.personnel.name}</span>
                  <span className="hidden sm:inline"> ({link.personnel.role})</span>
                </>
              ) : Array.isArray(link.personnelIds) && link.personnelIds.length > 0 ? (
                <span>Begrenset til {link.personnelIds.length} personer</span>
              ) : (
                "Brukeren velger personell selv"
              )}
            </p>
            <div className="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="hidden sm:inline">Opprettet av {link.createdBy}</span>
              <span>{link.createdAt.toLocaleDateString("nb-NO")}</span>
              <span>{link.usageCount} svar</span>
              {link.expiresAt && (
                <span>
                  Utløper{" "}
                  {new Date(link.expiresAt).toLocaleDateString("nb-NO")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <code className="rounded bg-muted px-2 py-1 text-xs break-all">
                /s/{link.token}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  navigator.clipboard.writeText(formUrl);
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <form action={toggleAction}>
              <input type="hidden" name="id" value={link.id} />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                disabled={togglePending}
              >
                {link.active ? (
                  <Pause className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Play className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </form>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={link.id} />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                disabled={deletePending}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
