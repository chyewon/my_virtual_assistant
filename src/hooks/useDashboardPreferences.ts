import { useState, useEffect, useCallback } from "react";

const DASHBOARD_VIEW_KEY = "va-dashboard-view";
export const VALID_COLUMNS = ["calendar", "tasks", "activity", "priority", "emails"] as const;
export type ColumnId = typeof VALID_COLUMNS[number];

const DEFAULT_COLUMNS: ColumnId[] = ["calendar", "tasks"];

export function useDashboardPreferences() {
  const [visibleColumns, setVisibleColumnsState] = useState<ColumnId[]>(DEFAULT_COLUMNS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_VIEW_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((c): c is ColumnId =>
            VALID_COLUMNS.includes(c as ColumnId)
          ).slice(0, 3);
          if (valid.length > 0) setVisibleColumnsState(valid);
        }
      }
    } catch (e) {
      console.warn("Failed to load dashboard preferences:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(DASHBOARD_VIEW_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, isLoaded]);

  const setVisibleColumns = useCallback((
    updater: ColumnId[] | ((prev: ColumnId[]) => ColumnId[])
  ) => {
    setVisibleColumnsState(prev =>
      typeof updater === "function" ? updater(prev) : updater
    );
  }, []);

  return { visibleColumns, setVisibleColumns, isLoaded };
}
