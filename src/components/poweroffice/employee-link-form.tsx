"use client";

import { useActionState, useEffect, useState } from "react";
import {
  linkEmployeeToPersonnel,
  unlinkEmployee,
  type ActionState,
} from "@/app/(authenticated)/poweroffice/actions";
import { Button } from "@/components/ui/button";
import { Link2, Unlink } from "lucide-react";

export function EmployeeLinkForm({
  poEmployeeId,
  linked = false,
  personnelId,
}: {
  poEmployeeId: string;
  linked?: boolean;
  personnelId?: string;
}) {
  const [linkState, linkAction, linkPending] = useActionState<ActionState, FormData>(
    linkEmployeeToPersonnel,
    {}
  );
  const [unlinkState, unlinkAction, unlinkPending] = useActionState<ActionState, FormData>(
    unlinkEmployee,
    {}
  );

  const [personnelOptions, setPersonnelOptions] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    if (!linked) {
      fetch("/api/personell/list")
        .then((r) => r.json())
        .then(setPersonnelOptions)
        .catch(() => {});
    }
  }, [linked]);

  if (linked) {
    return (
      <form action={unlinkAction}>
        <input type="hidden" name="poEmployeeId" value={poEmployeeId} />
        <Button type="submit" variant="outline" size="sm" disabled={unlinkPending}>
          <Unlink className="mr-1 h-3 w-3" />
          {unlinkPending ? "Fjerner..." : "Fjern kobling"}
        </Button>
        {unlinkState.message && (
          <p className="mt-1 text-xs text-muted-foreground">{unlinkState.message}</p>
        )}
      </form>
    );
  }

  return (
    <form action={linkAction} className="flex items-end gap-3">
      <input type="hidden" name="poEmployeeId" value={poEmployeeId} />
      <div className="flex-1">
        <label className="text-sm text-muted-foreground">Velg personell</label>
        <select
          name="personnelId"
          defaultValue={personnelId ?? ""}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">— Velg —</option>
          {personnelOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" disabled={linkPending}>
        <Link2 className="mr-1 h-3 w-3" />
        {linkPending ? "Kobler..." : "Koble"}
      </Button>
      {linkState.message && (
        <p className="text-xs text-muted-foreground">{linkState.message}</p>
      )}
      {linkState.errors?.poEmployeeId && (
        <p className="text-xs text-destructive">{linkState.errors.poEmployeeId[0]}</p>
      )}
    </form>
  );
}
