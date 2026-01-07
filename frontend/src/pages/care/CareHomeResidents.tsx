import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, AlertCircle, Eye, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ResidentCard } from "@/components/careHome/ResidentCard";
import { residents, aggregatedInsights } from "@/data/careHomeMockData";
import { cn } from "@/lib/utils";
import { AttentionStatus } from "@/types/careHome";

type FilterType = "all" | AttentionStatus;

const filterConfig: { id: FilterType; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "bitte_pruefen", label: "Bitte prüfen" },
  { id: "beobachtung", label: "Beobachtung" },
  { id: "keine_auffaelligkeiten", label: "Keine Auffälligkeiten" },
];

export default function CareHomeResidents() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredResidents =
    filter === "all"
      ? residents
      : residents.filter((r) => r.attentionStatus === filter);

  // Sort by attention priority
  const sortedResidents = [...filteredResidents].sort((a, b) => {
    const priority: Record<AttentionStatus, number> = {
      bitte_pruefen: 0,
      beobachtung: 1,
      keine_auffaelligkeiten: 2,
    };
    return priority[a.attentionStatus] - priority[b.attentionStatus];
  });

  const stats = [
    {
      label: "Bewohner gesamt",
      value: aggregatedInsights.totalResidents,
      icon: Users,
    },
    {
      label: "Benötigen Aufmerksamkeit",
      value: residents.filter((r) => r.attentionStatus === "bitte_pruefen").length,
      icon: AlertCircle,
      highlight: true,
    },
    {
      label: "Unter Beobachtung",
      value: residents.filter((r) => r.attentionStatus === "beobachtung").length,
      icon: Eye,
    },
    {
      label: "Ø Gesprächsdauer",
      value: `${aggregatedInsights.averageConversationDuration} Min.`,
      icon: Clock,
    },
  ];

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="mb-2">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">
            Bewohnerübersicht
          </h1>
          <p className="text-muted-foreground mt-1">
            Aktualisiert für den aktuellen Dienst
          </p>
        </div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "p-4 rounded-xl border",
                stat.highlight
                  ? "bg-primary/5 border-primary/20"
                  : "bg-card border-border"
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <stat.icon
                  className={cn(
                    "w-5 h-5",
                    stat.highlight ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p
                className={cn(
                  "text-2xl font-semibold",
                  stat.highlight ? "text-primary" : "text-foreground"
                )}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filterConfig.map((f) => {
            const count =
              f.id === "all"
                ? residents.length
                : residents.filter((r) => r.attentionStatus === f.id).length;

            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  filter === f.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground hover:bg-muted"
                )}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Resident List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-3"
        >
          {sortedResidents.map((resident, index) => (
            <motion.div
              key={resident.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ResidentCard
                resident={resident}
                onClick={() => navigate(`/care/residents/${resident.id}`)}
              />
            </motion.div>
          ))}

          {sortedResidents.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Keine Bewohner in dieser Kategorie.
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
