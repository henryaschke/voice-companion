import { motion } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Patient, ChangeStatus } from "@/types/doctor";

interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
}

const statusConfig: Record<ChangeStatus, { label: string; className: string }> = {
  keine_veraenderungen: {
    label: "Keine relevanten Veränderungen",
    className: "text-muted-foreground",
  },
  veraenderungen: {
    label: "Veränderungen seit letztem Termin",
    className: "text-foreground",
  },
};

export function PatientCard({ patient, onClick }: PatientCardProps) {
  const status = statusConfig[patient.changeStatus];
  const hasChanges = patient.changeStatus === "veraenderungen";

  const lastVisitText = format(patient.lastDoctorVisit, "d. MMM yyyy", { locale: de });

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      className={cn(
        "w-full text-left p-4 rounded-xl bg-card border border-border",
        "hover:border-border/80 hover:shadow-sm transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-display text-base font-medium text-foreground truncate">
              {patient.name}
            </h3>
            {hasChanges && (
              <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            Letzter Termin: {lastVisitText} · {patient.coveragePeriod.label}
          </p>

          <p className={cn("text-sm", status.className)}>
            {status.label}
          </p>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0 mt-1" />
      </div>
    </motion.button>
  );
}
