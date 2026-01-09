import {
  LovedOne,
  CallStats,
  SentimentData,
  WeeklyInsight,
  Alert,
  Conversation,
  ServiceOrder,
  PersonalContext,
  AddressAndServices,
  ConsentSettings,
  DetailedNotification,
} from "@/types/dashboard";
import { MoodBarometerData, ActivityMetrics } from "@/types/mood";

export const lovedOne: LovedOne = {
  id: "1",
  name: "Margarete Schmidt",
  age: 82,
  photo: "https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=200&h=200&fit=crop&crop=face",
  status: "gut",
  lastCallTime: new Date(Date.now() - 3600000 * 4), // 4 hours ago
  emergencyContact: {
    name: "Thomas Schmidt",
    phone: "+49 170 1234567",
    relation: "Sohn",
  },
  preferences: {
    callFrequency: "täglich",
    preferredTime: "10:00",
    language: "Deutsch",
  },
};

export const personalContext: PersonalContext = {
  description: "Margarete ist eine lebensfrohe und gesellige Frau, die in ihrer eigenen Wohnung in München lebt. Sie war 40 Jahre lang Grundschullehrerin und liebt es immer noch, Geschichten zu erzählen. Seit dem Tod ihres Mannes vor 3 Jahren lebt sie allein, ist aber sehr selbstständig. Sie hat einen ausgeprägten Sinn für Humor und mag es, wenn man sie nicht wie eine 'alte Frau' behandelt.",
  importantPeople: [
    { name: "Thomas", relationship: "Sohn (lebt in Berlin)" },
    { name: "Lisa", relationship: "Enkelin, 16 Jahre" },
    { name: "Helga", relationship: "Beste Freundin seit 50 Jahren" },
    { name: "Heinrich", relationship: "Verstorbener Ehemann" },
  ],
  interests: [
    "Gartenarbeit",
    "Backen (besonders Apfelkuchen)",
    "Kreuzworträtsel",
    "Klassische Musik",
    "Vogelbeobachtung",
  ],
  routines: [
    "Frühstück um 8:00 Uhr mit Kaffee und Zeitung",
    "Nachmittags oft im Garten",
    "Sonntags Telefonat mit Sohn Thomas",
    "Mittwochs besucht sie den Seniorentreff",
  ],
  preferredTopics: [
    "Familie und Enkelin",
    "Erinnerungen an ihre Zeit als Lehrerin",
    "Gartenarbeit und Pflanzen",
    "Kochen und Rezepte",
    "Aktuelle Ereignisse",
  ],
  sensitivities: [
    "Tod des Ehemanns – kann emotional sein, aber sie spricht gerne über ihn",
    "Thema Pflegeheim meiden – sie möchte unbedingt selbstständig bleiben",
  ],
};

export const addressAndServices: AddressAndServices = {
  homeAddress: {
    street: "Lindwurmstraße 42",
    city: "München",
    postalCode: "80337",
  },
  preferredPharmacy: {
    name: "Apotheke am Markt",
    address: "Marktplatz 5, 80331 München",
    phone: "+49 89 1234567",
  },
  doctorName: "Dr. med. Stefan Müller",
  mobilityNotes: "Wohnung im 2. Stock mit Aufzug. Nutzt einen Gehstock für längere Strecken. Bevorzugt Taxi bei schlechtem Wetter.",
};

export const consentSettings: ConsentSettings = {
  conversationAnalysis: true,
  insightSharing: true,
  serviceExecution: true,
};

export const callStats: CallStats = {
  totalCalls: 28,
  inboundCalls: 8,
  outboundCalls: 20,
  avgDuration: 12,
  missedCalls: 2,
  lastWeekChange: 15,
};

export const sentimentData: SentimentData[] = [
  { date: "Mo", sentiment: 75, activity: 80 },
  { date: "Di", sentiment: 82, activity: 85 },
  { date: "Mi", sentiment: 68, activity: 70 },
  { date: "Do", sentiment: 85, activity: 90 },
  { date: "Fr", sentiment: 78, activity: 75 },
  { date: "Sa", sentiment: 88, activity: 85 },
  { date: "So", sentiment: 72, activity: 65 },
];

// New qualitative mood data - replacing numeric sentiment
export const moodBarometerData: MoodBarometerData = {
  currentState: "gut",
  weeklyOverview: [
    { day: "Mo", state: "gut" },
    { day: "Di", state: "sehr_gut" },
    { day: "Mi", state: "neutral" },
    { day: "Do", state: "sehr_gut" },
    { day: "Fr", state: "gut" },
    { day: "Sa", state: "sehr_gut" },
    { day: "So", state: "gut" },
  ],
  trend: "stable",
  lastUpdated: new Date(),
};

// Activity metrics - quantitative data
export const activityMetricsData: ActivityMetrics = {
  totalCalls: 28,
  totalMinutes: 156,
  averageDuration: 12,
  callsThisWeek: 7,
  weeklyChange: 15,
};

export const weeklyInsights: WeeklyInsight[] = [
  {
    id: "1",
    week: "Diese Woche",
    summary:
      "Margarete hatte eine gute Woche. Sie sprach häufig über ihre Enkelin Lisa und freut sich auf den geplanten Besuch am Wochenende. Ihr Appetit scheint besser zu sein, und sie erwähnte, dass sie wieder mehr im Garten arbeitet.",
    highlights: [
      "Freut sich auf Besuch der Enkelin",
      "Wieder aktiv im Garten",
      "Positives Gespräch über alte Freundin Helga",
    ],
    concerns: [],
    mood: "positiv",
  },
  {
    id: "2",
    week: "Letzte Woche",
    summary:
      "Eine ruhigere Woche für Margarete. Sie erwähnte leichte Rückenschmerzen, die sie aber als normal beschrieb. Sie hat zwei Gespräche über ihren verstorbenen Mann geführt – emotional, aber gesund verarbeitet.",
    highlights: [
      "Hat ein neues Buch angefangen zu lesen",
      "Telefonat mit Schwester in Hamburg",
    ],
    concerns: ["Erwähnte leichte Rückenschmerzen"],
    mood: "neutral",
  },
];

export const alerts: Alert[] = [
  {
    id: "1",
    type: "positive",
    title: "Besonders gutes Gespräch",
    description: "Margarete war heute besonders gut gelaunt und sprach 18 Minuten.",
    timestamp: new Date(Date.now() - 3600000 * 4),
    read: false,
  },
  {
    id: "2",
    type: "concern",
    title: "Wiederholtes Thema",
    description: "Margarete erwähnte zum dritten Mal diese Woche Schlafprobleme.",
    timestamp: new Date(Date.now() - 3600000 * 24),
    read: false,
  },
  {
    id: "3",
    type: "missed_call",
    title: "Verpasster Anruf",
    description: "Der geplante Anruf um 10:00 Uhr wurde nicht entgegengenommen.",
    timestamp: new Date(Date.now() - 3600000 * 48),
    read: true,
  },
];

export const detailedNotifications: DetailedNotification[] = [
  {
    id: "1",
    type: "beobachtung",
    title: "Schlaf wurde zuletzt häufiger erwähnt",
    description: "In mehreren Gesprächen dieser Woche",
    timestamp: new Date(Date.now() - 3600000 * 24),
    read: false,
    sourceConversations: [
      {
        id: "conv1",
        date: new Date(Date.now() - 3600000 * 24),
        excerpt: "...ich konnte wieder nicht richtig schlafen, wache immer um 3 Uhr auf...",
      },
      {
        id: "conv2",
        date: new Date(Date.now() - 3600000 * 72),
        excerpt: "...die Nächte sind so lang, ich liege oft wach und denke nach...",
      },
      {
        id: "conv3",
        date: new Date(Date.now() - 3600000 * 96),
        excerpt: "...bin müde heute, habe nicht gut geschlafen...",
      },
    ],
    reasoning: "Das Thema Schlaf kam in 3 von 5 Gesprächen vor. Manche Angehörige finden es hilfreich, bei solchen wiederkehrenden Themen aufmerksam zu bleiben.",
    suggestedActions: [
      "Sie könnten Margarete bei Gelegenheit fragen, wie sie sich fühlt",
      "Falls gewünscht: Anrufzeit etwas früher legen",
    ],
  },
  {
    id: "2",
    type: "hinweis",
    title: "Besonders aktive und fröhliche Gespräche",
    description: "Positive Stimmung in den letzten Tagen",
    timestamp: new Date(Date.now() - 3600000 * 4),
    read: false,
    sourceConversations: [
      {
        id: "conv4",
        date: new Date(Date.now() - 3600000 * 4),
        excerpt: "...ich war heute im Garten und habe die Tomaten gegossen. Es war so schön draußen!",
      },
      {
        id: "conv5",
        date: new Date(Date.now() - 3600000 * 28),
        excerpt: "...freue mich so auf Lisa am Wochenende, ich werde Apfelkuchen backen!",
      },
    ],
    reasoning: "Die Gespräche waren länger und enthielten viele positive Themen wie Pläne und Aktivitäten. Der bevorstehende Besuch scheint Margarete zu freuen.",
    suggestedActions: [
      "Vielleicht freut sich Margarete, wenn Sie das positive Gespräch erwähnen",
    ],
  },
  {
    id: "3",
    type: "dringend",
    title: "Anruf wurde nicht entgegengenommen",
    description: "Geplanter Anruf um 10:00 Uhr",
    timestamp: new Date(Date.now() - 3600000 * 48),
    read: true,
    sourceConversations: [],
    reasoning: "Der Morgenanruf wurde nicht angenommen. Ein Folgeanruf 2 Stunden später war erfolgreich. Margarete war wahrscheinlich unterwegs oder hat das Telefon nicht gehört.",
    suggestedActions: [
      "Kein Handlungsbedarf – der Folgeanruf war erfolgreich",
    ],
  },
  {
    id: "4",
    type: "hinweis",
    title: "Kürzere Gespräche am Wochenende",
    description: "Im Vergleich zu anderen Tagen",
    timestamp: new Date(Date.now() - 3600000 * 72),
    read: true,
    sourceConversations: [
      {
        id: "conv6",
        date: new Date(Date.now() - 3600000 * 72),
        excerpt: "...kann gerade nicht so lange reden, erwarte gleich Besuch...",
      },
    ],
    reasoning: "Die Gespräche waren kürzer als üblich. Margarete erwähnte, dass sie Besuch erwartet – kürzere Gespräche sind in solchen Situationen ganz normal.",
    suggestedActions: [
      "Kein Handlungsbedarf – Besuch ist ein schöner Grund",
    ],
  },
];

export const conversations: Conversation[] = [
  {
    id: "1",
    date: new Date(Date.now() - 3600000 * 4),
    duration: 18,
    type: "outbound",
    summary:
      "Ein fröhliches Gespräch über den bevorstehenden Besuch der Enkelin. Margarete erzählte von ihren Plänen, Apfelkuchen zu backen.",
    topics: ["Familie", "Kochen", "Wochenendpläne"],
    sentiment: "positiv",
    transcript: [
      { speaker: "agent", text: "Guten Morgen, Margarete! Wie geht es Ihnen heute?", timestamp: "10:00" },
      { speaker: "user", text: "Oh, guten Morgen! Mir geht es wunderbar heute. Wissen Sie, meine Enkelin Lisa kommt am Samstag zu Besuch!", timestamp: "10:00" },
      { speaker: "agent", text: "Das klingt ja wunderbar! Das freut mich für Sie. Haben Sie schon Pläne gemacht?", timestamp: "10:01" },
      { speaker: "user", text: "Ja, ich möchte unbedingt einen Apfelkuchen backen. Den mag sie so gerne. Mein Geheimrezept von meiner Mutter.", timestamp: "10:02" },
      { speaker: "agent", text: "Das klingt köstlich! Haben Sie alle Zutaten, die Sie brauchen?", timestamp: "10:03" },
      { speaker: "user", text: "Oh, da fällt mir ein – ich bräuchte noch Äpfel und Zimt. Könnte jemand das besorgen?", timestamp: "10:04" },
    ],
  },
  {
    id: "2",
    date: new Date(Date.now() - 3600000 * 28),
    duration: 12,
    type: "outbound",
    summary:
      "Margarete sprach über ihre Gartenarbeit und erwähnte, dass sie gut geschlafen hat. Ein entspanntes Gespräch.",
    topics: ["Garten", "Schlaf", "Wetter"],
    sentiment: "positiv",
    transcript: [
      { speaker: "agent", text: "Hallo Margarete, wie war Ihre Nacht?", timestamp: "10:00" },
      { speaker: "user", text: "Ach, ich habe wunderbar geschlafen! Das Wetter ist so schön, da schlafe ich immer besser.", timestamp: "10:00" },
      { speaker: "agent", text: "Das freut mich zu hören! Haben Sie heute schon etwas vor?", timestamp: "10:01" },
      { speaker: "user", text: "Ja, ich möchte ein bisschen im Garten werkeln. Die Tomaten brauchen Wasser.", timestamp: "10:02" },
    ],
  },
  {
    id: "3",
    date: new Date(Date.now() - 3600000 * 52),
    duration: 8,
    type: "inbound",
    summary:
      "Margarete rief an, weil sie sich einsam fühlte. Das Gespräch half ihr, sich besser zu fühlen.",
    topics: ["Einsamkeit", "Erinnerungen", "Familie"],
    sentiment: "neutral",
    transcript: [
      { speaker: "user", text: "Hallo? Ich wollte nur mal reden...", timestamp: "14:30" },
      { speaker: "agent", text: "Hallo Margarete, schön von Ihnen zu hören. Wie geht es Ihnen?", timestamp: "14:30" },
      { speaker: "user", text: "Ach, es ist so still heute. Mein Mann fehlt mir besonders an solchen Tagen.", timestamp: "14:31" },
      { speaker: "agent", text: "Das verstehe ich gut. Möchten Sie mir von ihm erzählen?", timestamp: "14:31" },
    ],
  },
];

export const serviceOrders: ServiceOrder[] = [
  {
    id: "1",
    type: "lebensmittel",
    status: "geliefert",
    description: "Äpfel, Zimt und Mehl für Apfelkuchen",
    requestedAt: new Date(Date.now() - 3600000 * 3),
    completedAt: new Date(Date.now() - 3600000 * 1),
    details: "REWE Lieferung – 4 Äpfel, 1x Zimt, 1kg Mehl",
  },
  {
    id: "2",
    type: "taxi",
    status: "bestätigt",
    description: "Fahrt zum Arzt am Donnerstag",
    requestedAt: new Date(Date.now() - 3600000 * 24),
    details: "Abholung: 14:00 Uhr, Praxis Dr. Müller, Hauptstraße 15",
  },
  {
    id: "3",
    type: "essen",
    status: "abgeschlossen",
    description: "Mittagessen – Kartoffelsuppe",
    requestedAt: new Date(Date.now() - 3600000 * 48),
    completedAt: new Date(Date.now() - 3600000 * 46),
    details: "Lieferung durch Mahlzeit auf Rädern",
  },
  {
    id: "4",
    type: "medikamente",
    status: "unterwegs",
    description: "Blutdruckmedikamente Nachbestellung",
    requestedAt: new Date(Date.now() - 3600000 * 5),
    details: "Apotheke am Markt – Lieferung erwartet bis 16:00 Uhr",
  },
];
