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
  createPersonnel,
  type ActionState,
} from "@/app/(authenticated)/personell/ny/actions";

export function PersonnelForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createPersonnel,
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nytt personell</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="name">Navn *</Label>
              <Input id="name" name="name" placeholder="Fullt navn" required />
              {state.errors?.name && (
                <p className="text-sm text-destructive">
                  {state.errors.name[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">Rolle *</Label>
              <Input
                id="role"
                name="role"
                placeholder="F.eks. Dekksarbeider"
                required
              />
              {state.errors?.role && (
                <p className="text-sm text-destructive">
                  {state.errors.role[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="navn@eksempel.no"
              />
              {state.errors?.email && (
                <p className="text-sm text-destructive">
                  {state.errors.email[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" placeholder="+47 ..." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="department">Avdeling</Label>
              <Input
                id="department"
                name="department"
                placeholder="F.eks. Drift"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rig">Rigg</Label>
              <Input id="rig" name="rig" placeholder="F.eks. Rig 1" />
            </div>
          </div>

          {state.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Oppretter..." : "Opprett personell"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
