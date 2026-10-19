import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileStack,
  Plus,
  Clock3,
  Upload,
} from "lucide-react";
import { getDashboardData } from "@/lib/data/queries";
import { PageHeader } from "@/components/layout/page-header";
import { ModeBanner } from "@/components/layout/mode-banner";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RecentBookings } from "@/components/dashboard/recent-bookings";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { mode, metrics, recentBookings, activity } = await getDashboardData();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Operational overview of bookings waiting for review and issues that need attention."
        actions={
          <>
            <Button asChild>
              <Link href="/intake">
                <Upload aria-hidden="true" />
                Start intake
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/bookings/new">
                <Plus aria-hidden="true" />
                New booking
              </Link>
            </Button>
          </>
        }
      />
      <ModeBanner mode={mode} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total bookings"
          value={metrics.totalBookings}
          icon={FileStack}
        />
        <MetricCard
          label="Pending review"
          value={metrics.pendingReview}
          icon={Clock3}
          tone="warning"
          hint="Awaiting operator approval"
        />
        <MetricCard
          label="Open exceptions"
          value={metrics.openExceptions}
          icon={AlertTriangle}
          tone={metrics.openExceptions > 0 ? "warning" : "neutral"}
          hint={metrics.openExceptions > 0 ? "Blocks approval until resolved" : "Nothing blocking"}
        />
        <MetricCard
          label="Approved"
          value={metrics.approved}
          icon={CheckCircle2}
          tone="success"
          hint={`${metrics.archived} archived`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Recent bookings</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/bookings">View all</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <RecentBookings bookings={recentBookings} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <ActivityFeed activity={activity} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
