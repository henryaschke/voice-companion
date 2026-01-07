import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  MessageCircle,
  Phone,
  BarChart3,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AggregatedMoodBarometer } from "@/components/careHome/AggregatedMoodBarometer";
import { aggregatedInsights, residents, aggregatedMoodData } from "@/data/careHomeMockData";
import { cn } from "@/lib/utils";
import { TrendIndicator } from "@/types/careHome";

const trendIcons: Record<TrendIndicator, { icon: React.ElementType; className: string }> = {
  up: { icon: TrendingUp, className: "text-status-positive" },
  stable: { icon: Minus, className: "text-muted-foreground" },
  down: { icon: TrendingDown, className: "text-primary" },
};

export default function CareHomeInsights() {
  const { 
    residentsWithReducedEngagement, 
    totalResidents, 
    commonThemesThisWeek,
    missedConversationsTotal,
    averageConversationDuration,
    trendingSentiments 
  } = aggregatedInsights;

  const engagementPercentage = Math.round(
    ((totalResidents - residentsWithReducedEngagement) / totalResidents) * 100
  );

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="mb-2">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">
            Einblicke
          </h1>
          <p className="text-muted-foreground mt-1">
            Aggregierte Übersicht über alle Bewohner dieser Woche
          </p>
        </div>

        {/* Quantitative Metrics Section */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Aktivität & Engagement (gemessen)
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Users className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Engagement-Rate</span>
              </div>
              <p className="text-3xl font-semibold text-foreground">{engagementPercentage}%</p>
              <p className="text-sm text-muted-foreground mt-1">
                {totalResidents - residentsWithReducedEngagement} von {totalResidents} aktiv
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-accent-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Ø Gesprächsdauer</span>
              </div>
              <p className="text-3xl font-semibold text-foreground">{averageConversationDuration}</p>
              <p className="text-sm text-muted-foreground mt-1">Minuten pro Gespräch</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Verpasste Gespräche</span>
              </div>
              <p className={cn("text-3xl font-semibold", missedConversationsTotal > 0 ? "text-primary" : "text-foreground")}>
                {missedConversationsTotal}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Diese Woche gesamt</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Unter Beobachtung</span>
              </div>
              <p className="text-3xl font-semibold text-foreground">
                {residents.filter((r) => r.attentionStatus !== "keine_auffaelligkeiten").length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Bewohner benötigen Aufmerksamkeit</p>
            </div>
          </motion.div>
        </div>

        {/* Qualitative Mood Section */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Stimmung (abgeleitet)
          </h2>
          <AggregatedMoodBarometer 
            moodDistribution={aggregatedMoodData.moodDistribution}
            overallTrend={aggregatedMoodData.overallTrend}
            totalResidents={totalResidents}
          />
        </div>

        {/* Common Themes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h2 className="font-display text-lg font-medium text-foreground mb-4">
            Häufige Themen diese Woche
          </h2>
          <div className="space-y-3">
            {commonThemesThisWeek.map((theme, index) => {
              const maxCount = Math.max(...commonThemesThisWeek.map((t) => t.count));
              const percentage = (theme.count / maxCount) * 100;

              return (
                <div key={theme.theme} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{theme.theme}</span>
                    <span className="text-sm text-muted-foreground">
                      {theme.count} Erwähnungen
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.2 + index * 0.05, duration: 0.5 }}
                      className="h-full bg-primary/60 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Behavioral Trends - Renamed from "Trending Sentiments" */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h2 className="font-display text-lg font-medium text-foreground mb-2">
            Verhaltens-Tendenzen
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Abgeleitete Signale aus den Gesprächsmustern
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {trendingSentiments.map((sentiment) => {
              const trend = trendIcons[sentiment.direction];
              const TrendIcon = trend.icon;

              return (
                <div
                  key={sentiment.sentiment}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <span className="text-sm font-medium text-foreground">
                    {sentiment.sentiment}
                  </span>
                  <div className={cn("flex items-center gap-1.5", trend.className)}>
                    <TrendIcon className="w-4 h-4" />
                    <span className="text-sm">
                      {sentiment.direction === "up"
                        ? "Steigend"
                        : sentiment.direction === "down"
                        ? "Sinkend"
                        : "Stabil"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-muted/30 border border-border rounded-xl p-4"
        >
          <p className="text-sm text-muted-foreground text-center">
            Diese Einblicke helfen bei der Einschätzung von Entwicklungen – nicht bei der Bewertung einzelner Bewohner.
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
