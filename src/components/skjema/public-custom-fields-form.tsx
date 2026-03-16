"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  submitPublicCustomFields,
  type PublicActionState,
} from "@/app/(public)/s/[token]/actions";
import { CheckCircle2 } from "lucide-react";

interface Personnel {
  id: string;
  name: string;
  role: string;
}

interface Field {
  id: string;
  name: string;
  type: string;
  options: string | null;
  required: boolean;
}

interface Category {
  id: string;
  name: string;
  fields: Field[];
}

interface PublicCustomFieldsFormProps {
  token: string;
  personnel: Personnel[];
  lockedPersonnelId: string | null;
  category: Category;
}

export function PublicCustomFieldsForm({
  token,
  personnel,
  lockedPersonnelId,
  category,
}: PublicCustomFieldsFormProps) {
  const [state, formAction, isPending] = useActionState<
    PublicActionState,
    FormData
  >(submitPublicCustomFields, {});

  if (state.success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold">Takk!</h2>
            <p className="text-muted-foreground">Dataene er registrert.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fyll ut {category.name.toLowerCase()}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Felt merket med * er påkrevd.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-2">
            <Label htmlFor="submitterName">Ditt navn *</Label>
            <Input
              id="submitterName"
              name="submitterName"
              placeholder="Fullt navn"
              required
            />
            {state.errors?.submitterName && (
              <p className="text-sm text-destructive">
                {state.errors.submitterName[0]}
              </p>
            )}
          </div>

          {lockedPersonnelId ? (
            <input
              type="hidden"
              name="personnelId"
              value={lockedPersonnelId}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="personnelId">Hvem gjelder dette? *</Label>
              <select
                id="personnelId"
                name="personnelId"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Velg personell...
                </option>
                {personnel.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.role}
                  </option>
                ))}
              </select>
              {state.errors?.personnelId && (
                <p className="text-sm text-destructive">
                  {state.errors.personnelId[0]}
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            {category.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <input type="hidden" name="fieldId" value={field.id} />
                <Label htmlFor={`field_${field.id}`}>
                  {field.name}
                  {field.required && " *"}
                </Label>
                {field.type === "SELECT" && field.options ? (
                  <select
                    id={`field_${field.id}`}
                    name={`field_${field.id}`}
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                    defaultValue=""
                    required={field.required}
                  >
                    <option value="">Velg...</option>
                    {field.options.split(",").map((opt) => (
                      <option key={opt.trim()} value={opt.trim()}>
                        {opt.trim()}
                      </option>
                    ))}
                  </select>
                ) : field.type === "TEXTAREA" ? (
                  <textarea
                    id={`field_${field.id}`}
                    name={`field_${field.id}`}
                    className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                    required={field.required}
                  />
                ) : field.type === "BOOLEAN" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`field_${field.id}`}
                      name={`field_${field.id}`}
                      value="true"
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label
                      htmlFor={`field_${field.id}`}
                      className="text-sm font-normal"
                    >
                      Ja
                    </Label>
                  </div>
                ) : (
                  <Input
                    id={`field_${field.id}`}
                    name={`field_${field.id}`}
                    type={
                      field.type === "NUMBER"
                        ? "number"
                        : field.type === "DATE"
                          ? "date"
                          : "text"
                    }
                    required={field.required}
                  />
                )}
                {state.errors?.[field.id] && (
                  <p className="text-sm text-destructive">
                    {state.errors[field.id]![0]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {state.message && !state.success && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Sender..." : "Send inn"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
