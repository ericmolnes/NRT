import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SkillsOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Kompetanseoversikt
        </h1>
        <p className="text-muted-foreground">
          Denne siden er under utvikling.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Kompetanseoversikt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Kompetanseoversikten vil vise en samlet oversikt over ferdigheter og
            kompetanse for alle kandidater og ansatte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
