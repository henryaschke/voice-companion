import { motion } from "framer-motion";
import { Settings, FileText, Bell } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function DoctorSettings() {
  return (
    <DashboardLayout>
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Einstellungen
          </h1>
          <p className="text-muted-foreground mt-1">
            Präferenzen für das Ärzt:innen-Portal
          </p>
        </motion.div>

        {/* Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6 space-y-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-medium text-foreground">
              Anzeigeeinstellungen
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Kompakte Ansicht</Label>
                <p className="text-xs text-muted-foreground">
                  Zeigt weniger Details in der Übersicht
                </p>
              </div>
              <Switch defaultChecked={false} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Nur Veränderungen anzeigen</Label>
                <p className="text-xs text-muted-foreground">
                  Filtert stabile Patient:innen aus der Liste
                </p>
              </div>
              <Switch defaultChecked={false} />
            </div>
          </div>
        </motion.div>

        {/* Export Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6 space-y-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-medium text-foreground">
              Export (in Vorbereitung)
            </h2>
          </div>

          <p className="text-sm text-muted-foreground">
            PDF-Export von Zusammenfassungen wird in einer zukünftigen Version verfügbar sein.
          </p>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-6 space-y-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-medium text-foreground">
              Benachrichtigungen (in Vorbereitung)
            </h2>
          </div>

          <p className="text-sm text-muted-foreground">
            Benachrichtigungen bei signifikanten Veränderungen werden in einer zukünftigen Version verfügbar sein.
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
