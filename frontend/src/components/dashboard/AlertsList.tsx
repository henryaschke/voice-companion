import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Alert } from "@/types/dashboard";
import { Bell, Heart, AlertTriangle, PhoneMissed, HelpCircle, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AlertsListProps {
  alerts: Alert[];
}

const alertConfig = {
  positive: {
    icon: Heart,
    bg: "bg-status-positive/10",
    iconColor: "text-status-positive",
  },
  concern: {
    icon: AlertTriangle,
    bg: "bg-status-warning/10",
    iconColor: "text-status-warning",
  },
  missed_call: {
    icon: PhoneMissed,
    bg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  low_engagement: {
    icon: Bell,
    bg: "bg-status-warning/10",
    iconColor: "text-status-warning",
  },
};

export function AlertsList({ alerts }: AlertsListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="bg-card rounded-2xl border border-border p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              Benachrichtigungen
            </h3>
            <p className="text-sm text-muted-foreground">
              Wichtige Hinweise
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">
                Diese Hinweise werden von der KI erstellt, wenn sie Muster in den Gesprächen erkennt – z.B. wiederkehrende Themen oder Stimmungsänderungen.
              </p>
            </TooltipContent>
          </Tooltip>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
            {alerts.filter((a) => !a.read).length} neu
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;
          const timeAgo = formatDistanceToNow(alert.timestamp, {
            addSuffix: true,
            locale: de,
          });

          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl border transition-colors",
                alert.read
                  ? "bg-muted/30 border-transparent"
                  : "bg-card border-border hover:border-primary/20"
              )}
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.bg)}>
                <Icon className={cn("w-5 h-5", config.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn(
                    "font-medium text-foreground",
                    alert.read && "text-muted-foreground"
                  )}>
                    {alert.title}
                  </p>
                  {!alert.read && (
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {alert.description}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  {timeAgo}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Link to full notifications page */}
      <Link
        to="/notifications"
        className="flex items-center justify-center gap-2 mt-4 py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <span>Alle Benachrichtigungen anzeigen</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}
