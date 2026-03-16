import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getProjectById } from "@/lib/queries/projects";
import { ProjectDetail } from "@/components/prosjekter/project-detail";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  return <ProjectDetail project={project} />;
}
