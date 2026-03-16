"use client";

import { useState, useActionState } from "react";
import {
  createEstimate,
  uploadAndParseWorkPackage,
  type ActionState,
} from "@/app/(authenticated)/estimering/ny/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, FileText, Loader2 } from "lucide-react";

type RateProfile = {
  id: string;
  name: string;
  description: string | null;
  rates: { roleCode: string; roleName: string; hourlyRateNOK: number }[];
};

export function NewEstimateForm({
  rateProfiles,
}: {
  rateProfiles: RateProfile[];
}) {
  const [mode, setMode] = useState<"manual" | "upload">("upload");

  const [manualState, manualAction, manualPending] = useActionState<
    ActionState,
    FormData
  >(createEstimate, {});

  const [uploadState, uploadAction, uploadPending] = useActionState<
    ActionState,
    FormData
  >(uploadAndParseWorkPackage, {});

  const state = mode === "upload" ? uploadState : manualState;
  const isPending = mode === "upload" ? uploadPending : manualPending;

  return (
    <div className="space-y-6">
      {/* Mode-velger */}
      <div className="flex gap-2">
        <Button
          variant={mode === "upload" ? "default" : "outline"}
          onClick={() => setMode("upload")}
          type="button"
        >
          <Upload className="mr-2 h-4 w-4" />
          Last opp arbeidspakke
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
          type="button"
        >
          <FileText className="mr-2 h-4 w-4" />
          Manuelt estimat
        </Button>
      </div>

      {mode === "upload" ? (
        <Card>
          <CardHeader>
            <CardTitle>Last opp arbeidspakke</CardTitle>
            <CardDescription>
              Last opp en .docx-fil. AI-agenten analyserer dokumentet og trekker
              ut kabler, utstyr og arbeidsomfang automatisk. Du kan verifisere
              og justere alle verdier etterpå.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={uploadAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Estimatnavn *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="f.eks. U-LIGHT UPGRADE DSS 2024"
                  required
                />
                {state.errors?.name && (
                  <p className="text-sm text-destructive">
                    {state.errors.name[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rateProfileId">Rateprofil</Label>
                <Select name="rateProfileId">
                  <SelectTrigger>
                    <SelectValue placeholder="Velg rateprofil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rateProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Arbeidspakke (.docx) *</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  required
                />
                {state.errors?.file && (
                  <p className="text-sm text-destructive">
                    {state.errors.file[0]}
                  </p>
                )}
              </div>

              {state.message && (
                <p className="text-sm text-destructive">{state.message}</p>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyserer med AI...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Last opp og analyser
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Manuelt estimat</CardTitle>
            <CardDescription>
              Opprett et tomt estimat og fyll inn data manuelt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={manualAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name-manual">Navn *</Label>
                <Input
                  id="name-manual"
                  name="name"
                  placeholder="f.eks. U-LIGHT UPGRADE DSS 2024"
                  required
                />
                {state.errors?.name && (
                  <p className="text-sm text-destructive">
                    {state.errors.name[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectNumber-manual">Prosjektnummer</Label>
                <Input
                  id="projectNumber-manual"
                  name="projectNumber"
                  placeholder="f.eks. 500653"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description-manual">Beskrivelse</Label>
                <Textarea
                  id="description-manual"
                  name="description"
                  placeholder="Kort beskrivelse av arbeidet..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rateProfileId-manual">Rateprofil</Label>
                <Select name="rateProfileId">
                  <SelectTrigger>
                    <SelectValue placeholder="Velg rateprofil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rateProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {state.message && (
                <p className="text-sm text-destructive">{state.message}</p>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Oppretter..." : "Opprett estimat"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
