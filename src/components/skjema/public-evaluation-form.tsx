"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScoreSelector } from "@/components/evaluering/score-selector";
import { DEFAULT_CRITERIA, type Criterion } from "@/lib/validations/evaluation";
import {
  submitPublicEvaluation,
  type PublicActionState,
} from "@/app/(public)/s/[token]/actions";
import { CheckCircle2 } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

/* Sub-criteria group with live average display */
function SubCriteriaGroup({
  parentKey,
  parentLabel,
  children,
  errors,
}: {
  parentKey: string;
  parentLabel: string;
  children: Criterion[];
  errors?: Record<string, string[] | undefined>;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});

  const filledCount = Object.keys(scores).length;
  const avg =
    filledCount > 0
      ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / filledCount)
      : null;

  function handleScoreChange(subKey: string, value: number) {
    setScores((prev) => ({ ...prev, [subKey]: value }));
  }

  return (
    <div className="sm:pl-9 space-y-3">
      {children.map((sub) => (
        <div key={sub.key} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[oklch(0.68_0.155_220_/_50%)] shrink-0" />
            <Label className="text-xs font-medium text-muted-foreground">{sub.label}</Label>
          </div>
          <div className="pl-3.5">
            <ScoreSelector
              name={`${parentKey}.${sub.key}`}
              onScoreChange={(val) => handleScoreChange(sub.key, val)}
            />
          </div>
          {errors?.[`${parentKey}.${sub.key}`] && (
            <p className="text-xs text-destructive pl-3.5">
              {errors[`${parentKey}.${sub.key}`]![0]}
            </p>
          )}
        </div>
      ))}

      {/* Average badge */}
      {avg !== null && (
        <div className="flex items-center gap-2 pl-3.5 pt-1">
          <div className="flex-1 h-px bg-[oklch(0.92_0.01_250)]" />
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            avg >= 8
              ? "bg-emerald-50 text-emerald-700"
              : avg >= 5
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700"
          )}>
            <span>{parentLabel}:</span>
            <span className="tabular-nums">{avg}/10</span>
            <span className="text-[10px] font-normal opacity-70">
              (snitt av {filledCount}/{children.length})
            </span>
          </div>
          <div className="flex-1 h-px bg-[oklch(0.92_0.01_250)]" />
        </div>
      )}
    </div>
  );
}

interface Personnel {
  id: string;
  name: string;
  role: string;
}

interface MicrosoftUser {
  name: string;
  email: string;
  id: string;
}

interface PublicEvaluationFormProps {
  token: string;
  personnel: Personnel[];
  lockedPersonnelId: string | null;
  microsoftUser?: MicrosoftUser | null;
  customCriteria?: Criterion[] | null;
}

function PersonnelSearch({
  personnel,
  errors,
}: {
  personnel: Personnel[];
  errors?: string[];
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = search
    ? personnel.filter(
        (p) => p.name.toLowerCase().includes(search.toLowerCase())
      )
    : personnel;

  const selectedPerson = personnel.find((p) => p.id === selectedId);

  return (
    <div className="space-y-2">
      <Label htmlFor="personnelSearch">Hvem vil du evaluere? *</Label>
      <input type="hidden" name="personnelId" value={selectedId} />
      <div className="relative">
        {selectedPerson ? (
          <div className="flex items-center justify-between rounded-lg border border-[oklch(0.68_0.155_220_/_30%)] bg-[oklch(0.68_0.155_220_/_5%)] px-3 py-2">
            <div>
              <span className="text-sm font-medium">{selectedPerson.name}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedId("");
                setSearch("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Endre
            </button>
          </div>
        ) : (
          <>
            <Input
              id="personnelSearch"
              type="text"
              placeholder="Søk etter navn eller rolle..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              autoComplete="off"
            />
            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsOpen(false)}
                />
                <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-52 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      Ingen treff
                    </div>
                  ) : (
                    filtered.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(p.id);
                          setSearch("");
                          setIsOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[oklch(0.96_0.008_250)]"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[oklch(0.18_0.035_250)] text-xs font-bold text-white">
                          {getInitials(p.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
      {errors && (
        <p className="text-sm text-destructive">{errors[0]}</p>
      )}
    </div>
  );
}

export function PublicEvaluationForm({
  token,
  personnel,
  lockedPersonnelId,
  microsoftUser,
  customCriteria,
}: PublicEvaluationFormProps) {
  const criteria: Criterion[] = customCriteria ?? DEFAULT_CRITERIA;
  const [state, formAction, isPending] = useActionState<
    PublicActionState,
    FormData
  >(submitPublicEvaluation, {});

  if (state.success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-xl font-bold tracking-tight">
              Takk for evalueringen!
            </h2>
            <p className="text-sm text-muted-foreground">
              Evalueringen er registrert.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[oklch(0.90_0.012_250)] bg-white shadow-sm">
      {/* Form header */}
      <div className="border-b border-[oklch(0.92_0.01_250)] px-5 py-4 sm:px-6">
        <h2 className="font-display text-base font-bold tracking-tight text-[oklch(0.18_0.035_250)]">
          Fyll ut evalueringen
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Alle felt med score er påkrevd. Gi en vurdering fra 1 (svakest) til 10 (best).
        </p>
      </div>

      <form action={formAction} className="divide-y divide-[oklch(0.94_0.008_250)]">
        <input type="hidden" name="token" value={token} />
        {microsoftUser && (
          <>
            <input type="hidden" name="microsoftEmail" value={microsoftUser.email} />
            <input type="hidden" name="microsoftName" value={microsoftUser.name} />
            <input type="hidden" name="microsoftEntraId" value={microsoftUser.id} />
          </>
        )}

        {/* Identity section */}
        <div className="space-y-4 px-5 py-5 sm:px-6">
          {microsoftUser ? (
            <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {getInitials(microsoftUser.name)}
              </div>
              <div className="min-w-0">
                <input type="hidden" name="evaluatorName" value={microsoftUser.name} />
                <div className="text-sm font-medium truncate">{microsoftUser.name}</div>
                <div className="text-xs text-muted-foreground truncate">{microsoftUser.email}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="evaluatorName">Ditt navn *</Label>
              <Input
                id="evaluatorName"
                name="evaluatorName"
                placeholder="Fullt navn"
                required
              />
              {state.errors?.evaluatorName && (
                <p className="text-sm text-destructive">
                  {state.errors.evaluatorName[0]}
                </p>
              )}
            </div>
          )}

          {lockedPersonnelId ? (
            <input
              type="hidden"
              name="personnelId"
              value={lockedPersonnelId}
            />
          ) : (
            <PersonnelSearch
              personnel={personnel}
              errors={state.errors?.personnelId}
            />
          )}
        </div>

        {/* Criteria section */}
        <div className="px-5 py-5 sm:px-6">
          <div className="space-y-5">
            {criteria.map((criterion, index) => {
              const hasChildren = criterion.children && criterion.children.length > 0;
              return (
                <div key={criterion.key} className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[oklch(0.18_0.035_250)] text-[10px] font-bold text-white mt-0.5">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <Label className="text-sm font-semibold">{criterion.label}</Label>
                      {criterion.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {criterion.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {hasChildren ? (
                    <SubCriteriaGroup
                      parentKey={criterion.key}
                      parentLabel={criterion.label}
                      children={criterion.children!}
                      errors={state.errors}
                    />
                  ) : (
                    /* Single score */
                    <div className="sm:pl-9">
                      <ScoreSelector name={criterion.key} />
                    </div>
                  )}

                  {state.errors?.[criterion.key] && (
                    <p className="text-sm text-destructive sm:pl-9">
                      {state.errors[criterion.key]![0]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Comment section */}
        <div className="space-y-2 px-5 py-5 sm:px-6">
          <Label htmlFor="comment">Kommentar (valgfri)</Label>
          <Textarea
            id="comment"
            name="comment"
            placeholder="Skriv en kommentar..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Submit */}
        <div className="px-5 py-4 sm:px-6 bg-[oklch(0.975_0.005_250)]">
          {state.message && !state.success && (
            <p className="text-sm text-destructive mb-3">{state.message}</p>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 font-semibold text-sm rounded-xl bg-[oklch(0.18_0.035_250)] hover:bg-[oklch(0.24_0.035_250)] transition-all"
          >
            {isPending ? "Sender..." : "Send inn evaluering"}
          </Button>
        </div>
      </form>
    </div>
  );
}
