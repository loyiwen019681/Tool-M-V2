import { useState, useCallback } from 'react';

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: number;
}

export function useSavedViews(storageKey: string) {
  const [views, setViews] = useState<SavedView[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  });

  const saveView = useCallback((name: string, filters: Record<string, unknown>) => {
    const view: SavedView = {
      id: Date.now().toString(),
      name,
      filters,
      createdAt: Date.now(),
    };
    setViews(prev => {
      const next = [...prev, view];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const deleteView = useCallback((id: string) => {
    setViews(prev => {
      const next = prev.filter(v => v.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  return { views, saveView, deleteView };
}
