import { motion } from "framer-motion";
import { LovedOne } from "@/types/dashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface ProfileCardProps {
  lovedOne: LovedOne;
}

const statusConfig = {
  gut: {
    label: "Geht es gut",
    className: "bg-status-positive/10 text-status-positive border-status-positive/20",
  },
  besorgt: {
    label: "Aufmerksamkeit nötig",
    className: "bg-status-warning/10 text-status-warning-foreground border-status-warning/20",
  },
  neutral: {
    label: "Stabil",
    className: "bg-status-neutral/10 text-status-neutral border-status-neutral/20",
  },
};

export function ProfileCard({ lovedOne }: ProfileCardProps) {
  const status = statusConfig[lovedOne.status];
  const lastCallAgo = formatDistanceToNow(lovedOne.lastCallTime, {
    addSuffix: true,
    locale: de,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card rounded-2xl border border-border p-6 shadow-sm"
    >
      <div className="flex items-start gap-5">
        <Avatar className="w-20 h-20 border-4 border-primary/10">
          <AvatarImage src={lovedOne.photo} alt={lovedOne.name} />
          <AvatarFallback className="text-xl font-display bg-primary/10 text-primary">
            {lovedOne.name.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                {lovedOne.name}
              </h2>
              <p className="text-muted-foreground">{lovedOne.age} Jahre</p>
            </div>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>Letzter Anruf: {lastCallAgo}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                Bevorzugte Zeit: {lovedOne.preferences.preferredTime} Uhr
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
