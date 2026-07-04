import { requireAuth } from "@/features/auth/actions";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Monitor · Dashboard",
};

export default async function MonitorPage() {
  const session = await requireAuth();

  if (session.user.email !== process.env.OWNER_EMAIL) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        You do not have access to this monitoring page.
      </div>
    );
  }

  const events = await prisma.auditEvent.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <DashboardHeader
        title="Monitor"
        description="Your personal activity log and account usage overview."
      />
      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            This view shows your own sign-ins and important actions taken within the app.
          </p>
        </div>

        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No activity recorded yet.
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{event.action}</p>
                    {event.details ? <p className="text-xs text-muted-foreground">{event.details}</p> : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{new Date(event.createdAt).toLocaleString()}</p>
                    {event.ipAddress ? <p>{event.ipAddress}</p> : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
