import { Patient } from "@/types/doctor";

export const patients: Patient[] = [
  {
    id: "1",
    name: "Hildegard Müller",
    age: 78,
    livingSituation: "Pflegeeinrichtung",
    lastAIInteraction: new Date(Date.now() - 2 * 60 * 60 * 1000),
    lastDoctorVisit: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    changeStatus: "keine_veraenderungen",
    coveragePeriod: {
      days: 30,
      label: "Letzte 30 Tage",
    },
    briefingPoints: [
      { text: "Keine relevanten Veränderungen im Beobachtungszeitraum" },
    ],
    signalCategories: [
      { category: "Schlaf", status: "stabil", direction: "stable", timeframe: "seit 4 Wochen" },
      { category: "Stimmung / Affekt", status: "stabil", direction: "stable", timeframe: "seit 4 Wochen" },
      { category: "Gesprächsengagement", status: "stabil", direction: "up", timeframe: "seit 2 Wochen" },
      { category: "Medikamenten-Erwähnungen", status: "stabil", direction: "stable", timeframe: "seit 4 Wochen" },
    ],
  },
  {
    id: "2",
    name: "Werner Schmidt",
    age: 82,
    livingSituation: "Zuhause mit Partnerin",
    lastAIInteraction: new Date(Date.now() - 4 * 60 * 60 * 1000),
    lastDoctorVisit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    changeStatus: "veraenderungen",
    coveragePeriod: {
      days: 30,
      label: "Letzte 30 Tage",
    },
    briefingPoints: [
      { text: "Schlafprobleme wurden häufiger erwähnt" },
      { text: "Gesprächsengagement leicht reduziert" },
    ],
    signalCategories: [
      { category: "Schlaf", status: "veraendert", direction: "down", timeframe: "seit 3 Wochen" },
      { category: "Stimmung / Affekt", status: "stabil", direction: "stable", timeframe: "seit 4 Wochen" },
      { category: "Gesprächsengagement", status: "veraendert", direction: "down", timeframe: "seit 2 Wochen" },
      { category: "Medikamenten-Erwähnungen", status: "stabil", direction: "stable", timeframe: "seit 4 Wochen" },
    ],
  },
  {
    id: "3",
    name: "Ingrid Fischer",
    age: 75,
    livingSituation: "Pflegeeinrichtung",
    lastAIInteraction: new Date(Date.now() - 24 * 60 * 60 * 1000),
    lastDoctorVisit: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    changeStatus: "veraenderungen",
    coveragePeriod: {
      days: 30,
      label: "Letzte 30 Tage",
    },
    briefingPoints: [
      { text: "Unruhe wurde wiederholt erwähnt" },
      { text: "Medikamenteneinnahme uneinheitlich erwähnt" },
      { text: "Gesprächsengagement deutlich reduziert" },
      { text: "Schlafbezogene Themen häufiger genannt" },
    ],
    signalCategories: [
      { category: "Schlaf", status: "veraendert", direction: "down", timeframe: "seit 2 Wochen" },
      { category: "Stimmung / Affekt", status: "veraendert", direction: "down", timeframe: "seit 3 Wochen" },
      { category: "Gesprächsengagement", status: "veraendert", direction: "down", timeframe: "seit 4 Wochen" },
      { category: "Medikamenten-Erwähnungen", status: "veraendert", direction: "down", timeframe: "seit 2 Wochen" },
    ],
  },
  {
    id: "4",
    name: "Hans Becker",
    age: 80,
    livingSituation: "Zuhause allein",
    lastAIInteraction: new Date(Date.now() - 1 * 60 * 60 * 1000),
    lastDoctorVisit: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    changeStatus: "keine_veraenderungen",
    coveragePeriod: {
      days: 14,
      label: "Letzte 14 Tage",
    },
    briefingPoints: [
      { text: "Keine relevanten Veränderungen im Beobachtungszeitraum" },
    ],
    signalCategories: [
      { category: "Schlaf", status: "stabil", direction: "stable", timeframe: "seit 2 Wochen" },
      { category: "Stimmung / Affekt", status: "stabil", direction: "up", timeframe: "seit 1 Woche" },
      { category: "Gesprächsengagement", status: "stabil", direction: "up", timeframe: "seit 2 Wochen" },
      { category: "Medikamenten-Erwähnungen", status: "stabil", direction: "stable", timeframe: "seit 2 Wochen" },
    ],
  },
  {
    id: "5",
    name: "Ursula Weber",
    age: 71,
    livingSituation: "Betreutes Wohnen",
    lastAIInteraction: new Date(Date.now() - 6 * 60 * 60 * 1000),
    lastDoctorVisit: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    changeStatus: "veraenderungen",
    coveragePeriod: {
      days: 21,
      label: "Letzte 21 Tage",
    },
    briefingPoints: [
      { text: "Appetit wurde mehrfach thematisiert" },
      { text: "Müdigkeit gelegentlich erwähnt" },
    ],
    signalCategories: [
      { category: "Schlaf", status: "stabil", direction: "stable", timeframe: "seit 3 Wochen" },
      { category: "Stimmung / Affekt", status: "stabil", direction: "stable", timeframe: "seit 3 Wochen" },
      { category: "Gesprächsengagement", status: "stabil", direction: "stable", timeframe: "seit 3 Wochen" },
      { category: "Medikamenten-Erwähnungen", status: "stabil", direction: "stable", timeframe: "seit 3 Wochen" },
    ],
  },
];
