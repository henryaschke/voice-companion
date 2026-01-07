import { motion } from "framer-motion";
import { HelpCircle, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoodState, moodStateConfig } from "@/types/mood";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AggregatedMoodBarometerProps {
  moodDistribution: {
    state: MoodState;
    count: number;
    percentage: number;
  }[];
  overallTrend: "stable" | "improving" | "declining";
  totalResidents: number;
}

const trendConfig = {
  stable: { icon: Minus, label: "Stabil", className: "text-muted-foreground" },
  improving: { icon: TrendingUp, label: "Verbessert", className: "text-status-positive" },
  declining: { icon: TrendingDown, label: "Rückläufig", className: "text-status-warning" },
};

export function AggregatedMoodBarometer({ 
  moodDistribution, 
  overallTrend, 
  totalResidents 
}: AggregatedMoodBarometerProps) {
  const TrendIcon = trendConfig[overallTrend].icon;

  // Get the dominant mood (highest percentage)
  const dominantMood = moodDistribution.reduce((prev, current) => 
    (prev.percentage > current.percentage) ? prev : current
  );
  const dominantConfig = moodStateConfig[dominantMood.state];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="bg-card rounded-xl border border-border p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-display text-lg font-medium text-foreground">
            Stimmungsbarometer
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregierte Einschätzung aller Bewohner
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <HelpCircle className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-sm">
              Stimmung wird aus Gesprächsmerkmalen abgeleitet und dient als Hinweis, nicht als Diagnose.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Overall State */}
      <div className={cn(
        "rounded-lg p-4 mb-5 border",
        dominantConfig.bgClass,
        dominantConfig.borderClass
      )}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{dominantConfig.emoji}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-lg font-semibold", dominantConfig.colorClass)}>
                Überwiegend {dominantConfig.label.toLowerCase()}
              </span>
              <div className={cn("flex items-center gap-1 text-sm", trendConfig[overallTrend].className)}>
                <TrendIcon className="w-4 h-4" />
                <span>{trendConfig[overallTrend].label}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Wöchentlicher Trend über {totalResidents} Bewohner
            </p>
          </div>
        </div>
      </div>

      {/* Distribution Bar */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Verteilung diese Woche
        </p>
        <div className="flex rounded-lg overflow-hidden h-8 border border-border">
          {moodDistribution.map((mood, index) => {
            const config = moodStateConfig[mood.state];
            return mood.percentage > 0 ? (
              <Tooltip key={mood.state}>
                <TooltipTrigger asChild>
                  <div 
                    className={cn(
                      "flex items-center justify-center transition-all",
                      config.bgClass,
                      index > 0 && "border-l border-border"
                    )}
                    style={{ width: `${mood.percentage}%` }}
                  >
                    {mood.percentage >= 15 && (
                      <span className="text-sm">{config.emoji}</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{config.label}: {mood.count} Bewohner ({mood.percentage}%)</p>
                </TooltipContent>
              </Tooltip>
            ) : null;
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {moodDistribution.filter(m => m.count > 0).map((mood) => {
          const config = moodStateConfig[mood.state];
          return (
            <div 
              key={mood.state}
              className="flex items-center gap-2 text-sm"
            >
              <span>{config.emoji}</span>
              <span className="text-muted-foreground">
                {config.labelShort}: {mood.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 pt-4 border-t border-border">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Stimmung wird aus Gesprächsmerkmalen abgeleitet und dient als Hinweis, nicht als Diagnose. 
          Bei individuellen Auffälligkeiten prüfen Sie bitte die Bewohnerdetails.
        </p>
      </div>
    </motion.div>
  );
}
