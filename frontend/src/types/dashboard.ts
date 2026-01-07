export interface LovedOne {
  id: string;
  name: string;
  age: number;
  photo?: string;
  status: "gut" | "besorgt" | "neutral";
  lastCallTime: Date;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  preferences: {
    callFrequency: "täglich" | "zweimal_täglich" | "wöchentlich";
    preferredTime: string;
    language: string;
  };
}

export interface PersonalContext {
  description: string;
  importantPeople: {
    name: string;
    relationship: string;
  }[];
  interests: string[];
  routines: string[];
  preferredTopics: string[];
  sensitivities: string[];
}

export interface AddressAndServices {
  homeAddress: {
    street: string;
    city: string;
    postalCode: string;
  };
  preferredPharmacy: {
    name: string;
    address: string;
    phone?: string;
  };
  doctorName: string;
  mobilityNotes: string;
}

export interface ConsentSettings {
  conversationAnalysis: boolean;
  insightSharing: boolean;
  serviceExecution: boolean;
}

export interface CallStats {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  avgDuration: number;
  missedCalls: number;
  lastWeekChange: number;
}

export interface SentimentData {
  date: string;
  sentiment: number;
  activity: number;
}

export interface WeeklyInsight {
  id: string;
  week: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  mood: "positiv" | "neutral" | "besorgt";
}

export interface Alert {
  id: string;
  type: "missed_call" | "concern" | "low_engagement" | "positive";
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}

export interface DetailedNotification {
  id: string;
  type: "hinweis" | "beobachtung" | "dringend";
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  sourceConversations: {
    id: string;
    date: Date;
    excerpt: string;
  }[];
  reasoning: string;
  suggestedActions: string[];
}

export interface Conversation {
  id: string;
  date: Date;
  duration: number;
  type: "inbound" | "outbound";
  summary: string;
  topics: string[];
  sentiment: "positiv" | "neutral" | "besorgt";
  transcript: TranscriptEntry[];
}

export interface TranscriptEntry {
  speaker: "agent" | "user";
  text: string;
  timestamp: string;
}

export interface ServiceOrder {
  id: string;
  type: "essen" | "lebensmittel" | "taxi" | "medikamente" | "sonstiges";
  status: "angefragt" | "bestätigt" | "unterwegs" | "geliefert" | "abgeschlossen";
  description: string;
  requestedAt: Date;
  completedAt?: Date;
  details?: string;
}
