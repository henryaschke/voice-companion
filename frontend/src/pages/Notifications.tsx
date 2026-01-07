import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { detailedNotifications } from "@/data/mockData";
import { DetailedNotification } from "@/types/dashboard";
import {
  Eye,
  MessageCircle,
  Lightbulb,
  ChevronDown,
  Bell,
  Heart,
  CheckCheck,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const typeConfig = {
  hinweis: {
    label: "Hinweis",
    bgClass: "bg-muted/50",
    textClass: "text-muted-foreground",
  },
  beobachtung: {
    label: "Beobachtung",
    bgClass: "bg-accent/40",
    textClass: "text-accent-foreground",
  },
  dringend: {
    label: "Dringend",
    bgClass: "bg-primary/10",
    textClass: "text-primary",
  },
};

function NotificationCard({ notification }: { notification: DetailedNotification }) {
  const [expanded, setExpanded] = useState(false);
  const config = typeConfig[notification.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card rounded-2xl border border-border overflow-hidden transition-all",
        !notification.read && "ring-1 ring-primary/20"
      )}
    >
      {/* Collapsed Header - Always Visible */}
      <div className="p-5 lg:p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Type Badge */}
            <div className="flex items-center gap-2 mb-3">
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs font-normal border-0",
                  config.bgClass,
                  config.textClass
                )}
              >
                {config.label}
              </Badge>
              {!notification.read && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>

            {/* Title */}
            <h3 className="font-display text-base lg:text-lg font-medium text-foreground mb-1">
              {notification.title}
            </h3>

            {/* Light Context */}
            <p className="text-sm text-muted-foreground">
              {notification.description}
            </p>

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground/70 mt-3">
              {format(notification.timestamp, "EEEE, d. MMMM", { locale: de })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            )}
          >
            <Eye className="w-4 h-4" />
            <span>{expanded ? "Weniger anzeigen" : "Details ansehen"}</span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              expanded && "rotate-180"
            )} />
          </button>
          {!notification.read && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                // Handle mark as read
              }}
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Als gelesen markieren</span>
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Content - Progressive Disclosure */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 lg:px-6 pb-6 pt-0 space-y-6 border-t border-border/50">
              {/* Conversation Excerpts */}
              {notification.sourceConversations.length > 0 && (
                <div className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Aus den Gesprächen
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {notification.sourceConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="bg-muted/30 rounded-xl p-4"
                      >
                        <p className="text-sm text-foreground/90 italic leading-relaxed">
                          „{conv.excerpt}"
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(conv.date, "d. MMMM", { locale: de })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Reasoning - Soft Language */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Warum sehen Sie das?
                  </h4>
                </div>
                <div className="bg-accent/30 rounded-xl p-4">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {notification.reasoning}
                  </p>
                </div>
              </div>

              {/* Suggested Actions - Optional, Not Urgent */}
              {notification.suggestedActions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Mögliche Ideen
                  </h4>
                  <ul className="space-y-2">
                    {notification.suggestedActions.map((action, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40 mt-2 shrink-0" />
                        <span className="text-sm text-foreground/80">{action}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-4 italic">
                    Diese Vorschläge sind optional – Sie entscheiden, was für Sie passt.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const Notifications = () => {
  const unreadCount = detailedNotifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout>
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">
                Benachrichtigungen
              </h1>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                  {unreadCount} neu
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" className="gap-2 shrink-0">
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Alle als gelesen markieren</span>
                <span className="sm:hidden">Als gelesen markieren</span>
              </Button>
            )}
          </div>
        </div>

        {/* Global Reassurance Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-accent/20 rounded-2xl p-5 lg:p-6 mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-accent-foreground/70" />
            </div>
            <div>
              <p className="text-sm lg:text-base text-foreground/90 leading-relaxed">
                Hinweise bedeuten nicht, dass etwas falsch läuft. Sie helfen dabei, 
                kleine Veränderungen früh wahrzunehmen – ganz ohne Druck.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Notifications List */}
        <div className="space-y-4">
          {detailedNotifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
            >
              <NotificationCard notification={notification} />
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {detailedNotifications.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h2 className="font-display text-lg font-medium text-foreground mb-2">
              Keine neuen Hinweise
            </h2>
            <p className="text-muted-foreground text-sm">
              Alles ist ruhig – wir melden uns, wenn es etwas gibt.
            </p>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
