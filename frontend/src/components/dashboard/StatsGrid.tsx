import { motion } from "framer-motion";
import { CallStats } from "@/types/dashboard";
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, PhoneMissed, TrendingUp } from "lucide-react";

interface StatsGridProps {
  stats: CallStats;
}

const statItems = [
  {
    key: "totalCalls",
    label: "Anrufe gesamt",
    icon: Phone,
    suffix: "diese Woche",
    format: (v: number) => v.toString(),
  },
  {
    key: "inboundCalls",
    label: "Eingehend",
    icon: PhoneIncoming,
    suffix: "von ihr",
    format: (v: number) => v.toString(),
  },
  {
    key: "outboundCalls",
    label: "Ausgehend",
    icon: PhoneOutgoing,
    suffix: "geplant",
    format: (v: number) => v.toString(),
  },
  {
    key: "avgDuration",
    label: "Ø Dauer",
    icon: Clock,
    suffix: "Minuten",
    format: (v: number) => v.toString(),
  },
] as const;

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        const value = stats[item.key];

        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="bg-card rounded-xl border border-border p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-display font-semibold text-foreground">
              {item.format(value)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {item.label} <span className="text-xs opacity-70">· {item.suffix}</span>
            </p>
          </motion.div>
        );
      })}

      {/* Trend indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="col-span-2 lg:col-span-4 bg-secondary/50 rounded-xl border border-border p-4 flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-lg bg-status-positive/10 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-status-positive" />
        </div>
        <p className="text-sm text-foreground">
          <span className="font-medium text-status-positive">+{stats.lastWeekChange}%</span>{" "}
          mehr Gesprächszeit als letzte Woche
        </p>
      </motion.div>
    </div>
  );
}
