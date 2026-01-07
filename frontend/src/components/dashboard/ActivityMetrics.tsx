import { motion } from "framer-motion";
import { Phone, Clock, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityMetrics as ActivityMetricsType } from "@/types/mood";

interface ActivityMetricsProps {
  data: ActivityMetricsType;
  variant?: "family" | "care";
}

export function ActivityMetrics({ data, variant = "family" }: ActivityMetricsProps) {
  const isFamily = variant === "family";
  const isPositiveChange = data.weeklyChange >= 0;

  const metrics = [
    {
      icon: Phone,
      label: "Gespräche diese Woche",
      value: data.callsThisWeek,
      unit: "",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Clock,
      label: "Gesprächsminuten",
      value: data.totalMinutes,
      unit: "min",
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      icon: BarChart3,
      label: "Ø Dauer pro Gespräch",
      value: data.averageDuration,
      unit: "min",
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="bg-card rounded-2xl border border-border p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Aktivität
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isFamily 
              ? "Gemessene Gesprächsdaten" 
              : "Quantitative Gesprächsmetriken"}
          </p>
        </div>
        
        {/* Weekly Trend Badge */}
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
          isPositiveChange 
            ? "bg-status-positive/10 text-status-positive" 
            : "bg-status-warning/10 text-status-warning"
        )}>
          {isPositiveChange ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{isPositiveChange ? "+" : ""}{data.weeklyChange}%</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
            className="text-center"
          >
            <div className={cn(
              "w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center",
              metric.bgColor
            )}>
              <metric.icon className={cn("w-5 h-5", metric.color)} />
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {metric.value}
              {metric.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{metric.unit}</span>}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metric.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Clarifying note */}
      <p className="text-xs text-muted-foreground mt-5 pt-4 border-t border-border">
        Diese Zahlen werden automatisch aus den Anrufdaten ermittelt.
      </p>
    </motion.div>
  );
}
