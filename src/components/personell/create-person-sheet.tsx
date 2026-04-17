"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { HardHat, User, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createPersonManual,
  type ActionState,
} from "@/app/(authenticated)/personell/ny/actions";

type Props = {
  defaultContractor?: boolean;
  triggerLabel?: string;
};

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  error?: string[];
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-xs font-medium">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="h-9"
      />
      {error && error[0] && (
        <p className="text-xs text-destructive">{error[0]}</p>
      )}
    </div>
  );
}

export function CreatePersonSheet({
  defaultContractor = false,
  triggerLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isContractor, setIsContractor] = useState(defaultContractor);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createPersonManual,
    {}
  );
  const router = useRouter();

  useEffect(() => {
    setIsContractor(defaultContractor);
  }, [defaultContractor, open]);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  const label = triggerLabel ?? (defaultContractor ? "Ny innleid" : "Ny person");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        {label}
      </Button>

      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Opprett ny person</SheetTitle>
          <SheetDescription>
            Fyll ut informasjonen. Personen blir lagt til både i personelloversikten
            og kandidatbasen. Recman-synk oppdaterer neste morgen.
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="space-y-6 py-4 px-4">
          {/* Role toggle */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Type
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsContractor(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all",
                  !isContractor
                    ? "border-[oklch(0.89_0.17_178)] bg-[oklch(0.89_0.17_178_/_5%)] ring-1 ring-[oklch(0.89_0.17_178_/_30%)]"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <User
                  className={cn(
                    "h-4 w-4 shrink-0",
                    !isContractor
                      ? "text-[oklch(0.45_0.14_178)]"
                      : "text-muted-foreground"
                  )}
                />
                <span className="text-sm font-medium">Ansatt</span>
              </button>
              <button
                type="button"
                onClick={() => setIsContractor(true)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all",
                  isContractor
                    ? "border-[oklch(0.89_0.17_178)] bg-[oklch(0.89_0.17_178_/_5%)] ring-1 ring-[oklch(0.89_0.17_178_/_30%)]"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <HardHat
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isContractor
                      ? "text-[oklch(0.45_0.14_178)]"
                      : "text-muted-foreground"
                  )}
                />
                <span className="text-sm font-medium">Innleid</span>
              </button>
            </div>
            <input
              type="hidden"
              name="isContractor"
              value={isContractor ? "true" : "false"}
            />
          </div>

          {/* Basis */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Basis
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Fornavn *"
                name="firstName"
                placeholder="Ola"
                error={state.errors?.firstName}
              />
              <Field
                label="Etternavn *"
                name="lastName"
                placeholder="Nordmann"
                error={state.errors?.lastName}
              />
              <Field
                label="E-post"
                name="email"
                type="email"
                placeholder="ola@eksempel.no"
                error={state.errors?.email}
              />
              <Field label="Mobil" name="mobilePhone" placeholder="+47 ..." />
              <Field label="Telefon" name="phone" placeholder="+47 ..." />
              <Field
                label="Stillingstittel"
                name="title"
                placeholder="F.eks. Dekksarbeider"
              />
            </div>
          </section>

          {/* Bedrift hvis innleid */}
          {isContractor && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Innleid til
              </h3>
              <Field
                label="Bedrift"
                name="company"
                placeholder="Kunde/bedrift de er leid inn til"
              />
            </section>
          )}

          {/* Adresse */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Adresse
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Gateadresse" name="address" />
              <Field label="Postnr" name="postalCode" />
              <Field label="Poststed" name="postalPlace" />
              <Field label="By" name="city" />
              <Field label="Land" name="country" placeholder="Norge" />
              <Field label="Nasjonalitet" name="nationality" />
            </div>
          </section>

          {/* Personlig */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Personlig
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="gender" className="text-xs font-medium">
                  Kjønn
                </Label>
                <select
                  id="gender"
                  name="gender"
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
                  defaultValue=""
                >
                  <option value="">Ikke oppgitt</option>
                  <option value="male">Mann</option>
                  <option value="female">Kvinne</option>
                  <option value="other">Annet</option>
                </select>
              </div>
              <Field label="Fødselsdato" name="dob" type="date" />
              <Field
                label="Rating (0–5)"
                name="rating"
                type="number"
                placeholder="0"
              />
              <Field
                label="LinkedIn"
                name="linkedIn"
                placeholder="https://..."
                error={state.errors?.linkedIn}
              />
            </div>
          </section>

          {/* Kompetanse */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kompetanse
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Skriv komma-separert, f.eks. <em>Mekaniker, Elektriker</em>
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="skills" className="text-xs font-medium">
                  Skills
                </Label>
                <Textarea
                  id="skills"
                  name="skills"
                  rows={2}
                  placeholder="F.eks. Sveising, Hydraulikk, Elektro"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="courses" className="text-xs font-medium">
                  Kurs/sertifiseringer
                </Label>
                <Textarea
                  id="courses"
                  name="courses"
                  rows={2}
                  placeholder="F.eks. Offshore G4, Fallsikring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label
                    htmlFor="driversLicense"
                    className="text-xs font-medium"
                  >
                    Førerkort
                  </Label>
                  <Input
                    id="driversLicense"
                    name="driversLicense"
                    placeholder="B, C1, CE"
                    className="h-9"
                  />
                </div>
                <Field
                  label="Språk"
                  name="languages"
                  placeholder="Norsk, Engelsk"
                />
              </div>
            </div>
          </section>

          {state.message && !state.success && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <SheetFooter className="flex flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Oppretter...
                </>
              ) : (
                `Opprett ${isContractor ? "innleid" : "ansatt"}`
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
