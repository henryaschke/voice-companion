export type AttentionStatus = "keine_auffaelligkeiten" | "beobachtung" | "bitte_pruefen";
export type TrendIndicator = "up" | "stable" | "down";

export interface ThemeWithTime {
  theme: string;
  timeContext: string; // e.g., "seit 3 Tagen", "diese Woche", "neu seit letzter Woche"
}

export interface AttentionReason {
  signal: string; // e.g., "Verkürzte Gespräche", "Wiederkehrendes Thema"
  detail?: string; // optional detail like theme name
}

export interface Bezugsperson {
  name: string;
  relationship: string;
  telefon?: string;
}

export interface Medikament {
  name: string;
  dosierung: string;
  einnahmezeit: string;
  hinweis?: string;
}

export interface Diagnose {
  bezeichnung: string;
  seit?: string;
}

export interface Steckbrief {
  // Grunddaten
  vollstaendigerName: string;
  rufname?: string;
  geburtsdatum?: string;
  alter?: number;
  geschlecht?: "männlich" | "weiblich" | "divers";
  
  // Wohn- & Lebenssituation
  standort: string;
  zimmernummer: string;
  wohnform: string;
  einzugsdatum?: string;
  pflegegrad?: number;
  
  // Sozialer Kontext
  bezugspersonen: Bezugsperson[];
  angehoerigeEingebunden: boolean;
  
  // Kommunikationspräferenzen
  bevorzugteAnrufzeiten?: string;
  sprache?: string;
  hoergeraet?: boolean;
  sehbeeintraechtigung?: boolean;
  
  // Medizinische Basisinformationen
  medikamente?: Medikament[];
  diagnosen?: Diagnose[];
  allergien?: string[];
  mobilitaet?: string;
  ernaehrung?: string;
}

export interface Resident {
  id: string;
  name: string;
  room: string;
  photo?: string;
  lastConversation: Date;
  attentionStatus: AttentionStatus;
  trend: TrendIndicator;
  conversationCount: number;
  repeatedThemes: ThemeWithTime[];
  missedConversations: number;
  shortenedConversations: number;
  familySharing: FamilySharingSettings;
  attentionReasons?: AttentionReason[];
  steckbrief: Steckbrief;
}

export interface FamilySharingSettings {
  conversationSummaries: boolean;
  notifications: boolean;
}

export interface ConversationSummary {
  id: string;
  date: Date;
  duration: number;
  summary: string;
  themes: string[];
  engagement: "normal" | "reduced" | "high";
}

export interface AggregatedInsights {
  residentsWithReducedEngagement: number;
  totalResidents: number;
  commonThemesThisWeek: { theme: string; count: number }[];
  missedConversationsTotal: number;
  averageConversationDuration: number;
  trendingSentiments: { sentiment: string; direction: TrendIndicator }[];
}
