/**
 * Care Home Data Adapter
 * Transforms backend PersonWithStats to frontend Resident type.
 * Uses real backend data where available, mock enrichments for analytics features.
 */

import type { PersonWithStats } from "./people";
import type { 
  Resident, 
  AttentionStatus, 
  TrendIndicator,
  ThemeWithTime,
  AttentionReason,
  Steckbrief,
  Bezugsperson,
  Medikament,
  Diagnose
} from "@/types/careHome";

// ============= Mock Enrichment Data =============
// This data supplements real backend data for features not yet implemented

interface MockEnrichment {
  attentionStatus: AttentionStatus;
  trend: TrendIndicator;
  repeatedThemes: ThemeWithTime[];
  missedConversations: number;
  shortenedConversations: number;
  attentionReasons?: AttentionReason[];
  room?: string; // Fallback if not in address_json
}

// Mock enrichments keyed by person ID (will be replaced by real analytics)
const mockEnrichments: Record<number, MockEnrichment> = {
  // Add mock data for specific IDs if needed
  // Example:
  // 1: { attentionStatus: "bitte_pruefen", trend: "down", ... }
};

// Default enrichment for people without specific mock data
const defaultEnrichment: MockEnrichment = {
  attentionStatus: "keine_auffaelligkeiten",
  trend: "stable",
  repeatedThemes: [],
  missedConversations: 0,
  shortenedConversations: 0,
  attentionReasons: [],
};

// ============= Transformation Functions =============

/**
 * Compute attention status from real backend data
 * TODO: Replace with proper backend analytics
 */
function computeAttentionStatus(person: PersonWithStats): AttentionStatus {
  // Use mock data if available
  if (mockEnrichments[person.id]) {
    return mockEnrichments[person.id].attentionStatus;
  }

  // Otherwise compute from available data
  const sentiment = person.avg_sentiment_score ?? 0;
  const recentCalls = person.calls_this_week ?? 0;
  
  // Simple heuristic (will be replaced by proper backend logic)
  if (sentiment < -0.3 || recentCalls === 0) {
    return "bitte_pruefen";
  } else if (sentiment < 0 || recentCalls < 2) {
    return "beobachtung";
  }
  return "keine_auffaelligkeiten";
}

/**
 * Compute trend from call history
 * TODO: Replace with proper backend analytics
 */
function computeTrend(person: PersonWithStats): TrendIndicator {
  if (mockEnrichments[person.id]) {
    return mockEnrichments[person.id].trend;
  }

  const sentiment = person.avg_sentiment_score ?? 0;
  
  if (sentiment > 0.2) return "up";
  if (sentiment < -0.2) return "down";
  return "stable";
}

/**
 * Extract room number from address or personal context
 */
function extractRoom(person: PersonWithStats): string {
  // Try address_json first
  if (person.address_json) {
    const addr = person.address_json as any;
    if (addr.zimmernummer) return addr.zimmernummer;
    if (addr.room) return addr.room;
  }
  
  // Fallback to mock enrichment
  if (mockEnrichments[person.id]?.room) {
    return mockEnrichments[person.id].room!;
  }
  
  // Generate default room based on ID
  return `Z${person.id.toString().padStart(3, '0')}`;
}

/**
 * Transform personal_context_json to Steckbrief format
 */
function transformToSteckbrief(person: PersonWithStats): Steckbrief {
  const context = (person.personal_context_json || {}) as any;
  const address = (person.address_json || {}) as any;
  
  // Parse medications if present
  const medikamente: Medikament[] = [];
  if (context.medications) {
    // Simple parsing: "Med1 50mg morgens; Med2 100mg abends"
    const meds = context.medications.split(';').map((m: string) => m.trim());
    meds.forEach((med: string) => {
      const parts = med.split(' ');
      if (parts.length >= 2) {
        medikamente.push({
          name: parts[0],
          dosierung: parts[1] || "",
          einnahmezeit: parts.slice(2).join(' ') || "Nach Anweisung",
        });
      }
    });
  }
  
  // Parse diagnoses
  const diagnosen: Diagnose[] = [];
  if (context.diagnoses) {
    const diagList = context.diagnoses.split(',').map((d: string) => d.trim());
    diagList.forEach((diag: string) => {
      diagnosen.push({ bezeichnung: diag });
    });
  }
  
  // Parse allergies
  const allergien: string[] = [];
  if (context.allergies) {
    allergien.push(...context.allergies.split(',').map((a: string) => a.trim()));
  }
  
  // Parse important people into Bezugspersonen
  const bezugspersonen: Bezugsperson[] = [];
  if (context.important_people) {
    const people = context.important_people.split(',').map((p: string) => p.trim());
    people.forEach((personStr: string) => {
      // Format: "Name (Beziehung)" or just "Name"
      const match = personStr.match(/^(.+?)\s*\((.+?)\)$/);
      if (match) {
        bezugspersonen.push({
          name: match[1].trim(),
          relationship: match[2].trim(),
        });
      } else {
        bezugspersonen.push({
          name: personStr,
          relationship: "Angehörige/r",
        });
      }
    });
  }
  
  return {
    // Grunddaten
    vollstaendigerName: person.display_name,
    rufname: person.display_name.split(' ')[0],
    alter: person.age || undefined,
    geschlecht: undefined, // Not in backend yet
    
    // Wohn- & Lebenssituation
    standort: address.city || "Pflegeheim",
    zimmernummer: extractRoom(person),
    wohnform: "Pflegeheim",
    pflegegrad: undefined, // Not in backend yet
    
    // Sozialer Kontext
    bezugspersonen,
    angehoerigeEingebunden: bezugspersonen.length > 0,
    
    // Kommunikationspräferenzen
    bevorzugteAnrufzeiten: context.daily_routines,
    sprache: person.language,
    
    // Medizinische Basisinformationen
    medikamente: medikamente.length > 0 ? medikamente : undefined,
    diagnosen: diagnosen.length > 0 ? diagnosen : undefined,
    allergien: allergien.length > 0 ? allergien : undefined,
    mobilitaet: context.mobility,
    ernaehrung: context.nutrition,
  };
}

/**
 * Transform PersonWithStats to Resident
 */
export function transformPersonToResident(person: PersonWithStats): Resident {
  const enrichment = mockEnrichments[person.id] || defaultEnrichment;
  
  return {
    id: person.id.toString(),
    name: person.display_name,
    room: extractRoom(person),
    photo: undefined, // Not in backend yet
    lastConversation: person.last_call_at ? new Date(person.last_call_at) : new Date(),
    attentionStatus: computeAttentionStatus(person),
    trend: computeTrend(person),
    conversationCount: person.total_calls,
    repeatedThemes: enrichment.repeatedThemes,
    missedConversations: enrichment.missedConversations,
    shortenedConversations: enrichment.shortenedConversations,
    familySharing: {
      conversationSummaries: false,
      notifications: false,
    },
    attentionReasons: enrichment.attentionReasons,
    steckbrief: transformToSteckbrief(person),
  };
}

/**
 * Transform array of PersonWithStats to Residents
 */
export function transformPeopleToResidents(people: PersonWithStats[]): Resident[] {
  return people.map(transformPersonToResident);
}

/**
 * Add or update mock enrichment data for a specific person
 * Useful for testing or temporary data until backend analytics are ready
 */
export function setMockEnrichment(personId: number, enrichment: Partial<MockEnrichment>) {
  mockEnrichments[personId] = {
    ...defaultEnrichment,
    ...mockEnrichments[personId],
    ...enrichment,
  };
}

/**
 * Get mock enrichment for a person (for debugging)
 */
export function getMockEnrichment(personId: number): MockEnrichment {
  return mockEnrichments[personId] || defaultEnrichment;
}

