import { motion } from "framer-motion";
import { WeeklyInsight } from "@/types/dashboard";
import { Sparkles, CheckCircle, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WeeklyInsightsProps {
  insights: WeeklyInsight[];
}

const moodConfig = {
  positiv: {
    bg: "bg-status-positive/5",
    border: "border-status-positive/20",
    icon: "text-status-positive",
  },
  neutral: {
    bg: "bg-secondary",
    border: "border-border",
    icon: "text-muted-foreground",
  },
  besorgt: {
    bg: "bg-status-warning/5",
    border: "border-status-warning/20",
    icon: "text-status-warning",
  },
};

export function WeeklyInsights({ insights }: WeeklyInsightsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-card rounded-2xl border border-border p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              Wöchentliche Zusammenfassung
            </h3>
            <p className="text-sm text-muted-foreground">
              KI-generierte Einblicke
            </p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Warum sehe ich das?</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-sm">
              Diese Zusammenfassungen werden automatisch aus den Gesprächen erstellt. 
              Sie helfen Ihnen, ohne jedes Gespräch zu hören, zu verstehen, wie es Ihrem Angehörigen geht.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-6">
        {insights.map((insight, index) => {
          const mood = moodConfig[insight.mood];
          return (
            <div
              key={insight.id}
              className={cn(
                "p-5 rounded-xl border",
                mood.bg,
                mood.border
              )}
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {insight.week}
              </p>
              <p className="text-foreground leading-relaxed mb-4">
                {insight.summary}
              </p>

              {insight.highlights.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Positive Momente
                  </p>
                  <ul className="space-y-1.5">
                    {insight.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-status-positive mt-0.5 flex-shrink-0" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {insight.concerns.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Zum Beobachten
                  </p>
                  <ul className="space-y-1.5">
                    {insight.concerns.map((concern, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <AlertCircle className="w-4 h-4 text-status-warning mt-0.5 flex-shrink-0" />
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
