import { SuiteSuggestionModel } from "./testSuiteLlmSuggestionService";

export interface GenerationRun {
  cacheKey: string;
  generationNumber: number;
  timestamp: Date;
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  supersededCount: number;
  isCurrent: boolean;
}

export interface GenerationStats {
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  supersededCount: number;
}

class GenerationRunService {
  /**
   * Groups suggestions by cacheKey to create generation runs
   */
  groupByGeneration(suggestions: SuiteSuggestionModel[]): GenerationRun[] {
    // Group by cacheKey
    const grouped = new Map<string, SuiteSuggestionModel[]>();
    
    suggestions.forEach(suggestion => {
      const key = suggestion.cacheKey || 'unknown';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(suggestion);
    });

    // Convert to GenerationRun array
    const runs: GenerationRun[] = [];
    grouped.forEach((suggestions, cacheKey) => {
      const stats = this.calculateStats(suggestions);
      const timestamp = this.getEarliestTimestamp(suggestions);
      
      runs.push({
        cacheKey,
        generationNumber: 0, // Will be assigned later
        timestamp,
        ...stats,
        isCurrent: false, // Will be determined later
      });
    });

    // Sort by timestamp descending (newest first)
    runs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Assign generation numbers (newest = highest number)
    runs.forEach((run, index) => {
      run.generationNumber = runs.length - index;
    });

    // Mark the newest as current
    if (runs.length > 0) {
      runs[0].isCurrent = true;
    }

    return runs;
  }

  /**
   * Calculates statistics for a set of suggestions
   */
  calculateStats(suggestions: SuiteSuggestionModel[]): GenerationStats {
    const stats: GenerationStats = {
      totalCount: suggestions.length,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      supersededCount: 0,
    };

    suggestions.forEach(suggestion => {
      const status = suggestion.reviewStatus?.toLowerCase();
      switch (status) {
        case 'pending':
          stats.pendingCount++;
          break;
        case 'approved':
          stats.approvedCount++;
          break;
        case 'rejected':
          stats.rejectedCount++;
          break;
        case 'superseded':
          stats.supersededCount++;
          break;
      }
    });

    return stats;
  }

  /**
   * Identifies the current generation (newest)
   */
  identifyCurrent(runs: GenerationRun[]): GenerationRun | null {
    if (runs.length === 0) return null;
    
    // Already sorted by timestamp descending, so first is current
    return runs[0];
  }

  /**
   * Gets the earliest timestamp from a set of suggestions
   */
  private getEarliestTimestamp(suggestions: SuiteSuggestionModel[]): Date {
    const timestamps = suggestions
      .map(s => s.createdDateTime)
      .filter(d => d != null)
      .map(d => new Date(d!));

    if (timestamps.length === 0) {
      return new Date();
    }

    return new Date(Math.min(...timestamps.map(d => d.getTime())));
  }

  /**
   * Gets statistics for a specific generation by cacheKey
   */
  getGenerationStatistics(
    suggestions: SuiteSuggestionModel[],
    cacheKey: string
  ): GenerationStats {
    const filtered = suggestions.filter(s => s.cacheKey === cacheKey);
    return this.calculateStats(filtered);
  }

  /**
   * Gets the current cacheKey (from the newest generation)
   */
  getCurrentCacheKey(suggestions: SuiteSuggestionModel[]): string | null {
    const runs = this.groupByGeneration(suggestions);
    const current = this.identifyCurrent(runs);
    return current?.cacheKey || null;
  }
}

export default new GenerationRunService();
