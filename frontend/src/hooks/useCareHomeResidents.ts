/**
 * Hook to fetch and manage care home residents data.
 * Combines real backend data with mock enrichments.
 */

import { useState, useEffect } from "react";
import { fetchSeniors } from "@/api/people";
import { transformPeopleToResidents } from "@/api/careHomeAdapter";
import type { Resident, AggregatedInsights } from "@/types/careHome";

interface UseCareHomeResidentsResult {
  residents: Resident[];
  aggregatedInsights: AggregatedInsights;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Compute aggregated insights from residents data
 */
function computeAggregatedInsights(residents: Resident[]): AggregatedInsights {
  const residentsWithReducedEngagement = residents.filter(
    (r) => r.attentionStatus === "bitte_pruefen" || r.attentionStatus === "beobachtung"
  ).length;

  const totalResidents = residents.length;

  // Collect all themes
  const themeCount = new Map<string, number>();
  residents.forEach((r) => {
    r.repeatedThemes.forEach((t) => {
      themeCount.set(t.theme, (themeCount.get(t.theme) || 0) + 1);
    });
  });

  const commonThemesThisWeek = Array.from(themeCount.entries())
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const missedConversationsTotal = residents.reduce(
    (sum, r) => sum + r.missedConversations,
    0
  );

  const averageConversationDuration = residents.length > 0
    ? Math.round(
        residents.reduce((sum, r) => {
          // Estimate duration from conversation count (placeholder)
          // TODO: Use real avg_duration_sec from backend
          return sum + 12; // Default 12 minutes
        }, 0) / residents.length
      )
    : 0;

  const trendingSentiments = [
    { sentiment: "Positiv", direction: "up" as const },
    { sentiment: "Stabil", direction: "stable" as const },
  ];

  return {
    residentsWithReducedEngagement,
    totalResidents,
    commonThemesThisWeek,
    missedConversationsTotal,
    averageConversationDuration,
    trendingSentiments,
  };
}

/**
 * Hook to fetch care home residents from backend
 */
export function useCareHomeResidents(): UseCareHomeResidentsResult {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [aggregatedInsights, setAggregatedInsights] = useState<AggregatedInsights>({
    residentsWithReducedEngagement: 0,
    totalResidents: 0,
    commonThemesThisWeek: [],
    missedConversationsTotal: 0,
    averageConversationDuration: 0,
    trendingSentiments: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch real data from backend
      const peopleData = await fetchSeniors();
      
      // Transform to Resident format with mock enrichments
      const transformedResidents = transformPeopleToResidents(peopleData);
      
      setResidents(transformedResidents);
      setAggregatedInsights(computeAggregatedInsights(transformedResidents));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Fehler beim Laden der Bewohner";
      setError(errorMessage);
      console.error("Error fetching residents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    residents,
    aggregatedInsights,
    isLoading,
    error,
    refetch: fetchData,
  };
}

