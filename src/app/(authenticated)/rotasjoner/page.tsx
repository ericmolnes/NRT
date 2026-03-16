import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllRotationPatterns } from "@/lib/queries/rotations";
import { RotationPatternList } from "@/components/rotasjoner/rotation-pattern-list";

export default async function RotasjonerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const patterns = await getAllRotationPatterns();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Rotasjonsmønstre</h1>
        <p className="text-sm text-muted-foreground">
          Definer arbeidsmønstre for offshore/onshore-rotasjoner
        </p>
      </div>

      <RotationPatternList patterns={patterns} />
    </div>
  );
}
