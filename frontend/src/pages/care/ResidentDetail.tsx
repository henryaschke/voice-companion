import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
  ArrowLeft,
  Clock,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Phone,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { residents, residentConversations } from "@/data/careHomeMockData";
import { cn } from "@/lib/utils";
import { AttentionStatus, TrendIndicator } from "@/types/careHome";
import { SteckbriefSection } from "@/components/careHome/SteckbriefSection";

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
    className: "bg-primary/15 text-primary",
  },
};

const trendConfig: Record<TrendIndicator, { icon: React.ElementType; label: string; className: string }> = {
  up: { icon: TrendingUp, label: "Aufwärtstrend", className: "text-status-positive" },
  stable: { icon: Minus, label: "Stabil", className: "text-muted-foreground" },
  down: { icon: TrendingDown, label: "Abwärtstrend", className: "text-primary" },
};

const engagementLabels = {
  high: "Hohes Engagement",
  normal: "Normales Engagement",
  reduced: "Reduziertes Engagement",
};

export default function ResidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const resident = residents.find((r) => r.id === id);
  const conversations = residentConversations[id || ""] || [];

  if (!resident) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Bewohner nicht gefunden.</p>
          <Button variant="outline" onClick={() => navigate("/care/residents")} className="mt-4">
            Zurück zur Übersicht
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const status = statusConfig[resident.attentionStatus];
  const trend = trendConfig[resident.trend];
  const TrendIcon = trend.icon;

  return (
    <DashboardLayout>
      <div className="w-full max-w-4xl space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/care/residents")}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground">
                {resident.name}
              </h1>
              <p className="text-muted-foreground mt-1">{resident.room}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className={cn("px-3 py-1.5 rounded-full text-sm font-medium", status.className)}>
                {status.label}
              </span>
              <div className={cn("flex items-center gap-1.5", trend.className)}>
                <TrendIcon className="w-4 h-4" />
                <span className="text-sm">{trend.label}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Steckbrief Section - Collapsed by default */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <SteckbriefSection steckbrief={resident.steckbrief} />
        </motion.div>

        {/* Attention Reason Summary - only for beobachtung/bitte_pruefen */}
        {resident.attentionReasons && resident.attentionReasons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-muted/40 border border-border rounded-xl p-4"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Grund für Aufmerksamkeit
            </p>
            <p className="text-sm text-foreground">
              {resident.attentionReasons.map((reason, index) => {
                const text = reason.detail 
                  ? `${reason.signal} (${reason.detail})`
                  : reason.signal;
                return index === 0 ? text : ` + ${text.toLowerCase()}`;
              }).join('')}
            </p>
          </motion.div>
        )}

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">Gespräche gesamt</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {resident.conversationCount}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Letztes Gespräch</span>
              </div>
              <p className="text-lg font-medium text-foreground">
                {formatDistanceToNow(resident.lastConversation, { addSuffix: true, locale: de })}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Phone className="w-4 h-4" />
                <span className="text-sm">Verpasste Gespräche</span>
              </div>
              <p className={cn("text-2xl font-semibold", resident.missedConversations > 0 ? "text-primary" : "text-foreground")}>
                {resident.missedConversations}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Verkürzte Gespräche</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {resident.shortenedConversations}
              </p>
            </div>
          </div>

          {/* Reassurance note */}
          <p className="text-xs text-muted-foreground/70 text-center">
            Diese Angaben dienen der Orientierung und erfordern nicht automatisch ein Handeln.
          </p>
        </motion.div>

        {/* Repeated Themes with time context */}
        {resident.repeatedThemes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h2 className="font-display text-lg font-medium text-foreground mb-4">
              Wiederkehrende Themen
            </h2>
            <div className="flex flex-wrap gap-2">
              {resident.repeatedThemes.map((themeItem) => (
                <div
                  key={themeItem.theme}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm"
                >
                  <span className="font-medium">{themeItem.theme}</span>
                  <span className="text-xs text-muted-foreground">
                    · {themeItem.timeContext}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Conversation Summaries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h2 className="font-display text-lg font-medium text-foreground mb-4">
            Letzte Gespräche
          </h2>

          {conversations.length > 0 ? (
            <div className="space-y-4">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {format(conv.date, "EEEE, d. MMMM", { locale: de })} • {conv.duration} Min.
                    </span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        conv.engagement === "high"
                          ? "bg-secondary text-secondary-foreground"
                          : conv.engagement === "reduced"
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {engagementLabels[conv.engagement]}
                    </span>
                  </div>
                  <p className="text-foreground">{conv.summary}</p>
                  {conv.themes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {conv.themes.map((theme) => (
                        <span
                          key={theme}
                          className="text-xs px-2 py-0.5 rounded bg-background text-muted-foreground"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Noch keine Gesprächszusammenfassungen verfügbar.
            </p>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
