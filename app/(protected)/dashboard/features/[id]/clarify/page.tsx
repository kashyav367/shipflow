import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { requireAuth } from "@/features/auth/actions";
import { ClarificationChat } from "@/features/dashboard/components/clarification-chat";

interface ClarifyPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClarifyFeaturePage({ params }: ClarifyPageProps) {
  await requireAuth();
  const { id } = await params;
  
  const feature = await prisma.featureRequest.findUnique({
    where: { id },
    include: { clarifications: true },
  });

  if (!feature) notFound();

  // Format clarifications for client serialization
  const serializedClarifications = feature.clarifications.map((c) => ({
    id: c.id,
    question: c.question,
    answer: c.answer,
    createdAt: c.createdAt,
  }));

  return (
    <ClarificationChat
      featureId={id}
      featureTitle={feature.title}
      initialStatus={feature.status}
      initialClarifications={serializedClarifications}
    />
  );
}
