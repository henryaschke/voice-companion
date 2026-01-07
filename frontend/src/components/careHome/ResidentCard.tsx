import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Resident, AttentionStatus, TrendIndicator } from "@/types/careHome";

interface ResidentCardProps {
  resident: Resident;
  onClick: () => void;
}

const statusConfig: Record<AttentionStatus, { label: string; className: string }> = {
  keine_auffaelligkeiten: {
    label: "Keine Auffälligkeiten",
    className: "bg-secondary text-secondary-foreground",
  },
  beobachtung: {
    label: "Beobachtung",
    className: "bg-accent text-accent-foreground",
  },
  bitte_pruefen: {
    label: "Bitte prüfen",
    className: "bg-primary/15 text-primary border border-primary/20",
  },
};

const trendIcons: Record<TrendIndicator, { icon: React.ElementType; className: string }> = {
  up: { icon: TrendingUp, className: "text-status-positive" },
  stable: { icon: Minus, className: "text-muted-foreground" },
  down: { icon: TrendingDown, className: "text-primary" },
};

function getReasonSignal(resident: Resident): string | null {
  if (resident.attentionStatus === "keine_auffaelligkeiten") return null;
  
  const reasons = resident.attentionReasons;
  if (!reasons || reasons.length === 0) return null;
  
  const firstReason = reasons[0];
  if (firstReason.detail) {
    return `${firstReason.signal}: ${firstReason.detail}`;
  }
  return firstReason.signal;
}

export function ResidentCard({ resident, onClick }: ResidentCardProps) {
  const status = statusConfig[resident.attentionStatus];
  const trend = trendIcons[resident.trend];
  const TrendIcon = trend.icon;
  const reasonSignal = getReasonSignal(resident);

  const lastConversationText = formatDistanceToNow(resident.lastConversation, {
    addSuffix: true,
    locale: de,
  });

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "w-full text-left p-4 rounded-xl bg-card border border-border",
        "hover:border-primary/20 hover:shadow-sm transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-display text-base font-medium text-foreground truncate">
              {resident.name}
            </h3>
            <div className={cn("flex items-center gap-1", trend.className)}>
              <TrendIcon className="w-4 h-4" />
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-3">
            {resident.room} • Letztes Gespräch {lastConversationText}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                status.className
              )}
            >
              {status.label}
            </span>
            {reasonSignal && (
              <span className="text-xs text-muted-foreground italic">
                {reasonSignal}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
      </div>
    </motion.button>
  );
}
