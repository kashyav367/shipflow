import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { requireAuth } from "@/features/auth/actions";
import { FeatureNavigationTabs } from "@/features/dashboard/components/feature-navigation-tabs";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";

interface FeatureLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function FeatureLayout({ children, params }: FeatureLayoutProps) {
  await requireAuth();
  const { id } = await params;

  const feature = await prisma.featureRequest.findUnique({
    where: { id },
  });

  if (!feature) {
    notFound();
  }

  // Helper to render readable status label
  const getStatusLabel = (status: string) => {
    return status.replace("_", " ").toUpperCase();
  };

  const getStatusColor = (status: string) => {
    if (status === "shipped") return "bg-green-500/10 text-green-500 border-green-500/20";
    if (status === "ready_to_ship") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (status === "clarifying") return "bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-background">
      {/* Sticky layout header */}
      <DashboardHeader
        title={feature.title}
        description={`Status: ${getStatusLabel(feature.status)}`}
      />

      {/* Segment navigation tabs */}
      <FeatureNavigationTabs id={id} status={feature.status} />

      {/* Tab page content container */}
      <div className="flex-1 w-full bg-background/50">
        {children}
      </div>
    </div>
  );
}
