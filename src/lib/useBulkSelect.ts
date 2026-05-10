import { useState, useCallback } from 'react';

export function useBulkSelect() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      if (ids.every(id => prev.has(id)) && prev.size === ids.length) {
        return new Set();
      }
      return new Set(ids);
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const isAllSelected = (ids: string[]) =>
    ids.length > 0 && ids.every(id => selectedIds.has(id));

  return { selectedIds, toggleOne, toggleAll, clearSelection, isAllSelected };
}
