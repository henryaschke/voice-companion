import { motion } from "framer-motion";
import { HelpCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoodBarometerData, MoodState, moodStateConfig } from "@/types/mood";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MoodBarometerProps {
  data: MoodBarometerData;
  variant?: "family" | "care";
}

const moodOrder: MoodState[] = ["sehr_gut", "gut", "neutral", "belastet", "sorgenfallig"];

const trendConfig = {
  stable: { icon: Minus, label: "Stabil", className: "text-muted-foreground" },
  improving: { icon: TrendingUp, label: "Verbessert", className: "text-status-positive" },
  declining: { icon: TrendingDown, label: "Rückläufig", className: "text-status-warning" },
};

export function MoodBarometer({ data, variant = "family" }: MoodBarometerProps) {
  const currentMood = moodStateConfig[data.currentState];
  const TrendIcon = trendConfig[data.trend].icon;
  const isFamily = variant === "family";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={cn(
        "rounded-2xl border p-6 shadow-sm",
        isFamily 
          ? "bg-card border-border" 
          : "bg-card border-border"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Stimmungsbarometer
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isFamily 
              ? "Wie geht es Ihrer Angehörigen diese Woche?" 
              : "Übersicht der emotionalen Lage"}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-1">
              <HelpCircle className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-sm">
              {isFamily 
                ? "Diese Einschätzung basiert auf Gesprächsdauer, Wortwahl und Sprechverhalten der letzten Tage. Sie ersetzt keine medizinische Beurteilung."
                : "Stimmung wird aus Gesprächsmerkmalen abgeleitet und dient als Hinweis, nicht als Diagnose."}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Current State Display */}
      <div className={cn(
        "rounded-xl p-5 mb-6",
        currentMood.bgClass,
        "border",
        currentMood.borderClass
      )}>
        <div className="flex items-center gap-4">
          <span className="text-4xl" role="img" aria-label={currentMood.label}>
            {currentMood.emoji}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-xl font-semibold", currentMood.colorClass)}>
                {currentMood.label}
              </span>
              <div className={cn("flex items-center gap-1 text-sm", trendConfig[data.trend].className)}>
                <TrendIcon className="w-4 h-4" />
                <span>{trendConfig[data.trend].label}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isFamily 
                ? `Diese Woche überwiegend ${currentMood.label.toLowerCase()}`
                : currentMood.description}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Barometer Scale */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          {moodOrder.map((state) => {
            const config = moodStateConfig[state];
            const isActive = state === data.currentState;
            return (
              <Tooltip key={state}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                      isActive 
                        ? cn(config.bgClass, config.borderClass, "border-2 scale-110") 
                        : "opacity-40 hover:opacity-70"
                    )}
                  >
                    <span className="text-xl">{config.emoji}</span>
                    <span className={cn(
                      "text-[10px] font-medium hidden sm:block",
                      isActive ? config.colorClass : "text-muted-foreground"
                    )}>
                      {config.labelShort}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{config.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        
        {/* Gradient bar indicator */}
        <div className="relative h-2 rounded-full bg-gradient-to-r from-status-positive via-status-warning/60 to-destructive/80 overflow-hidden">
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-card border-2 border-foreground rounded-full shadow-md"
            initial={{ left: "50%" }}
            animate={{ 
              left: `${(moodOrder.indexOf(data.currentState) / (moodOrder.length - 1)) * 100}%` 
            }}
            style={{ transform: "translate(-50%, -50%)" }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          />
        </div>
      </div>

      {/* Weekly Overview with Icons */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Wochenübersicht
        </p>
        <div className="flex justify-between">
          {data.weeklyOverview.map((day, index) => {
            const dayMood = moodStateConfig[day.state];
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      {day.day}
                    </span>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      dayMood.bgClass,
                      "border",
                      dayMood.borderClass
                    )}>
                      <span className="text-base">{dayMood.emoji}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{day.day}: {dayMood.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Explanatory Microcopy */}
      <p className="text-xs text-muted-foreground mt-5 pt-4 border-t border-border">
        {isFamily 
          ? "Diese Einschätzung basiert auf Gesprächsdauer, Wortwahl und Sprechverhalten der letzten Tage."
          : "Stimmung wird aus Gesprächsmerkmalen abgeleitet und dient als Hinweis, nicht als Diagnose."}
      </p>
    </motion.div>
  );
}
