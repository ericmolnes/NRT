import { isAdmin } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Settings } from "lucide-react";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">Platform administration.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/normer">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Normer og arbeidstidssatser
              </CardTitle>
              <CardDescription>
                Administrer arbeidsnormer, se statistikk fra utforte prosjekter,
                og oppdater satser basert pa historiske data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Klikk for a administrere normer
              </p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Generelle innstillinger
            </CardTitle>
            <CardDescription>
              Platform-innstillinger og brukertilgang.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Kommer snart.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
