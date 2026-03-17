"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check } from "lucide-react";

const MODELS = [
  { value: "claude-opus-4-6-20250219", label: "Claude Opus 4.6", description: "Mest kapabel — best for nøyaktig matching" },
  { value: "claude-sonnet-4-6-20250514", label: "Claude Sonnet 4.6", description: "Rask og presis — god balanse" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", description: "Raskest — lavest kostnad" },
] as const;

interface AiModelSettingProps {
  currentModel: string;
  onSave: (model: string) => Promise<{ success: boolean }>;
}

export function AiModelSetting({ currentModel, onSave }: AiModelSettingProps) {
  const [selected, setSelected] = useState(currentModel);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      const result = await onSave(selected);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="space-y-3">
      {MODELS.map((model) => (
        <button
          key={model.value}
          type="button"
          onClick={() => setSelected(model.value)}
          className={`w-full text-left rounded-lg border p-3 transition-colors ${
            selected === model.value
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-input hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{model.label}</p>
              <p className="text-xs text-muted-foreground">{model.description}</p>
            </div>
            {selected === model.value && (
              <Badge className="bg-blue-600 text-[10px]">Valgt</Badge>
            )}
          </div>
        </button>
      ))}
      {selected !== currentModel && (
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : saved ? (
            <Check className="h-4 w-4 mr-1" />
          ) : null}
          {saved ? "Lagret!" : "Lagre modellvalg"}
        </Button>
      )}
    </div>
  );
}
