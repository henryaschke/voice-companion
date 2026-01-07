import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PatientCard } from "@/components/doctor/PatientCard";
import { patients } from "@/data/doctorMockData";

export default function PatientsList() {
  const navigate = useNavigate();

  // Sort: veraenderungen first, then keine_veraenderungen
  const sortedPatients = [...patients].sort((a, b) => {
    const priority = { veraenderungen: 0, keine_veraenderungen: 1 };
    return priority[a.changeStatus] - priority[b.changeStatus];
  });

  const patientsWithChanges = patients.filter((p) => p.changeStatus === "veraenderungen").length;

  return (
    <DashboardLayout>
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Termin-Briefings
            </h1>
          </div>
          <p className="text-muted-foreground">
            Kurzübersichten für anstehende Termine
          </p>
        </motion.div>

        {/* Context Framing */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-muted/30 border border-border rounded-lg p-4"
        >
          <p className="text-sm text-muted-foreground">
            Diese Übersichten dienen ausschließlich der Vorbereitung auf den Termin 
            und stellen keine laufende Überwachung dar.
          </p>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-4 text-sm text-muted-foreground"
        >
          <span>{patients.length} Patient:innen</span>
          <span className="text-border">·</span>
          <span>
            {patientsWithChanges > 0 
              ? `${patientsWithChanges} mit Veränderungen seit letztem Termin`
              : "Keine relevanten Veränderungen"
            }
          </span>
        </motion.div>

        {/* Patient List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          {sortedPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onClick={() => navigate(`/doctor/patients/${patient.id}`)}
            />
          ))}
        </motion.div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-xs text-muted-foreground/60 text-center pt-4"
        >
          KI-generierte Zusammenfassungen · Ergänzender Kontext für den Termin
        </motion.p>
      </div>
    </DashboardLayout>
  );
}
