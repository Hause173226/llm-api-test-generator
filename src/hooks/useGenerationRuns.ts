import { useState, useEffect, useMemo } from "react";
import { SuiteSuggestionModel } from "../services/testSuiteLlmSuggestionService";
import generationRunService, { GenerationRun } from "../services/generationRunService";

export interface UseGenerationRunsResult {
  allRuns: GenerationRun[];
  selectedRun: GenerationRun | null;
  currentRun: GenerationRun | null;
  isHistoricalView: boolean;
  selectRun: (run: GenerationRun) => void;
  selectCurrentRun: () => void;
  getFilteredSuggestions: (suggestions: SuiteSuggestionModel[]) => SuiteSuggestionModel[];
}

export function useGenerationRuns(
  allSuggestions: SuiteSuggestionModel[]
): UseGenerationRunsResult {
  const [selectedRun, setSelectedRun] = useState<GenerationRun | null>(null);

  // Group suggestions into generation runs
  const allRuns = useMemo(() => {
    return generationRunService.groupByGeneration(allSuggestions);
  }, [allSuggestions]);

  // Identify current run
  const currentRun = useMemo(() => {
    return generationRunService.identifyCurrent(allRuns);
  }, [allRuns]);

  // Auto-select current run on mount
  useEffect(() => {
    if (currentRun && !selectedRun) {
      setSelectedRun(currentRun);
    }
  }, [currentRun, selectedRun]);

  // Check if viewing historical
  const isHistoricalView = useMemo(() => {
    if (!selectedRun || !currentRun) return false;
    return selectedRun.cacheKey !== currentRun.cacheKey;
  }, [selectedRun, currentRun]);

  // Select a specific run
  const selectRun = (run: GenerationRun) => {
    setSelectedRun(run);
  };

  // Select current run
  const selectCurrentRun = () => {
    if (currentRun) {
      setSelectedRun(currentRun);
    }
  };

  // Filter suggestions by selected run
  const getFilteredSuggestions = (suggestions: SuiteSuggestionModel[]) => {
    if (!selectedRun) return suggestions;
    return suggestions.filter(s => s.cacheKey === selectedRun.cacheKey);
  };

  return {
    allRuns,
    selectedRun,
    currentRun,
    isHistoricalView,
    selectRun,
    selectCurrentRun,
    getFilteredSuggestions,
  };
}
