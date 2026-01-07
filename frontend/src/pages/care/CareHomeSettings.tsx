import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function CareHomeSettings() {
  return (
    <DashboardLayout>
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-1">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">
              Einstellungen
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Einrichtungseinstellungen und Konfiguration
          </p>
        </div>

        {/* Placeholder Settings Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h2 className="font-display text-lg font-medium text-foreground mb-4">
            Einrichtungsprofil
          </h2>
          <p className="text-muted-foreground text-sm">
            Einstellungen für das Einrichtungsprofil werden hier angezeigt.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h2 className="font-display text-lg font-medium text-foreground mb-4">
            Benachrichtigungseinstellungen
          </h2>
          <p className="text-muted-foreground text-sm">
            Konfiguration für Mitarbeiter-Benachrichtigungen wird hier angezeigt.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h2 className="font-display text-lg font-medium text-foreground mb-4">
            Datenschutz & Compliance
          </h2>
          <p className="text-muted-foreground text-sm">
            Datenschutz- und Compliance-Einstellungen werden hier angezeigt.
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
