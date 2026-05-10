import { useMemo } from 'react';

export function useFacilityFilter<T extends { facility?: string }>(
  data: T[],
  selectedFacility: string
): T[] {
  return useMemo(() => {
    if (selectedFacility === 'ALL') return data;
    const target = selectedFacility.trim().toUpperCase();
    return data.filter(item => (item.facility || '').trim().toUpperCase() === target);
  }, [data, selectedFacility]);
}
