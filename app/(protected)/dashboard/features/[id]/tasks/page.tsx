import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { requireAuth } from "@/features/auth/actions";
import { KanbanBoard } from "@/features/dashboard/components/kanban-board";

interface TasksPageProps {
  params: Promise<{ id: string }>;
}

export default async function FeatureTasksPage({ params }: TasksPageProps) {
  await requireAuth();
  const { id } = await params;
  
  const feature = await prisma.featureRequest.findUnique({
    where: { id },
    include: { tasks: true, prd: true },
  });

  if (!feature) notFound();

  // Safely serialize tasks for client serialization
  const serializedTasks = feature.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    createdAt: t.createdAt,
  }));

  return (
    <KanbanBoard
      featureId={id}
      featureTitle={feature.title}
      featureStatus={feature.status}
      initialTasks={serializedTasks}
      prdContent={feature.prd?.content || null}
    />
  );
}
