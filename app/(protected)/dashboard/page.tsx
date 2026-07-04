import { requireAuth } from "@/features/auth/actions";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { getOverviewData } from "@/features/overview/server/get-overview";
import { OverviewDashboard } from "@/features/overview/components/overview-dashboard";

export const metadata = {
  title: "Overview · Dashboard",
};

export default async function DashboardPage() {
  const session = await requireAuth();
  const overviewData = await getOverviewData(session.user.id);

  return (
    <>
      <DashboardHeader 
        title="Overview" 
        description="Workspace summary and recent integration activity." 
      />
      <OverviewDashboard overview={overviewData} />
    </>
  );
}
