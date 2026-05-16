import type { RequestConfig, ResponseData, RequestHistoryEntry } from "../types";

/**
 * HistoryService - Manages request history using LocalStorage
 *
 * Features:
 * - Persistent storage of request history across browser sessions
 * - FIFO eviction when 100-entry limit is reached
 * - CRUD operations for history entries
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */
class HistoryService {
  private readonly STORAGE_KEY = "manual_testing_history";
  private readonly MAX_ENTRIES = 100;

  /**
   * Add a request to history
   * Requirement 14.1: Store request configuration and response metadata
   * Requirement 14.3: Store the most recent 100 requests
   * Requirement 14.4: Remove oldest entries when limit is reached
   * Requirement 14.5: Store method, URL, headers, body, timestamp, status code, and response time
   *
   * @param request - Request configuration
   * @param response - Response data
   */
  addToHistory(request: RequestConfig, response: ResponseData): void {
    const history = this.getHistory();

    // Create history entry
    const entry: RequestHistoryEntry = {
      id: this.generateEntryId(),
      config: request,
      response: {
        status: response.status,
        statusText: response.statusText,
        time: response.time,
      },
      timestamp: new Date(),
    };

    // Add to beginning of array (newest first)
    history.unshift(entry);

    // Enforce 100-entry limit with FIFO eviction
    if (history.length > this.MAX_ENTRIES) {
      history.splice(this.MAX_ENTRIES);
    }

    // Persist to LocalStorage
    this.saveHistory(history);
  }

  /**
   * Get all history entries
   * Requirement 14.2: Persist across browser sessions using LocalStorage
   *
   * @returns Array of history entries in reverse chronological order (newest first)
   */
  getHistory(): RequestHistoryEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);

      // Convert timestamp strings back to Date objects
      return parsed.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
    } catch (error) {
      console.error("Failed to load history from LocalStorage:", error);
      return [];
    }
  }

  /**
   * Clear all history entries
   * Requirement 16.1: Provide "Clear All" functionality
   */
  clearHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear history from LocalStorage:", error);
    }
  }

  /**
   * Delete a specific history entry
   * Requirement 16.2: Provide delete functionality for individual entries
   *
   * @param id - ID of the history entry to delete
   */
  deleteHistoryEntry(id: string): void {
    const history = this.getHistory();
    const filtered = history.filter((entry) => entry.id !== id);
    this.saveHistory(filtered);
  }

  /**
   * Save history to LocalStorage
   * @param history - Array of history entries to save
   */
  private saveHistory(history: RequestHistoryEntry[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save history to LocalStorage:", error);
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        // Remove oldest entries and try again
        const reducedHistory = history.slice(0, Math.floor(this.MAX_ENTRIES / 2));
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reducedHistory));
        } catch (retryError) {
          console.error("Failed to save reduced history:", retryError);
        }
      }
    }
  }

  /**
   * Generate a unique entry ID
   * @returns Unique ID string
   */
  private generateEntryId(): string {
    return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const historyService = new HistoryService();
export default historyService;
