import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, MessageCircle, Bell, ChevronDown, Info } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { residents } from "@/data/careHomeMockData";
import { cn } from "@/lib/utils";
import { Resident, FamilySharingSettings } from "@/types/careHome";

interface ResidentSharingCardProps {
  resident: Resident;
  onUpdate: (id: string, settings: FamilySharingSettings) => void;
}

function ResidentSharingCard({ resident, onUpdate }: ResidentSharingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [settings, setSettings] = useState(resident.familySharing);

  const handleToggle = (key: keyof FamilySharingSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onUpdate(resident.id, newSettings);
  };

  const sharingEnabled = settings.conversationSummaries || settings.notifications;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-foreground">{resident.name}</h3>
          <span className="text-sm text-muted-foreground">{resident.room}</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className={cn(
              sharingEnabled ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {sharingEnabled ? "Freigabe aktiv" : "Keine Freigabe"}
          </Badge>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-border"
        >
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Legen Sie fest, welche Informationen mit Angehörigen geteilt werden.
            </p>

            {/* Conversation Summaries */}
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Gesprächszusammenfassungen</p>
                  <p className="text-xs text-muted-foreground">
                    Kurze Zusammenfassungen der Gespräche teilen
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.conversationSummaries}
                onCheckedChange={(checked) => handleToggle("conversationSummaries", checked)}
              />
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/50 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Benachrichtigungen</p>
                  <p className="text-xs text-muted-foreground">
                    Hinweise und Beobachtungen mit Angehörigen teilen
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => handleToggle("notifications", checked)}
              />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function FamilySharing() {
  const [residentSettings, setResidentSettings] = useState(
    residents.reduce((acc, r) => ({ ...acc, [r.id]: r.familySharing }), {} as Record<string, FamilySharingSettings>)
  );

  const handleUpdate = (id: string, settings: FamilySharingSettings) => {
    setResidentSettings((prev) => ({ ...prev, [id]: settings }));
  };

  const sharingStats = {
    total: residents.length,
    withSharing: Object.values(residentSettings).filter(
      (s) => s.conversationSummaries || s.notifications
    ).length,
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-1">
            <Share2 className="w-6 h-6 text-primary" />
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">
              Familienfreigaben
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie, welche Informationen mit den Angehörigen jedes Bewohners geteilt werden.
          </p>
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-secondary/30 border border-secondary rounded-xl p-4 flex gap-3"
        >
          <Info className="w-5 h-5 text-secondary-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground">
              Diese Einstellungen steuern nur, was im Familienportal sichtbar ist.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Angehörige sehen keine Rohdaten oder detaillierten Gesprächsprotokolle – nur kurze Zusammenfassungen und allgemeine Hinweise.
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Bewohner mit aktiver Freigabe</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {sharingStats.withSharing} von {sharingStats.total}
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <span className="text-lg font-semibold text-foreground">
                {Math.round((sharingStats.withSharing / sharingStats.total) * 100)}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Resident List */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-medium text-foreground">
            Bewohner-Freigaben
          </h2>
          {residents.map((resident) => (
            <ResidentSharingCard
              key={resident.id}
              resident={resident}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
