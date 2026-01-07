export type ChangeStatus = "keine_veraenderungen" | "veraenderungen";
export type TrendDirection = "up" | "down" | "stable";

export interface SignalCategory {
  category: string;
  status: "stabil" | "veraendert";
  direction: TrendDirection;
  timeframe: string;
}

export interface BriefingPoint {
  text: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  livingSituation: string;
  lastAIInteraction: Date;
  lastDoctorVisit: Date;
  changeStatus: ChangeStatus;
  coveragePeriod: {
    days: number;
    label: string;
  };
  briefingPoints: BriefingPoint[]; // Main briefing bullets for the Kurzüberblick
  signalCategories: SignalCategory[];
}
