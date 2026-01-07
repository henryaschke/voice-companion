import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Home,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Info,
  FileText,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { patients } from "@/data/doctorMockData";
import { cn } from "@/lib/utils";
import { TrendDirection } from "@/types/doctor";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const trendIcons: Record<TrendDirection, { icon: React.ElementType; label: string }> = {
  up: { icon: TrendingUp, label: "↑" },
  stable: { icon: Minus, label: "→" },
  down: { icon: TrendingDown, label: "↓" },
};

export default function PatientSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const patient = patients.find((p) => p.id === id);

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Patient:in nicht gefunden.</p>
          <Button variant="outline" onClick={() => navigate("/doctor/patients")} className="mt-4">
            Zurück zur Übersicht
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-4xl space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/doctor/patients")}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Button>

        {/* Context Framing */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-muted/30 border border-border rounded-lg p-4"
        >
          <p className="text-sm text-muted-foreground">
            Diese Übersicht dient ausschließlich der Vorbereitung auf den Termin 
            und stellt keine laufende Überwachung dar.
          </p>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {patient.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              {patient.age} Jahre · {patient.livingSituation}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Letzter Termin: {format(patient.lastDoctorVisit, "d. MMMM yyyy", { locale: de })}</p>
          </div>
        </motion.div>

        {/* DOMINANT: Kurzüberblick für das Gespräch */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border-2 border-border rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-foreground" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Kurzüberblick für das Gespräch
            </h2>
            <span className="text-sm text-muted-foreground">
              ({patient.coveragePeriod.label})
            </span>
          </div>

          <ul className="space-y-3">
            {patient.briefingPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-muted-foreground mt-1 text-lg leading-none">•</span>
                <span className="text-base text-foreground leading-relaxed">
                  {point.text}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Snapshot - Secondary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="bg-muted/20 border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs">Alter</span>
            </div>
            <p className="text-sm font-medium text-foreground">{patient.age} Jahre</p>
          </div>

          <div className="bg-muted/20 border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Home className="w-3.5 h-3.5" />
              <span className="text-xs">Wohnsituation</span>
            </div>
            <p className="text-sm font-medium text-foreground">{patient.livingSituation}</p>
          </div>

          <div className="bg-muted/20 border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">Beobachtungszeitraum</span>
            </div>
            <p className="text-sm font-medium text-foreground">{patient.coveragePeriod.days} Tage</p>
          </div>
        </motion.div>

        {/* Details zur Einordnung (optional) - Collapsed by default */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-between py-2">
                <span>Details zur Einordnung (optional)</span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    detailsOpen && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 bg-muted/20 border border-border rounded-lg p-5">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Signalkategorien
                </h3>

                <div className="space-y-2">
                  {patient.signalCategories.map((signal) => {
                    const TrendIcon = trendIcons[signal.direction].icon;
                    const isChanged = signal.status === "veraendert";

                    return (
                      <div
                        key={signal.category}
                        className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {signal.category}
                          </span>
                          <span
                            className={cn(
                              "text-xs",
                              isChanged ? "text-foreground" : "text-muted-foreground/70"
                            )}
                          >
                            {isChanged ? "Verändert" : "Stabil"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground/70">
                            {signal.timeframe}
                          </span>
                          <TrendIcon
                            className={cn(
                              "w-3.5 h-3.5",
                              signal.direction === "up" && "text-muted-foreground",
                              signal.direction === "down" && "text-muted-foreground",
                              signal.direction === "stable" && "text-muted-foreground/50"
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>

        {/* Explanation (Progressive Disclosure) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Collapsible open={explanationOpen} onOpenChange={setExplanationOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                <Info className="w-3.5 h-3.5" />
                <span>Wie entstehen diese Hinweise?</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    explanationOpen && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 p-4 rounded-lg bg-muted/20 border border-border">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Die Hinweise basieren auf wiederkehrenden Mustern in Gesprächen und dienen 
                  ausschließlich der Vorbereitung auf das Gespräch. Sie sind nicht diagnostisch, 
                  nicht vollständig und ersetzen keine klinische Beurteilung.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>

        {/* Footer - Trust Framing */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center pt-4 border-t border-border/50"
        >
          <p className="text-xs text-muted-foreground/60">
            KI-generierte Zusammenfassung · Ergänzender Kontext für den Termin · Keine Diagnose
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
