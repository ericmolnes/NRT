import { Button } from "@/components/ui/button";
import { PersonnelForm } from "@/components/personell/personnel-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewPersonnelPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href="/personell" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nytt personell</h1>
          <p className="text-muted-foreground">
            Fyll ut skjemaet for å registrere nytt personell.
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <PersonnelForm />
      </div>
    </div>
  );
}
