// Qualitative mood types - no numeric values
export type MoodState = "sehr_gut" | "gut" | "neutral" | "belastet" | "sorgenfallig";

export interface MoodBarometerData {
  currentState: MoodState;
  weeklyOverview: {
    day: string;
    state: MoodState;
  }[];
  trend: "stable" | "improving" | "declining";
  lastUpdated: Date;
}

export interface ActivityMetrics {
  totalCalls: number;
  totalMinutes: number;
  averageDuration: number;
  callsThisWeek: number;
  weeklyChange: number; // percentage
}

export const moodStateConfig: Record<MoodState, {
  emoji: string;
  label: string;
  labelShort: string;
  description: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}> = {
  sehr_gut: {
    emoji: "😊",
    label: "Sehr gut",
    labelShort: "Sehr gut",
    description: "Fröhlich und aufgeschlossen",
    colorClass: "text-status-positive",
    bgClass: "bg-status-positive/10",
    borderClass: "border-status-positive/30",
  },
  gut: {
    emoji: "🙂",
    label: "Gut",
    labelShort: "Gut",
    description: "Ausgeglichen und zufrieden",
    colorClass: "text-status-positive",
    bgClass: "bg-status-positive/5",
    borderClass: "border-status-positive/20",
  },
  neutral: {
    emoji: "😐",
    label: "Neutral",
    labelShort: "Neutral",
    description: "Keine auffälligen Veränderungen",
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted/50",
    borderClass: "border-border",
  },
  belastet: {
    emoji: "😟",
    label: "Belastet",
    labelShort: "Belastet",
    description: "Zeigt Anzeichen von Unruhe",
    colorClass: "text-status-warning",
    bgClass: "bg-status-warning/10",
    borderClass: "border-status-warning/30",
  },
  sorgenfallig: {
    emoji: "😞",
    label: "Sorgenfällig",
    labelShort: "Sorgenfällig",
    description: "Auffällige Veränderungen erkannt",
    colorClass: "text-destructive",
    bgClass: "bg-destructive/10",
    borderClass: "border-destructive/30",
  },
};
