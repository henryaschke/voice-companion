import { motion } from "framer-motion";
import { Shield, HelpCircle, Eye, Share2, ShoppingBag } from "lucide-react";
import { ConsentSettings } from "@/types/dashboard";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConsentSectionProps {
  settings: ConsentSettings;
}

export function ConsentSection({ settings }: ConsentSectionProps) {
  const consentItems = [
    {
      id: "conversationAnalysis",
      icon: Eye,
      label: "Gesprächsanalyse",
      description: "Die KI analysiert Gespräche, um Stimmung und wichtige Themen zu erkennen.",
      tooltip: "Ermöglicht wöchentliche Zusammenfassungen, Stimmungstrends und automatische Hinweise. Ohne diese Einstellung erhalten Sie nur grundlegende Anrufinformationen.",
      defaultChecked: settings.conversationAnalysis,
    },
    {
      id: "insightSharing",
      icon: Share2,
      label: "Einblicke teilen",
      description: "Zusammenfassungen und Hinweise werden mit Ihnen als Angehörige geteilt.",
      tooltip: "Wenn deaktiviert, werden Gesprächsinhalte nicht mit Angehörigen geteilt. Die Person selbst kann weiterhin mit der KI sprechen.",
      defaultChecked: settings.insightSharing,
    },
    {
      id: "serviceExecution",
      icon: ShoppingBag,
      label: "Dienste ausführen",
      description: "Die KI kann Bestellungen (Essen, Taxi, etc.) im Auftrag koordinieren.",
      tooltip: "Ermöglicht der KI, während Gesprächen angeforderte Dienste zu arrangieren. Bestellungen werden Ihnen zur Bestätigung angezeigt.",
      defaultChecked: settings.serviceExecution,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="bg-card rounded-2xl border border-border p-6 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
          <Shield className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Datenschutz & Einwilligung
          </h2>
          <p className="text-sm text-muted-foreground">
            Kontrollieren Sie, wie die KI Gespräche verarbeitet
          </p>
        </div>
      </div>

      <div className="space-y-1">
        {consentItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between py-4 border-b border-border last:border-0"
          >
            <div className="flex items-start gap-3 flex-1 mr-4">
              <item.icon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm">{item.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
            <Switch defaultChecked={item.defaultChecked} />
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-muted/50 rounded-xl">
        <p className="text-xs text-muted-foreground">
          Sie können diese Einstellungen jederzeit ändern. Alle Daten werden gemäß DSGVO verarbeitet und auf Servern in Deutschland gespeichert.
        </p>
      </div>
    </motion.div>
  );
}
