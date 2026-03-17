"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Check, UserPlus } from "lucide-react";
import { createCandidate } from "@/app/(authenticated)/personell/kandidater/actions";

interface CreateCandidateFormProps {
  onCreated?: () => void;
}

export function CreateCandidateForm({ onCreated }: CreateCandidateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; errors?: Record<string, string[]> } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createCandidate(formData);
      setResult(res);
      if (res.success) {
        onCreated?.();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Opprett ny kandidat
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Kandidaten opprettes i RecMan og synkroniseres til NRT
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-firstName">Fornavn *</Label>
              <Input id="create-firstName" name="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-lastName">Etternavn *</Label>
              <Input id="create-lastName" name="lastName" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-title">Tittel / stilling</Label>
            <Input id="create-title" name="title" placeholder="F.eks. Elektriker, Mekaniker..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-email">E-post</Label>
              <Input id="create-email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-mobilePhone">Mobiltelefon</Label>
              <Input id="create-mobilePhone" name="mobilePhone" placeholder="+47..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-city">By</Label>
              <Input id="create-city" name="city" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-country">Land</Label>
              <Input id="create-country" name="country" defaultValue="Norge" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-description">Beskrivelse</Label>
            <Textarea id="create-description" name="description" rows={3} />
          </div>
        </CardContent>
      </Card>

      {result && !result.success && result.errors && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {Object.values(result.errors).flat().join(". ")}
        </div>
      )}

      {result?.success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4" /> Kandidat opprettet i RecMan
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Opprett kandidat
      </Button>
    </form>
  );
}
