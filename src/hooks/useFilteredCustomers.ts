
'use client';

import { useMemo } from 'react';
import type { Profile } from '@/types/matchmaking';

export default function useFilteredCustomers(
  customers: Profile[],
  searchQuery: string,
  stageFilter: string
) {
  return useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch = `${customer.firstName} ${customer.lastName} ${customer.city}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesStage =
        stageFilter === 'All' || customer.statusTag === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [customers, searchQuery, stageFilter]);
}
