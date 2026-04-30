"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Bot,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  AssistantModeSwitcher,
  type AssistantUiMode,
} from "@/components/assistant/assistant-mode-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSISTANT_ACTIONS,
  type AssistantActionId,
  type UserAssistantCapabilities,
} from "@/lib/assistant/resolve-user-capabilities";
import type { RunAssistantActionResult } from "@/lib/assistant/run-assistant-action";

function actionTone(actionId: AssistantActionId) {
  if (ASSISTANT_ACTIONS[actionId].mutating) return "destructive" as const;
  return "secondary" as const;
}

export function AssistantPanel({
  capabilities,
  accessLevel,
  runAction,
}: {
  capabilities: UserAssistantCapabilities;
  accessLevel: "USER" | "ADMIN";
  runAction: (input: {
    actionId: "assistant.plan" | "assistant.ask";
    mode: "PLAN" | "ASK";
    prompt: string;
  }) => Promise<RunAssistantActionResult>;
}) {
  const [mode, setMode] = useState<AssistantUiMode>("ASK");
  const [prompt, setPrompt] = useState("");
  const [confirmationSelected, setConfirmationSelected] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mutatingActionCount = useMemo(
    () =>
      capabilities.allowedActionIds.filter(
        (actionId) => ASSISTANT_ACTIONS[actionId].mutating
      ).length,
    [capabilities.allowedActionIds]
  );

  const hasPrompt = prompt.trim().length > 0;
  const promptActionId =
    mode === "PLAN" ? "assistant.plan" : "assistant.ask";
  const canRunPrompt =
    hasPrompt && mode !== "AUTO" && (mode === "PLAN" || confirmationSelected);

  function handleRunPromptAction() {
    if (!canRunPrompt) return;

    startTransition(async () => {
      try {
        const result = await runAction({
          actionId: promptActionId,
          mode,
          prompt,
        });
        setResultMessage(result.ok ? "Handling logget." : result.errorMessage);
      } catch (caught) {
        setResultMessage(caught instanceof Error ? caught.message : String(caught));
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Card className="min-w-0" size="sm">
        <CardHeader className="border-b pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-nrt-teal" />
                Assistent
              </CardTitle>
            </div>
            <AssistantModeSwitcher value={mode} onChange={setMode} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          <Textarea
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              setConfirmationSelected(false);
              setResultMessage(null);
            }}
            placeholder="Arbeidsordre, spørsmål eller kontrollpunkt"
            className="min-h-28 resize-y text-sm"
          />

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <label className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 accent-primary"
                checked={confirmationSelected}
                disabled={!hasPrompt || mode !== "ASK"}
                onChange={(event) =>
                  setConfirmationSelected(event.target.checked)
                }
              />
              <span className="min-w-0">
                Bekreft før muterende handling foreslås
              </span>
            </label>
            <Button
              type="button"
              variant="secondary"
              disabled={!canRunPrompt || isPending}
              onClick={handleRunPromptAction}
              className="h-9 w-full sm:w-44"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Klargjør
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              Action layer aktiv
            </Badge>
            {resultMessage && <span>{resultMessage}</span>}
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Tilgang
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-muted-foreground">Nivå</p>
              <p className="mt-1 font-medium">{accessLevel}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-muted-foreground">Mutering</p>
              <p className="mt-1 font-medium">{mutatingActionCount}</p>
            </div>
          </div>

          <div className="space-y-2">
            {capabilities.allowedActionIds.map((actionId) => (
              <div
                key={actionId}
                className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-xs"
              >
                <span className="min-w-0 truncate">
                  {ASSISTANT_ACTIONS[actionId].label}
                </span>
                <Badge variant={actionTone(actionId)} className="text-[10px]">
                  {ASSISTANT_ACTIONS[actionId].mutating ? "Skriv" : "Les"}
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>RBAC fra sesjon og capability resolver.</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Auto er sperret til action layer er klart.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
