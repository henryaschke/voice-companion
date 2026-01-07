import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { MoodBarometer } from "@/components/dashboard/MoodBarometer";
import { ActivityMetrics } from "@/components/dashboard/ActivityMetrics";
import { WeeklyInsights } from "@/components/dashboard/WeeklyInsights";
import { AlertsList } from "@/components/dashboard/AlertsList";
import {
  lovedOne,
  callStats,
  moodBarometerData,
  activityMetricsData,
  weeklyInsights,
  alerts,
} from "@/data/mockData";

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="w-full space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            Guten Tag, Familie Schmidt
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Hier sehen Sie, wie es Ihrer Mutter geht.
          </p>
        </div>

        {/* Profile Card */}
        <ProfileCard lovedOne={lovedOne} />

        {/* Stats Grid */}
        <StatsGrid stats={callStats} />

        {/* Mood & Activity Section - Clearly Separated */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Qualitative: Mood Barometer */}
          <MoodBarometer data={moodBarometerData} variant="family" />

          {/* Quantitative: Activity Metrics */}
          <ActivityMetrics data={activityMetricsData} variant="family" />
        </div>

        {/* Alerts */}
        <AlertsList alerts={alerts} />

        {/* Weekly Insights */}
        <WeeklyInsights insights={weeklyInsights} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
